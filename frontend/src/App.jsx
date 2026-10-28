import React, { useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Library from './pages/Library.jsx';
import QuizCreator from './pages/QuizCreator.jsx';
import QuizPlayer from './pages/QuizPlayer.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

const initialQuizzes = [
  {
    id: 'quiz-se-1',
    title: 'Software Engineering Fundamentals',
    description: 'Covers Agile methodology, SDLC phases, and requirements gathering.',
    subject: 'Software Engineering',
    status: 'published',
    published: true,
    timeLimitSeconds: 600,
    maxAttempts: 2,
    shuffle: true,
    difficulty: 'medium',
    settings: {
      timeLimitSeconds: 600,
      maxAttempts: 2,
      shuffle: true,
      difficulty: 'medium'
    },
    questions: [
      {
        id: 'q1',
        type: 'mcq',
        prompt: 'What does SDLC stand for?',
        options: [
          'Software Development Life Cycle',
          'System Design and Logic Control',
          'Structured Development Learning Course',
          'Standard Data Link Connection'
        ],
        correctAnswer: 'Software Development Life Cycle',
        points: 1
      },
      {
        id: 'q2',
        type: 'true_false',
        prompt: 'Agile promotes iterative and incremental development.',
        options: [true, false],
        correctAnswer: true,
        points: 1
      },
      {
        id: 'q3',
        type: 'short_answer',
        prompt: 'What is the acronym for Software Requirements Specification?',
        correctAnswer: 'SRS',
        points: 2
      }
    ]
  }
];

function App() {
  const [quizzes, setQuizzes] = useState(initialQuizzes);

  const handleQuizCreated = (newQuiz) => {
    setQuizzes((prev) => {
      const idx = prev.findIndex((q) => q.id === newQuiz.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newQuiz;
        return copy;
      }
      return [newQuiz, ...prev];
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>SE Collaborative Platform</h1>
      <hr />
      <Login />
      <hr />
      <AdminPanel />
      <hr />
      <Register />
      <hr />
      <Dashboard />
      <hr />
      <Library />
      <hr />
      <QuizCreator onQuizCreated={handleQuizCreated} existingQuizzes={quizzes} />
      <hr />
      <QuizPlayer availableQuizzes={quizzes} />
    </div>
  );
}

export default App;
