const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDb } = require("../db");
const { getJwtSecret } = require("../secret");

const JWT_SECRET = getJwtSecret();
const COOKIE_NAME = "dl_session";
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function findUserByEmail(email) {
  const db = await getDb();
  const r = await db.execute({ sql: "SELECT * FROM users WHERE email = @email", args: { email } });
  return r.rows[0] ?? null;
}
async function findUserById(id) {
  const db = await getDb();
  const r = await db.execute({
    sql: "SELECT id, email, display_name, created_at FROM users WHERE id = @id",
    args: { id },
  });
  return r.rows[0] ?? null;
}
async function insertUser(email, displayName, passwordHash) {
  const db = await getDb();
  const r = await db.execute({
    sql: "INSERT INTO users (email, display_name, password_hash) VALUES (@email, @displayName, @passwordHash)",
    args: { email, displayName, passwordHash },
  });
  return findUserById(Number(r.lastInsertRowid));
}

function signSession(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    secure: process.env.NODE_ENV === "production",
  });
}

/** Middleware: adjunta req.user si hay una cookie de sesión válida. Nunca rechaza. */
async function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(payload.sub);
    if (user) req.user = user;
  } catch {
    // token inválido o expirado: se ignora, el usuario queda como anónimo
  }
  next();
}

/** Middleware: requiere sesión activa. */
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "No has iniciado sesión." });
  next();
}

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body ?? {};

    if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: "Ingresa un correo válido." });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
    }
    const name =
      typeof displayName === "string" && displayName.trim() ? displayName.trim().slice(0, 60) : email.split("@")[0];
    const normalizedEmail = email.trim().toLowerCase();

    if (await findUserByEmail(normalizedEmail)) {
      return res.status(409).json({ error: "Ya existe una cuenta con ese correo." });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await insertUser(normalizedEmail, name, passwordHash);

    setSessionCookie(res, signSession(user));
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
    }

    const row = await findUserByEmail(email.trim().toLowerCase());
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    const user = { id: row.id, email: row.email, display_name: row.display_name, created_at: row.created_at };
    setSessionCookie(res, signSession(user));
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).end();
});

router.get("/me", attachUser, (req, res) => {
  res.json({ user: req.user ?? null });
});

module.exports = { router, attachUser, requireAuth };
