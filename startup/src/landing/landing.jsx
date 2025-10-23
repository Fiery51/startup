import React from 'react';
import '../styles.css';
import './landing.css';
import { BrowserRouter, NavLink, Routes, Route} from 'react-router-dom';
import {Login} from '../login/login'
import { LobbyCard } from '../components/lobbyCard';


//EXAMPLE CARD STUFF:
const LOBBIES = [
  { id: 1, name: 'Sunset Hike @ Y-Mountain', tag: 'Outdoors', people: 6, max: 10, time: 'Today 7:30 PM', location: 'Provo, UT' },
  { id: 2, name: 'Board Games & Boba',       tag: 'Casual',   people: 3, max: 6,  time: 'Fri 8:00 PM',   location: 'Riv. Commons' },
  { id: 3, name: 'Pick-up Basketball',       tag: 'Sports',   people: 9, max: 12, time: 'Sat 10:00 AM',  location: 'RB Courts' },
  { id: 4, name: 'Study Session – CS260',    tag: 'Study',    people: 4, max: 8,  time: 'Sun 3:00 PM',   location: 'HBLL' },
  { id: 5, name: 'Pickleball',               tag: 'Sports',   people: 4, max: 4,  time: 'Mon 1:00 PM',   location: 'HBLL' },
  { id: 6, name: 'Study Session – CS235',    tag: 'Study',    people: 4, max: 8,  time: 'Tue 3:00 PM',   location: 'TNRB' },
];


//SECTION 1 - Hero section thing

function HeroSection(){
  return(
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
            <NavLink className="kbtn kbtn-primary" to="/login">Join a lobby</NavLink>
            <NavLink className="kbtn" to="/login">How it works</NavLink>
          </div>


          <ul className="hero-bullets">
            <li>Community-first</li>
            <li>Small groups</li>
            <li>Local only</li>
          </ul>
        </div>

        <aside className="hero-right card hero-card">
          <LobbyCard l={{ id: 1, name: 'Sunset Hike @ Y-Mountain', tag: 'Outdoors', people: 6, max: 10, time: 'Today 7:30 PM', location: 'Provo, UT' }} />
          <LobbyCard l={{ id: 2, name: 'Board Games & Boba', tag: 'Casual', people: 3, max: 6, time: 'Fri 8:00 PM', location: 'Riv. Commons' }} />
          <LobbyCard l={{ id: 3, name: 'Pick-up Basketball', tag: 'Sports', people: 9, max: 12, time: 'Sat 10:00 AM', location: 'RB Courts' }} />
          <LobbyCard l={{ id: 4, name: 'Study Session – CS260', tag: 'Study', people: 4, max: 8, time: 'Sun 3:00 PM', location: 'HBLL' }} />
        </aside>
      </section>
  )
}


//SECTION 2 - all the "features of the website"

function FeaturesSection(){
  return (
    <section className="section container-fluid">
      <div className="features-grid">
        <div className="card feature-card">
          <div className="feature-icon">🎲</div>
          <h3>Activity-based</h3>
          <p className="muted">No awkward cold DMs. Meet new people while doing something you enjoy.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">🛡️</div>
          <h3>Safety first</h3>
          <p className="muted">Hosts verify locations and group size. Report & review keep events positive.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Low friction</h3>
          <p className="muted">One-tap join. Calendar and reminders coming soon.</p>
        </div>
      </div>
    </section>
  );
}


//SECTION 3 - examples of what cards and stuff look like for the users to see. Uses the lobbies dictionary thing to popoulate the cards

function TrendingSection(){
  return (
    <section className="section container-fluid">
      <div className="trending-grid">
        <div>
          <div className="trending-header">
            <h3>Trending near you</h3>
            <p className="muted">Join an activity or create your own.</p>
          </div>
          <div className="trending-list">
            {LOBBIES.map(l => <LobbyCard key={l.id} l={l} />)}
          </div>
        </div>

        <aside className="card aside-card">
          <h4>New to Kynectra?</h4>
          <ol className="muted">
            <li>1. Create a profile</li>
            <li>2. Join a small activity</li>
            <li>3. Show up, have fun, meet people</li>
          </ol>
          <NavLink className="kbtn kbtn-primary" to="/login">Get started</NavLink>
        </aside>
      </div>
    </section>
  );
}

//SECTION 4 - FAQ because i really don't feel like making a full different FAQ page

function FAQSection(){
  return (
    <section className="section container-fluid">
      <div className="faq-grid">
        <div className="faq-intro">
          <h3>Frequently asked</h3>
          <p className="muted">Everything you need to know about Kynectra.</p>
        </div>
        <div className="faq-cards">
          <div className="card qa-card">
            <h4>Is it safe?</h4>
            <p className="muted">Yes. Hosts verify locations and group size. Ratings and reports keep events positive.</p>
          </div>
          <div className="card qa-card">
            <h4>Do I need to be friends first?</h4>
            <p className="muted">Nope. Join an activity and let conversation happen naturally while you do something together.</p>
          </div>
          <div className="card qa-card">
            <h4>What does it cost?</h4>
            <p className="muted">Free during beta. We may offer premium features for hosts later.</p>
          </div>
        </div>
      </div>
    </section>
  );
}




//Okay now actually return everything
export function Landing() {
  return (
    <main className="main--landing">
      <HeroSection />
      <FeaturesSection />
      <TrendingSection />
      <FAQSection />
    </main>
  );
}
