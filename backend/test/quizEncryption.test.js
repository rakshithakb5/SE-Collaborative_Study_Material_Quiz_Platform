const request = require("supertest");
const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const {
  resetQuizAttemptData,
  getRawStorage,
  decryptStoredQuiz,
} = require("../src/routes/quizAttempts");

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
// TC-Sec-03: Encrypt Quiz Questions & Answers at Rest
// Requirement: CSQ-SR-003
// Acceptance Criteria: CSQ-SR-003
// ==========================================

test("TC-Sec-03: Storage inspection confirms quiz questions and answers are encrypted at rest with AES-256", async () => {
  const secretAnswer = "ConfidentialAnswerKey42";
  const questionPrompt = "Classified exam question prompt?";

  const quizPayload = {
    title: "Encrypted Security Exam",
    status: "published",
    questions: [
      {
        id: "q-enc-1",
        type: "mcq",
        prompt: questionPrompt,
        options: ["Option 1", secretAnswer, "Option 3"],
        correctAnswer: secretAnswer,
        explanation: "Confidential explanation detail",
        points: 5,
      },
      {
        id: "q-enc-2",
        type: "true_false",
        prompt: "Is AES-256 an authenticated standard?",
        correctAnswer: true,
        points: 2,
      },
    ],
  };

  // 1. Create quiz via API
  const createRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send(quizPayload);

  assert.equal(createRes.status, 201);
  const quizId = createRes.body.quiz.id;

  // 2. Direct Storage Inspection (AC-CSQ-SR-003)
  const rawRecord = getRawStorage(quizId);
  assert.ok(rawRecord, "Raw storage entry must exist for quiz");
  assert.equal(rawRecord.encryptionAlgorithm, "aes-256-gcm");
  assert.ok(rawRecord.encryptedData, "Encrypted payload must be stored");
  assert.ok(rawRecord.encryptedData.ciphertext, "Ciphertext must exist in hex");
  assert.ok(rawRecord.encryptedData.iv, "Initialization vector must exist");
  assert.ok(rawRecord.encryptedData.authTag, "Authentication tag must exist");

  // Inspect raw storage serialization to ensure plaintext is NOT present
  const rawDump = JSON.stringify(rawRecord);
  assert.equal(
    rawDump.includes(secretAnswer),
    false,
    "Raw persistent storage inspection must NOT reveal plaintext answer key"
  );
  assert.equal(
    rawDump.includes(questionPrompt),
    false,
    "Raw persistent storage inspection must NOT reveal plaintext question prompt"
  );

  // 3. Confirm decryptStoredQuiz restores full questions accurately
  const decrypted = decryptStoredQuiz(quizId);
  assert.ok(decrypted.questions);
  assert.equal(decrypted.questions[0].correctAnswer, secretAnswer);
  assert.equal(decrypted.questions[0].prompt, questionPrompt);
});

test("TC-Sec-03: On-the-fly server decryption allows students to attempt and grade encrypted quizzes", async () => {
  const createRes = await request(app)
    .post("/api/quizzes")
    .set(asInstructor())
    .send({
      title: "Active Encrypted Quiz",
      status: "published",
      questions: [
        {
          id: "q1",
          type: "mcq",
          prompt: "What is 2 + 2?",
          options: ["3", "4", "5"],
          correctAnswer: "4",
          points: 1,
        },
      ],
    });

  const quizId = createRes.body.quiz.id;

  // Student starts attempt
  const attemptRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts`)
    .set(asStudent())
    .send({});
  assert.equal(attemptRes.status, 201);
  const attempt = attemptRes.body.attempt;
  assert.equal(attempt.questions[0].prompt, "What is 2 + 2?");
  assert.equal(attempt.questions[0].correctAnswer, undefined, "Answers hidden from attempt");

  // Student submits attempt
  const submitRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts/${attempt.id}/submit`)
    .set(asStudent())
    .send({
      answers: [{ questionId: "q1", answer: "4" }],
    });

  assert.equal(submitRes.status, 200);
  assert.equal(submitRes.body.attempt.score, 1);
  assert.equal(submitRes.body.attempt.results[0].isCorrect, true);
});
