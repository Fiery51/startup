// components/lobbyCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export function LobbyCard({ l, onDelete, onJoin }) {
  const navigate = useNavigate();

  async function handleJoin() {
    try {
      await onJoin(l.id); // call parent-provided join logic
      navigate(`/lobbyinfo/${l.id}`); // then go to lobby page
    } catch (e) {
      console.error('Join failed:', e);
      alert(e.message || 'Failed to join lobby');
    }
  }

  return (
    <div className="card lobby-card">
      <div className="lobby-chip">{l.tag}</div>
      <h4 className="lobby-name">{l.name}</h4>
      <div className="lobby-meta-row">
        {l.people}/{l.max} • {l.time}
      </div>
      <div className="lobby-meta-row">{l.location}</div>

      <button
        className="kbtn"
        type="button"
        style={{ marginTop: '.5rem' }}
        onClick={handleJoin}
      >
        Join Lobby
      </button>

      {onDelete && (
        <button
          className="kbtn kbtn-danger"
          type="button"
          style={{ marginTop: '.5rem', marginLeft: '.5rem' }}
          onClick={onDelete}
        >
          Delete
        </button>
      )}
    </div>
  );
}
