import React from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Library from './pages/Library.jsx';
import QuizPlayer from './pages/QuizPlayer.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>SE Collaborative Platform</h1>
      <hr />
      <Login />
      <hr />
      <Register />
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