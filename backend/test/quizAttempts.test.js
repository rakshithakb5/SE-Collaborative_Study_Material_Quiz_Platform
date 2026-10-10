const request = require("supertest");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const {
  registerQuiz,
  resetQuizAttemptData,
} = require("../src/routes/quizAttempts");

beforeEach(() => {
  resetQuizAttemptData();

  registerQuiz("quiz-1", {
    published: true,
    maxAttempts: 2,
    timeLimitSeconds: 600,
  });
});

test("starts an attempt for a published quiz", async () => {
  const response = await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .send({ userId: "student-1" });

  assert.equal(response.status, 201);
  assert.equal(response.body.attempt.status, "in_progress");
  assert.equal(response.body.attempt.quizId, "quiz-1");
});

test("rejects a request without userId", async () => {
  const response = await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .send({});

  assert.equal(response.status, 400);
});

test("rejects an unpublished quiz", async () => {
  registerQuiz("quiz-2", {
    published: false,
    maxAttempts: 2,
    timeLimitSeconds: 600,
  });

  const response = await request(app)
    .post("/api/quizzes/quiz-2/attempts")
    .send({ userId: "student-1" });

  assert.equal(response.status, 404);
});

test("rejects attempts after the configured limit", async () => {
  await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .send({ userId: "student-1" });

  await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .send({ userId: "student-1" });

  const response = await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .send({ userId: "student-1" });

  assert.equal(response.status, 403);
});
test("submits an active attempt successfully", async () => {
    const startResponse = await request(app)
      .post("/api/quizzes/quiz-1/attempts")
      .send({ userId: "student-1" });
  
    const attemptId = startResponse.body.attempt.id;
  
    const response = await request(app)
      .post(`/api/quizzes/quiz-1/attempts/${attemptId}/submit`)
      .send({ userId: "student-1" });
  
    assert.equal(response.status, 200);
    assert.equal(response.body.attempt.status, "submitted");
  });
  
  test("rejects submitting the same attempt twice", async () => {
    const startResponse = await request(app)
      .post("/api/quizzes/quiz-1/attempts")
      .send({ userId: "student-1" });
  
    const attemptId = startResponse.body.attempt.id;
    const url = `/api/quizzes/quiz-1/attempts/${attemptId}/submit`;
  
    await request(app).post(url).send({ userId: "student-1" });
  
    const response = await request(app)
      .post(url)
      .send({ userId: "student-1" });
  
    assert.equal(response.status, 409);
  });
  
 test("rejects submitting an attempt that has expired", async () => {
  // Set the time limit to zero BEFORE creating the attempt.
  registerQuiz("quiz-1", {
    published: true,
    maxAttempts: 2,
    timeLimitSeconds: 0,
  });

  const startResponse = await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .send({ userId: "student-1" });

  const attemptId = startResponse.body.attempt.id;

  await new Promise((resolve) => setTimeout(resolve, 10));

  const response = await request(app)
    .post(`/api/quizzes/quiz-1/attempts/${attemptId}/submit`)
    .send({ userId: "student-1" });

  assert.equal(response.status, 409);
  assert.equal(response.body.status, "expired");
});
