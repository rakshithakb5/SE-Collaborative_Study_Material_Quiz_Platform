const request = require("supertest");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");


const app = require("../src/app");

function asStudent(userId) {
  return { "x-test-user": JSON.stringify({ id: userId, role: "student" }) };
}

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
      questions: [
        {
          id: "q1",
          type: "mcq",
          correctAnswer: "A",
          points: 1,
        },
        {
          id: "q2",
          type: "true_false",
          correctAnswer: true,
          points: 1,
        },
      ],
    });
  });
  

test("starts an attempt for a published quiz", async () => {
  const response = await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .set(asStudent("student-1")).send({});

  assert.equal(response.status, 201);
  assert.equal(response.body.attempt.status, "in_progress");
  assert.equal(response.body.attempt.quizId, "quiz-1");
});

test("uses the authenticated identity instead of body userId", async () => {
  const response = await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .set(asStudent("student-1"))
    .send({ userId: "different-user" });

  assert.equal(response.status, 201);
  assert.equal(response.body.attempt.userId, "student-1");
});

test("rejects an unpublished quiz", async () => {
  registerQuiz("quiz-2", {
    published: false,
    maxAttempts: 2,
    timeLimitSeconds: 600,
  });

  const response = await request(app)
    .post("/api/quizzes/quiz-2/attempts")
    .set(asStudent("student-1")).send({});

  assert.equal(response.status, 404);
});

test("rejects attempts after the configured limit", async () => {
  await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .set(asStudent("student-1")).send({});

  await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .set(asStudent("student-1")).send({});

  const response = await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .set(asStudent("student-1")).send({});

});

test("submits an active attempt successfully", async () => {
    const startResponse = await request(app)
      .post("/api/quizzes/quiz-1/attempts")
      .set(asStudent("student-1")).send({});
  
    const attemptId = startResponse.body.attempt.id;
  
    const response = await request(app)
      .post(`/api/quizzes/quiz-1/attempts/${attemptId}/submit`)
      .set(asStudent("student-1")).send({
        userId: "student-1",
        answers: [
          { questionId: "q1", answer: "A" },
          { questionId: "q2", answer: true },
        ],
      });
  
    assert.equal(response.status, 200);
    assert.equal(response.body.attempt.status, "submitted");
    assert.equal(response.body.attempt.score, 2);
    assert.equal(response.body.attempt.maxScore, 2);
  });
  

    
test("rejects submitting the same attempt twice", async () => {
    const startResponse = await request(app)
      .post("/api/quizzes/quiz-1/attempts")
      .set(asStudent("student-1")).send({});
    assert.equal(startResponse.status, 201, JSON.stringify(startResponse.body));
    const attemptId = startResponse.body.attempt.id;
    const url = `/api/quizzes/quiz-1/attempts/${attemptId}/submit`;
  
    const submission = {
      userId: "student-1",
      answers: [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: true },
      ],
    };
  
    await request(app).post(url).set(asStudent("student-1")).send(submission);
  
    const response = await request(app)
    .post(url)
    .set(asStudent("student-1"))
    .send(submission);
  
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
    .set(asStudent("student-1")).send({});

  const attemptId = startResponse.body.attempt.id;

  await new Promise((resolve) => setTimeout(resolve, 10));

  const response = await request(app)
    .post(`/api/quizzes/quiz-1/attempts/${attemptId}/submit`)
    .set(asStudent("student-1")).send({});

  assert.equal(response.status, 409);
  assert.equal(response.body.status, "expired");
});

test("awards zero points for incorrect answers", async () => {
    const startResponse = await request(app)
      .post("/api/quizzes/quiz-1/attempts")
      .set(asStudent("student-2")).send({});
  
    const attemptId = startResponse.body.attempt.id;
  
    const response = await request(app)
      .post(`/api/quizzes/quiz-1/attempts/${attemptId}/submit`)
      .set(asStudent("student-2")).send({
        userId: "student-2",
        answers: [
          { questionId: "q1", answer: "B" },
          { questionId: "q2", answer: false },
        ],
      });
  
    assert.equal(response.status, 200);
    assert.equal(response.body.attempt.score, 0);
    assert.equal(response.body.attempt.maxScore, 2);
  });
  
  test("rejects submissions with missing answers", async () => {
    const startResponse = await request(app)
      .post("/api/quizzes/quiz-1/attempts")
      .set(asStudent("student-3")).send({});
  
    const attemptId = startResponse.body.attempt.id;
  
    const response = await request(app)
      .post(`/api/quizzes/quiz-1/attempts/${attemptId}/submit`)
      .set(asStudent("student-3")).send({
        userId: "student-3",
        answers: [{ questionId: "q1", answer: "A" }],
      });
  
    assert.equal(response.status, 400);
  });
  
test("returns an empty leaderboard when no attempts are submitted", async () => {
    const response = await request(app)
      .get("/api/quizzes/quiz-1/leaderboard")
      .set(asStudent("student-viewer"));
  
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.leaderboard, []);
  });
  
  test("ranks submitted quiz attempts by score", async () => {
    async function submitQuiz(userId, answers) {
      const start = await request(app)
        .post("/api/quizzes/quiz-1/attempts")
        .set(asStudent(userId)).send({});
  
      assert.equal(start.status, 201);
  
      return request(app)
        .post(`/api/quizzes/quiz-1/attempts/${start.body.attempt.id}/submit`)
        .set(asStudent(userId)).send({ answers });
    }
  
    await submitQuiz("student-low", [
      { questionId: "q1", answer: "B" },
      { questionId: "q2", answer: false },
    ]);
  
    await submitQuiz("student-high", [
      { questionId: "q1", answer: "A" },
      { questionId: "q2", answer: true },
    ]);
  
    const response = await request(app)
      .get("/api/quizzes/quiz-1/leaderboard")
      .set(asStudent("student-viewer"));
  
    assert.equal(response.status, 200);
    assert.equal(response.body.leaderboard.length, 2);
    assert.equal(response.body.leaderboard[0].userId, "student-high");
    assert.equal(response.body.leaderboard[0].score, 2);
    assert.equal(response.body.leaderboard[0].rank, 1);
    assert.equal(response.body.leaderboard[1].userId, "student-low");
    assert.equal(response.body.leaderboard[1].score, 0);
    assert.equal(response.body.leaderboard[1].rank, 2);
  });

  test("breaks leaderboard ties by earlier submission time", async () => {
    async function submitQuiz(userId) {
      const start = await request(app)
        .post("/api/quizzes/quiz-1/attempts")
        .set(asStudent(userId)).send({});
  
      assert.equal(start.status, 201);
  
      const response = await request(app)
        .post(
          `/api/quizzes/quiz-1/attempts/${start.body.attempt.id}/submit`
        )
        .set(asStudent(userId)).send({
          userId,
          answers: [
            { questionId: "q1", answer: "A" },
            { questionId: "q2", answer: true },
          ],
        });
  
      assert.equal(response.status, 200);
    }
  
    await submitQuiz("student-earlier");
    await new Promise((resolve) => setTimeout(resolve, 20));
    await submitQuiz("student-later");
  
    const response = await request(app)
      .get("/api/quizzes/quiz-1/leaderboard")
      .set(asStudent("student-viewer"));
  
    assert.equal(response.status, 200);
    assert.equal(response.body.leaderboard.length, 2);
    assert.equal(response.body.leaderboard[0].userId, "student-earlier");
    assert.equal(response.body.leaderboard[1].userId, "student-later");
    assert.equal(response.body.leaderboard[0].score, 2);
    assert.equal(response.body.leaderboard[1].score, 2);
  });
  
 
test("rejects submitting another user's attempt", async () => {
  const startResponse = await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .set(asStudent("student-1")).send({});

  const attemptId = startResponse.body.attempt.id;

  const response = await request(app)
    .post(`/api/quizzes/quiz-1/attempts/${attemptId}/submit`)
    .set(asStudent("student-2"))
    .send({
      userId: "student-2",
      answers: [
        { questionId: "q1", answer: "A" },
        { questionId: "q2", answer: true },
      ],
    });

  assert.equal(response.status, 404);
});

test("rejects submissions with duplicate question IDs", async () => {
  const startResponse = await request(app)
    .post("/api/quizzes/quiz-1/attempts")
    .set(asStudent("student-1")).send({});

  const attemptId = startResponse.body.attempt.id;

  const response = await request(app)
    .post(`/api/quizzes/quiz-1/attempts/${attemptId}/submit`)
    .set(asStudent("student-1"))
    .send({
      userId: "student-1",
      answers: [
        { questionId: "q1", answer: "A" },
        { questionId: "q1", answer: "B" },
        { questionId: "q2", answer: true },
      ],
    });

  assert.equal(response.status, 400);
});
