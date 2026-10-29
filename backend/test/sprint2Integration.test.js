const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");
const { getRawStorage } = require("../src/routes/quizAttempts");
const { getOutbox, resetOutbox } = require("../src/services/notifier");
const { resetAuditLog } = require("../src/services/auditLog");
const { resetMaterialData } = require("../src/routes/materials");
const { resetQuizAttemptData } = require("../src/routes/quizAttempts");

// End-to-end Sprint 2 Comprehensive Workflow Integration Test
// Covers CSQ-F-022, CSQ-F-023, CSQ-F-052, CSQ-F-061, CSQ-SR-003, Defect #62

const instructor = { id: "inst-sprint2", role: "instructor", email: "prof@sprint2.edu" };
const studentInGroup = { id: "stu-group-b", role: "student", group: "Section B", email: "alice@sprint2.edu" };
const studentOutsideGroup = { id: "stu-group-c", role: "student", group: "Section C", email: "bob@sprint2.edu" };
const admin = { id: "admin-sprint2", role: "admin", email: "admin@sprint2.edu" };

const as = (u) => ({ "x-test-user": JSON.stringify(u) });

test("Sprint 2 Full Workflow Integration: Bank Reuse -> Encryption -> Group Window -> Graded Reveal -> Moderation", async () => {
  resetOutbox();
  resetAuditLog();
  resetMaterialData();
  resetQuizAttemptData();

  // Step 1: Instructor reuses a question from the question bank (CSQ-F-023)
  const reuseRes = await request(app)
    .post("/api/question-bank/qb-1/reuse")
    .set(as(instructor));
  assert.equal(reuseRes.status, 200);
  assert.equal(reuseRes.body.question.fromBankId, "qb-1");
  const reusedQuestion = reuseRes.body.question;

  // Step 2: Instructor creates a draft quiz with the reused question and customized options
  const now = Date.now();
  const windowStart = new Date(now - 60000).toISOString(); // started 1 min ago
  const windowEnd = new Date(now + 20 * 3600000).toISOString(); // ends in 20 hours (< 24h for deadline check)

  const createQuizRes = await request(app)
    .post("/api/quizzes")
    .set(as(instructor))
    .send({
      title: "Sprint 2 Comprehensive Assessment",
      topic: "Software Architecture",
      status: "draft",
      targetGroups: ["Section B"],
      timeLimitMinutes: 30,
      availabilityWindow: {
        start: windowStart,
        end: windowEnd,
        startTime: windowStart,
        endTime: windowEnd,
      },
      questions: [
        {
          ...reusedQuestion,
          prompt: "Customized: What is the time complexity of searching an element in a balanced BST?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
          correctAnswer: "O(log n)",
          explanation: "Balanced BST halves the search space each step.",
        },
      ],
    });
  assert.equal(createQuizRes.status, 201);
  const quizId = createQuizRes.body.quiz.id;

  // Step 3: Publish quiz and verify notification trigger (CSQ-F-022 & CSQ-F-052)
  const publishRes = await request(app)
    .post(`/api/quizzes/${quizId}/publish`)
    .set(as(instructor))
    .send({
      targetGroups: ["Section B"],
      availabilityWindow: { start: windowStart, end: windowEnd, startTime: windowStart, endTime: windowEnd },
    });
  assert.equal(publishRes.status, 200);
  assert.equal(publishRes.body.quiz.status, "published");

  // Trigger deadline notification check (< 24 hours remaining)
  const deadlineCheckRes = await request(app)
    .post("/api/notifications/deadline-check")
    .set(as(instructor))
    .send({});
  assert.equal(deadlineCheckRes.status, 200);
  assert.ok(deadlineCheckRes.body.notifications.some((n) => n.quizId === quizId && n.type === "quiz_deadline"));

  // Step 4: Verify AES-256-GCM encryption at rest in storage (CSQ-SR-003)
  const rawRecord = getRawStorage(quizId);
  assert.ok(rawRecord, "Encrypted record must exist in raw storage");
  assert.equal(rawRecord.encryptionAlgorithm, "aes-256-gcm");
  assert.ok(rawRecord.encryptedData, "Encrypted payload must be stored");
  assert.equal(rawRecord.questions, undefined, "Plaintext questions must NOT be in raw storage");

  // Step 5: Authorization check: Student outside target group is blocked (CSQ-F-022)
  const blockedAttemptRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts`)
    .set(as(studentOutsideGroup));
  assert.equal(blockedAttemptRes.status, 403);

  // Step 6: Authorized student starts attempt with server-side on-the-fly decryption
  const startAttemptRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts`)
    .set(as(studentInGroup));
  assert.equal(startAttemptRes.status, 201);
  const attemptId = startAttemptRes.body.attempt.id;
  const questionId = startAttemptRes.body.attempt.questions[0].id;
  // Answers should not be exposed while taking the quiz
  assert.equal(startAttemptRes.body.attempt.questions[0].correctAnswer, undefined);

  // Step 7: Student submits attempt and receives correct answers & explanations (Defect #62 / CSQ-F-032)
  const submitRes = await request(app)
    .post(`/api/quizzes/${quizId}/attempts/${attemptId}/submit`)
    .set(as(studentInGroup))
    .send({
      answers: [
        {
          questionId,
          answer: "O(log n)",
        },
      ],
    });
  assert.equal(submitRes.status, 200);
  const gradedAttempt = submitRes.body.attempt;
  assert.ok(gradedAttempt.score >= 1);
  assert.ok(Array.isArray(gradedAttempt.results));
  assert.equal(gradedAttempt.results[0].correctAnswer, "O(log n)");
  assert.equal(gradedAttempt.results[0].explanation, "Balanced BST halves the search space each step.");

  // Verify grade notification was generated
  const updatedOutbox = getOutbox();
  assert.ok(updatedOutbox.some((n) => n.to === studentInGroup.email && n.type === "grade_published"));

  // Step 8: User flags quiz for admin moderation (CSQ-F-061)
  const flagRes = await request(app)
    .post(`/api/quizzes/${quizId}/flag`)
    .set(as(studentInGroup))
    .send({ reason: "Question prompt could be more explicit regarding self-balancing." });
  assert.equal(flagRes.status, 200);

  // Step 9: Admin views moderation queue and dismisses user flag (CSQ-F-061)
  const queueRes = await request(app)
    .get("/api/admin/moderation-queue")
    .set(as(admin));
  assert.equal(queueRes.status, 200);
  const flaggedQuiz = queueRes.body.queue.find((item) => item.id === quizId);
  assert.ok(flaggedQuiz, "Flagged quiz must appear in moderation queue");
  assert.equal(flaggedQuiz.contentType, "quiz");

  const dismissRes = await request(app)
    .post(`/api/admin/moderation-queue/quizzes/${quizId}/dismiss`)
    .set(as(admin))
    .send({ reason: "Prompt is sufficiently clear for architecture level." });
  assert.equal(dismissRes.status, 200);
  assert.equal(dismissRes.body.dismissed, true);
});
