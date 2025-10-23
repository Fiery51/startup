import React from 'react';

export function LobbyCard({l}) {
  return (
    <div className="card lobby-card">
      <div className="lobby-chip">{l.tag}</div>
      <h4 className="lobby-name">{l.name}</h4>
      <div className="lobby-meta-row">{l.people}/{l.max} • {l.time}</div>
      <div className="lobby-meta-row">{l.location}</div>
      <button className="kbtn" type="button" style={{marginTop:'.5rem'}}>Join lobby</button>
    </div>
  );
}