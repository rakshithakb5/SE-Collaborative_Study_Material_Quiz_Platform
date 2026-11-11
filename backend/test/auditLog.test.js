const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const {
  recordAuditEvent,
  getAuditLog,
  verifyChain,
  resetAuditLog,
} = require("../src/services/auditLog");

// TC-Sec-05 (CSQ-SR-005): admin actions are logged with actor, timestamp and
// reason; log entries can be verified for sample actions.

const admin = { id: "admin-1", role: "admin", email: "admin@example.com" };
const student = { id: "student-1", role: "student" };

function suspension() {
  return recordAuditEvent({
    actor: admin,
    action: "user.suspend",
    target: "user:42",
    reason: "Repeated policy violations",
  });
}

test("TC-Sec-05: a user suspension is logged with actor, timestamp and reason", () => {
  resetAuditLog();
  const entry = suspension();

  assert.equal(entry.actor.id, "admin-1");
  assert.equal(entry.actor.role, "admin");
  assert.equal(entry.action, "user.suspend");
  assert.equal(entry.target, "user:42");
  assert.equal(entry.reason, "Repeated policy violations");
  assert.ok(!Number.isNaN(Date.parse(entry.timestamp)));
});

test("TC-Sec-05: a content removal is logged", () => {
  resetAuditLog();
  recordAuditEvent({
    actor: admin,
    action: "content.remove",
    target: "material:7",
    reason: "Plagiarised content",
  });

  const log = getAuditLog({ action: "content.remove" });
  assert.equal(log.length, 1);
  assert.equal(log[0].target, "material:7");
});

test("an event without an actor, action, target or reason is rejected", () => {
  resetAuditLog();
  const ok = { actor: admin, action: "user.suspend", target: "user:1", reason: "x" };

  assert.throws(() => recordAuditEvent({ ...ok, actor: undefined }), TypeError);
  assert.throws(() => recordAuditEvent({ ...ok, actor: {} }), TypeError);
  assert.throws(() => recordAuditEvent({ ...ok, action: "" }), TypeError);
  assert.throws(() => recordAuditEvent({ ...ok, target: undefined }), TypeError);
  assert.throws(() => recordAuditEvent({ ...ok, reason: "   " }), TypeError);
  assert.equal(getAuditLog().length, 0);
});

test("entries are numbered in order and filterable", () => {
  resetAuditLog();
  suspension();
  recordAuditEvent({
    actor: { id: "admin-2", role: "admin" },
    action: "user.reactivate",
    target: "user:42",
    reason: "Appeal accepted",
  });

  const all = getAuditLog();
  assert.deepEqual(all.map((e) => e.seq), [1, 2]);
  assert.equal(getAuditLog({ actorId: "admin-2" }).length, 1);
  assert.equal(getAuditLog({ target: "user:42" }).length, 2);
});

test("the stored log cannot be changed through returned copies", () => {
  resetAuditLog();
  suspension();

  const copy = getAuditLog()[0];
  copy.reason = "changed";

  assert.equal(getAuditLog()[0].reason, "Repeated policy violations");
  assert.deepEqual(verifyChain(), { valid: true, count: 1 });
});

test("verifyChain detects an edited or deleted entry", () => {
  resetAuditLog();
  suspension();
  suspension();
  suspension();
  const log = getAuditLog();

  assert.equal(verifyChain(log).valid, true);

  const edited = structuredClone(log);
  edited[1].reason = "something else";
  assert.deepEqual(verifyChain(edited), { valid: false, brokenAtSeq: 2 });

  const deleted = [log[0], log[2]];
  assert.equal(verifyChain(deleted).valid, false);
});

test("GET /api/admin/audit-log: admin sees entries, others are blocked", async () => {
  resetAuditLog();
  suspension();

  const asAdmin = await request(app)
    .get("/api/admin/audit-log")
    .set("x-test-user", JSON.stringify(admin));
  const asStudent = await request(app)
    .get("/api/admin/audit-log")
    .set("x-test-user", JSON.stringify(student));
  const anonymous = await request(app).get("/api/admin/audit-log");

  assert.equal(asAdmin.status, 200);
  assert.equal(asAdmin.body.count, 1);
  assert.equal(asAdmin.body.entries[0].action, "user.suspend");
  assert.equal(asStudent.status, 403);
  assert.equal(anonymous.status, 401);
});

test("GET /api/admin/audit-log can filter by action", async () => {
  resetAuditLog();
  suspension();
  recordAuditEvent({
    actor: admin,
    action: "content.remove",
    target: "material:7",
    reason: "Plagiarised",
  });

  const res = await request(app)
    .get("/api/admin/audit-log?action=content.remove")
    .set("x-test-user", JSON.stringify(admin));

  assert.equal(res.body.count, 1);
  assert.equal(res.body.entries[0].target, "material:7");
});

test("GET /api/admin/audit-log/verify reports an intact log; admin only", async () => {
  resetAuditLog();
  suspension();

  const ok = await request(app)
    .get("/api/admin/audit-log/verify")
    .set("x-test-user", JSON.stringify(admin));
  const blocked = await request(app)
    .get("/api/admin/audit-log/verify")
    .set("x-test-user", JSON.stringify(student));

  assert.equal(ok.status, 200);
  assert.equal(ok.body.valid, true);
  assert.equal(blocked.status, 403);
});
