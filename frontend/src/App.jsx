import React from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Library from './pages/Library.jsx';
import QuizPlayer from './pages/QuizPlayer.jsx';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>SE Collaborative Platform</h1>
      <hr />
      <Dashboard />
      <hr />
      <Library />
      <hr />
      <QuizPlayer />
    </div>
  );
}

export default App;