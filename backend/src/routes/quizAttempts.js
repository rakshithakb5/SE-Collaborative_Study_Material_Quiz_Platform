
const express = require("express");

const router = express.Router();

const quizzes = new Map();
const attempts = new Map();

function resetQuizAttemptData() {
  quizzes.clear();
  attempts.clear();
}

function registerQuiz(quizId, quiz) {
  quizzes.set(quizId, quiz);
}

// Start a quiz attempt
router.post("/:quizId/attempts", (req, res) => {
  const { quizId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const quiz = quizzes.get(quizId);

  if (!quiz || !quiz.published) {
    return res.status(404).json({ error: "Published quiz not found" });
  }

  const key = `${quizId}:${userId}`;
  const userAttempts = attempts.get(key) || [];

  if (userAttempts.length >= quiz.maxAttempts) {
    return res.status(403).json({
      error: "Maximum number of attempts reached",
    });
  }

  const startedAt = Date.now();

  const attempt = {
    id: `${quizId}-${userId}-${userAttempts.length + 1}`,
    quizId,
    userId,
    startedAt,
    expiresAt: startedAt + quiz.timeLimitSeconds * 1000,
    status: "in_progress",
  };

  userAttempts.push(attempt);
  attempts.set(key, userAttempts);

  return res.status(201).json({ attempt });
});

// Submit a quiz attempt
router.post("/:quizId/attempts/:attemptId/submit", (req, res) => {
  const { quizId, attemptId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
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

const results = quiz.questions.map((question) => {
  const submittedAnswer = answerMap.get(question.id);

  const isCorrect =
    question.type === "mcq" || question.type === "true_false"
      ? submittedAnswer === question.correctAnswer
      : false;

  return {
    questionId: question.id,
    isCorrect,
    pointsAwarded: isCorrect ? (question.points ?? 1) : 0,
    maxPoints: question.points ?? 1,
  };
});

const score = results.reduce((total, result) => total + result.pointsAwarded, 0);
const maxScore = results.reduce((total, result) => total + result.maxPoints, 0);

attempt.status = "submitted";
attempt.submittedAt = Date.now();
attempt.score = score;
attempt.maxScore = maxScore;
attempt.results = results;

return res.status(200).json({ attempt });

});

router.get("/:quizId/leaderboard", (req, res) => {
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
  });
  

module.exports = {
    router,
    registerQuiz,
    resetQuizAttemptData,
  };