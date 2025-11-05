// src/dashboard/dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import '../styles.css';
import { LobbyCard } from '../components/lobbyCard';

export function Dashboard() {
  const [all, setAll] = useState([]);
  const [tag, setTag] = useState('All');
  const [form, setForm] = useState({
    name: '',
    tag: 'Casual',
    max: 10,
    time: '',
    location: '',
    people: 0,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userName = localStorage.getItem('userName') || '';

  // Load lobbies on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/lobbies');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load lobbies');
        if (!cancelled) setAll(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  // Filter visible by tag
  const visible = useMemo(() => {
    if (tag === 'All') return all;
    return all.filter(d => d.tag === tag);
  }, [all, tag]);

  // Create lobby
  async function handleAdd(e) {
    e.preventDefault();
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
          people: Number(form.people) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create lobby');
      setAll(prev => [...prev, data]);

      // Reset fields & close modal
      setForm({
        name: '',
        tag: 'Casual',
        max: 10,
        time: '',
        location: '',
        people: 0,
      });
      setIsCreateModalOpen(false);
    } catch (e) {
      alert(e.message);
    }
  }

  // Delete lobby
  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/lobbies/${id}`, { method: 'DELETE' });
      if (res.status === 204) {
        setAll(prev => prev.filter(x => x.id !== id));
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (e) {
      alert(e.message);
    }
  }

  async function joinLobby(id) {
    const res = await fetch(`/api/lobbies/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to join');

    // Refresh counts after joining
    const r = await fetch('/api/lobbies');
    const updated = await r.json().catch(() => []);
    setAll(updated);
  }

  const isFormValid =
    Boolean(form.name && form.time && form.location) &&
    Number(form.max) > 0;

  if (loading) return <main><p>Loading lobbies...</p></main>;
  if (error) return <main><p>Error: {error}</p></main>;

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-heading">
          <h2 className="dashboard-title">Open Lobbies</h2>
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

        {/* Button that triggers the modal */}
        <button
          type="button"
          className="kbtn kbtn-primary create-lobby-btn"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Create Lobby
        </button>
      </div>

      {/* Modal for create lobby */}
      {isCreateModalOpen && (
        <div
          className="app-modal-backdrop"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="app-modal"
            onClick={e => e.stopPropagation()} // prevent closing when clicking inside
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsCreateModalOpen(false)}
              aria-label="Close create lobby modal"
            >
              X
            </button>
            <h3>Create a New Lobby</h3>
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
                <div className="field">
                  <label className="field-label" htmlFor="lobby-people">Currently joined</label>
                  <input
                    id="lobby-people"
                    className="field-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.people}
                    onChange={e => setForm(f => ({ ...f, people: e.target.value }))}
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
                  Add Lobby
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
          visible.map(d => (
            <LobbyCard
              key={d.id}
              l={d}
              onDelete={() => handleDelete(d.id)}
              onJoin={joinLobby}
            />
          ))
        )}
      </div>
    </main>
  );
}
