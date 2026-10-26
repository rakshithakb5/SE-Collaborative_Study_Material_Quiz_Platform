// In-memory user store (same approach as the other stores in this project).
// Emails are stored lower-cased so "A@x.com" and "a@x.com" are the same user.

const crypto = require("node:crypto");

const users = new Map(); // key: lower-cased email

function normaliseEmail(email) {
  return String(email).trim().toLowerCase();
}

function findByEmail(email) {
  return users.get(normaliseEmail(email)) || null;
}

function findById(id) {
  for (const user of users.values()) {
    if (user.id === id) return user;
  }
  return null;
}

function createUser({ email, passwordHash, role }) {
  const user = {
    id: crypto.randomUUID(),
    email: normaliseEmail(email),
    passwordHash, // bcrypt hash only - never the plaintext password
    role,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  users.set(user.email, user);
  return user;
}

function resetUsers() {
  users.clear();
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  resetUsers,
};
