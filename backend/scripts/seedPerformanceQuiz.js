
const {
  registerQuiz,
} = require("../src/routes/quizAttempts");

if (process.env.PERFORMANCE_TEST_MODE !== "true") {
  throw new Error(
    "Set PERFORMANCE_TEST_MODE=true to seed the performance-test quiz."
  );
}

registerQuiz("performance-quiz", {
  published: true,
  maxAttempts: 10,
  timeLimitSeconds: 1800,
});

console.log("Performance-test quiz registered.");
