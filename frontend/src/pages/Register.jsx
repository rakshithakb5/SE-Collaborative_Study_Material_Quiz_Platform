import React, { useState } from 'react';
import { postJson } from '../api.js';

const Register = () => {
  const [formData, setFormData] = useState({ email: '', password: '', role: 'student' });
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { ok, data } = await postJson('/api/auth/register', formData);

    if (ok) {
      setMessage({
        type: 'success',
        text: `Account created for ${data.email}. A verification email has been sent. You can now log in.`,
      });
      setFormData({ email: '', password: '', role: formData.role });
    } else {
      setMessage({ type: 'error', text: data.error || 'Registration failed' });
    }
    setSubmitting(false);
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px 0', borderRadius: '8px' }}>
      <h2>Register / Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email: </label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password (min 8 characters): </label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} minLength={8} required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Role: </label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </select>
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Registering...' : 'Register'}
        </button>
      </form>
      {message && (
        <p role="status" style={{ color: message.type === 'success' ? 'green' : 'crimson' }}>
          {message.text}
        </p>
      )}
    </div>
  );
};

export default Register;
