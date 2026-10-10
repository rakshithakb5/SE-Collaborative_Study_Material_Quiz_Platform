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

module.exports = {
  router,
  registerQuiz,
  resetQuizAttemptData,
};
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
  
    attempt.status = "submitted";
    attempt.submittedAt = Date.now();
  
    return res.status(200).json({ attempt });
  });