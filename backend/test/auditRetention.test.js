const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const {
  RETENTION_DAYS,
  recordAuditEvent,
  getAuditLog,
  archiveExpired,
  getArchiveSize,
  verifyChain,
  resetAuditLog,
} = require("../src/services/auditLog");
const { runRetention } = require("../src/services/retentionJob");
const { resetMaterialData } = require("../src/routes/materials");
const { registerQuiz, resetQuizAttemptData } = require("../src/routes/quizAttempts");

// TC-OPS-01 (CSQ-NF-004): activity is logged with timestamps, kept for 2
// years, then archived automatically; archived entries can still be retrieved
// and the whole chain still verifies.

const DAY = 24 * 60 * 60 * 1000;
const admin = { id: "a-1", role: "admin", email: "a@example.com" };
const instructor = { id: "i-1", role: "instructor" };
const student = { id: "s-1", role: "student" };
const as = (u) => ({ "x-test-user": JSON.stringify(u) });

function add(n) {
  for (let i = 0; i < n; i++) {
    recordAuditEvent({ actor: admin, action: "user.warn", target: `user:${i}`, reason: "test" });
  }
}

test("retention period is 2 years", () => {
  assert.equal(RETENTION_DAYS, 730);
});

test("nothing is archived before 2 years", () => {
  resetAuditLog();
  add(3);
  assert.equal(archiveExpired(Date.now() + 729 * DAY), 0);
  assert.equal(getAuditLog().length, 3);
});

test("entries older than 2 years are archived, not deleted", () => {
  resetAuditLog();
  add(3);
  const moved = archiveExpired(Date.now() + 731 * DAY);
  assert.equal(moved, 3);
  assert.equal(getAuditLog().length, 0);
  assert.equal(getArchiveSize(), 3);
  assert.equal(getAuditLog({ includeArchived: true }).length, 3);
});

test("the hash chain stays valid across archive and new entries", () => {
  resetAuditLog();
  add(2);
  archiveExpired(Date.now() + 731 * DAY);
  add(2); // new entries after archival
  assert.deepEqual(verifyChain(), { valid: true, count: 4 });
  const seqs = getAuditLog({ includeArchived: true }).map((e) => e.seq);
  assert.deepEqual(seqs, [1, 2, 3, 4]);
});

test("tampering with an archived entry is detected", () => {
  resetAuditLog();
  add(3);
  archiveExpired(Date.now() + 731 * DAY);
  const copy = getAuditLog({ includeArchived: true });
  copy[1].reason = "edited";
  assert.equal(verifyChain(copy).valid, false);
});

test("the retention job archives and records that it did", () => {
  resetAuditLog();
  add(2);
  assert.equal(runRetention(Date.now() + 731 * DAY), 2);
  const events = getAuditLog({ action: "audit.archive" });
  assert.equal(events.length, 1);
  assert.equal(events[0].actor.id, "system");
  assert.equal(verifyChain().valid, true);
  assert.equal(runRetention(), 0); // nothing else is old enough
});

test("admin can run archival and search archived entries over the API", async () => {
  resetAuditLog();
  add(1);
  assert.equal((await request(app).post("/api/admin/audit-log/archive").set(as(student))).status, 403);
  const res = await request(app).post("/api/admin/audit-log/archive").set(as(admin));
  assert.equal(res.status, 200);
  assert.equal(res.body.archived, 0); // too recent

  archiveExpired(Date.now() + 731 * DAY);
  const active = await request(app).get("/api/admin/audit-log").set(as(admin));
  assert.equal(active.body.count, 0);
  const all = await request(app).get("/api/admin/audit-log?includeArchived=true").set(as(admin));
  assert.equal(all.body.count, 1);
});

test("uploads and quiz attempts are logged as user activity", async () => {
  resetAuditLog();
  resetMaterialData();
  const up = await request(app)
    .post("/api/materials")
    .set(as(instructor))
    .send({ title: "Notes", content: "some original study notes about sorting algorithms and their costs" });
  assert.equal(up.status, 201);

  const log = getAuditLog({ action: "material.upload" });
  assert.equal(log.length, 1);
  assert.equal(log[0].actor.id, "i-1");
  assert.equal(log[0].target, `material:${up.body.materialId}`);
  assert.ok(!Number.isNaN(Date.parse(log[0].timestamp)));
});

test("quiz attempt start and submit are logged without answers", async () => {
  resetAuditLog();
  resetQuizAttemptData();
  registerQuiz("quiz-log", {
    published: true,
    maxAttempts: 2,
    timeLimitSeconds: 600,
    questions: [{ id: "q1", type: "mcq", correctAnswer: "A", points: 1 }],
  });

  const start = await request(app).post("/api/quizzes/quiz-log/attempts").set(as(student)).send({});
  assert.equal(start.status, 201);
  const submit = await request(app)
    .post(`/api/quizzes/quiz-log/attempts/${start.body.attempt.id}/submit`)
    .set(as(student))
    .send({ answers: [{ questionId: "q1", answer: "A" }] });
  assert.equal(submit.status, 200);

  const log = getAuditLog({ actorId: "s-1" });
  assert.deepEqual(log.map((e) => e.action), ["quiz.attempt.start", "quiz.attempt.submit"]);
  assert.equal(log[0].target, "quiz:quiz-log");
  assert.ok(!JSON.stringify(log).includes('"answer"'));
});
