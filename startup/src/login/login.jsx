// src/login/login.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

export function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [msg, setMsg] = React.useState('');

  async function apiLogin() {
    setMsg('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMsg(err.error ?? 'Login failed');
        return;
      }
      localStorage.setItem('userName', username);
      onLogin?.(username);
      navigate('/dashboard');
    } catch {
      setMsg('Network error');
    }
  }

  async function apiCreate() {
    setMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMsg(err.error ?? 'Create failed');
        return;
      }

      setMsg('Account created! Please log in.');
      navigate('/login');
    } catch {
      setMsg('Network error');
    }
  }


  return (
    <main className="login-page">
      <div className="loginContainer">
        <h1>Login</h1>
        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            apiLogin();
          }}
        >
          <label htmlFor="username">Username</label>
          <input
            className="login-input"
            type="text"
            name="username"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            className="login-input"
            type="password"
            name="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="login-actions">
            <button className="kbtn" type="button" onClick={apiLogin} disabled={!username || !password}>
              Log in
            </button>
            <button className="kbtn kbtn-secondary" type="button" onClick={apiCreate} disabled={!username || !password}>
              Create account
            </button>
          </div>
        </form>

        {msg && <p className="form-msg form-msg--error">{msg}</p>}
      </div>
    </main>
  );
}
