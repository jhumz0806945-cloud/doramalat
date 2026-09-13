// Punto de entrada solo para desarrollo local (`npm start`). En Vercel se
// usa api/index.js, que reexporta la misma app de server/app.js — Vercel
// maneja el servidor HTTP por su cuenta.
const app = require("./app");

const PORT = Number(process.env.PORT) || 5600;

app.listen(PORT, () => {
  console.log(`DoramaLatAMP (backend real) escuchando en http://localhost:${PORT}`);
});
