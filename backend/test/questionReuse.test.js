const request = require("supertest");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { resetQuizAttemptData } = require("../src/routes/quizAttempts");
const { questionBank } = require("../src/models/quizStore");

function asInstructor(userId = "instructor-1") {
  return { "x-test-user": JSON.stringify({ id: userId, role: "instructor" }) };
}

function asStudent(userId = "student-1") {
  return { "x-test-user": JSON.stringify({ id: userId, role: "student" }) };
}

beforeEach(() => {
  resetQuizAttemptData();
});

// ==========================================
// TC-QuizC-04: Reuse and Edit Questions from Bank
// Requirement: CSQ-F-023
// Acceptance Criteria: AC-CSQ-F-023
// ==========================================

test("TC-QuizC-04: Reuse endpoint returns cloned bank question with version reference", async () => {
  const bankQ = questionBank.get("qb-1");
  assert.ok(bankQ, "Seed question qb-1 exists");

  const reuseRes = await request(app)
    .post("/api/question-bank/qb-1/reuse")
    .set(asInstructor())
    .send({
      prompt: "Customized Prompt for Midterm: What does SDLC stand for?",
      points: 5,
    });

  assert.equal(reuseRes.status, 200);
  const reused = reuseRes.body.question;
  assert.equal(reused.fromBankId, "qb-1");
  assert.equal(reused.bankVersion, 1);
  assert.equal(reused.prompt, "Customized Prompt for Midterm: What does SDLC stand for?");
  assert.equal(reused.points, 5);

  // Original bank question remains completely unchanged
  const original = questionBank.get("qb-1");
  assert.equal(original.prompt, "What does SDLC stand for?");
  assert.equal(original.points, 1);
});

test("TC-QuizC-04: AC-CSQ-F-023 - Quiz question edits apply only to new quiz copy and preserve original bank history", async () => {
  const originalBankQ = questionBank.get("qb-1");
  const originalPrompt = originalBankQ.prompt;
  const originalOptions = [...originalBankQ.options];
  const originalAnswer = originalBankQ.correctAnswer;

  // 1. Create a quiz reusing and customizing qb-1
  const createQuizRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Quiz with Reused Question",
      status: "draft",
      questions: [
        {
          id: "custom-copy-1",
          fromBankId: "qb-1",
          type: "mcq",
          prompt: "Modified Question Text for Quiz Only",
          options: ["Option Alpha", "Option Beta", "Option Gamma"],
          correctAnswer: "Option Alpha",
          points: 10,
        },
      ],
    });

  assert.equal(createQuizRes.status, 201);
  const quiz = createQuizRes.body.quiz;
  assert.equal(quiz.questions[0].prompt, "Modified Question Text for Quiz Only");
  assert.equal(quiz.questions[0].fromBankId, "qb-1");
  assert.equal(quiz.questions[0].bankVersion, 1);

  // 2. Further update the quiz draft
  const updateQuizRes = await request(app)
    .put(`/api/quizzes/${quiz.id}`)
    .set(asInstructor())
    .send({
      questions: [
        {
          id: "custom-copy-1",
          fromBankId: "qb-1",
          type: "mcq",
          prompt: "Second Modification inside Quiz",
          options: ["Opt 1", "Opt 2"],
          correctAnswer: "Opt 1",
          points: 15,
        },
      ],
    });

  assert.equal(updateQuizRes.status, 200);

  // 3. Verify original question in question bank is 100% UNTOUCHED
  const bankAfter = questionBank.get("qb-1");
  assert.equal(bankAfter.prompt, originalPrompt, "Original bank prompt must not be mutated");
  assert.deepEqual(bankAfter.options, originalOptions, "Original bank options must not be mutated");
  assert.equal(bankAfter.correctAnswer, originalAnswer, "Original bank answer must not be mutated");
  assert.equal(bankAfter.points, 1);
  assert.equal(bankAfter.version, 1);
});

test("TC-QuizC-04: Bank questions retain full revision history when updated directly in question bank", async () => {
  // Update bank question qb-2 directly
  const updateRes = await request(app)
    .put("/api/question-bank/qb-2")
    .set(asInstructor())
    .send({
      prompt: "Agile promotes iterative, test-driven and incremental delivery (Revised).",
      points: 2,
    });

  assert.equal(updateRes.status, 200);
  const updated = updateRes.body.question;
  assert.equal(updated.version, 2, "Bank question version increments to 2");
  assert.equal(updated.history.length, 2, "History contains version 1 record");
  assert.equal(updated.history[0].version, 1);
  assert.equal(updated.history[0].prompt, "Agile methodology promotes iterative and incremental development.");
  assert.equal(updated.prompt, "Agile promotes iterative, test-driven and incremental delivery (Revised).");
});

test("TC-QuizC-04: Student is rejected from reusing or updating question bank", async () => {
  const reuseRes = await request(app)
    .post("/api/question-bank/qb-1/reuse")
    .set(asStudent())
    .send({});
  assert.equal(reuseRes.status, 403);

  const updateRes = await request(app)
    .put("/api/question-bank/qb-1")
    .set(asStudent())
    .send({ prompt: "Hacked" });
  assert.equal(updateRes.status, 403);
});
