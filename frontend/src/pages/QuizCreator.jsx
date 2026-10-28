import React, { useState } from 'react';

// Pre-seeded shared question bank (CSQ-F-020)
const initialQuestionBank = [
  {
    id: 'qb-1',
    topic: 'Software Engineering',
    type: 'mcq',
    prompt: 'What does SDLC stand for?',
    options: [
      'Software Development Life Cycle',
      'System Design and Logic Control',
      'Structured Development Learning Course',
      'Standard Data Link Connection'
    ],
    correctAnswer: 'Software Development Life Cycle',
    points: 1,
    difficulty: 'easy'
  },
  {
    id: 'qb-2',
    topic: 'Software Engineering',
    type: 'true_false',
    prompt: 'Agile methodology promotes iterative and incremental development.',
    options: [true, false],
    correctAnswer: true,
    points: 1,
    difficulty: 'easy'
  },
  {
    id: 'qb-3',
    topic: 'Software Engineering',
    type: 'short_answer',
    prompt: 'What is the document specifying system functional and non-functional requirements known as?',
    correctAnswer: 'SRS',
    points: 2,
    difficulty: 'medium'
  },
  {
    id: 'qb-4',
    topic: 'Data Structures',
    type: 'mcq',
    prompt: 'What is the worst-case time complexity of binary search on a sorted array?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
    correctAnswer: 'O(log n)',
    points: 1,
    difficulty: 'easy'
  },
  {
    id: 'qb-5',
    topic: 'Data Structures',
    type: 'true_false',
    prompt: 'A stack operates on a First-In, First-Out (FIFO) principle.',
    options: [true, false],
    correctAnswer: false,
    points: 1,
    difficulty: 'medium'
  },
  {
    id: 'qb-6',
    topic: 'Data Structures',
    type: 'short_answer',
    prompt: 'Which data structure uses keys computed via a hash function to map values?',
    correctAnswer: 'Hash table',
    points: 2,
    difficulty: 'hard'
  }
];

export default function QuizCreator({ onQuizCreated, existingQuizzes = [] }) {
  const [questionBank] = useState(initialQuestionBank);
  const [quizzes, setQuizzes] = useState(existingQuizzes);
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'list'

  // Quiz Meta
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Software Engineering');
  const [description, setDescription] = useState('');

  // Quiz Settings (CSQ-F-021)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');

  // Selected / Added Questions for the Quiz (CSQ-F-020)
  const [quizQuestions, setQuizQuestions] = useState([]);

  // Custom question form
  const [customType, setCustomType] = useState('mcq');
  const [customPrompt, setCustomPrompt] = useState('');
  const [customOptions, setCustomOptions] = useState(['', '', '', '']);
  const [customMcqAnswer, setCustomMcqAnswer] = useState('');
  const [customTfAnswer, setCustomTfAnswer] = useState(true);
  const [customSaAnswer, setCustomSaAnswer] = useState('');
  const [customPoints, setCustomPoints] = useState(1);

  // Bank question filter
  const [bankFilterTopic, setBankFilterTopic] = useState('All');
  const [bankFilterType, setBankFilterType] = useState('All');

  // Add question from Question Bank
  const handleAddFromBank = (bankQ) => {
    if (quizQuestions.some(q => q.id === bankQ.id)) {
      alert('This question is already in the quiz!');
      return;
    }
    setQuizQuestions([...quizQuestions, { ...bankQ, fromBank: true }]);
  };

  // Add custom question
  const handleAddCustomQuestion = (e) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    let newQ = {
      id: `custom-q-${Date.now()}`,
      prompt: customPrompt,
      type: customType,
      points: Number(customPoints) || 1,
      difficulty
    };

    if (customType === 'mcq') {
      const validOptions = customOptions.filter(o => o.trim() !== '');
      if (validOptions.length < 2) {
        alert('Please provide at least 2 options for MCQ.');
        return;
      }
      if (!customMcqAnswer) {
        alert('Please specify the correct option for MCQ.');
        return;
      }
      newQ.options = validOptions;
      newQ.correctAnswer = customMcqAnswer;
    } else if (customType === 'true_false') {
      newQ.options = [true, false];
      newQ.correctAnswer = Boolean(customTfAnswer);
    } else if (customType === 'short_answer') {
      if (!customSaAnswer.trim()) {
        alert('Please provide the expected short answer.');
        return;
      }
      newQ.correctAnswer = customSaAnswer.trim();
    }

    setQuizQuestions([...quizQuestions, newQ]);
    setCustomPrompt('');
    setCustomOptions(['', '', '', '']);
    setCustomMcqAnswer('');
    setCustomSaAnswer('');
  };

  const handleRemoveQuestion = (id) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== id));
  };

  // Save Quiz as Draft or Publish (AC-CSQ-F-020, AC-CSQ-F-021)
  const handleSaveQuiz = (status = 'draft') => {
    if (!title.trim()) {
      alert('Please enter a Quiz Title.');
      return;
    }
    if (quizQuestions.length === 0) {
      alert('Please add at least one question to the quiz.');
      return;
    }

    const newQuiz = {
      id: `quiz-${Date.now()}`,
      title,
      subject,
      description,
      status, // 'draft' | 'published'
      published: status === 'published',
      timeLimitSeconds: Number(timeLimitMinutes) * 60,
      maxAttempts: Number(maxAttempts) || 1,
      shuffle: Boolean(shuffleQuestions),
      difficulty,
      settings: {
        timeLimitSeconds: Number(timeLimitMinutes) * 60,
        maxAttempts: Number(maxAttempts) || 1,
        shuffle: Boolean(shuffleQuestions),
        difficulty
      },
      questions: quizQuestions,
      createdAt: new Date().toISOString()
    };

    const updated = [newQuiz, ...quizzes];
    setQuizzes(updated);
    if (onQuizCreated) onQuizCreated(newQuiz);

    alert(`Quiz successfully saved as ${status === 'draft' ? 'DRAFT' : 'PUBLISHED'}!`);
    // Reset form
    setTitle('');
    setDescription('');
    setQuizQuestions([]);
    setActiveTab('list');
  };

  const handlePublishExistingDraft = (quizId) => {
    const updated = quizzes.map(q => {
      if (q.id === quizId) {
        return { ...q, status: 'published', published: true };
      }
      return q;
    });
    setQuizzes(updated);
    const pubQuiz = updated.find(q => q.id === quizId);
    if (onQuizCreated) onQuizCreated(pubQuiz);
    alert('Quiz draft published successfully!');
  };

  // Filter bank questions
  const filteredBank = questionBank.filter(q => {
    const topicMatch = bankFilterTopic === 'All' || q.topic === bankFilterTopic;
    const typeMatch = bankFilterType === 'All' || q.type === bankFilterType;
    return topicMatch && typeMatch;
  });

  return (
    <div style={{ border: '1px solid #4a90e2', borderRadius: '8px', padding: '20px', margin: '20px 0', background: '#fdfdfd' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>Quiz Creator & Question Bank (CSQ-F-020 / CSQ-F-021)</h2>
        <div>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              padding: '8px 16px',
              marginRight: '8px',
              backgroundColor: activeTab === 'create' ? '#4a90e2' : '#e0e0e0',
              color: activeTab === 'create' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create / New Draft
          </button>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === 'list' ? '#4a90e2' : '#e0e0e0',
              color: activeTab === 'list' ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Manage Quizzes & Drafts ({quizzes.length})
          </button>
        </div>
      </div>

      {activeTab === 'create' && (
        <div>
          {/* Metadata */}
          <div style={{ background: '#f4f6f8', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
            <h3 style={{ marginTop: 0 }}>1. Quiz Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label><strong>Quiz Title: </strong></label>
                <input
                  type="text"
                  placeholder="e.g. Unit 2 Sprint Quiz"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label><strong>Subject: </strong></label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <label><strong>Description: </strong></label>
              <textarea
                rows="2"
                placeholder="Brief description or guidelines for students..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </div>
          </div>

          {/* Quiz Settings (CSQ-F-021) */}
          <div style={{ background: '#eef6fc', padding: '15px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #c2e0f9' }}>
            <h3 style={{ marginTop: 0, color: '#1a5276' }}>2. Quiz Settings (CSQ-F-021 Enforced Settings)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              <div>
                <label><strong>Time Limit (Minutes): </strong></label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={timeLimitMinutes}
                  onChange={e => setTimeLimitMinutes(e.target.value)}
                  style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                />
                <small style={{ color: '#666' }}>Auto-submits on expiry</small>
              </div>

              <div>
                <label><strong>Max Attempts: </strong></label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxAttempts}
                  onChange={e => setMaxAttempts(e.target.value)}
                  style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                />
                <small style={{ color: '#666' }}>Allowed attempts per student</small>
              </div>

              <div>
                <label><strong>Difficulty Level: </strong></label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label><strong>Shuffle Questions: </strong></label>
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    id="shuffleCheck"
                    checked={shuffleQuestions}
                    onChange={e => setShuffleQuestions(e.target.checked)}
                  />
                  <label htmlFor="shuffleCheck" style={{ marginLeft: '6px', cursor: 'pointer' }}>
                    Randomize order
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Questions Selection & Bank */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Left: Shared Question Bank */}
            <div style={{ background: '#fdfefe', border: '1px solid #d5dbdb', borderRadius: '6px', padding: '15px' }}>
              <h3 style={{ marginTop: 0 }}>3A. Shared Question Bank</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select value={bankFilterTopic} onChange={e => setBankFilterTopic(e.target.value)} style={{ padding: '4px' }}>
                  <option value="All">All Topics</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Data Structures">Data Structures</option>
                </select>
                <select value={bankFilterType} onChange={e => setBankFilterType(e.target.value)} style={{ padding: '4px' }}>
                  <option value="All">All Types</option>
                  <option value="mcq">MCQ</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {filteredBank.map(q => (
                  <div
                    key={q.id}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      padding: '10px',
                      marginBottom: '8px',
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7f8c8d' }}>
                      <span><strong>{q.type.toUpperCase()}</strong> | {q.topic}</span>
                      <span>{q.difficulty} | {q.points} pt</span>
                    </div>
                    <p style={{ margin: '6px 0', fontSize: '14px' }}>{q.prompt}</p>
                    <button
                      onClick={() => handleAddFromBank(q)}
                      style={{
                        padding: '4px 10px',
                        background: '#27ae60',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      + Add to Quiz
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Add Custom Question */}
            <div style={{ background: '#fdfefe', border: '1px solid #d5dbdb', borderRadius: '6px', padding: '15px' }}>
              <h3 style={{ marginTop: 0 }}>3B. Add Custom Question</h3>
              <form onSubmit={handleAddCustomQuestion}>
                <div style={{ marginBottom: '8px' }}>
                  <label>Type: </label>
                  <select
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                    style={{ padding: '4px', marginLeft: '6px' }}
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <label>Prompt / Question: </label>
                  <textarea
                    rows="2"
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    placeholder="Enter question text..."
                    required
                    style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                  />
                </div>

                {customType === 'mcq' && (
                  <div style={{ marginBottom: '8px' }}>
                    <label>Options (select radio for correct answer):</label>
                    {customOptions.map((opt, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
                        <input
                          type="radio"
                          name="correctMcq"
                          checked={customMcqAnswer === opt && opt !== ''}
                          onChange={() => setCustomMcqAnswer(opt)}
                        />
                        <input
                          type="text"
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={e => {
                            const copy = [...customOptions];
                            copy[idx] = e.target.value;
                            setCustomOptions(copy);
                          }}
                          style={{ marginLeft: '8px', flex: 1, padding: '4px' }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {customType === 'true_false' && (
                  <div style={{ marginBottom: '8px' }}>
                    <label>Correct Answer: </label>
                    <div style={{ marginTop: '4px' }}>
                      <label style={{ marginRight: '15px' }}>
                        <input
                          type="radio"
                          name="tf"
                          checked={customTfAnswer === true}
                          onChange={() => setCustomTfAnswer(true)}
                        /> True
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="tf"
                          checked={customTfAnswer === false}
                          onChange={() => setCustomTfAnswer(false)}
                        /> False
                      </label>
                    </div>
                  </div>
                )}

                {customType === 'short_answer' && (
                  <div style={{ marginBottom: '8px' }}>
                    <label>Expected Text Answer: </label>
                    <input
                      type="text"
                      placeholder="e.g. SRS"
                      value={customSaAnswer}
                      onChange={e => setCustomSaAnswer(e.target.value)}
                      style={{ width: '100%', padding: '6px', marginTop: '4px' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <label>Points: </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={customPoints}
                    onChange={e => setCustomPoints(e.target.value)}
                    style={{ width: '60px', padding: '4px' }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '6px 12px',
                    background: '#2980b9',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  + Add Custom Question
                </button>
              </form>
            </div>
          </div>

          {/* Current Quiz Questions Review */}
          <div style={{ marginTop: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
            <h3>4. Added Questions in Draft ({quizQuestions.length})</h3>
            {quizQuestions.length === 0 ? (
              <p style={{ color: '#777' }}>No questions added yet. Add from the shared question bank or create custom questions above.</p>
            ) : (
              <ul style={{ paddingLeft: '20px' }}>
                {quizQuestions.map((q, idx) => (
                  <li key={q.id || idx} style={{ marginBottom: '8px' }}>
                    <strong>[{q.type.toUpperCase()}]</strong> {q.prompt} ({q.points} pt) - <em>Ans: {String(q.correctAnswer)}</em>
                    <button
                      onClick={() => handleRemoveQuestion(q.id)}
                      style={{
                        marginLeft: '12px',
                        background: '#e74c3c',
                        color: '#fff',
                        border: 'none',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Actions: Save Draft or Publish (CSQ-F-020) */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
              <button
                onClick={() => handleSaveQuiz('draft')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f39c12',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Save as Draft (AC-CSQ-F-020)
              </button>
              <button
                onClick={() => handleSaveQuiz('published')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#27ae60',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                Publish Quiz Now
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div>
          <h3>All Created Quizzes & Drafts</h3>
          {quizzes.length === 0 ? (
            <p>No quizzes created yet. Switch to "Create / New Draft" above to create one.</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    padding: '15px',
                    background: '#fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>{quiz.title}</h4>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#fff',
                        backgroundColor: quiz.status === 'published' ? '#27ae60' : '#f39c12'
                      }}
                    >
                      {quiz.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0', color: '#555', fontSize: '13px' }}>{quiz.description || 'No description provided'}</p>
                  
                  {/* Settings summary */}
                  <div style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: '4px', fontSize: '13px', margin: '8px 0' }}>
                    <strong>Enforced Settings:</strong> Time Limit: {Math.round(quiz.timeLimitSeconds / 60)} min | Max Attempts: {quiz.maxAttempts} | Difficulty: {quiz.difficulty} | Shuffle: {quiz.shuffle ? 'Yes' : 'No'}
                  </div>

                  <p style={{ margin: '4px 0', fontSize: '13px' }}>
                    <strong>Questions ({quiz.questions?.length || 0}):</strong> MCQ, True/False, Short-Answer retrievable
                  </p>

                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    {quiz.status === 'draft' && (
                      <button
                        onClick={() => handlePublishExistingDraft(quiz.id)}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#27ae60',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Publish Draft
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
