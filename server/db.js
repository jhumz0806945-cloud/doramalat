// Acceso a datos — compatible con SQLite (mismo dialecto SQL en todo el
// proyecto), usando @libsql/client:
//
//   - Local / npm start:  sin TURSO_DATABASE_URL configurada, usa un
//     archivo SQLite local en data/doramalatamp.db (igual que antes,
//     cero cuentas externas necesarias para desarrollar).
//   - Producción (Vercel): con TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
//     configuradas como variables de entorno, se conecta a una base de
//     datos Turso real — necesario porque el sistema de archivos de las
//     funciones serverless de Vercel es de solo lectura (salvo /tmp) y
//     no persiste entre invocaciones.
//
// La conexión y la siembra del catálogo son perezosas (getDb()), nunca
// código a nivel de módulo: si algo falla (p.ej. faltan las variables de
// entorno en Vercel), el error queda dentro de una promesa que las rutas
// pueden atrapar con try/catch y devolver como JSON 500 — en vez de
// tumbar toda la función serverless en el arranque, que es lo que pasa
// si un `require()` de nivel superior lanza una excepción.
const path = require("node:path");
const fs = require("node:fs");
const { SERIES } = require("./data/series");

function buildClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (process.env.VERCEL) {
    if (!url) {
      throw new Error(
        "Faltan TURSO_DATABASE_URL / TURSO_AUTH_TOKEN. En Vercel el sistema de archivos no persiste, así que " +
          "no hay una base de datos local de respaldo — configura esas variables de entorno en el proyecto y vuelve a desplegar."
      );
    }
    // Build "/web": cliente 100% JS (sin binario nativo) hecho para runtimes
    // serverless/edge. El build por defecto de @libsql/client arrastra un
    // binario nativo para el modo de archivo local que no siempre carga bien
    // en el sandbox de las funciones de Vercel — con /web se evita del todo.
    const { createClient } = require("@libsql/client/web");
    return createClient({ url, authToken });
  }

  const { createClient } = require("@libsql/client");
  if (url) return createClient({ url, authToken });

  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return createClient({ url: `file:${path.join(dataDir, "doramalatamp.db")}` });
}

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    country TEXT NOT NULL,
    country_label TEXT NOT NULL,
    genre TEXT NOT NULL,
    category TEXT,
    year INTEGER NOT NULL,
    rating REAL,
    meta TEXT,
    synopsis TEXT NOT NULL,
    poster TEXT NOT NULL,
    watch_url TEXT NOT NULL,
    trailer TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, series_id)
  )`,
];

const UPSERT_SERIES_SQL = `
  INSERT INTO series (slug, title, type, country, country_label, genre, category, year, rating, meta, synopsis, poster, watch_url, trailer)
  VALUES (@slug, @title, @type, @country, @countryLabel, @genre, @category, @year, @rating, @meta, @synopsis, @poster, @watchUrl, @trailer)
  ON CONFLICT(slug) DO UPDATE SET
    title=excluded.title, type=excluded.type, country=excluded.country, country_label=excluded.country_label,
    genre=excluded.genre, category=excluded.category, year=excluded.year, rating=excluded.rating, meta=excluded.meta,
    synopsis=excluded.synopsis, poster=excluded.poster, watch_url=excluded.watch_url, trailer=excluded.trailer
`;

// Memoizado: la conexión + migración + siembra corren una sola vez por
// arranque (o por "cold start" en serverless), no en cada request.
let dbPromise = null;
function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const client = buildClient();
      for (const stmt of SCHEMA_SQL) await client.execute(stmt);
      const batch = SERIES.map((item) => ({
        sql: UPSERT_SERIES_SQL,
        args: {
          slug: item.slug,
          title: item.title,
          type: item.type,
          country: item.country,
          countryLabel: item.countryLabel,
          genre: item.genre,
          category: item.category ?? null,
          year: item.year,
          rating: item.rating ?? null,
          meta: item.meta ?? null,
          synopsis: item.synopsis,
          poster: item.poster,
          watchUrl: item.watchUrl,
          trailer: item.trailer ?? null,
        },
      }));
      await client.batch(batch, "write");
      return client;
    })().catch((err) => {
      dbPromise = null; // permite reintentar en la siguiente invocación en vez de quedar rota para siempre
      throw err;
    });
  }
  return dbPromise;
}

module.exports = { getDb };
