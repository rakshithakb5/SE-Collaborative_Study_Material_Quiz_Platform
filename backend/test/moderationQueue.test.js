const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { createUser, resetUsers } = require("../src/models/userStore");
const { createMaterial, resetMaterialData } = require("../src/routes/materials");
const { registerQuiz, resetQuizAttemptData } = require("../src/routes/quizAttempts");
const { getAuditLog, resetAuditLog } = require("../src/services/auditLog");
const { resetOutbox } = require("../src/services/notifier");
const { hashPassword } = require("../src/utils/password");

// TC-Admin-02: CSQ-F-061 Admin Moderation Queue Verification

const admin = { id: "admin-1", role: "admin", email: "admin@example.com" };
const instructor = { id: "inst-1", role: "instructor", email: "prof@example.com" };
const student = { id: "stu-1", role: "student", email: "student@example.com" };
const as = (u) => ({ "x-test-user": JSON.stringify(u) });

async function setup() {
  resetUsers();
  resetAuditLog();
  resetOutbox();
  resetMaterialData();
  resetQuizAttemptData();

  const passwordHash = await hashPassword("Password123");
  createUser({ email: "student@example.com", passwordHash, role: "student" });

  createMaterial("mat-101", {
    title: "Operating Systems Notes",
    content: "Processes, threads, and memory management.",
  });

  registerQuiz("quiz-201", {
    id: "quiz-201",
    title: "CS201 Operating Systems Final",
    topic: "Operating Systems",
    creatorId: instructor.id,
    targetGroups: ["all"],
    status: "published",
    questions: [
      {
        id: "q1",
        type: "mcq",
        prompt: "What is virtual memory?",
        options: ["RAM", "Storage mapping", "CPU register", "Cache"],
        correctAnswer: "Storage mapping",
      },
    ],
  });
}

test("TC-Admin-02: Flagging material and quiz requires a valid reason", async () => {
  await setup();

  // Material flag without reason fails
  const matRes = await request(app)
    .post("/api/materials/mat-101/flag")
    .set(as(student))
    .send({});
  assert.equal(matRes.status, 400);

  // Quiz flag without reason fails
  const quizRes = await request(app)
    .post("/api/quizzes/quiz-201/flag")
    .set(as(student))
    .send({});
  assert.equal(quizRes.status, 400);
});

test("TC-Admin-02: User reports appear in unified moderation queue within 1 minute with correct metadata", async () => {
  await setup();
  const flagStartTime = Date.now();

  // Student flags material
  const flagMatRes = await request(app)
    .post("/api/materials/mat-101/flag")
    .set(as(student))
    .send({ reason: "Contains copyright infringement textbook excerpts" });
  assert.equal(flagMatRes.status, 200);

  // Student flags quiz
  const flagQuizRes = await request(app)
    .post("/api/quizzes/quiz-201/flag")
    .set(as(student))
    .send({ reason: "Misleading questions and incorrect answer keys" });
  assert.equal(flagQuizRes.status, 200);

  // Student is blocked from accessing the admin moderation queue
  const studentQueueRes = await request(app)
    .get("/api/admin/moderation-queue")
    .set(as(student));
  assert.equal(studentQueueRes.status, 403);

  // Admin retrieves the moderation queue
  const adminQueueRes = await request(app)
    .get("/api/admin/moderation-queue")
    .set(as(admin));
  assert.equal(adminQueueRes.status, 200);
  assert.ok(adminQueueRes.body.count >= 2);

  const matItem = adminQueueRes.body.queue.find((item) => item.id === "mat-101");
  assert.ok(matItem, "Flagged material must be in moderation queue");
  assert.equal(matItem.contentType, "material");
  assert.equal(matItem.source, "user-report");
  assert.ok(matItem.reason.includes("copyright infringement"));
  // Verify 1-minute SLA: Flag timestamp must be within 60 seconds of flag action
  assert.ok(matItem.timestamp >= flagStartTime);
  assert.ok(Date.now() - matItem.timestamp < 60000);

  const quizItem = adminQueueRes.body.queue.find((item) => item.id === "quiz-201");
  assert.ok(quizItem, "Flagged quiz must be in moderation queue");
  assert.equal(quizItem.contentType, "quiz");
  assert.equal(quizItem.source, "user-report");
  assert.ok(quizItem.reason.includes("Misleading questions"));
  assert.ok(Date.now() - quizItem.timestamp < 60000);
});

test("TC-Admin-02: Admin can dismiss user flags or remove violating content with audit trails", async () => {
  await setup();

  // Flag content
  await request(app)
    .post("/api/materials/mat-101/flag")
    .set(as(student))
    .send({ reason: "Unverified claims" });

  await request(app)
    .post("/api/quizzes/quiz-201/flag")
    .set(as(student))
    .send({ reason: "Wrong options" });

  // Dismissing requires reason and admin role
  const unauthDismiss = await request(app)
    .post("/api/admin/moderation-queue/materials/mat-101/dismiss")
    .set(as(student))
    .send({ reason: "False positive" });
  assert.equal(unauthDismiss.status, 403);

  const noReasonDismiss = await request(app)
    .post("/api/admin/moderation-queue/materials/mat-101/dismiss")
    .set(as(admin))
    .send({});
  assert.equal(noReasonDismiss.status, 400);

  // Admin dismisses material flag
  const dismissMatRes = await request(app)
    .post("/api/admin/moderation-queue/materials/mat-101/dismiss")
    .set(as(admin))
    .send({ reason: "Verified as valid educational content" });
  assert.equal(dismissMatRes.status, 200);

  // Admin removes violating quiz
  const removeQuizRes = await request(app)
    .post("/api/admin/quizzes/quiz-201/remove")
    .set(as(admin))
    .send({ reason: "Violates quiz guidelines" });
  assert.equal(removeQuizRes.status, 200);

  // Queue reflects dismissed and removed items
  const updatedQueue = await request(app)
    .get("/api/admin/moderation-queue")
    .set(as(admin));
  assert.equal(updatedQueue.status, 200);
  assert.ok(!updatedQueue.body.queue.some((i) => i.id === "mat-101"));
  assert.ok(!updatedQueue.body.queue.some((i) => i.id === "quiz-201"));

  // Check audit log contains all moderation actions
  const log = getAuditLog();
  const dismissAction = log.find((e) => e.action === "content.dismiss_flag");
  assert.ok(dismissAction, "content.dismiss_flag must be logged");
  assert.equal(dismissAction.target, "material:mat-101");

  const removeAction = log.find((e) => e.action === "content.remove" && e.target === "quiz:quiz-201");
  assert.ok(removeAction, "content.remove for quiz must be logged");
});
