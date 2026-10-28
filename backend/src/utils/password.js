// Password hashing helper (CSQ-SR-002).
// Passwords are hashed with bcrypt (salted, adaptive) and are never stored
// or logged in plaintext. Only the hash string is ever saved.

const bcrypt = require("bcryptjs");

// Cost factor: higher = slower to brute-force. 12 is a sound default;
// tests use a lower value so the test suite stays fast.
const SALT_ROUNDS = process.env.NODE_ENV === "test" ? 4 : 12;

const MIN_LENGTH = 8;
// bcrypt only looks at the first 72 bytes, so longer passwords are rejected
// rather than silently truncated.
const MAX_BYTES = 72;

function validatePassword(plain) {
  if (typeof plain !== "string") {
    throw new TypeError("Password must be a string");
  }
  if (plain.length < MIN_LENGTH) {
    throw new RangeError(`Password must be at least ${MIN_LENGTH} characters`);
  }
  if (Buffer.byteLength(plain, "utf8") > MAX_BYTES) {
    throw new RangeError(`Password must be at most ${MAX_BYTES} bytes`);
  }
}

// Returns a hash string such as "$2a$12$..." (the salt is embedded in it).
async function hashPassword(plain) {
  validatePassword(plain);
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Returns true only if `plain` matches `hash`. Never throws for a wrong
// password or a malformed hash; it simply returns false.
async function verifyPassword(plain, hash) {
  if (typeof plain !== "string" || typeof hash !== "string") return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  MIN_LENGTH,
  MAX_BYTES,
};
