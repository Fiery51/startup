// components/lobbyCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export function LobbyCard({ l, onDelete, onJoin, onLeave, isJoined, isFull }) {
  const navigate = useNavigate();
  const [joining, setJoining] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  const occupancy = `${Math.min(l.people, l.max)} / ${l.max}`;
  const fillPercent = Math.min(100, (Number(l.people) / Number(l.max)) * 100 || 0);

  async function handlePrimary() {
    if (isJoined) {
      navigate(`/lobbyinfo/${l.id}`);
      return;
    }
    if (!onJoin || isFull) return;

    try {
      setJoining(true);
      await onJoin(l.id);
      navigate(`/lobbyinfo/${l.id}`);
    } catch (e) {
      console.error('Join failed:', e);
      alert(e.message || 'Failed to join lobby');
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!onLeave) return;
    try {
      setLeaving(true);
      await onLeave(l.id);
    } catch (e) {
      console.error('Leave failed:', e);
      alert(e.message || 'Failed to leave lobby');
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="card lobby-card">
      <div className="lobby-card__header">
        <span className="lobby-chip">{l.tag}</span>
        {isJoined && <span className="lobby-status lobby-status--joined">Joined</span>}
        {!isJoined && isFull && <span className="lobby-status lobby-status--full">Full</span>}
      </div>

      <h4 className="lobby-name">{l.name}</h4>
      <div className="lobby-meta">
        <span>{l.time}</span>
        <span>{l.location}</span>
      </div>

      <div className="lobby-progress">
        <div className="lobby-progress__bar">
          <div className="lobby-progress__fill" style={{ width: `${fillPercent}%` }} />
        </div>
        <span>{occupancy} spots</span>
      </div>

      <div className="lobby-card__actions">
        <button
          className="kbtn kbtn-primary"
          type="button"
          onClick={handlePrimary}
          disabled={joining || (!isJoined && isFull)}
        >
          {isJoined ? 'View lobby' : isFull ? 'Lobby full' : (joining ? 'Joining...' : 'Join lobby')}
        </button>

        {isJoined && onLeave && (
          <button
            className="kbtn"
            type="button"
            onClick={handleLeave}
            disabled={leaving}
          >
            {leaving ? 'Leaving...' : 'Leave lobby'}
          </button>
        )}

        {onDelete && (
          <button
            className="kbtn kbtn-danger"
            type="button"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
