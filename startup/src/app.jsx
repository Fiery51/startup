// src/App.jsx
import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import { BrowserRouter, NavLink, Route, Routes, useNavigate } from 'react-router-dom';

import { Dashboard } from './dashboard/dashboard';
import { LobbyInfo } from './lobbyInfo/lobbyInfo';
import { ProfileSkeleton } from './profileSkeleton/profileSkeleton';
import { Login } from './login/login';
import { Landing } from './landing/landing';

function AppShell() {
  const [userName, setUserName] = React.useState(() => localStorage.getItem('userName') || '');
  const authed = Boolean(userName);

  function handleLogin(name) {
    setUserName(name);
    localStorage.setItem('userName', name);
  }
  function handleLogout() {
    setUserName('');
    localStorage.removeItem('userName');
  }

  return (
    <div>
      <header className="container-fluid">
        <nav>
          <NavLink className="nav-link" to="/">Home</NavLink>

          {authed && (
            <>
              <NavLink className="nav-link" to="/dashboard">Dashboard</NavLink>
              {/* remove the plain /lobbyinfo link, since it needs an :id */}
              {/* link to the logged-in user's profile */}
              <NavLink className="nav-link" to={`/profileskeleton/${encodeURIComponent(userName)}`}>
                My Profile
              </NavLink>
            </>
          )}

          {/* show Login when not authed; show Logout when authed */}
          {!authed ? (
            <NavLink className="nav-link" to="/login">Login</NavLink>
          ) : (
            <LogoutLink onLogout={handleLogout} userName={userName} />
          )}
        </nav>
      </header>

      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path='/dashboard' element={<RequireAuth authed={authed}><Dashboard /></RequireAuth>} />
        <Route path='/lobbyinfo/:id' element={<RequireAuth authed={authed}><LobbyInfo /></RequireAuth>} />
        <Route path='/profileskeleton/:userName' element={<RequireAuth authed={authed}><ProfileSkeleton /></RequireAuth>} />
        <Route path='/login' element={<Login onLogin={handleLogin} />} />
      </Routes>

      <footer className="bg-dark text-white-50">
        <div className="container-fluid">
          Tyler Mo
          <a href="https://github.com/Fiery51">Github</a>
        </div>
      </footer>
    </div>
  );
}

function LogoutLink({ onLogout, userName }) {
  const navigate = useNavigate();
  return (
    <button
      className="nav-link"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      onClick={() => { onLogout(); navigate('/'); }}
      title={`Logout ${userName}`}
    >
      Logout
    </button>
  );
}


function RequireAuth({ authed, children }) {
  const navigate = useNavigate();
  React.useEffect(() => {
    if (!authed) navigate('/login', { replace: true });
  }, [authed, navigate]);
  return authed ? children : null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
