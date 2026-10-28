// Reads "Authorization: Bearer <token>" and sets req.user, which is what the
// role checks in rbac.js expect. Requests with no Authorization header pass
// through untouched (rbac.js then answers 401 on protected routes).

const { verifyToken } = require("../utils/jwt");
const { findById } = require("../models/userStore");

function authenticate(req, res, next) {
  const header = req.get("authorization");
  if (!header) return next();

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid authorization header" });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // CSQ-F-060: a suspended account stops working immediately, even if the
  // token it was issued earlier has not expired yet.
  const account = findById(req.user.id);
  if (account && account.status !== "active") {
    return res.status(403).json({ error: "Account is not active" });
  }
  return next();
}

module.exports = { authenticate };
