// Audit log (CSQ-SR-005).
// Every administrative action (user suspension, content removal, ...) is
// recorded with WHO did it (actor), WHEN (timestamp) and WHY (reason).
//
// The log is append-only and tamper-evident: each entry stores the hash of the
// previous entry, so changing or deleting an old entry breaks the chain and
// verifyChain() reports where.

const crypto = require("node:crypto");

const GENESIS_HASH = "0".repeat(64);
const entries = [];

function computeHash(entry) {
  const body = JSON.stringify({
    seq: entry.seq,
    timestamp: entry.timestamp,
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    reason: entry.reason,
    prevHash: entry.prevHash,
  });
  return crypto.createHash("sha256").update(body).digest("hex");
}

function requireText(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`Audit event needs a non-empty ${name}`);
  }
  return value.trim();
}

// actor:  { id, role, email? }  - who did it (use { id: "system", role: "system" }
//         for automatic events such as an account lockout)
// action: e.g. "user.suspend", "content.remove"
// target: what it was done to, e.g. "user:42" or "material:7"
// reason: why (required)
function recordAuditEvent({ actor, action, target, reason }) {
  if (!actor || typeof actor !== "object" || !actor.id) {
    throw new TypeError("Audit event needs an actor with an id");
  }

  const previous = entries[entries.length - 1];
  const entry = {
    seq: entries.length + 1,
    timestamp: new Date().toISOString(),
    actor: {
      id: String(actor.id),
      role: actor.role || "unknown",
      email: actor.email || null,
    },
    action: requireText(action, "action"),
    target: requireText(target, "target"),
    reason: requireText(reason, "reason"),
    prevHash: previous ? previous.hash : GENESIS_HASH,
  };
  entry.hash = computeHash(entry);

  entries.push(Object.freeze(entry));
  return structuredClone(entry);
}

// Returns copies, so callers cannot change the stored log.
function getAuditLog({ action, actorId, target } = {}) {
  return entries
    .filter((e) => !action || e.action === action)
    .filter((e) => !actorId || e.actor.id === actorId)
    .filter((e) => !target || e.target === target)
    .map((e) => structuredClone(e));
}

// Checks a list of entries (the stored log by default).
// Returns { valid: true } or { valid: false, brokenAtSeq }.
function verifyChain(list = entries) {
  let expectedPrev = GENESIS_HASH;
  for (const entry of list) {
    if (entry.prevHash !== expectedPrev || entry.hash !== computeHash(entry)) {
      return { valid: false, brokenAtSeq: entry.seq };
    }
    expectedPrev = entry.hash;
  }
  return { valid: true, count: list.length };
}

// For tests only: start with an empty log.
function resetAuditLog() {
  entries.length = 0;
}

module.exports = {
  recordAuditEvent,
  getAuditLog,
  verifyChain,
  resetAuditLog,
};
