// Reads "Authorization: Bearer <token>" and sets req.user, which is what the
// role checks in rbac.js expect. Requests with no Authorization header pass
// through untouched (rbac.js then answers 401 on protected routes).

const { verifyToken } = require("../utils/jwt");

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
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticate };
