const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// Normalizar texto
function normalize(s) {
  if (!s) return "";
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

// Cargar data.json
const DATA_FILE = path.join(__dirname, "data.json");
let data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

// API privada (requiere key)
let apiKeys = {};
try {
  apiKeys = JSON.parse(fs.readFileSync("keys.json", "utf8"));
} catch (e) { apiKeys = {}; }

function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key) return res.status(401).json({ error: "API key requerida" });
  if (!apiKeys[key]) return res.status(403).json({ error: "API key inválida" });
  next();
}

// Buscar provincia
function findProvincia(q) {
  const norm = normalize(q);
  const match = Object.keys(data).find(k => normalize(k) === norm);
  return match ? { provincia: match, recomendacion: data[match] } : null;
}

// ----------------- UI PÚBLICA -----------------
app.use(express.static(__dirname)); // sirve resultados.html desde raíz

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "resultados.html"));
});

// ----------------- API PÚBLICA -----------------
app.get("/api/public/recomendaciones", (req, res) => {
  const ubic = req.query.ubicacion || "";
  const found = findProvincia(ubic);
  if (!found) return res.status(404).json({ error: "Provincia no encontrada" });
  res.json(found);
});

// Descarga CSV para Excel
app.get("/api/public/recomendaciones/export", (req, res) => {
  const ubic = req.query.ubicacion || "";
  const found = findProvincia(ubic);
  if (!found) return res.status(404).json({ error: "Provincia no encontrada" });

  const provincia = found.provincia;
  const cultivos = found.recomendacion.cultivos.replace(/\n/g, " ");

  const csv =
    "provincia,campo,valor\n" +
    `"${provincia}","cultivos","${cultivos}"`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${provincia}.csv`);
  res.send(csv);
});

// ----------------- API PRIVADA (empresarial) -----------------
app.get("/api/recomendaciones", requireApiKey, (req, res) => {
  const ubic = req.query.ubicacion || "";
  const found = findProvincia(ubic);
  if (!found) return res.status(404).json({ error: "Provincia no encontrada" });
  res.json(found);
});

// ----------------- HEALTHCHECK -----------------
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`API pública y privada lista en puerto ${PORT}`));
