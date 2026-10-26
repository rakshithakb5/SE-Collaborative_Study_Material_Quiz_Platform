// Authentication routes.
// CSQ-F-001: POST /api/auth/register
// CSQ-F-002: POST /api/auth/login, GET /api/auth/me

const express = require("express");
const { hashPassword, verifyPassword } = require("../utils/password");
const { signToken, TOKEN_LIFETIME_SECONDS } = require("../utils/jwt");
const { createUser, findByEmail, findById } = require("../models/userStore");
const { sendVerificationEmail } = require("../services/notifier");

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SELF_REGISTER_ROLES = ["student", "instructor"]; // admins are not self-registered

// Never send the password hash back to the client.
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

// Used so an unknown email takes about as long to reject as a wrong password.
let dummyHashPromise;
function getDummyHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword("dummy-password-1");
  return dummyHashPromise;
}

router.post("/register", async (req, res) => {
  const { email, password, role } = req.body || {};

  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email.trim())
  ) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  if (!SELF_REGISTER_ROLES.includes(role)) {
    return res
      .status(400)
      .json({ error: "Role must be 'student' or 'instructor'" });
  }

  let passwordHash;
  try {
    passwordHash = await hashPassword(password);
  } catch (err) {
    // Password rules (type, length) come from utils/password.js
    return res.status(400).json({ error: err.message });
  }

  if (findByEmail(email)) {
    return res.status(409).json({ error: "Email is already registered" });
  }

  const user = createUser({ email, passwordHash, role });
  const verificationEmailSent = sendVerificationEmail(user);

  return res.status(201).json({
    ...publicUser(user),
    verificationEmailSent,
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = findByEmail(email);
  const hash = user ? user.passwordHash : await getDummyHash();
  const passwordOk = await verifyPassword(password, hash);

  // Same message for "unknown email" and "wrong password" on purpose.
  if (!user || !passwordOk) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.status !== "active") {
    return res.status(403).json({ error: "Account is not active" });
  }

  return res.status(200).json({
    token: signToken(user),
    expiresIn: TOKEN_LIFETIME_SECONDS,
    user: publicUser(user),
  });
});

router.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const user = findById(req.user.id);
  return res.status(200).json(user ? publicUser(user) : req.user);
});

module.exports = { router, publicUser };
