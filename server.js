// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// Normalizar textos (quitar tildes, espacios, mayúsculas)
function normalize(s) {
  if (!s) return "";
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

// Cargar data.json
const DATA_FILE = path.join(__dirname, "data.json");
let data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

// Cache de provincias normalizadas
let provinciasNorm = Object.keys(data).map((p) => ({
  raw: p,
  norm: normalize(p),
}));

// ENDPOINT LISTAR PROVINCIAS
app.get("/api/provincias", (req, res) => {
  res.json({ provincias: Object.keys(data) });
});

// ENDPOINT RECOMENDACIONES
app.get("/api/recomendaciones", (req, res) => {
  const ubicacionRaw = req.query.ubicacion || "";
  const ubicacionNorm = normalize(ubicacionRaw);

  if (!ubicacionNorm) {
    return res.status(400).json({ error: "Falta parámetro ubicacion" });
  }

  // match exacto
  let match = provinciasNorm.find((p) => p.norm === ubicacionNorm);

  if (!match) {
    return res.status(404).json({
      error: "Provincia no encontrada",
      provincia: ubicacionRaw
    });
  }

  return res.json({
    provincia: match.raw,
    recomendacion: data[match.raw],
  });
});

// HEALTH CHECK (Render lo usa)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log("API running on port " + PORT);
});
