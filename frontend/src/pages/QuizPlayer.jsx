import React, { useState, useEffect, useCallback } from 'react';
import { quizData } from '../data/quizData';

export default function QuizPlayer({ availableQuizzes = [] }) {
  const publishedQuizzes = availableQuizzes.filter(q => q.status === 'published' || q.published);

  const [selectedQuizId, setSelectedQuizId] = useState(() => publishedQuizzes[0]?.id || '');
  const [attemptState, setAttemptState] = useState(null);
  const [userAttemptsRecord, setUserAttemptsRecord] = useState({});

  const currentQuiz = publishedQuizzes.find(q => q.id === selectedQuizId);
  const attemptsTaken = selectedQuizId ? (userAttemptsRecord[selectedQuizId] || 0) : 0;
  const attemptsRemaining = currentQuiz ? Math.max(0, currentQuiz.maxAttempts - attemptsTaken) : 0;

  // Shuffle helper (CSQ-F-021)
  const shuffleArray = useCallback((arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, []);

  const handleSubmitAttempt = useCallback((activeState = attemptState, isExpired = false) => {
    if (!activeState || activeState.submitted) return;

    const questions = activeState.questions;
    const answers = activeState.answers;

    // Grade MCQ, True/False, and Short-Answer
    const gradingResults = questions.map(q => {
      const studentAns = answers[q.id];
      let isCorrect = false;

      if (q.type === 'mcq' || q.type === 'true_false') {
        isCorrect = studentAns === q.correctAnswer;
      } else if (q.type === 'short_answer') {
        isCorrect =
          typeof studentAns === 'string' &&
          typeof q.correctAnswer === 'string' &&
          studentAns.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      }

      return {
        questionId: q.id,
        prompt: q.prompt,
        type: q.type,
        studentAnswer: studentAns !== undefined ? studentAns : '(No answer)',
        correctAnswer: q.correctAnswer,
        isCorrect,
        pointsAwarded: isCorrect ? (q.points || 1) : 0,
        maxPoints: q.points || 1
      };
    });

    const totalScore = gradingResults.reduce((sum, r) => sum + r.pointsAwarded, 0);
    const maxScore = gradingResults.reduce((sum, r) => sum + r.maxPoints, 0);

    setAttemptState({
      ...activeState,
      submitted: true,
      expired: isExpired,
      results: {
        score: totalScore,
        maxScore,
        percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
        breakdown: gradingResults
      }
    });
  }, [attemptState]);

  // Timer countdown for timeLimitSeconds (CSQ-F-021)
  useEffect(() => {
    if (!attemptState || attemptState.submitted || attemptState.timeLeft <= 0) return;

    const timer = setInterval(() => {
      setAttemptState(prev => {
        if (!prev || prev.submitted) return prev;
        if (prev.timeLeft <= 1) {
          clearInterval(timer);
          handleSubmitAttempt(prev, true);
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [attemptState, handleSubmitAttempt]);

  // Start attempt (CSQ-F-021 Settings Enforcement)
  const handleStartAttempt = () => {
    if (!currentQuiz) return;

    if (attemptsTaken >= currentQuiz.maxAttempts) {
      alert(`Maximum attempts (${currentQuiz.maxAttempts}) reached for this quiz.`);
      return;
    }

    let questionsToPresent = currentQuiz.questions || [];
    if (currentQuiz.shuffle) {
      questionsToPresent = shuffleArray(questionsToPresent);
    }

    const newAttemptsCount = attemptsTaken + 1;
    setUserAttemptsRecord(prevRecords => ({ ...prevRecords, [currentQuiz.id]: newAttemptsCount }));

    setAttemptState({
      id: `attempt-${Date.now().toString()}`,
      quiz: currentQuiz,
      questions: questionsToPresent,
      answers: {},
      timeLeft: currentQuiz.timeLimitSeconds || 600,
      submitted: false,
      results: null,
      expired: false
    });
  };

  const handleAnswerChange = (questionId, value) => {
    if (!attemptState || attemptState.submitted) return;
    setAttemptState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value
      }
    }));
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ border: '1px solid #27ae60', borderRadius: '8px', padding: '20px', margin: '20px 0', background: '#fcfdfc' }}>
      <h2 style={{ color: '#27ae60', marginTop: 0 }}>Interactive Quiz Player (Settings Enforcement)</h2>

      {publishedQuizzes.length === 0 ? (
        <div>
          <p style={{ color: '#666' }}>No published quizzes available. Showing fallback dummy data:</p>
          {quizData.map((item) => (
            <div key={item.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px', background: '#fff' }}>
              <h4>{item.id}. {item.question}</h4>
              <ul>
                {item.options.map((option, index) => (
                  <li key={index}>{option}</li>
                ))}
              </ul>
              <p><strong>Correct Answer:</strong> {item.answer}</p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {/* Quiz Selection & Settings Display */}
          {!attemptState && (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label><strong>Select Published Quiz: </strong></label>
                <select
                  value={selectedQuizId}
                  onChange={e => setSelectedQuizId(e.target.value)}
                  style={{ padding: '8px', minWidth: '300px' }}
                >
                  {publishedQuizzes.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.difficulty.toUpperCase()} | {q.questions?.length || 0} Questions)
                    </option>
                  ))}
                </select>
              </div>

              {currentQuiz && (
                <div style={{ background: '#f4f6f8', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>{currentQuiz.title}</h4>
                  <p style={{ margin: '0 0 10px 0', color: '#555' }}>{currentQuiz.description}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '13px' }}>
                    <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                      <strong>Time Limit:</strong> {Math.round(currentQuiz.timeLimitSeconds / 60)} minutes
                    </div>
                    <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                      <strong>Attempts Allowed:</strong> {currentQuiz.maxAttempts}
                    </div>
                    <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                      <strong>Attempts Taken:</strong> {attemptsTaken} / {currentQuiz.maxAttempts}
                    </div>
                    <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                      <strong>Shuffled:</strong> {currentQuiz.shuffle ? 'Yes' : 'No'}
                    </div>
                  </div>

                  <div style={{ marginTop: '15px' }}>
                    <button
                      onClick={handleStartAttempt}
                      disabled={attemptsRemaining <= 0}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: attemptsRemaining > 0 ? '#27ae60' : '#bdc3c7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '15px',
                        cursor: attemptsRemaining > 0 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      {attemptsRemaining > 0 ? `Start Attempt (${attemptsRemaining} left)` : 'Max Attempts Reached'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Quiz Attempt */}
          {attemptState && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: attemptState.timeLeft < 60 ? '#fde8e8' : '#eafaf1',
                padding: '12px 20px',
                borderRadius: '6px',
                border: '1px solid #a3e4d7',
                marginBottom: '20px'
              }}>
                <div>
                  <h3 style={{ margin: 0 }}>{attemptState.quiz.title}</h3>
                  <small style={{ color: '#555' }}>Enforced Difficulty: {attemptState.quiz.difficulty} | {attemptState.questions.length} Questions</small>
                </div>
                {!attemptState.submitted && (
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: attemptState.timeLeft < 60 ? '#e74c3c' : '#27ae60' }}>
                    Time Remaining: {formatTimer(attemptState.timeLeft)}
                  </div>
                )}
              </div>

              {/* Questions List */}
              {!attemptState.submitted ? (
                <div>
                  {attemptState.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        padding: '15px',
                        marginBottom: '15px',
                        background: '#fff'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold' }}>Question {idx + 1} ({q.type.toUpperCase()})</span>
                        <span style={{ fontSize: '12px', color: '#888' }}>{q.points || 1} pt</span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: '15px' }}>{q.prompt}</p>

                      {/* MCQ Options */}
                      {q.type === 'mcq' && (
                        <div>
                          {q.options?.map((opt, oIdx) => (
                            <label key={oIdx} style={{ display: 'block', margin: '6px 0', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                value={opt}
                                checked={attemptState.answers[q.id] === opt}
                                onChange={() => handleAnswerChange(q.id, opt)}
                              />
                              <span style={{ marginLeft: '8px' }}>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* True/False Options */}
                      {q.type === 'true_false' && (
                        <div>
                          <label style={{ marginRight: '20px', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={attemptState.answers[q.id] === true}
                              onChange={() => handleAnswerChange(q.id, true)}
                            />
                            <span style={{ marginLeft: '6px' }}>True</span>
                          </label>
                          <label style={{ cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={attemptState.answers[q.id] === false}
                              onChange={() => handleAnswerChange(q.id, false)}
                            />
                            <span style={{ marginLeft: '6px' }}>False</span>
                          </label>
                        </div>
                      )}

                      {/* Short Answer Input */}
                      {q.type === 'short_answer' && (
                        <div>
                          <input
                            type="text"
                            placeholder="Type your answer here..."
                            value={attemptState.answers[q.id] || ''}
                            onChange={e => handleAnswerChange(q.id, e.target.value)}
                            style={{ width: '100%', maxWidth: '400px', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleSubmitAttempt(attemptState, false)}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#27ae60',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        fontSize: '15px',
                        cursor: 'pointer'
                      }}
                    >
                      Submit Quiz Attempt
                    </button>
                  </div>
                </div>
              ) : (
                /* Results Display */
                <div style={{ background: '#fff', border: '1px solid #27ae60', borderRadius: '6px', padding: '20px' }}>
                  {attemptState.expired && (
                    <div style={{ color: '#e74c3c', fontWeight: 'bold', marginBottom: '10px' }}>
                      Time limit expired! Attempt was automatically submitted.
                    </div>
                  )}

                  <h3 style={{ marginTop: 0 }}>Attempt Results: {attemptState.results.score} / {attemptState.results.maxScore} ({attemptState.results.percentage}%)</h3>
                  
                  <div style={{ margin: '15px 0' }}>
                    <h4>Question Breakdown:</h4>
                    {attemptState.results.breakdown.map((res, idx) => (
                      <div
                        key={idx}
                        style={{
                          borderLeft: `4px solid ${res.isCorrect ? '#27ae60' : '#e74c3c'}`,
                          padding: '10px',
                          background: '#f9f9f9',
                          marginBottom: '8px'
                        }}
                      >
                        <p style={{ margin: '0 0 4px 0' }}><strong>Q{idx + 1}:</strong> {res.prompt}</p>
                        <p style={{ margin: 0, fontSize: '13px' }}>
                          Your answer: <span style={{ color: res.isCorrect ? '#27ae60' : '#e74c3c', fontWeight: 'bold' }}>{String(res.studentAnswer)}</span>
                          {' | '}
                          Correct answer: <strong>{String(res.correctAnswer)}</strong>
                          {' | '}
                          Points: {res.pointsAwarded}/{res.maxPoints}
                        </p>
                        {res.explanation && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#555' }}>
                            <em>Explanation: {res.explanation}</em>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setAttemptState(null)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#34495e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Back to Quizzes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}