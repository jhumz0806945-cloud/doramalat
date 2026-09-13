const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");

const { ready } = require("./db");
const { attachUser, router: authRouter } = require("./routes/auth");
const { router: seriesRouter } = require("./routes/series");

const ROOT = path.join(__dirname, "..");

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use(cookieParser());

// Garantiza que la migración + siembra del catálogo terminó antes de que
// cualquier ruta toque la base de datos (una sola vez por arranque / cold
// start, gracias al memoizado en db.js).
app.use(async (_req, res, next) => {
  try {
    await ready();
    next();
  } catch (err) {
    res.status(503).json({ error: "Base de datos no disponible." });
    console.error("Fallo al inicializar la base de datos:", err);
  }
});

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

module.exports = app;
