// Administrator routes.
// CSQ-SR-005: read access to the audit log (admins only).
// Other admin actions (suspend user, remove content) are added in later issues
// and must call recordAuditEvent() for every action they perform.

const express = require("express");
const { requireRole } = require("../middleware/rbac");
const { getAuditLog, verifyChain } = require("../services/auditLog");

const router = express.Router();

// GET /api/admin/audit-log?action=...&actorId=...&target=...
router.get("/audit-log", requireRole("admin"), (req, res) => {
  const { action, actorId, target } = req.query;
  const log = getAuditLog({ action, actorId, target });
  res.status(200).json({ count: log.length, entries: log });
});

// GET /api/admin/audit-log/verify  -> is the log untampered?
router.get("/audit-log/verify", requireRole("admin"), (req, res) => {
  res.status(200).json(verifyChain());
});

module.exports = { router };
