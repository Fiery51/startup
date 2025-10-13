import React from 'react';
import '../styles.css';
import './landing.css';
import { BrowserRouter, NavLink, Routes, Route} from 'react-router-dom';
import {Login} from '../login/login'



export function Landing() {
  return (
    <main className="main--landing">  {/* temporary class so we don't fight your global main flex yet */}
      <section id="landing-HeroSection" className="container-fluid">
        <div className="hero-left">
          <span className="hero-eyebrow">Safe, campus-friendly activities</span>
          <h1 className="hero-title">
            Meet new people, <span className="hero-accent">by doing things</span>.
          </h1>
          <p className="hero-sub">
            Join or host small activities—board games, hikes, study sessions, so friendships happen naturally.
          </p>

          <div className="hero-cta">
            <NavLink className="kbtn kbtn-primary" to="/lobbyinfo">Join a lobby</NavLink>
            <NavLink className="kbtn" to="/dashboard">How it works</NavLink>
          </div>


          <ul className="hero-bullets">
            <li>Community-first</li>
            <li>Small groups</li>
            <li>Local only</li>
          </ul>
        </div>

        <aside className="hero-right card hero-card">
          <small className="muted">Trending near you</small>
          <div className="lobby card lobby--preview">
            <div className="lobby-meta">Outdoors • Today 7:30 PM</div>
            <h3 className="lobby-title">Sunset Hike @ Y-Mountain</h3>
            <div className="lobby-meta">6/10 • Provo, UT</div>
            <button className="kbtn lobby-view" type="button">View</button>
          </div>
        </aside>
      </section>
    </main>
  );
}
