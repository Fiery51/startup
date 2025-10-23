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
      setForm(f => ({ ...f, name: '', time: '', location: '' }));
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

  // ✅ Join lobby (used by LobbyCard → then navigate inside the card)
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

  if (loading) return <main><p>Loading lobbies…</p></main>;
  if (error) return <main><p>Error: {error}</p></main>;

  return (
    <main>
      <div>
        <h2>Open Lobbies</h2>
        <select
          value={tag}
          onChange={e => setTag(e.target.value)}
          name="Filter"
          id="Filter"
        >
          <option value="All">All</option>
          <option value="Outdoors">Outdoors</option>
          <option value="Casual">Casual</option>
          <option value="Sports">Sports</option>
          <option value="Study">Study</option>
        </select>
      </div>

      {/* Quick add form */}
      <form
        onSubmit={handleAdd}
        style={{ margin: '1rem 0', display: 'grid', gap: '.5rem', maxWidth: 520 }}
      >
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <select
            value={form.tag}
            onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
          >
            <option>Outdoors</option>
            <option>Casual</option>
            <option>Sports</option>
            <option>Study</option>
          </select>
          <input
            type="number"
            min="1"
            placeholder="Max"
            value={form.max}
            onChange={e => setForm(f => ({ ...f, max: e.target.value }))}
          />
          <input
            type="number"
            min="0"
            placeholder="People"
            value={form.people}
            onChange={e => setForm(f => ({ ...f, people: e.target.value }))}
          />
        </div>
        <input
          required
          placeholder="Time (e.g., Fri 8:00 PM)"
          value={form.time}
          onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
        />
        <input
          required
          placeholder="Location"
          value={form.location}
          onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
        />
        <button type="submit">Add Lobby</button>
      </form>

      <div id="LobbyContainer">
        {visible.length === 0 ? (
          <p>No lobbies match that filter.</p>
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
