// Authentication routes.
// CSQ-F-001: POST /api/auth/register

const express = require("express");
const { hashPassword } = require("../utils/password");
const { createUser, findByEmail } = require("../models/userStore");
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

module.exports = { router, publicUser };
