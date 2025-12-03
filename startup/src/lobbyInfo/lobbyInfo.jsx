// src/lobbyInfo/lobbyInfo.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChatEvent, createChatNotifier } from '../chat/chatNotifier';
import { loadGoogleMaps } from '../lib/maps';
import '../styles.css';

export function LobbyInfo() {
  const { id } = useParams();
  const [lobby, setLobby] = useState(null);
  const [members, setMembers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendBusy, setSendBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [viewCoords, setViewCoords] = useState(null);
  const rawUserName = localStorage.getItem('userName') || '';
  const normalizedUser = rawUserName.toLowerCase();
  const [isMember, setIsMember] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapMarkerRef = useRef(null);
  const editLocationRef = useRef(null);
  const editMapRef = useRef(null);
  const editMapInstanceRef = useRef(null);
  const editMapMarkerRef = useRef(null);

  const fetchDetails = useCallback(async () => {
    const [lobbyRes, memRes] = await Promise.all([
      fetch(`/api/lobbies/${id}`),
      fetch(`/api/lobbies/${id}/members`),
    ]);

    const lobbyData = await lobbyRes.json().catch(() => ({}));
    const membersData = await memRes.json().catch(() => []);

    if (!lobbyRes.ok) {
      throw new Error(lobbyData.error || 'Failed to load lobby');
    }
    if (!memRes.ok) {
      throw new Error(membersData.error || 'Failed to load members');
    }

    return { lobbyData, membersData };
  }, [id]);

  const fetchChatMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/lobbies/${id}/chat`);
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || 'Failed to load chat');
      setChatMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to fetch chat', err);
    }
  }, [id]);

  const refresh = useCallback(async () => {
    const { lobbyData, membersData } = await fetchDetails();
    setLobby(lobbyData);
    setMembers(Array.isArray(membersData) ? membersData : []);
    setIsMember(membersData.some((name) => name.toLowerCase() === normalizedUser));
    setViewCoords(lobbyData?.coords || null);
    if (lobbyData?.canEdit) {
      const { date, timeOfDay } = parseTimeFields(lobbyData.time);
      setEditForm({
        name: lobbyData.name || '',
        tag: lobbyData.tag || 'Casual',
        max: lobbyData.max || '',
        date,
        timeOfDay,
        location: lobbyData.location || '',
        coords: lobbyData.coords || null,
      });
    } else {
      setEditForm(null);
      setEditMode(false);
    }
    await fetchChatMessages();
    setError(null);
  }, [fetchDetails, fetchChatMessages, normalizedUser]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { lobbyData, membersData } = await fetchDetails();
        if (!cancelled) {
          setLobby(lobbyData);
          setMembers(Array.isArray(membersData) ? membersData : []);
          setIsMember(membersData.some((name) => name.toLowerCase() === normalizedUser));
          await fetchChatMessages();
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchDetails, normalizedUser, fetchChatMessages]);

  // Render location map (fallback center if coords missing)
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (!google?.maps) return;
        const center = viewCoords
          ? { lat: Number(viewCoords.lat), lng: Number(viewCoords.lng) }
          : { lat: 39.5, lng: -98.35 }; // fallback to US center

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center,
            zoom: viewCoords ? 14 : 4,
            disableDefaultUI: true,
          });
        } else {
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setZoom(viewCoords ? 14 : 4);
        }

        if (viewCoords) {
          if (mapMarkerRef.current) {
            mapMarkerRef.current.setPosition(center);
          } else {
            mapMarkerRef.current = new google.maps.Marker({ position: center, map: mapInstanceRef.current });
          }
        } else if (mapMarkerRef.current) {
          mapMarkerRef.current.setMap(null);
          mapMarkerRef.current = null;
        }
      } catch (err) {
        console.warn('Map render failed', err);
      }
    })();
  }, [viewCoords]);

  // Attach autocomplete for edit form
  useEffect(() => {
    if (!editMode) return undefined;
    let autocomplete = null;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (!editLocationRef.current || !google?.maps?.places) return;
        autocomplete = new google.maps.places.Autocomplete(editLocationRef.current, {
          fields: ['formatted_address', 'geometry', 'name'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const label = place.name || place.formatted_address || '';
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          setEditForm((f) => ({
            ...f,
            location: label,
            coords: lat && lng ? { lat, lng } : f.coords,
          }));
        });
      } catch (err) {
        console.warn('Edit maps autocomplete init failed', err);
      }
    })();
    return () => {
      if (autocomplete) autocomplete.unbindAll?.();
    };
  }, [editMode]);

  // Render map preview in edit form
  useEffect(() => {
    if (!editMode || !editForm || (!editForm.coords && !lobby?.coords) || !editMapRef.current) return;
    const target = editForm.coords || lobby?.coords;
    if (!target) return;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (!google?.maps) return;
        const center = { lat: Number(target.lat), lng: Number(target.lng) };
        if (!editMapInstanceRef.current) {
          editMapInstanceRef.current = new google.maps.Map(editMapRef.current, {
            center,
            zoom: 13,
            disableDefaultUI: true,
          });
        } else {
          editMapInstanceRef.current.setCenter(center);
        }
        if (editMapMarkerRef.current) {
          editMapMarkerRef.current.setPosition(center);
        } else {
          editMapMarkerRef.current = new google.maps.Marker({ position: center, map: editMapInstanceRef.current });
        }
      } catch (err) {
        console.warn('Edit map render failed', err);
      }
    })();
  }, [editMode, editForm?.coords, lobby?.coords]);

  // If no coords but we have a location string, try to approximate via Places text search
  useEffect(() => {
    if (viewCoords || !lobby?.location) return;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (!google?.maps) return;
        const service = new google.maps.places.PlacesService(mapRef.current || document.createElement('div'));
        service.textSearch({ query: lobby.location }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            setViewCoords({ lat: loc.lat(), lng: loc.lng() });
          }
        });
      } catch (err) {
        console.warn('Location text search failed', err);
      }
    })();
  }, [viewCoords, lobby?.location]);

  useEffect(() => {
    const notifier = createChatNotifier(id);
    notifier.joinLobby(id);

    const handler = (event) => {
      if (event.type === ChatEvent.Chat && event.payload) {
        setChatMessages((prev) => [...prev, event.payload]);
      }
    };
    notifier.addHandler(handler);

    return () => {
      notifier.removeHandler(handler);
      notifier.socket?.close();
    };
  }, [id]);

  async function handleJoin() {
    if (!rawUserName) return;
    try {
      setJoinBusy(true);
      const res = await fetch(`/api/lobbies/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: rawUserName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        throw new Error(data.error || 'Lobby is full');
      }
      if (!res.ok && res.status !== 200) {
        throw new Error(data.error || 'Failed to join lobby');
      }
      await refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setJoinBusy(false);
    }
  }

  async function handleLeave() {
    if (!rawUserName) return;
    try {
      setLeaveBusy(true);
      const res = await fetch(`/api/lobbies/${id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: rawUserName }),
      });
      if (res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to leave lobby');
      }
      await refresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setLeaveBusy(false);
    }
  }

  async function handleSendMessage() {
    const text = messageText.trim();
    if (!text) return;
    try {
      setSendBusy(true);
      const res = await fetch(`/api/lobbies/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userName: rawUserName || 'anon' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }
      setMessageText('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSendBusy(false);
    }
  }

  async function handleUpdate() {
    if (!editForm) return;
    const time = `${editForm.date} ${editForm.timeOfDay}`.trim();
    const payload = {
      name: editForm.name,
      tag: editForm.tag,
      max: Number(editForm.max),
      time,
      location: editForm.location?.trim() || 'To be determined',
      coords: editForm.coords || null,
    };
    try {
      const res = await fetch(`/api/lobbies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update lobby');
      setLobby(data);
      setEditMode(false);
      const { date, timeOfDay } = parseTimeFields(data.time);
      setEditForm({
        name: data.name || '',
        tag: data.tag || 'Casual',
        max: data.max || '',
        date,
        timeOfDay,
        location: data.location || '',
        coords: data.coords || null,
      });
    } catch (err) {
      alert(err.message);
    }
  }

  function parseTimeFields(timeStr) {
    if (!timeStr) return { date: '', timeOfDay: '' };
    const parts = timeStr.split(/[\sT]+/);
    const date = parts[0] || '';
    const timeOfDay = parts[1] || '';
    return { date, timeOfDay };
  }

  function formatTimestamp(ts) {
    const d = new Date(Number(ts));
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  }

  if (loading) return <main><p>Loading lobby...</p></main>;
  if (error) return <main><p>Error: {error}</p></main>;
  if (!lobby) return <main><p>Lobby not found.</p></main>;

  const isFull = Number(lobby.people) >= Number(lobby.max);
  const canEdit = Boolean(lobby.canEdit);

  return (
    <main className="lobby-view">
      <div className="lobby-view__grid">
        <div className="lobby-view__card card lobby-view__card--info">
          <header className="lobby-view__header">
            <div>
              <h1>{lobby.name}</h1>
              <p className="muted">{lobby.location}</p>
            </div>
            <div className="lobby-view__meta">
              <span>{lobby.time}</span>
              <span>{Math.min(lobby.people, lobby.max)} / {lobby.max} spots</span>
            </div>
          <div className="lobby-view__actions">
            {canEdit && (
              <button
                type="button"
                className="kbtn kbtn-secondary"
                onClick={() => setEditMode((m) => !m)}
              >
                {editMode ? 'Cancel edit' : 'Edit lobby'}
              </button>
            )}
            {isMember ? (
              <button
                type="button"
                className="kbtn"
                onClick={handleLeave}
                disabled={leaveBusy}
              >
                {leaveBusy ? 'Leaving...' : 'Leave lobby'}
              </button>
            ) : (
              <button
                type="button"
                className="kbtn kbtn-primary"
                onClick={handleJoin}
                disabled={joinBusy || isFull}
              >
                {isFull ? 'Lobby full' : joinBusy ? 'Joining...' : 'Join lobby'}
              </button>
            )}
          </div>
        </header>

        {canEdit && editMode && editForm && (
          <section className="lobby-view__section">
            <h2>Edit lobby</h2>
            <div className="create-lobby-form">
              <div className="field">
                <label className="field-label" htmlFor="edit-name">Name</label>
                <input
                  id="edit-name"
                  className="field-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="field field-row">
                <div className="field">
                  <label className="field-label" htmlFor="edit-tag">Tag</label>
                  <select
                    id="edit-tag"
                    className="field-input field-select"
                    value={editForm.tag}
                    onChange={(e) => setEditForm(f => ({ ...f, tag: e.target.value }))}
                  >
                    <option value="Outdoors">Outdoors</option>
                    <option value="Casual">Casual</option>
                    <option value="Sports">Sports</option>
                    <option value="Study">Study</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="edit-max">Max people</label>
                  <input
                    id="edit-max"
                    type="number"
                    className="field-input"
                    min="1"
                    value={editForm.max}
                    onChange={(e) => setEditForm(f => ({ ...f, max: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field field-row">
                <div className="field">
                  <label className="field-label" htmlFor="edit-date">Date</label>
                  <input
                    id="edit-date"
                    type="date"
                    className="field-input"
                    value={editForm.date}
                    onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="edit-time">Time</label>
                  <input
                    id="edit-time"
                    type="time"
                    className="field-input"
                    value={editForm.timeOfDay}
                    onChange={(e) => setEditForm(f => ({ ...f, timeOfDay: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="edit-location">Location</label>
                <input
                  id="edit-location"
                  className="field-input"
                  placeholder="Enter location (optional)"
                  ref={editLocationRef}
                  value={editForm.location}
                  onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))}
                />
                <div className="map-preview" ref={editMapRef} aria-label="Edit map preview" />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="kbtn kbtn-primary"
                  onClick={handleUpdate}
                  disabled={!editForm.name || !editForm.date || !editForm.timeOfDay || !editForm.max}
                >
                  Save changes
                </button>
                <button type="button" className="kbtn" onClick={() => setEditMode(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

          <section className="lobby-view__section">
            <h2>Members</h2>
            {members.length === 0 ? (
              <p className="muted">No members yet.</p>
            ) : (
              <ul className="lobby-members">
                {members.map((name) => (
                  <li key={name} className="member">
                    <span className="avatar-circle" aria-hidden />
                    <Link to={`/profile/${encodeURIComponent(name)}`}>{name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {lobby.joke && (
            <section className="lobby-view__section">
              <h2>Lobby joke</h2>
              <p className="muted">{lobby.joke}</p>
            </section>
          )}

          <section className="lobby-view__section">
            <h2>Location</h2>
            <p>{lobby.location}</p>
            {lobby.coords ? (
              <div className="map-preview" ref={mapRef} aria-label="Lobby location map" />
            ) : (
              <p className="muted">No map available for this lobby.</p>
            )}
          </section>
        </div>

        <div className="lobby-view__card card lobby-view__card--chat">
          <section className="lobby-view__section">
            <h2>Chat</h2>
            <div className="chat-log">
              {chatMessages.length === 0 ? (
                <p className="muted">No messages yet.</p>
              ) : (
                chatMessages
                  .slice()
                  .sort((a, b) => Number(a.ts) - Number(b.ts))
                  .map((msg, idx) => {
                    const isSelf = msg.user?.toLowerCase?.() === normalizedUser;
                    return (
                      <div
                        key={`${msg.ts}-${idx}`}
                        className={`message ${isSelf ? 'me' : 'them'}`}
                      >
                        <div className="chat-message__meta">
                          <strong>{msg.user || 'anon'}</strong>
                          <span className="chat-message__time">{formatTimestamp(msg.ts)}</span>
                        </div>
                        <div>{msg.text}</div>
                      </div>
                    );
                  })
              )}
            </div>
            <div className="chat-input">
              <textarea
                id="chatMessage"
                name="chatMessage"
                placeholder="Enter message here"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={sendBusy}
              />
              <button type="button" onClick={handleSendMessage} disabled={sendBusy}>
                <strong>{sendBusy ? 'Sending...' : 'Send'}</strong>
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
