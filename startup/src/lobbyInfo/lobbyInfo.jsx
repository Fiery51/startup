// src/lobbyInfo/lobbyInfo.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChatEvent, createChatNotifier } from '../chat/chatNotifier';
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
  const rawUserName = localStorage.getItem('userName') || '';
  const normalizedUser = rawUserName.toLowerCase();
  const [isMember, setIsMember] = useState(false);

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

  function formatTimestamp(ts) {
    const d = new Date(Number(ts));
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  }

  if (loading) return <main><p>Loading lobby...</p></main>;
  if (error) return <main><p>Error: {error}</p></main>;
  if (!lobby) return <main><p>Lobby not found.</p></main>;

  const isFull = Number(lobby.people) >= Number(lobby.max);

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
            <p className="muted">Map integration coming soon.</p>
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
