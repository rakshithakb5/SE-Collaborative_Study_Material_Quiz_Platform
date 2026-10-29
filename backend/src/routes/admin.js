// Administrator routes.
// CSQ-SR-005: read access to the audit log (admins only).
// CSQ-F-060: list / suspend / reactivate users.
// CSQ-F-062: warn a user and remove content.
// Every action below calls recordAuditEvent() with the admin, the target and
// a mandatory reason.

const express = require("express");
const { requireRole } = require("../middleware/rbac");
const { getAuditLog, verifyChain, recordAuditEvent } = require("../services/auditLog");
const { findById, listUsers, setStatus } = require("../models/userStore");
const { publicUser } = require("./auth");
const { sendWarning } = require("../services/notifier");
const {
  removeMaterial,
  getMaterial,
  listForReview,
  listUserFlaggedMaterials,
  dismissMaterialFlag,
} = require("./materials");
const {
  listUserFlaggedQuizzes,
  dismissQuizFlag,
} = require("./quizAttempts");
const { runRetention } = require("../services/retentionJob");

const router = express.Router();

// GET /api/admin/audit-log?action=...&actorId=...&target=...
router.get("/audit-log", requireRole("admin"), (req, res) => {
  const { action, actorId, target, includeArchived } = req.query;
  const log = getAuditLog({
    action,
    actorId,
    target,
    includeArchived: includeArchived === "true",
  });
  res.status(200).json({ count: log.length, entries: log });
});

// GET /api/admin/audit-log/verify  -> is the log untampered?
router.get("/audit-log/verify", requireRole("admin"), (req, res) => {
  res.status(200).json(verifyChain());
});

// POST /api/admin/audit-log/archive  -> run the retention job now
router.post("/audit-log/archive", requireRole("admin"), (req, res) => {
  res.status(200).json({ archived: runRetention() });
});

// Returns the trimmed reason, or sends 400 and returns null.
function requireReason(req, res) {
  const reason = req.body && req.body.reason;
  if (typeof reason !== "string" || !reason.trim()) {
    res.status(400).json({ error: "A reason is required" });
    return null;
  }
  return reason.trim();
}

function actorOf(req) {
  return { id: req.user.id, role: req.user.role, email: req.user.email };
}

// GET /api/admin/users
router.get("/users", requireRole("admin"), (req, res) => {
  const users = listUsers().map(publicUser);
  res.status(200).json({ count: users.length, users });
});

function changeStatus(from, to, action) {
  return (req, res) => {
    const reason = requireReason(req, res);
    if (!reason) return;

    const user = findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") {
      return res.status(403).json({ error: "Admin accounts cannot be changed here" });
    }
    if (user.status !== from) {
      return res.status(409).json({ error: `User is already ${user.status}` });
    }

    setStatus(user, to);
    recordAuditEvent({ actor: actorOf(req), action, target: `user:${user.id}`, reason });
    return res.status(200).json(publicUser(user));
  };
}

// POST /api/admin/users/:id/suspend   { reason }
router.post("/users/:id/suspend", requireRole("admin"), changeStatus("active", "suspended", "user.suspend"));

// POST /api/admin/users/:id/reactivate   { reason }
router.post("/users/:id/reactivate", requireRole("admin"), changeStatus("suspended", "active", "user.reactivate"));

// POST /api/admin/users/:id/warn   { reason }
router.post("/users/:id/warn", requireRole("admin"), (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const user = findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  sendWarning(user, reason);
  recordAuditEvent({ actor: actorOf(req), action: "user.warn", target: `user:${user.id}`, reason });
  return res.status(200).json({ warned: true, user: publicUser(user) });
});

// POST /api/admin/materials/:id/remove   { reason }
router.post("/materials/:id/remove", requireRole("admin"), (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const material = removeMaterial(req.params.id);
  if (!material) return res.status(404).json({ error: "Material not found" });

  recordAuditEvent({ actor: actorOf(req), action: "content.remove", target: `material:${material.id}`, reason });
  return res.status(200).json({ removed: true, materialId: material.id });
});

// GET /api/admin/materials/review-queue
// Material held back by the plagiarism check or user flags
router.get("/materials/review-queue", requireRole("admin"), (req, res) => {
  const plagiarismItems = listForReview().map((m) => ({
    materialId: m.id,
    title: m.title,
    status: m.status,
    source: "plagiarism-service",
    reason:
      m.status === "flagged"
        ? `Similarity ${Math.round(m.scan.similarity * 100)}% is above the threshold`
        : "Plagiarism scan unavailable - manual review needed",
    scan: m.scan,
    createdAt: m.createdAt,
  }));

  const userFlaggedItems = listUserFlaggedMaterials().map((m) => ({
    materialId: m.id,
    title: m.title,
    status: m.status,
    source: "user-report",
    reason: m.userFlags.map((f) => f.reason).join("; "),
    flags: m.userFlags,
    flagCount: m.userFlags.length,
    createdAt: m.userFlags[m.userFlags.length - 1].flaggedAt,
  }));

  const items = [...plagiarismItems, ...userFlaggedItems];
  res.status(200).json({ count: items.length, items });
});

// GET /api/admin/moderation-queue - Unified moderation queue (CSQ-F-061)
router.get("/moderation-queue", requireRole("admin"), (req, res) => {
  const plagiarismItems = listForReview().map((m) => ({
    id: m.id,
    contentType: "material",
    title: m.title,
    status: m.status,
    source: "plagiarism-service",
    reason:
      m.status === "flagged"
        ? `Similarity ${Math.round(m.scan.similarity * 100)}% is above the threshold`
        : "Plagiarism scan unavailable - manual review needed",
    scan: m.scan,
    timestamp: m.createdAt || Date.now(),
  }));

  const userFlaggedMaterials = listUserFlaggedMaterials().map((m) => ({
    id: m.id,
    contentType: "material",
    title: m.title,
    status: m.status,
    source: "user-report",
    reason: m.userFlags.map((f) => f.reason).join("; "),
    flags: m.userFlags,
    flagCount: m.userFlags.length,
    timestamp: m.userFlags[m.userFlags.length - 1].flaggedAt,
  }));

  const userFlaggedQuizzes = listUserFlaggedQuizzes().map((q) => ({
    id: q.id,
    contentType: "quiz",
    title: q.title,
    status: q.status,
    source: "user-report",
    reason: q.userFlags.map((f) => f.reason).join("; "),
    flags: q.userFlags,
    flagCount: q.userFlags.length,
    timestamp: q.userFlags[q.userFlags.length - 1].flaggedAt,
  }));

  const items = [...plagiarismItems, ...userFlaggedMaterials, ...userFlaggedQuizzes].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  return res.status(200).json({ count: items.length, queue: items });
});

// POST /api/admin/moderation-queue/materials/:id/dismiss - Dismiss user flags on material
router.post("/moderation-queue/materials/:id/dismiss", requireRole("admin"), (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const dismissed = dismissMaterialFlag(req.params.id);
  if (!dismissed) return res.status(404).json({ error: "Material not found" });

  recordAuditEvent({
    actor: actorOf(req),
    action: "content.dismiss_flag",
    target: `material:${req.params.id}`,
    reason,
  });

  return res.status(200).json({ dismissed: true, materialId: req.params.id });
});

// POST /api/admin/moderation-queue/quizzes/:id/dismiss - Dismiss user flags on quiz
router.post("/moderation-queue/quizzes/:id/dismiss", requireRole("admin"), (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const dismissed = dismissQuizFlag(req.params.id);
  if (!dismissed) return res.status(404).json({ error: "Quiz not found" });

  recordAuditEvent({
    actor: actorOf(req),
    action: "content.dismiss_flag",
    target: `quiz:${req.params.id}`,
    reason,
  });

  return res.status(200).json({ dismissed: true, quizId: req.params.id });
});

// POST /api/admin/materials/:id/approve   { reason }  -> publish after review
router.post("/materials/:id/approve", requireRole("admin"), (req, res) => {
  const reason = requireReason(req, res);
  if (!reason) return;

  const material = getMaterial(req.params.id);
  if (!material) return res.status(404).json({ error: "Material not found" });
  if (material.status === "published") {
    return res.status(409).json({ error: "Material is already published" });
  }

  material.status = "published";
  recordAuditEvent({ actor: actorOf(req), action: "content.approve", target: `material:${material.id}`, reason });
  return res.status(200).json({ materialId: material.id, status: material.status });
});

module.exports = { router };
