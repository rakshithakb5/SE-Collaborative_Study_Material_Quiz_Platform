const express = require("express");
const router = express.Router();

// Deliberately fictional, in-memory demo content. No database or real student data.
const materials = [
  { id: "mat-101", title: "Data Structures: Trees & Graphs", subject: "Computer Science", topic: "Data Structures", description: "Revision notes covering tree traversals, graph representations, BFS and DFS.", updatedAt: "2026-10-20", type: "Notes", readTime: "12 min" },
  { id: "mat-102", title: "SQL Joins and Subqueries", subject: "Database Systems", topic: "SQL", description: "Examples of inner, left, and right joins, grouping, and nested queries.", updatedAt: "2026-10-18", type: "Cheat sheet", readTime: "8 min" },
  { id: "mat-103", title: "Software Engineering Sprint Guide", subject: "Software Engineering", topic: "Agile & Scrum", description: "A concise guide to sprint planning, stand-ups, reviews, and retrospectives.", updatedAt: "2026-10-15", type: "Guide", readTime: "10 min" },
  { id: "mat-104", title: "Computer Networks Essentials", subject: "Computer Networks", topic: "Networking", description: "OSI and TCP/IP models, common protocols, and subnetting fundamentals.", updatedAt: "2026-10-12", type: "Notes", readTime: "15 min" },
  { id: "mat-105", title: "Operating Systems: Processes", subject: "Operating Systems", topic: "Processes", description: "Process states, scheduling algorithms, threads, and synchronization basics.", updatedAt: "2026-10-10", type: "Revision", readTime: "11 min" }
];
const quizzes = [
  { id: "quiz-101", title: "Software Engineering Fundamentals", subject: "Software Engineering", difficulty: "Easy", duration: 5, questions: [
    { id: "q1", prompt: "What does SDLC stand for?", options: ["Software Development Life Cycle", "System Design and Logic Control", "Structured Development Learning Course", "Standard Data Link Connection"], answer: 0, explanation: "SDLC means Software Development Life Cycle." },
    { id: "q2", prompt: "Agile promotes iterative and incremental development.", options: ["True", "False"], answer: 0, explanation: "Agile teams deliver work in short iterations and improve continuously." },
    { id: "q3", prompt: "Which meeting is used to reflect on a sprint and identify improvements?", options: ["Sprint review", "Retrospective", "Daily stand-up", "Backlog grooming"], answer: 1, explanation: "The retrospective focuses on how the team can improve its process." }
  ]},
  { id: "quiz-102", title: "Data Structures Quick Check", subject: "Data Structures", difficulty: "Medium", duration: 4, questions: [
    { id: "q1", prompt: "What is the worst-case time complexity of binary search on a sorted array?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 1, explanation: "Binary search halves the remaining search interval each step." },
    { id: "q2", prompt: "Which data structure follows LIFO?", options: ["Queue", "Stack", "Graph", "Heap"], answer: 1, explanation: "A stack uses last-in, first-out ordering." },
    { id: "q3", prompt: "BFS typically uses which data structure?", options: ["Stack", "Queue", "Hash only", "Recursion only"], answer: 1, explanation: "A queue processes vertices in discovery order." }
  ]},
  { id: "quiz-103", title: "Database Basics", subject: "Database Systems", difficulty: "Easy", duration: 4, questions: [
    { id: "q1", prompt: "Which SQL clause filters groups after aggregation?", options: ["WHERE", "ORDER BY", "HAVING", "FROM"], answer: 2, explanation: "HAVING filters grouped results after aggregation." },
    { id: "q2", prompt: "A primary key uniquely identifies each row.", options: ["True", "False"], answer: 0, explanation: "A primary key is unique and cannot be null." },
    { id: "q3", prompt: "Which join returns only matching rows from both tables?", options: ["LEFT JOIN", "FULL JOIN", "INNER JOIN", "CROSS JOIN"], answer: 2, explanation: "INNER JOIN returns rows with matching join conditions." }
  ]}
];
router.get("/dashboard", (_req, res) => res.json({
  stats: [{ label: "Study resources", value: materials.length, note: "Ready to explore" }, { label: "Practice quizzes", value: quizzes.length, note: "Across 3 subjects" }, { label: "Questions", value: quizzes.reduce((n,q)=>n+q.questions.length,0), note: "Quick knowledge checks" }, { label: "Study streak", value: "4 days", note: "Keep it going" }],
  recentActivity: [{ title: "Reviewed Data Structures", detail: "Trees and graph traversal", when: "Today" }, { title: "Practised SQL queries", detail: "Joins and subqueries", when: "Yesterday" }, { title: "Read Sprint Guide", detail: "Agile & Scrum", when: "2 days ago" }],
  checklist: [{ id: "task-1", title: "Review data structures", detail: "Trees and graph traversal", tag: "Study" }, { id: "task-2", title: "Practice SQL queries", detail: "Joins, grouping and subqueries", tag: "Practice" }, { id: "task-3", title: "Review sprint concepts", detail: "Agile ceremonies and roles", tag: "Review" }]
}));
router.get("/materials", (_req, res) => res.json({ materials }));
router.get("/quizzes", (_req, res) => res.json({ quizzes: quizzes.map(({questions,...quiz})=>({...quiz, questionCount: questions.length})) }));
router.get("/quizzes/:id", (req, res) => {
  const quiz = quizzes.find(item => item.id === req.params.id);
  if (!quiz) return res.status(404).json({ error: "Demo quiz not found" });
  res.json({ quiz });
});
module.exports = router;
