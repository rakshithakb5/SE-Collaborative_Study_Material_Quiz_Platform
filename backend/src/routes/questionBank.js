const express = require("express");
const { requireRole } = require("../middleware/rbac");
const { questionBank } = require("../models/quizStore");

const router = express.Router();

// GET /api/question-bank - List questions in question bank with optional filtering
router.get("/", requireRole("instructor", "admin"), (req, res) => {
  const { topic, difficulty, type } = req.query;

  let questions = Array.from(questionBank.values());

  if (topic) {
    questions = questions.filter(
      (q) => q.topic && q.topic.toLowerCase() === topic.toLowerCase()
    );
  }

  if (difficulty) {
    questions = questions.filter(
      (q) => q.difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
  }

  if (type) {
    questions = questions.filter((q) => q.type === type);
  }

  res.status(200).json({ questions });
});

// GET /api/question-bank/:id - Get a single question by ID
router.get("/:id", requireRole("instructor", "admin"), (req, res) => {
  const question = questionBank.get(req.params.id);
  if (!question) {
    return res.status(404).json({ error: "Question not found in bank" });
  }
  res.status(200).json({ question });
});

// POST /api/question-bank - Add a question to question bank
router.post("/", requireRole("instructor", "admin"), (req, res) => {
  const { prompt, question: promptAlt, type, options, correctAnswer, difficulty, topic, points } = req.body;
  const questionText = prompt || promptAlt;

  if (!questionText || typeof questionText !== "string") {
    return res.status(400).json({ error: "Question prompt is required" });
  }

  if (!["mcq", "true_false", "short_answer"].includes(type)) {
    return res.status(400).json({
      error: "Invalid question type. Allowed types: 'mcq', 'true_false', 'short_answer'",
    });
  }

  if (type === "mcq") {
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: "MCQ questions require at least 2 options" });
    }
    if (correctAnswer === undefined || correctAnswer === null) {
      return res.status(400).json({ error: "MCQ questions require a correct answer" });
    }
  }

  if (type === "true_false") {
    if (typeof correctAnswer !== "boolean") {
      return res.status(400).json({ error: "True/False questions require a boolean correct answer" });
    }
  }

  if (type === "short_answer") {
    if (!correctAnswer || typeof correctAnswer !== "string") {
      return res.status(400).json({ error: "Short answer questions require a valid text correct answer" });
    }
  }

  const id = `qb-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newQuestion = {
    id,
    prompt: questionText,
    type,
    options: type === "mcq" ? options : type === "true_false" ? [true, false] : undefined,
    correctAnswer,
    difficulty: difficulty || "medium",
    topic: topic || "General",
    points: points ? Number(points) : 1,
    createdAt: Date.now(),
    createdBy: req.user ? req.user.id : "system",
  };

  questionBank.set(id, newQuestion);
  res.status(201).json({ question: newQuestion });
});

module.exports = router;
