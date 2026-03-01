import { useState } from 'react';
import {
  getApiError,
  getStoredUser,
  login,
  logout,
  setAuthSession,
  signup
} from '../services/api';

export default function AuthPanel({ onAuthChange }) {
  const initialUser = getStoredUser();
  const [user, setUser] = useState(initialUser);
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = mode === 'signup' ? { name, email, password } : { email, password };
      const data = mode === 'signup' ? await signup(payload) : await login(payload);

      setAuthSession(data);
      setUser(data.user);
      setPassword('');
      if (onAuthChange) onAuthChange(data.user);
    } catch (err) {
      setError(getApiError(err, 'Authentication failed.'));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    setUser(null);
    if (onAuthChange) onAuthChange(null);
  }

  if (user) {
    return (
      <section className="auth-panel">
        <p className="auth-panel__welcome">
          Signed in as <strong>{user.name}</strong> ({user.email})
        </p>
        <button className="btn btn--ghost" type="button" onClick={handleLogout}>
          Logout
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <div className="auth-panel__toggle">
        <button
          type="button"
          className={`question-chip ${mode === 'login' ? 'question-chip--active' : ''}`}
          onClick={() => setMode('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={`question-chip ${mode === 'signup' ? 'question-chip--active' : ''}`}
          onClick={() => setMode('signup')}
        >
          Signup
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'signup' ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
          />
        ) : null}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          minLength={6}
          required
        />
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Login'}
        </button>
      </form>

      {error ? <p className="status status--error">{error}</p> : null}
    </section>
  );
}
