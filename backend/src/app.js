
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const {
  router: quizAttemptsRouter,
  registerQuiz,
} = require("./routes/quizAttempts");
const {
  router: materialsRouter,
} = require("./routes/materials");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
if (process.env.NODE_ENV === "test") {
  app.use((req, res, next) => {
    const testUser = req.get("x-test-user");

    if (testUser) {
      try {
        req.user = JSON.parse(testUser);
      } catch {
        return res.status(400).json({
          error: "Invalid test user",
        });
      }
    }

    next();
  });
}

if (process.env.PERFORMANCE_TEST_MODE === "true") {
  registerQuiz("performance-quiz", {
    published: true,
    maxAttempts: 10,
    timeLimitSeconds: 1800,
    questions: [
      {
        id: "q1",
        type: "mcq",
        correctAnswer: "A",
        points: 1,
      },
      {
        id: "q2",
        type: "true_false",
        correctAnswer: true,
        points: 1,
      },
    ],
  });

  console.log("Performance-test quiz registered.");
}

app.use("/api/quizzes", quizAttemptsRouter);
app.use("/api/materials", materialsRouter);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Collaborative Study Material & Quiz Platform API is running",
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

module.exports = app;