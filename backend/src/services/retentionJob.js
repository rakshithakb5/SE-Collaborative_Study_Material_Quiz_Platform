// Runs the audit-log archival once a day (CSQ-NF-004). Started from app.js
// only when the server runs for real, never during tests.

const { archiveExpired, recordAuditEvent, RETENTION_DAYS } = require("./auditLog");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Archives expired entries and records that it did. Returns the count.
function runRetention(now = Date.now()) {
  const moved = archiveExpired(now);
  if (moved > 0) {
    recordAuditEvent({
      actor: { id: "system", role: "system" },
      action: "audit.archive",
      target: "audit-log",
      reason: `Retention policy: ${moved} entr${moved === 1 ? "y" : "ies"} older than ${RETENTION_DAYS} days archived`,
    });
  }
  return moved;
}

function startRetentionJob(intervalMs = ONE_DAY_MS) {
  runRetention();
  const timer = setInterval(runRetention, intervalMs);
  timer.unref(); // do not keep the process alive just for this timer
  return timer;
}

module.exports = { runRetention, startRetentionJob };
