const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");

const { attachUser, router: authRouter } = require("./routes/auth");
const { router: seriesRouter } = require("./routes/series");

const ROOT = path.join(__dirname, "..");

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/series", seriesRouter);

// Disponible para vistas renderizadas del lado servidor en el futuro.
app.use(attachUser);

// En Vercel los archivos estáticos (index.html, app.js, images/) ya los
// sirve la plataforma directamente — este bloque solo se ejercita en
// desarrollo local (npm start / server/index.js).
if (!process.env.VERCEL) {
  app.use(express.static(ROOT, { extensions: ["html"] }));
  app.use((req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Ruta no encontrada." });
    res.status(404).sendFile(path.join(ROOT, "index.html"));
  });
} else {
  app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
}

// Manejador de errores final: cualquier excepción de una ruta (incluida una
// base de datos no configurada en getDb()) llega aquí como JSON legible,
// en vez de la página de error HTML por defecto de Express.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Error interno del servidor." });
});

module.exports = app;
