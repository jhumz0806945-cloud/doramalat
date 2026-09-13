// Generates (once) and reuses a local signing secret for session JWTs.
// Kept out of git (see .gitignore) — each deployment gets its own secret.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const SECRET_PATH = path.join(DATA_DIR, ".jwt-secret");

function getJwtSecret() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(SECRET_PATH)) {
    return fs.readFileSync(SECRET_PATH, "utf8").trim();
  }
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(SECRET_PATH, secret, { encoding: "utf8", mode: 0o600 });
  return secret;
}

module.exports = { getJwtSecret };
