const express = require("express");
const { db } = require("../db");

const router = express.Router();

function rowToJson(row) {
  return {
    slug: row.slug,
    title: row.title,
    type: row.type,
    country: row.country,
    countryLabel: row.country_label,
    genre: row.genre,
    category: row.category,
    year: row.year,
    rating: row.rating,
    meta: row.meta,
    synopsis: row.synopsis,
    poster: row.poster,
    watchUrl: row.watch_url,
    trailer: row.trailer,
  };
}

// GET /api/series?q=&genre=&country=&type=&limit=
router.get("/", (req, res) => {
  const { q, genre, category, country, type } = req.query;
  const limit = Math.min(Number(req.query.limit) || 40, 100);

  const clauses = [];
  const params = {};

  if (typeof q === "string" && q.trim()) {
    clauses.push("(title LIKE @q OR synopsis LIKE @q OR genre LIKE @q)");
    params.q = `%${q.trim()}%`;
  }
  if (typeof genre === "string" && genre.trim()) {
    clauses.push("genre LIKE @genre");
    params.genre = `%${genre.trim()}%`;
  }
  if (typeof category === "string" && category.trim()) {
    clauses.push("category = @category");
    params.category = category.trim();
  }
  if (typeof country === "string" && country.trim()) {
    clauses.push("country = @country");
    params.country = country.trim().toUpperCase();
  }
  if (typeof type === "string" && (type === "series" || type === "movie")) {
    clauses.push("type = @type");
    params.type = type;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM series ${where} ORDER BY rating IS NULL, rating DESC, year DESC LIMIT @limit`)
    .all({ ...params, limit });

  res.json({ results: rows.map(rowToJson), count: rows.length });
});

router.get("/:slug", (req, res) => {
  const row = db.prepare("SELECT * FROM series WHERE slug = ?").get(req.params.slug);
  if (!row) return res.status(404).json({ error: "No encontramos esa reseña." });
  res.json({ series: rowToJson(row) });
});

module.exports = { router };
