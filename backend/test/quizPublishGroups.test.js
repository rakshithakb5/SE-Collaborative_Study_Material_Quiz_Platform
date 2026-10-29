const request = require("supertest");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { resetQuizAttemptData } = require("../src/routes/quizAttempts");

function asInstructor(userId = "instructor-1") {
  return { "x-test-user": JSON.stringify({ id: userId, role: "instructor" }) };
}

function asStudentInGroup(userId = "student-1", group = "Group A") {
  return { "x-test-user": JSON.stringify({ id: userId, role: "student", group }) };
}

beforeEach(() => {
  resetQuizAttemptData();
});

// ==========================================
// TC-QuizC-03: Publish Quiz to Groups & Window
// Requirement: CSQ-F-022
// Acceptance Criteria: AC-CSQ-F-022
// ==========================================

test("TC-QuizC-03: Instructor can publish quiz with target groups and availability window", async () => {
  // 1. Create a draft quiz
  const createRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Group 11 Timed Exam",
      status: "draft",
      questions: [
        {
          id: "q-1",
          type: "mcq",
          prompt: "What is CI/CD?",
          options: ["Continuous Integration", "Compute Instance", "Cloud Index", "Central Interface"],
          correctAnswer: "Continuous Integration",
        },
      ],
    });

  assert.equal(createRes.status, 201);
  const quizId = createRes.body.quiz.id;
  assert.equal(createRes.body.quiz.published, false);

  // 2. Publish to specific groups with window
  const now = Date.now();
  const publishRes = await request(app)
    .post(`/api/quizzes/${quizId}/publish`)
    .set(asInstructor())
    .send({
      targetGroups: ["Group 11", "Group A"],
      availabilityWindow: {
        start: new Date(now - 10000).toISOString(),
        end: new Date(now + 3600000).toISOString(),
      },
    });

  assert.equal(publishRes.status, 200);
  assert.equal(publishRes.body.quiz.published, true);
  assert.deepEqual(publishRes.body.quiz.targetGroups, ["Group 11", "Group A"]);
  assert.ok(publishRes.body.quiz.availabilityWindow.start);
});

test("TC-QuizC-03: AC-CSQ-F-022 - Student in assigned group within window can view and attempt quiz", async () => {
  const now = Date.now();
  const createRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "CS Sprint Quiz",
      status: "published",
      targetGroups: ["Group 11"],
      availabilityWindow: {
        start: new Date(now - 60000).toISOString(),
        end: new Date(now + 60000).toISOString(),
      },
      questions: [
        { id: "q1", type: "true_false", prompt: "Agile is iterative", correctAnswer: true },
      ],
    });

  const quizId = createRes.body.quiz.id;

  // Student in Group 11 sees quiz in list
  const listRes = await request(app)
    .get("/api/quizzes")
    .set(asStudentInGroup("student-g11", "Group 11"));
  assert.equal(listRes.status, 200);
  assert.ok(listRes.body.quizzes.some((q) => q.id === quizId));

  // Student in Group 11 can start attempt
  const attemptRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts`)
    .set(asStudentInGroup("student-g11", "Group 11"))
    .send({});
  assert.equal(attemptRes.status, 201);
  assert.equal(attemptRes.body.attempt.status, "in_progress");
});

test("TC-QuizC-03: AC-CSQ-F-022 - Student outside designated group cannot view or attempt quiz", async () => {
  const now = Date.now();
  const createRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Restricted Quiz",
      status: "published",
      targetGroups: ["Group 11"],
      availabilityWindow: {
        start: new Date(now - 60000).toISOString(),
        end: new Date(now + 60000).toISOString(),
      },
      questions: [
        { id: "q1", type: "true_false", prompt: "Test TF", correctAnswer: true },
      ],
    });

  const quizId = createRes.body.quiz.id;

  // Student in Group B does NOT see quiz in list
  const listRes = await request(app)
    .get("/api/quizzes")
    .set(asStudentInGroup("student-gb", "Group B"));
  assert.equal(listRes.status, 200);
  assert.ok(!listRes.body.quizzes.some((q) => q.id === quizId));

  // Direct attempt by student in Group B is rejected with 403
  const attemptRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts`)
    .set(asStudentInGroup("student-gb", "Group B"))
    .send({});
  assert.equal(attemptRes.status, 403);
  assert.ok(attemptRes.body.error.includes("restricted"));
});

test("TC-QuizC-03: AC-CSQ-F-022 - Attempt is rejected before window start and after window end", async () => {
  const now = Date.now();

  // 1. Future Quiz (Window hasn't started yet)
  const futureQuizRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Upcoming Midterm",
      status: "published",
      availabilityWindow: {
        start: new Date(now + 3600000).toISOString(), // starts in 1 hour
        end: new Date(now + 7200000).toISOString(),
      },
      questions: [{ id: "q1", type: "true_false", prompt: "Future question", correctAnswer: true }],
    });
  const futureQuizId = futureQuizRes.body.quiz.id;

  const futureAttempt = await request(app)
    .post(`/api/quizzes/${futureQuizId}/attempts`)
    .set(asStudentInGroup("student-1"))
    .send({});
  assert.equal(futureAttempt.status, 403);
  assert.ok(futureAttempt.body.error.includes("not started"));

  // 2. Past Quiz (Window closed)
  const pastQuizRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Expired Quiz",
      status: "published",
      availabilityWindow: {
        start: new Date(now - 7200000).toISOString(),
        end: new Date(now - 3600000).toISOString(), // ended 1 hour ago
      },
      questions: [{ id: "q1", type: "true_false", prompt: "Expired question", correctAnswer: true }],
    });
  const pastQuizId = pastQuizRes.body.quiz.id;

  const pastAttempt = await request(app)
    .post(`/api/quizzes/${pastQuizId}/attempts`)
    .set(asStudentInGroup("student-1"))
    .send({});
  assert.equal(pastAttempt.status, 403);
  assert.ok(pastAttempt.body.error.includes("closed"));
});
