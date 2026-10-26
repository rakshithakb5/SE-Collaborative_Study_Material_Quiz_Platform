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

  sampleQuestions.forEach((q) => questionBank.set(q.id, { ...q }));
}

seedQuestionBank();

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
  resetQuizStore,
  seedQuestionBank,
};
