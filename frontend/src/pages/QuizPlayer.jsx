import React from 'react';
import { quizData } from '../data/quizData';

function QuizPlayer() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Interactive Quiz Player</h2>
      {quizData.map((item) => (
        <div key={item.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
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
  );
}

export default QuizPlayer;