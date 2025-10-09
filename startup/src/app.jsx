import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';

import {Dashboard} from './dashboard/dashboard'
import {LobbyInfo} from './lobbyInfo/lobbyInfo'
import {ProfileSkeleton} from './profileSkeleton/profileSkeleton'
import {Login} from './login/login'
import {Landing} from './landing/landing'

export default function App() {
  return (
    <BrowserRouter>
        <div>
          <header className="container-fluid">
            <nav>
              <NavLink className="nav-link" to="">Home</NavLink>
              <NavLink className="nav-link" to="dashboard">Dashboard</NavLink>
              <NavLink className="nav-link" to="lobbyInfo">Lobby</NavLink>
              <NavLink className="nav-link" to="profileSkeleton">Profile</NavLink>
              <NavLink className="nav-link" to="login">Login</NavLink>
            </nav>
          </header>

          <Routes>
            <Route path='/' element={<Landing />} exact />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/lobbyinfo' element={<LobbyInfo />} />
            <Route path='/profileskeleton' element={<ProfileSkeleton />} />
            <Route path='/login' element={<Login />} />
          </Routes>

          <footer className="bg-dark text-white-50">
            <div className="container-fluid">
                Tyler Mo
                <a href="https://github.com/Fiery51">Github</a>
            </div>
          </footer>
        </div>
    </BrowserRouter>
  );
}