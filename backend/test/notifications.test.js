const request = require("supertest");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { resetQuizAttemptData } = require("../src/routes/quizAttempts");
const {
  resetOutbox,
  getNotificationsForUser,
} = require("../src/services/notifier");

function asInstructor(userId = "instructor-1", email = "instructor@test.edu") {
  return { "x-test-user": JSON.stringify({ id: userId, role: "instructor", email }) };
}

function asStudent(userId = "student-1", email = "student1@test.edu") {
  return { "x-test-user": JSON.stringify({ id: userId, role: "student", email }) };
}

beforeEach(() => {
  resetQuizAttemptData();
  resetOutbox();
});

// ==========================================
// TC-Notif-01: Multi-event Notifications Delivery
// Requirement: CSQ-F-052
// Acceptance Criteria: AC-CSQ-F-052
// ==========================================

test("TC-Notif-01: AC-CSQ-F-052 - New study material upload triggers notification delivered within 1 minute", async () => {
  const triggerTime = Date.now();

  const res = await request(app)
    .post("/api/materials")
    .set(asInstructor())
    .send({
      title: "Operating Systems Virtual Memory",
      content: "Paging and segmentation mechanisms in contemporary OS.",
    });

  assert.equal(res.status, 201);

  // Retrieve user notifications
  const notifRes = await request(app)
    .get("/api/notifications")
    .set(asStudent());

  assert.equal(notifRes.status, 200);
  const materialNotifs = notifRes.body.notifications.filter(
    (n) => n.type === "new_material"
  );
  assert.ok(materialNotifs.length >= 1, "Should deliver new material notification");

  const notif = materialNotifs[0];
  assert.ok(notif.title.includes("Operating Systems Virtual Memory"));

  // Verify delivery latency <= 1 minute (60,000 ms)
  const deliveryLatency = notif.deliveredAt - triggerTime;
  assert.ok(
    deliveryLatency <= 60000,
    `Delivery latency ${deliveryLatency}ms must be within 1 minute (AC-CSQ-F-052)`
  );
});

test("TC-Notif-01: AC-CSQ-F-052 - Quiz deadline (24 hours prior) triggers notification delivered within 1 minute", async () => {
  const now = Date.now();
  const triggerTime = now;

  // Create a quiz with availability window closing in 20 hours (< 24h)
  const quizRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Sprint 2 Assessment Quiz",
      status: "published",
      availabilityWindow: {
        start: new Date(now - 3600000).toISOString(),
        end: new Date(now + 20 * 3600000).toISOString(), // 20 hours remaining
      },
      questions: [
        { id: "q1", type: "true_false", prompt: "Notification deadline test", correctAnswer: true },
      ],
    });

  assert.equal(quizRes.status, 201);

  // Trigger deadline check
  const checkRes = await request(app)
    .post("/api/notifications/deadline-check")
    .set(asInstructor())
    .send({});

  assert.equal(checkRes.status, 200);
  assert.ok(checkRes.body.count >= 1);

  const notif = checkRes.body.notifications[0];
  assert.equal(notif.type, "quiz_deadline");
  assert.ok(notif.title.includes("Sprint 2 Assessment Quiz"));
  assert.equal(notif.hoursRemaining, 20);

  // Verify delivery latency <= 1 minute
  const latency = notif.deliveredAt - triggerTime;
  assert.ok(
    latency <= 60000,
    `Deadline notification delivery latency ${latency}ms must be <= 1 min`
  );
});

test("TC-Notif-01: AC-CSQ-F-052 - Quiz submission triggers grade published notification delivered within 1 minute", async () => {
  const triggerTime = Date.now();

  // Create and publish quiz
  const quizRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Scored Evaluation Quiz",
      status: "published",
      questions: [
        { id: "q1", type: "true_false", prompt: "Scored prompt", correctAnswer: true, points: 5 },
      ],
    });

  const quizId = quizRes.body.quiz.id;

  // Student starts attempt
  const attemptRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts`)
    .set(asStudent("student-99", "student99@test.edu"))
    .send({});
  assert.equal(attemptRes.status, 201);

  // Student submits attempt
  const submitRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts/${attemptRes.body.attempt.id}/submit`)
    .set(asStudent("student-99", "student99@test.edu"))
    .send({
      answers: [{ questionId: "q1", answer: true }],
    });
  assert.equal(submitRes.status, 200);

  // Check student's inbox
  const notifRes = await request(app)
    .get("/api/notifications")
    .set(asStudent("student-99", "student99@test.edu"));

  assert.equal(notifRes.status, 200);
  const gradeNotifs = notifRes.body.notifications.filter(
    (n) => n.type === "grade_published"
  );
  assert.ok(gradeNotifs.length >= 1, "Should deliver grade published notification");

  const notif = gradeNotifs[0];
  assert.equal(notif.score, 5);
  assert.equal(notif.maxScore, 5);
  assert.ok(notif.title.includes("Scored Evaluation Quiz"));

  const latency = notif.deliveredAt - triggerTime;
  assert.ok(
    latency <= 60000,
    `Grade notification latency ${latency}ms must be within 1 minute (AC-CSQ-F-052)`
  );
});

test("TC-Notif-01: User can mark notification as read", async () => {
  // Generate notification via material upload
  await request(app)
    .post("/api/materials")
    .set(asInstructor())
    .send({
      title: "Read Status Material",
      content: "Content to trigger notification.",
    });

  const inbox = await request(app)
    .get("/api/notifications")
    .set(asStudent());
  const notifId = inbox.body.notifications[0].id;

  const patchRes = await request(app)
    .patch(`/api/notifications/${notifId}/read`)
    .set(asStudent())
    .send({});

  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.notification.read, true);
});
