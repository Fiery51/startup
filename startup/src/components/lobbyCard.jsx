// components/lobbyCard.jsx
import React from 'react';

export function LobbyCard({ l, onDelete, onJoin }) {
  return (
    <div className="card lobby-card">
      <div className="lobby-chip">{l.tag}</div>
      <h4 className="lobby-name">{l.name}</h4>
      <div className="lobby-meta-row">{l.people}/{l.max} • {l.time}</div>
      <div className="lobby-meta-row">{l.location}</div>

      {/* Join */}
      <button className="kbtn" type="button" style={{ marginTop: '.5rem' }} onClick={onJoin}> Join lobby </button>

      {/* Delete */}
      {onDelete && (
        <button className="kbtn kbtn-danger" type="button" style={{ marginTop: '.5rem', marginLeft: '.5rem' }} onClick={onDelete}> Delete </button>
      )}
    </div>
  );
}
