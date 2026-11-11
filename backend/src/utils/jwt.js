// JWT helper (CSQ-F-002). Tokens are signed with HS256 using JWT_SECRET.

const jwt = require("jsonwebtoken");

const TOKEN_LIFETIME_SECONDS = 60 * 60; // 1 hour

function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  // Convenience for tests and local demos only. Set JWT_SECRET in backend/.env
  // (that file is git-ignored) for anything real.
  if (!getSecret.warned && process.env.NODE_ENV !== "test") {
    console.warn("JWT_SECRET is not set - using an insecure development secret.");
    getSecret.warned = true;
  }
  return "insecure-development-secret";
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    getSecret(),
    { algorithm: "HS256", expiresIn: TOKEN_LIFETIME_SECONDS }
  );
}

// Returns the decoded payload, or throws if the token is invalid or expired.
function verifyToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
}

module.exports = {
  signToken,
  verifyToken,
  TOKEN_LIFETIME_SECONDS,
};
