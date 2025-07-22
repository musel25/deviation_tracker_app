// deviation_tracker_app/frontend/src/Login.js

import React, { useState } from 'react';
import { useAuth } from './AuthContext'; // Import useAuth hook
import './App.css'; // Use App.css for basic styling

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth(); // Get login function from context

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await login(username, password);

    if (!result.success) {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="login-container">
      <header className="login-header">
        <h1>Deviation Tracker Login</h1>
      </header>
      <main className="login-form-wrapper">
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Sign In</h2>
          {error && <p className="error-message">{error}</p>}
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging In...' : 'Login'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default Login;