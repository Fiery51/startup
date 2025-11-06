// src/dashboard/myLobbies.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';

export function MyLobbies() {
  const [joined, setJoined] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userName = localStorage.getItem('userName') || '';
  const navigate = useNavigate();

  const loadLobbies = useCallback(async () => {
    if (!userName) {
      setJoined([]);
      setError('You must be logged in to view your lobbies.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userName)}/lobbies`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load lobbies');
      setJoined(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userName]);

  useEffect(() => {
    loadLobbies();
  }, [loadLobbies]);

  async function leaveLobby(id) {
    try {
      const res = await fetch(`/api/lobbies/${id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName }),
      });
      if (res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to leave lobby');
      }
      await loadLobbies();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <main><p>Loading your lobbies...</p></main>;
  if (error) return <main><p>Error: {error}</p></main>;

  return (
    <main className="my-lobbies">
      <div className="page-heading">
        <h1>My lobbies</h1>
        <p className="muted">Jump back into activities you have signed up for.</p>
      </div>

      {joined.length === 0 ? (
        <div className="empty-state card">
          <h3>No lobbies yet</h3>
          <p>Join a lobby from the dashboard to see it show up here.</p>
          <button type="button" className="kbtn kbtn-primary" onClick={() => navigate('/dashboard')}>
            Browse lobbies
          </button>
        </div>
      ) : (
        <div className="my-lobbies__grid">
          {joined.map(lobby => (
            <div key={lobby.id} className="card my-lobby-card">
              <div className="my-lobby-card__header">
                <span className="lobby-chip">{lobby.tag}</span>
                <h3>{lobby.name}</h3>
              </div>
              <div className="my-lobby-card__meta">
                <span>{lobby.time}</span>
                <span>{lobby.location}</span>
                <span>{Math.min(lobby.people, lobby.max)} / {lobby.max} spots</span>
              </div>
              <div className="my-lobby-card__actions">
                <button
                  type="button"
                  className="kbtn kbtn-primary"
                  onClick={() => navigate(`/lobbyinfo/${lobby.id}`)}
                >
                  Open lobby
                </button>
                <button
                  type="button"
                  className="kbtn"
                  onClick={() => leaveLobby(lobby.id)}
                >
                  Leave
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
