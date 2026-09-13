// Función serverless de Vercel: reexporta la misma app de Express que usa
// el desarrollo local (server/app.js). Vercel invoca este módulo por cada
// request a /api/* (ver el rewrite en vercel.json) y maneja el ciclo
// HTTP por su cuenta — por eso server/app.js nunca llama a app.listen().
module.exports = require("../server/app");
