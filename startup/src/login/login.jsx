import React from 'react';
import '../styles.css';

export function Login() {
  return (
    <main>
      <div className="loginContainer">
        <h1>Login</h1>
        <form>
          <label htmlFor="username">Username:</label>
          <br />
          <input type="text" name="username" id="username" />
          <br />
          <label htmlFor="password">Password:</label>
          <br />
          <input type="password" name="password" id="password" />
        </form>
        <div>
          Login W/ Google Button
        </div>
      </div>
    </main>
  );
}
