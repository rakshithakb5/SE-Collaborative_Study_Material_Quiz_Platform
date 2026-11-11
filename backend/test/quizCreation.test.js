const request = require("supertest");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { resetQuizAttemptData } = require("../src/routes/quizAttempts");

function asInstructor(userId = "instructor-1") {
  return { "x-test-user": JSON.stringify({ id: userId, role: "instructor" }) };
}

function asStudent(userId = "student-1") {
  return { "x-test-user": JSON.stringify({ id: userId, role: "student" }) };
}

function asAdmin(userId = "admin-1") {
  return { "x-test-user": JSON.stringify({ id: userId, role: "admin" }) };
}

beforeEach(() => {
  resetQuizAttemptData();
});

// ==========================================
// TC-QuizC-01: Create Quiz & Question Bank
// Requirement: CSQ-F-020
// Acceptance Criteria: AC-CSQ-F-020
// ==========================================

test("TC-QuizC-01: Question bank lists questions across MCQ, True/False, and Short Answer", async () => {
  const res = await request(app)
    .get("/api/question-bank")
    .set(asInstructor());

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.questions));
  assert.ok(res.body.questions.length >= 3);

  const types = new Set(res.body.questions.map((q) => q.type));
  assert.ok(types.has("mcq"), "Question bank should include MCQ");
  assert.ok(types.has("true_false"), "Question bank should include True/False");
  assert.ok(types.has("short_answer"), "Question bank should include Short Answer");
});

test("TC-QuizC-01: Instructor can add a new question to the shared question bank", async () => {
  const newQuestion = {
    prompt: "What is Polymorphism?",
    type: "short_answer",
    correctAnswer: "Ability of an entity to take multiple forms",
    difficulty: "medium",
    topic: "OOP",
    points: 2,
  };

  const res = await request(app)
    .post("/api/question-bank")
    .set(asInstructor())
    .send(newQuestion);

  assert.equal(res.status, 201);
  assert.equal(res.body.question.prompt, newQuestion.prompt);
  assert.equal(res.body.question.type, "short_answer");
  assert.ok(res.body.question.id);
});

test("TC-QuizC-01: AC-CSQ-F-020 - Quiz is saved as a draft with all added MCQ, True/False, and Short-Answer questions retrievable", async () => {
  const quizPayload = {
    title: "Software Engineering Quiz 1",
    description: "Covers SDLC, Agile principles, and Requirements",
    subject: "Software Engineering",
    status: "draft",
    settings: {
      timeLimitSeconds: 900,
      maxAttempts: 2,
      shuffle: true,
      difficulty: "medium",
    },
    questions: [
      {
        id: "q-mcq-1",
        fromBankId: "qb-1",
        type: "mcq",
        prompt: "What does SDLC stand for?",
        options: [
          "Software Development Life Cycle",
          "System Design and Logic Control",
          "Structured Development Learning Course",
          "Standard Data Link Connection",
        ],
        correctAnswer: "Software Development Life Cycle",
        points: 1,
      },
      {
        id: "q-tf-1",
        fromBankId: "qb-2",
        type: "true_false",
        prompt: "Agile methodology promotes iterative and incremental development.",
        correctAnswer: true,
        points: 1,
      },
      {
        id: "q-sa-1",
        fromBankId: "qb-3",
        type: "short_answer",
        prompt: "What is the document specifying system functional and non-functional requirements known as?",
        correctAnswer: "SRS",
        points: 2,
      },
    ],
  };

  // 1. Create quiz draft
  const createRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send(quizPayload);

  assert.equal(createRes.status, 201);
  const createdQuiz = createRes.body.quiz;
  assert.ok(createdQuiz.id);
  assert.equal(createdQuiz.status, "draft");
  assert.equal(createdQuiz.published, false);
  assert.equal(createdQuiz.questions.length, 3);

  // 2. Retrieve the draft quiz and verify all questions are intact
  const getRes = await request(app)
    .get(`/api/quizzes/${createdQuiz.id}`)
    .set(asInstructor());

  assert.equal(getRes.status, 200);
  const retrievedQuiz = getRes.body.quiz;
  assert.equal(retrievedQuiz.id, createdQuiz.id);
  assert.equal(retrievedQuiz.status, "draft");
  assert.equal(retrievedQuiz.questions.length, 3);

  // Verify all 3 question types are retrievable
  const qMcq = retrievedQuiz.questions.find((q) => q.type === "mcq");
  const qTf = retrievedQuiz.questions.find((q) => q.type === "true_false");
  const qSa = retrievedQuiz.questions.find((q) => q.type === "short_answer");

  assert.ok(qMcq, "MCQ question retrievable");
  assert.equal(qMcq.options.length, 4);
  assert.equal(qMcq.correctAnswer, "Software Development Life Cycle");

  assert.ok(qTf, "True/False question retrievable");
  assert.equal(qTf.correctAnswer, true);

  assert.ok(qSa, "Short-answer question retrievable");
  assert.equal(qSa.correctAnswer, "SRS");
});

test("TC-QuizC-01: Student cannot create a quiz or access unpublished draft quiz", async () => {
  // Student cannot create quiz
  const createRes = await request(app)
    .post("/api/quizzes")
    .set(asStudent())
    .send({
      title: "Student Quiz",
      questions: [],
    });
  assert.equal(createRes.status, 403);

  // Instructor creates draft
  const draftRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Secret Exam Draft",
      status: "draft",
      questions: [
        {
          id: "q-1",
          type: "true_false",
          prompt: "Draft prompt",
          correctAnswer: true,
        },
      ],
    });
  const quizId = draftRes.body.quiz.id;

  // Student receives 404 for draft
  const getRes = await request(app)
    .get(`/api/quizzes/${quizId}`)
    .set(asStudent());
  assert.equal(getRes.status, 404);
});

// ==========================================
// TC-QuizC-02: Quiz Settings Enforcement
// Requirement: CSQ-F-021
// Acceptance Criteria: AC-CSQ-F-021
// ==========================================

test("TC-QuizC-02: AC-CSQ-F-021 - Quiz settings (time limit, attempts, difficulty, shuffle) are properly configured and enforced", async () => {
  // 1. Instructor creates published quiz with explicit settings
  const quizPayload = {
    title: "Enforced Settings Quiz",
    status: "published",
    settings: {
      timeLimitSeconds: 1, // 1 second limit for testing timeout enforcement
      maxAttempts: 2, // strictly 2 attempts
      shuffle: true,
      difficulty: "hard",
    },
    questions: [
      {
        id: "q-1",
        type: "mcq",
        prompt: "First question?",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        points: 2,
      },
      {
        id: "q-2",
        type: "true_false",
        prompt: "Second question?",
        correctAnswer: true,
        points: 1,
      },
      {
        id: "q-3",
        type: "short_answer",
        prompt: "Third question?",
        correctAnswer: "SE",
        points: 3,
      },
    ],
  };

  const createRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send(quizPayload);

  assert.equal(createRes.status, 201);
  const quiz = createRes.body.quiz;
  assert.equal(quiz.timeLimitSeconds, 1);
  assert.equal(quiz.maxAttempts, 2);
  assert.equal(quiz.shuffle, true);
  assert.equal(quiz.difficulty, "hard");

  const quizId = quiz.id;

  // 2. Student starts Attempt 1
  const attempt1Res = await request(app)
    .post(`/api/quizzes/${quizId}/attempts`)
    .set(asStudent("student-42"))
    .send({});
  assert.equal(attempt1Res.status, 201);
  const attempt1 = attempt1Res.body.attempt;
  assert.equal(attempt1.status, "in_progress");
  assert.ok(attempt1.questions.length === 3);
  // Ensure student questions do not leak correctAnswer
  assert.equal(attempt1.questions[0].correctAnswer, undefined);

  // Submit attempt 1 with correct answers including short-answer
  const submit1Res = await request(app)
    .post(`/api/quizzes/${quizId}/attempts/${attempt1.id}/submit`)
    .set(asStudent("student-42"))
    .send({
      answers: [
        { questionId: "q-1", answer: "A" },
        { questionId: "q-2", answer: true },
        { questionId: "q-3", answer: "SE" }, // short answer case-insensitive match
      ],
    });
  assert.equal(submit1Res.status, 200);
  assert.equal(submit1Res.body.attempt.score, 6);
  assert.equal(submit1Res.body.attempt.maxScore, 6);

  // 3. Student starts Attempt 2 (within limit of 2)
  const attempt2Res = await request(app)
    .post(`/api/quizzes/${quizId}/attempts`)
    .set(asStudent("student-42"))
    .send({});
  assert.equal(attempt2Res.status, 201);

  // 4. Student attempts to start Attempt 3 -> Rejected due to maxAttempts setting (403)
  const attempt3Res = await request(app)
    .post(`/api/quizzes/${quizId}/attempts`)
    .set(asStudent("student-42"))
    .send({});
  assert.equal(attempt3Res.status, 403);
  assert.equal(attempt3Res.body.error, "Maximum number of attempts reached");

  // 5. Test time limit enforcement on attempt 2: wait 1.1s so it expires
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const submitExpiredRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts/${attempt2Res.body.attempt.id}/submit`)
    .set(asStudent("student-42"))
    .send({
      answers: [
        { questionId: "q-1", answer: "A" },
        { questionId: "q-2", answer: true },
        { questionId: "q-3", answer: "SE" },
      ],
    });
  assert.equal(submitExpiredRes.status, 409);
  assert.equal(submitExpiredRes.body.error, "Time limit exceeded");
  assert.equal(submitExpiredRes.body.status, "expired");
});

test("TC-QuizC-02: Instructor can update quiz settings and publish a draft", async () => {
  // Create draft with default settings
  const createRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Draft to Publish",
      status: "draft",
      questions: [
        { id: "q1", type: "true_false", prompt: "Test TF", correctAnswer: true },
      ],
    });
  const quizId = createRes.body.quiz.id;
  assert.equal(createRes.body.quiz.published, false);

  // Update settings and publish
  const updateRes = await request(app)
    .put(`/api/quizzes/${quizId}`)
    .set(asInstructor())
    .send({
      status: "published",
      settings: {
        timeLimitSeconds: 1200,
        maxAttempts: 3,
        shuffle: true,
        difficulty: "easy",
      },
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.quiz.published, true);
  assert.equal(updateRes.body.quiz.maxAttempts, 3);
  assert.equal(updateRes.body.quiz.timeLimitSeconds, 1200);
  assert.equal(updateRes.body.quiz.difficulty, "easy");
});
