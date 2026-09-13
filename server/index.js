const path = require("node:path");
const express = require("express");
const cookieParser = require("cookie-parser");

const { attachUser, router: authRouter } = require("./routes/auth");
const { router: seriesRouter } = require("./routes/series");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 5600;

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/series", seriesRouter);

// Usuario actual disponible en cualquier vista renderizada por el propio server
// (no se usa aún del lado servidor, pero deja la puerta abierta a SSR futuro).
app.use(attachUser);

app.use(express.static(ROOT, { extensions: ["html"] }));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Ruta no encontrada." });
  res.status(404).sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, () => {
  console.log(`DoramaLat (backend real) escuchando en http://localhost:${PORT}`);
});
