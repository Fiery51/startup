// src/dashboard/dashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles.css';
import { LobbyCard } from '../components/lobbyCard';

const createEmptyLobbyForm = () => ({
  name: '',
  tag: 'Casual',
  max: 10,
  time: '',
  location: '',
});

export function Dashboard() {
  const [all, setAll] = useState([]);
  const [joined, setJoined] = useState([]);
  const [tag, setTag] = useState('All');
  const [form, setForm] = useState(() => createEmptyLobbyForm());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userName = localStorage.getItem('userName') || '';
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const [lobbyRes, joinedRes] = await Promise.all([
      fetch('/api/lobbies'),
      fetch(`/api/users/${encodeURIComponent(userName)}/lobbies`),
    ]);

    const lobbyJson = await lobbyRes.json().catch(() => {
      throw new Error('Failed to parse lobbies response');
    });
    if (!lobbyRes.ok) {
      throw new Error(lobbyJson?.error || 'Failed to load lobbies');
    }

    const joinedJson = await joinedRes.json().catch(() => {
      throw new Error('Failed to parse joined lobbies response');
    });
    if (!joinedRes.ok) {
      throw new Error(joinedJson?.error || 'Failed to load joined lobbies');
    }

    return {
      lobbies: Array.isArray(lobbyJson) ? lobbyJson : [],
      joined: Array.isArray(joinedJson) ? joinedJson : [],
    };
  }, [userName]);

  const refreshData = useCallback(async () => {
    const data = await fetchData();
    setAll(data.lobbies);
    setJoined(data.joined);
    setError(null);
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchData();
        if (!cancelled) {
          setAll(data.lobbies);
          setJoined(data.joined);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchData]);

  // Lock body scroll when the modal is open
  useEffect(() => {
    if (isCreateModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isCreateModalOpen]);

  const joinedIds = useMemo(() => new Set(joined.map(l => String(l.id))), [joined]);

  const visible = useMemo(() => {
    const normalized = all.map(l => ({ ...l, id: Number(l.id) }));
    if (tag === 'All') return normalized;
    return normalized.filter(item => item.tag === tag);
  }, [all, tag]);

  const isFormValid = Boolean(form.name && form.time && form.location && form.max);

  async function handleAdd(event) {
    event.preventDefault();
    try {
      const res = await fetch('/api/lobbies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          tag: form.tag,
          max: Number(form.max),
          time: form.time,
          location: form.location,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create lobby');

      setForm(createEmptyLobbyForm());
      setIsCreateModalOpen(false);
      await refreshData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/lobbies/${id}`, { method: 'DELETE' });
      if (res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete lobby');
      }
      await refreshData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function joinLobby(id) {
    const res = await fetch(`/api/lobbies/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new Error(data.error || 'Lobby is full');
    }
    if (!res.ok && res.status !== 200) {
      throw new Error(data.error || 'Failed to join lobby');
    }
    await refreshData();
    return true;
  }

  async function leaveLobby(id) {
    const res = await fetch(`/api/lobbies/${id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
    });
    if (res.status !== 204) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to leave lobby');
    }
    await refreshData();
  }

  if (loading) return <main><p>Loading lobbies...</p></main>;
  if (error) return <main><p>Error: {error}</p></main>;

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-heading">
          <div>
            <h2 className="dashboard-title">Open lobbies</h2>
            <p className="muted">Join something new or host your own.</p>
          </div>
          <div className="dashboard-filter">
            <span className="field-label">Filter by tag</span>
            <select
              value={tag}
              onChange={e => setTag(e.target.value)}
              name="filter"
              id="dashboard-filter"
              className="field-input field-select"
            >
              <option value="All">All</option>
              <option value="Outdoors">Outdoors</option>
              <option value="Casual">Casual</option>
              <option value="Sports">Sports</option>
              <option value="Study">Study</option>
            </select>
          </div>
        </div>
        <div className="dashboard-actions">
          <button
            type="button"
            className="kbtn"
            onClick={() => navigate('/my-lobbies')}
          >
            My lobbies
          </button>
          <button
            type="button"
            className="kbtn kbtn-primary create-lobby-btn"
            onClick={() => setIsCreateModalOpen(true)}
          >
            + Create lobby
          </button>
        </div>
      </div>

      {isCreateModalOpen && (
        <div
          className="app-modal-backdrop"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="app-modal"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsCreateModalOpen(false)}
              aria-label="Close create lobby modal"
            >
              X
            </button>
            <h3>Create a new lobby</h3>
            <p className="modal-subtitle">Host a meetup by filling out the details below.</p>
            <form
              onSubmit={handleAdd}
              className="create-lobby-form"
            >
              <div className="field">
                <label className="field-label" htmlFor="lobby-name">Lobby name</label>
                <input
                  id="lobby-name"
                  className="field-input"
                  required
                  placeholder="Pickleball on campus"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="lobby-tag">Tag</label>
                  <select
                    id="lobby-tag"
                    className="field-input"
                    value={form.tag}
                    onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                  >
                    <option>Outdoors</option>
                    <option>Casual</option>
                    <option>Sports</option>
                    <option>Study</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="lobby-max">Max people</label>
                  <input
                    id="lobby-max"
                    className="field-input"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={form.max}
                    onChange={e => setForm(f => ({ ...f, max: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="lobby-time">Time</label>
                <input
                  id="lobby-time"
                  className="field-input"
                  required
                  placeholder="Fri @ 8:00 PM"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="lobby-location">Location</label>
                <input
                  id="lobby-location"
                  className="field-input"
                  required
                  placeholder="Student housing courtyard"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="kbtn"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="kbtn kbtn-primary"
                  disabled={!isFormValid}
                >
                  Add lobby
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div id="LobbyContainer">
        {visible.length === 0 ? (
          <p className="dashboard-empty">No lobbies match that filter yet.</p>
        ) : (
          visible.map(lobby => (
            <LobbyCard
              key={lobby.id}
              l={lobby}
              isJoined={joinedIds.has(String(lobby.id))}
              isFull={Number(lobby.people) >= Number(lobby.max)}
              onJoin={joinLobby}
              onLeave={leaveLobby}
              onDelete={() => handleDelete(lobby.id)}
            />
          ))
        )}
      </div>
    </main>
  );
}
