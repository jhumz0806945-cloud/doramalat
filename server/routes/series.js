const express = require("express");
const { getDb } = require("../db");

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
router.get("/", async (req, res, next) => {
  try {
    const db = await getDb();
    const { q, genre, category, country, type } = req.query;
    const limit = Math.min(Number(req.query.limit) || 40, 100);

    const clauses = [];
    const args = {};

    if (typeof q === "string" && q.trim()) {
      clauses.push("(title LIKE @q OR synopsis LIKE @q OR genre LIKE @q)");
      args.q = `%${q.trim()}%`;
    }
    if (typeof genre === "string" && genre.trim()) {
      clauses.push("genre LIKE @genre");
      args.genre = `%${genre.trim()}%`;
    }
    if (typeof category === "string" && category.trim()) {
      clauses.push("category = @category");
      args.category = category.trim();
    }
    if (typeof country === "string" && country.trim()) {
      clauses.push("country = @country");
      args.country = country.trim().toUpperCase();
    }
    if (typeof type === "string" && (type === "series" || type === "movie")) {
      clauses.push("type = @type");
      args.type = type;
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    args.limit = limit;
    const result = await db.execute({
      sql: `SELECT * FROM series ${where} ORDER BY rating IS NULL, rating DESC, year DESC LIMIT @limit`,
      args,
    });

    res.json({ results: result.rows.map(rowToJson), count: result.rows.length });
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const db = await getDb();
    const result = await db.execute({ sql: "SELECT * FROM series WHERE slug = @slug", args: { slug: req.params.slug } });
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "No encontramos esa reseña." });
    res.json({ series: rowToJson(row) });
  } catch (err) {
    next(err);
  }
});

module.exports = { router };
