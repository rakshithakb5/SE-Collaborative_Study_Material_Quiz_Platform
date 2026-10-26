import React, { useState } from 'react';
import { postJson, saveToken, clearToken } from '../api.js';

const Login = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [session, setSession] = useState(null); // { email, role } when logged in
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { ok, data } = await postJson('/api/auth/login', credentials);

    if (ok) {
      saveToken(data.token);
      setSession({ email: data.user.email, role: data.user.role });
      setCredentials({ email: '', password: '' });
    } else if (data.error === 'Invalid credentials') {
      setError('Incorrect email or password.');
    } else {
      setError(data.error || 'Login failed');
    }
    setSubmitting(false);
  };

  const handleLogout = () => {
    clearToken();
    setSession(null);
  };

  const boxStyle = { padding: '20px', border: '1px solid #ccc', margin: '10px 0', borderRadius: '8px' };

  if (session) {
    return (
      <div style={boxStyle}>
        <h2>Login / Authentication</h2>
        <p role="status" style={{ color: 'green' }}>
          Logged in as {session.email} ({session.role}).
        </p>
        <button type="button" onClick={handleLogout}>Log out</button>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <h2>Login / Authentication</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email: </label>
          <input type="email" name="email" value={credentials.email} onChange={handleChange} required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password: </label>
          <input type="password" name="password" value={credentials.password} onChange={handleChange} required />
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
};

export default Login;
