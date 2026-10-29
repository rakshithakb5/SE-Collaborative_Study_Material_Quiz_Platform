const express = require("express");
const { requireRole } = require("../middleware/rbac");
const { recordActivity } = require("../services/auditLog");
const {
  quizzes,
  attempts,
  questionBank,
  registerQuiz,
  resetQuizStore,
} = require("../models/quizStore");

const router = express.Router();

function resetQuizAttemptData() {
  resetQuizStore();
}

function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// GET /api/quizzes - List quizzes
// Instructors/admins see all (drafts + published). Students see only published.
router.get("/", (req, res) => {
  const role = req.user ? req.user.role : "student";
  let quizList = Array.from(quizzes.values());

  if (role === "student") {
    quizList = quizList.filter((q) => q.published);
  }

  const sanitized = quizList.map((quiz) => {
    // If student, remove correct answers from question list preview
    if (role === "student" && Array.isArray(quiz.questions)) {
      return {
        ...quiz,
        questions: quiz.questions.map(({ correctAnswer, ...rest }) => rest),
      };
    }
    return quiz;
  });

  return res.status(200).json({ quizzes: sanitized });
});

// POST /api/quizzes - Create quiz from question bank / new questions (CSQ-F-020 & CSQ-F-021)
router.post("/", requireRole("instructor", "admin"), (req, res) => {
  const {
    id: customId,
    title,
    description,
    subject,
    status = "draft",
    settings = {},
    questions = [],
  } = req.body;

  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "Quiz title is required" });
  }

  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: "Questions must be an array" });
  }

  // Validate questions (MCQ, True/False, Short-Answer)
  const normalizedQuestions = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qId = q.id || `q-${i + 1}`;
    const qPrompt = q.prompt || q.question;
    const qType = q.type;

    if (!qPrompt || typeof qPrompt !== "string") {
      return res.status(400).json({
        error: `Question ${i + 1} is missing a prompt/question text`,
      });
    }

    if (!["mcq", "true_false", "short_answer"].includes(qType)) {
      return res.status(400).json({
        error: `Question ${i + 1} has invalid type '${qType}'. Allowed: 'mcq', 'true_false', 'short_answer'`,
      });
    }

    if (qType === "mcq") {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({
          error: `MCQ Question ${i + 1} requires at least 2 options`,
        });
      }
      if (q.correctAnswer === undefined || q.correctAnswer === null) {
        return res.status(400).json({
          error: `MCQ Question ${i + 1} requires a correctAnswer`,
        });
      }
    }

    if (qType === "true_false") {
      if (typeof q.correctAnswer !== "boolean") {
        return res.status(400).json({
          error: `True/False Question ${i + 1} requires boolean correctAnswer`,
        });
      }
    }

    if (qType === "short_answer") {
      if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
        return res.status(400).json({
          error: `Short Answer Question ${i + 1} requires string correctAnswer`,
        });
      }
    }

    normalizedQuestions.push({
      id: qId,
      type: qType,
      prompt: qPrompt,
      options: q.options || (qType === "true_false" ? [true, false] : undefined),
      correctAnswer: q.correctAnswer,
      points: q.points !== undefined ? Number(q.points) : 1,
      fromBankId: q.fromBankId || undefined,
      difficulty: q.difficulty || "medium",
    });
  }

  // Settings enforcement parameters (CSQ-F-021)
  const timeLimitSeconds =
    typeof settings.timeLimitSeconds === "number"
      ? settings.timeLimitSeconds
      : 1800;

  const maxAttempts =
    typeof settings.maxAttempts === "number" ? settings.maxAttempts : 1;

  const shuffle = Boolean(settings.shuffle);
  const difficulty = settings.difficulty || "medium";

  const targetGroups = Array.isArray(req.body.targetGroups)
    ? req.body.targetGroups
    : [];
  const availabilityWindow =
    req.body.availabilityWindow && typeof req.body.availabilityWindow === "object"
      ? {
          start: req.body.availabilityWindow.start
            ? new Date(req.body.availabilityWindow.start).toISOString()
            : null,
          end: req.body.availabilityWindow.end
            ? new Date(req.body.availabilityWindow.end).toISOString()
            : null,
        }
      : null;

  const quizId = customId || `quiz-${Date.now()}`;
  const isPublished = status === "published";

  const newQuiz = {
    id: quizId,
    title,
    description: description || "",
    subject: subject || "General",
    status, // "draft" | "published"
    published: isPublished,
    timeLimitSeconds,
    maxAttempts,
    shuffle,
    difficulty,
    targetGroups,
    availabilityWindow,
    settings: {
      timeLimitSeconds,
      maxAttempts,
      shuffle,
      difficulty,
    },
    questions: normalizedQuestions,
    createdBy: req.user.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  quizzes.set(quizId, newQuiz);

  return res.status(201).json({ quiz: newQuiz });
});

// GET /api/quizzes/:quizId - Retrieve a quiz (draft or published)
router.get("/:quizId", (req, res) => {
  const { quizId } = req.params;
  const quiz = quizzes.get(quizId);

  if (!quiz) {
    return res.status(404).json({ error: "Quiz not found" });
  }

  const role = req.user ? req.user.role : "student";

  // Drafts are only accessible to instructors and admins (AC-CSQ-F-020)
  if (!quiz.published && role !== "instructor" && role !== "admin") {
    return res.status(404).json({ error: "Published quiz not found" });
  }

  // Sanitize for students
  if (role === "student" && Array.isArray(quiz.questions)) {
    const sanitizedQuestions = quiz.questions.map(
      ({ correctAnswer, ...rest }) => rest
    );
    return res.status(200).json({
      quiz: {
        ...quiz,
        questions: sanitizedQuestions,
      },
    });
  }

  return res.status(200).json({ quiz });
});

// PUT /api/quizzes/:quizId - Update quiz draft or settings
router.put("/:quizId", requireRole("instructor", "admin"), (req, res) => {
  const { quizId } = req.params;
  const existing = quizzes.get(quizId);

  if (!existing) {
    return res.status(404).json({ error: "Quiz not found" });
  }

  const {
    title,
    description,
    subject,
    status,
    settings = {},
    questions,
  } = req.body;

  if (title) existing.title = title;
  if (description !== undefined) existing.description = description;
  if (subject) existing.subject = subject;

  if (status) {
    existing.status = status;
    existing.published = status === "published";
  }

  if (settings.timeLimitSeconds !== undefined) {
    existing.timeLimitSeconds = settings.timeLimitSeconds;
    existing.settings.timeLimitSeconds = settings.timeLimitSeconds;
  }
  if (settings.maxAttempts !== undefined) {
    existing.maxAttempts = settings.maxAttempts;
    existing.settings.maxAttempts = settings.maxAttempts;
  }
  if (settings.shuffle !== undefined) {
    existing.shuffle = Boolean(settings.shuffle);
    existing.settings.shuffle = Boolean(settings.shuffle);
  }
  if (settings.difficulty !== undefined) {
    existing.difficulty = settings.difficulty;
    existing.settings.difficulty = settings.difficulty;
  }

  if (Array.isArray(questions)) {
    existing.questions = questions;
  }

  if (Array.isArray(req.body.targetGroups)) {
    existing.targetGroups = req.body.targetGroups;
  }

  if (req.body.availabilityWindow !== undefined) {
    existing.availabilityWindow =
      req.body.availabilityWindow && typeof req.body.availabilityWindow === "object"
        ? {
            start: req.body.availabilityWindow.start
              ? new Date(req.body.availabilityWindow.start).toISOString()
              : null,
            end: req.body.availabilityWindow.end
              ? new Date(req.body.availabilityWindow.end).toISOString()
              : null,
          }
        : null;
  }

  existing.updatedAt = Date.now();
  quizzes.set(quizId, existing);

  return res.status(200).json({ quiz: existing });
});

// POST /api/quizzes/:quizId/publish - Publish quiz to specific groups with availability window (CSQ-F-022)
router.post("/:quizId/publish", requireRole("instructor", "admin"), (req, res) => {
  const { quizId } = req.params;
  const quiz = quizzes.get(quizId);

  if (!quiz) {
    return res.status(404).json({ error: "Quiz not found" });
  }

  const { targetGroups, availabilityWindow } = req.body;

  if (Array.isArray(targetGroups)) {
    quiz.targetGroups = targetGroups;
  }

  if (availabilityWindow !== undefined) {
    quiz.availabilityWindow =
      availabilityWindow && typeof availabilityWindow === "object"
        ? {
            start: availabilityWindow.start
              ? new Date(availabilityWindow.start).toISOString()
              : null,
            end: availabilityWindow.end
              ? new Date(availabilityWindow.end).toISOString()
              : null,
          }
        : null;
  }

  quiz.status = "published";
  quiz.published = true;
  quiz.updatedAt = Date.now();
  quizzes.set(quizId, quiz);

  return res.status(200).json({ quiz });
});

// Start a quiz attempt (CSQ-F-021: enforces settings during attempt)
router.post("/:quizId/attempts", requireRole("student"), (req, res) => {
  const { quizId } = req.params;
  const userId = req.user.id;

  if (!userId) {
    return res.status(400).json({ error: "Authenticated user ID is required" });
  }
  const quiz = quizzes.get(quizId);

  if (!quiz || !quiz.published) {
    return res.status(404).json({ error: "Published quiz not found" });
  }

  const key = `${quizId}:${userId}`;
  const userAttempts = attempts.get(key) || [];

  // Enforce max attempts setting (CSQ-F-021)
  if (userAttempts.length >= quiz.maxAttempts) {
    return res.status(403).json({
      error: "Maximum number of attempts reached",
    });
  }

  const startedAt = Date.now();

  // Enforce question shuffle setting (CSQ-F-021)
  let attemptQuestions = quiz.questions || [];
  if (quiz.shuffle && Array.isArray(attemptQuestions) && attemptQuestions.length > 0) {
    attemptQuestions = shuffleArray(attemptQuestions);
  }

  // Strip correct answers from attempt questions returned to student
  const sanitizedQuestions = attemptQuestions.map(
    ({ correctAnswer, ...rest }) => rest
  );

  const attempt = {
    id: `${quizId}-${userId}-${userAttempts.length + 1}`,
    quizId,
    userId,
    startedAt,
    expiresAt: startedAt + quiz.timeLimitSeconds * 1000,
    status: "in_progress",
    questions: sanitizedQuestions,
  };

  userAttempts.push(attempt);
  attempts.set(key, userAttempts);
  recordActivity(req.user, "quiz.attempt.start", `quiz:${quizId}`, "Quiz attempt started");

  return res.status(201).json({ attempt });
});

// Submit a quiz attempt
router.post(
  "/:quizId/attempts/:attemptId/submit",
  requireRole("student"),
  (req, res) => {
    const { quizId, attemptId } = req.params;
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: "Authenticated user ID is required" });
    }

    const quiz = quizzes.get(quizId);

    if (!quiz || !quiz.published) {
      return res.status(404).json({ error: "Published quiz not found" });
    }

    const key = `${quizId}:${userId}`;
    const userAttempts = attempts.get(key) || [];
    const attempt = userAttempts.find((item) => item.id === attemptId);

    if (!attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    if (attempt.status !== "in_progress") {
      return res.status(409).json({ error: "Attempt is already completed" });
    }

    // Enforce time limit setting (CSQ-F-021)
    if (Date.now() > attempt.expiresAt) {
      attempt.status = "expired";

      return res.status(409).json({
        error: "Time limit exceeded",
        status: attempt.status,
      });
    }

    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        error: "answers must be an array",
      });
    }

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return res.status(400).json({
        error: "Quiz has no questions configured for grading",
      });
    }

    const questionIds = new Set(quiz.questions.map((question) => question.id));

    if (
      answers.some(
        (answer) =>
          !answer ||
          typeof answer.questionId !== "string" ||
          !questionIds.has(answer.questionId)
      ) ||
      new Set(answers.map((answer) => answer.questionId)).size !== answers.length
    ) {
      return res.status(400).json({
        error: "Answers contain invalid or duplicate question IDs",
      });
    }

    const answerMap = new Map(
      answers.map((answer) => [answer.questionId, answer.answer])
    );

    if (quiz.questions.some((question) => !answerMap.has(question.id))) {
      return res.status(400).json({
        error: "An answer is required for every question",
      });
    }

    // Auto-grade MCQ, True/False, and Short-Answer questions (CSQ-F-020)
    const results = quiz.questions.map((question) => {
      const submittedAnswer = answerMap.get(question.id);

      let isCorrect = false;
      if (question.type === "mcq" || question.type === "true_false") {
        isCorrect = submittedAnswer === question.correctAnswer;
      } else if (question.type === "short_answer") {
        isCorrect =
          typeof submittedAnswer === "string" &&
          typeof question.correctAnswer === "string" &&
          submittedAnswer.trim().toLowerCase() ===
            question.correctAnswer.trim().toLowerCase();
      }

      const explanation =
        question.explanation ||
        (isCorrect
          ? "Correct answer submitted."
          : `Expected: ${question.correctAnswer}.`);

      return {
        questionId: question.id,
        isCorrect,
        pointsAwarded: isCorrect ? question.points ?? 1 : 0,
        maxPoints: question.points ?? 1,
        correctAnswer: question.correctAnswer,
        explanation,
      };
    });

    const score = results.reduce(
      (total, result) => total + result.pointsAwarded,
      0
    );
    const maxScore = results.reduce(
      (total, result) => total + result.maxPoints,
      0
    );

    attempt.status = "submitted";
    attempt.submittedAt = Date.now();
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.results = results;
    recordActivity(req.user, "quiz.attempt.submit", `quiz:${attempt.quizId}`, "Quiz attempt submitted");

    return res.status(200).json({ attempt });
  }
);

router.get(
  "/:quizId/leaderboard",
  requireRole("student", "instructor", "admin"),
  (req, res) => {
    const { quizId } = req.params;
    const quiz = quizzes.get(quizId);

    if (!quiz || !quiz.published) {
      return res.status(404).json({
        error: "Published quiz not found",
      });
    }

    const bestAttempts = new Map();

    for (const [key, userAttempts] of attempts.entries()) {
      if (!key.startsWith(`${quizId}:`)) {
        continue;
      }

      for (const attempt of userAttempts) {
        if (
          attempt.status !== "submitted" ||
          typeof attempt.score !== "number"
        ) {
          continue;
        }

        const existing = bestAttempts.get(attempt.userId);

        if (!existing || attempt.score > existing.score) {
          bestAttempts.set(attempt.userId, attempt);
        }
      }
    }

    const leaderboard = [...bestAttempts.values()]
      .sort((a, b) => b.score - a.score || a.submittedAt - b.submittedAt)
      .map((attempt, index) => ({
        rank: index + 1,
        userId: attempt.userId,
        score: attempt.score,
        maxScore: attempt.maxScore,
        submittedAt: attempt.submittedAt,
      }));

    return res.status(200).json({
      quizId,
      leaderboard,
    });
  }
);

function getActiveAttemptCount(quizId) {
  let count = 0;

  for (const [key, userAttempts] of attempts.entries()) {
    if (!key.startsWith(`${quizId}:`)) continue;

    for (const attempt of userAttempts) {
      if (
        attempt.status === "in_progress" &&
        Date.now() <= attempt.expiresAt
      ) {
        count++;
      }
    }
  }

  return count;
}

module.exports = {
  router,
  registerQuiz,
  resetQuizAttemptData,
  getActiveAttemptCount,
};
