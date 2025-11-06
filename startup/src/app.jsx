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
import { ProfileEditor } from './profile/profileEditor';
import { MyLobbies } from './dashboard/myLobbies';

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
      <header className="app-header">
        <div className="app-header__inner container-fluid">
          <div className="app-nav-left">
            <NavLink className="app-brand" to="/">Kynectra</NavLink>
            <NavLink className="nav-link" to="/" end>Home</NavLink>
            {authed && (
              <NavLink className="nav-link" to="/dashboard">Dashboard</NavLink>
            )}
          </div>
          <div className="app-nav-right">
            {!authed ? (
              <NavLink className="kbtn kbtn-primary" to="/login">Login</NavLink>
            ) : (
              <ProfileMenu userName={userName} onLogout={handleLogout} />
            )}
          </div>
        </div>
      </header>

      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path='/dashboard' element={<RequireAuth authed={authed}><Dashboard /></RequireAuth>} />
        <Route path='/lobbyinfo/:id' element={<RequireAuth authed={authed}><LobbyInfo /></RequireAuth>} />
        <Route path='/profile/:userName' element={<RequireAuth authed={authed}><ProfileSkeleton /></RequireAuth>} />
        <Route path='/profile/edit' element={<RequireAuth authed={authed}><ProfileEditor /></RequireAuth>} />
        <Route path='/my-lobbies' element={<RequireAuth authed={authed}><MyLobbies /></RequireAuth>} />
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

function ProfileMenu({ userName, onLogout }) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  const initials = userName ? userName[0].toUpperCase() : '?';

  React.useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function go(path) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="avatar-btn"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {initials}
      </button>
      {open && (
        <div className="profile-menu__dropdown" role="menu">
          <button type="button" onClick={() => go(`/profile/${encodeURIComponent(userName)}`)}>My profile</button>
          <button type="button" onClick={() => go('/profile/edit')}>Edit profile</button>
          <button type="button" onClick={() => go('/my-lobbies')}>My lobbies</button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
              navigate('/');
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
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

