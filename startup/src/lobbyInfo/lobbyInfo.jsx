// src/lobbyInfo/lobbyInfo.jsx
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import '../styles.css';

export function LobbyInfo() {
  const { id } = useParams();
  const [lobby, setLobby] = React.useState(null);
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [lobbyRes, memRes] = await Promise.all([
          fetch(`/api/lobbies/${id}`),
          fetch(`/api/lobbies/${id}/members`),
        ]);

        const lobbyData = await lobbyRes.json();
        const membersData = await memRes.json();

        if (!lobbyRes.ok) throw new Error(lobbyData.error || 'Failed to load lobby');
        if (!memRes.ok) throw new Error(membersData.error || 'Failed to load members');

        if (!cancelled) {
          setLobby(lobbyData);
          setMembers(membersData);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <main><p>Loading lobby…</p></main>;
  if (error) return <main><p>Error: {error}</p></main>;
  if (!lobby) return <main><p>Lobby not found</p></main>;

  return (
    <main>
      <h1>Lobby Info</h1>
      <div id="LobbyInfoContainer">
        <div id="Members">
          <h2>{lobby.name}</h2>

          <div>
            <strong>Members</strong>
            {members.length === 0 && <p>No members yet.</p>}
            {members.map((name) => (
              <div className="member" key={name}>
                <span className="avatar-circle" aria-hidden />
                {/* Link to the profile page */}
                <Link to={`/profileskeleton/${encodeURIComponent(name)}`}>
                  {name}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div id="location">
          <h2>Location</h2>
          <div>Map API call Here</div>
          <div>
            <h3>Time</h3>
            <p>{lobby.time}</p>
            <h3>Date</h3>
          </div>
        </div>

        <div id="Chat">
          <h2>Chat</h2>
          <div className="chat-log">
            this'll be connected to a chat later, we need a database 
          </div>
          <div className="chat-input">
            <textarea id="chatMessage" name="chatMessage" placeholder="Enter Message Here" />
            <button type="button"><strong>Send</strong></button>
          </div>
        </div>
      </div>
    </main>
  );
}
