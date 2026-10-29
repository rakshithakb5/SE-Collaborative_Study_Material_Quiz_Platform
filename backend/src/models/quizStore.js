const quizzes = new Map();
const attempts = new Map();
const questionBank = new Map();

// Seed standard question bank items across MCQ, True/False, and Short Answer
function seedQuestionBank() {
  questionBank.clear();
  const sampleQuestions = [
    {
      id: "qb-1",
      topic: "Software Engineering",
      difficulty: "easy",
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
      id: "qb-2",
      topic: "Software Engineering",
      difficulty: "easy",
      type: "true_false",
      prompt: "Agile methodology promotes iterative and incremental development.",
      options: [true, false],
      correctAnswer: true,
      points: 1,
    },
    {
      id: "qb-3",
      topic: "Software Engineering",
      difficulty: "medium",
      type: "short_answer",
      prompt: "What is the document specifying system functional and non-functional requirements known as?",
      correctAnswer: "SRS",
      points: 2,
    },
    {
      id: "qb-4",
      topic: "Data Structures",
      difficulty: "easy",
      type: "mcq",
      prompt: "What is the worst-case time complexity of binary search on a sorted array?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"],
      correctAnswer: "O(log n)",
      points: 1,
    },
    {
      id: "qb-5",
      topic: "Data Structures",
      difficulty: "medium",
      type: "true_false",
      prompt: "A stack operates on a First-In, First-Out (FIFO) principle.",
      options: [true, false],
      correctAnswer: false,
      points: 1,
    },
    {
      id: "qb-6",
      topic: "Data Structures",
      difficulty: "hard",
      type: "short_answer",
      prompt: "Which data structure uses keys computed via a hash function to map values?",
      correctAnswer: "Hash table",
      points: 2,
    },
  ];

  sampleQuestions.forEach((q) =>
    questionBank.set(q.id, {
      ...q,
      version: 1,
      history: [
        {
          version: 1,
          modifiedAt: Date.now(),
          prompt: q.prompt,
          options: q.options ? [...q.options] : undefined,
          correctAnswer: q.correctAnswer,
          points: q.points,
        },
      ],
    })
  );
}

seedQuestionBank();

function updateBankQuestion(id, updates, user) {
  const existing = questionBank.get(id);
  if (!existing) return null;

  const currentVersion = existing.version || 1;
  const history = Array.isArray(existing.history) ? [...existing.history] : [];

  history.push({
    version: currentVersion,
    modifiedAt: existing.updatedAt || existing.createdAt || Date.now(),
    modifiedBy: existing.updatedBy || existing.createdBy || "system",
    prompt: existing.prompt,
    options: existing.options ? [...existing.options] : undefined,
    correctAnswer: existing.correctAnswer,
    points: existing.points,
  });

  const updated = {
    ...existing,
    ...updates,
    id: existing.id,
    type: updates.type || existing.type,
    version: currentVersion + 1,
    history,
    updatedAt: Date.now(),
    updatedBy: user ? user.id : "system",
  };

  questionBank.set(id, updated);
  return updated;
}

function reuseBankQuestion(id, overrides = {}) {
  const original = questionBank.get(id);
  if (!original) return null;

  // Deep copy so changes never leak to original
  const copy = {
    id: overrides.id || `reused-${original.id}-${Date.now()}`,
    fromBankId: original.id,
    bankVersion: original.version || 1,
    type: overrides.type || original.type,
    prompt: overrides.prompt || original.prompt,
    options: overrides.options
      ? [...overrides.options]
      : original.options
      ? [...original.options]
      : undefined,
    correctAnswer:
      overrides.correctAnswer !== undefined
        ? overrides.correctAnswer
        : original.correctAnswer,
    points: overrides.points !== undefined ? Number(overrides.points) : original.points || 1,
    difficulty: overrides.difficulty || original.difficulty || "medium",
    topic: overrides.topic || original.topic || "General",
  };

  return copy;
}

function resetQuizStore() {
  quizzes.clear();
  attempts.clear();
  seedQuestionBank();
}

function registerQuiz(quizId, quiz) {
  quizzes.set(quizId, quiz);
}

function getQuiz(quizId) {
  return quizzes.get(quizId);
}

function deleteQuiz(quizId) {
  return quizzes.delete(quizId);
}

module.exports = {
  quizzes,
  attempts,
  questionBank,
  registerQuiz,
  getQuiz,
  deleteQuiz,
  updateBankQuestion,
  reuseBankQuestion,
  resetQuizStore,
  seedQuestionBank,
};
