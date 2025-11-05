const express = require('express');
const path = require('path');

const app = express();
const port = process.argv.length > 2 ? process.argv[2] : 4000;

// ------------ Middleware -------------
app.use(express.json());
app.use(express.static('public'));

// ========== In-memory "DB" (no seed data) ==========

// Users: [{ id, userName, password }]
let users = [];

// Lobbies: [{ id, name, tag, people, max, time, location }]
let lobbies = [];

// Lobby members: { [lobbyId]: [userName, ...] }
let lobbyMembers = {};

// Lobby chat: { [lobbyId]: [{ user, text, ts }, ...] }
let lobbyChat = {};

// Profiles: { [userName]: { ...profileFields } }
let profiles = {};

// ----------------- Helpers -----------------
function findUser(userName) {
  return users.find(u => u.userName === userName);
}

function validateLobby(body) {
  const required = ['name', 'tag', 'max', 'time', 'location'];
  const missing = required.filter(k =>
    body[k] === undefined || body[k] === null || body[k] === ''
  );
  if (missing.length) return `Missing: ${missing.join(', ')}`;
  if (typeof body.max !== 'number' || Number.isNaN(body.max) || body.max <= 0) {
    return 'max must be a positive number';
  }
  if (body.people !== undefined && (typeof body.people !== 'number' || Number.isNaN(body.people) || body.people < 0)) {
    return 'people must be a non-negative number';
  }
  return null;
}

function getLobbyById(id) {
  return lobbies.find(l => String(l.id) === String(id));
}

// ===================== AUTH / USERS =======================

// (optional) list users – mostly for debugging
app.get('/api/users', (req, res) => {
  res.json(users.map(u => ({ id: u.id, userName: u.userName })));
});

// create user
app.post('/api/users', (req, res) => {
  const { userName, password } = req.body || {};
  if (!userName || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (findUser(userName)) {
    return res.status(409).json({ error: 'User exists' });
  }
  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
  const user = { id, userName, password };
  users.push(user);
  res.status(201).json({ id, userName });
});

// login
app.post('/api/login', (req, res) => {
  const { userName, password } = req.body || {};
  const user = findUser(userName);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // client stores userName in localStorage; we just return user info
  res.json({ id: user.id, userName: user.userName });
});

// ===================== LOBBIES ============================

// list lobbies
app.get('/api/lobbies', (req, res) => {
  res.json(lobbies);
});

// get single lobby
app.get('/api/lobbies/:id', (req, res) => {
  const lobby = getLobbyById(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  res.json(lobby);
});

// create lobby
app.post('/api/lobbies', (req, res) => {
  const raw = req.body || {};
  const body = {
    name: raw.name ?? '',
    tag: raw.tag ?? '',
    time: raw.time ?? '',
    location: raw.location ?? '',
    max: Number(raw.max),
    people: raw.people === undefined || raw.people === '' ? 0 : Number(raw.people),
  };

  const err = validateLobby(body);
  if (err) return res.status(400).json({ error: err });

  const id = lobbies.length ? Math.max(...lobbies.map(l => Number(l.id))) + 1 : 1;
  const lobby = { id, ...body };
  lobbies.push(lobby);

  // seed helpers maps
  if (!lobbyMembers[id]) lobbyMembers[id] = [];
  if (!lobbyChat[id]) lobbyChat[id] = [];

  res.status(201).json(lobby);
});

// full update lobby
app.put('/api/lobbies/:id', (req, res) => {
  const id = req.params.id;
  const raw = req.body || {};
  const body = {
    name: (raw.name ?? '').toString().trim(),
    tag: (raw.tag ?? '').toString().trim(),
    time: (raw.time ?? '').toString().trim(),
    location: (raw.location ?? '').toString().trim(),
    max: Number(raw.max),
    people: raw.people === undefined || raw.people === '' ? 0 : Number(raw.people),
  };

  const err = validateLobby(body);
  if (err) return res.status(400).json({ error: err });

  const index = lobbies.findIndex(l => String(l.id) === String(id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  lobbies[index] = { id: Number(id), ...body };
  res.json(lobbies[index]);
});

// partial update lobby
app.patch('/api/lobbies/:id', (req, res) => {
  const id = req.params.id;
  const patch = { ...(req.body || {}) };

  if (patch.max !== undefined) patch.max = Number(patch.max);
  if (patch.people !== undefined) patch.people = Number(patch.people);

  const index = lobbies.findIndex(l => String(l.id) === String(id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const merged = { ...lobbies[index], ...patch, id: Number(id) };
  const err = validateLobby(merged);
  if (err) return res.status(400).json({ error: err });

  lobbies[index] = merged;
  res.json(merged);
});

// delete lobby
app.delete('/api/lobbies/:id', (req, res) => {
  const id = req.params.id;
  const index = lobbies.findIndex(l => String(l.id) === String(id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  lobbies.splice(index, 1);
  delete lobbyMembers[id];
  delete lobbyChat[id];

  res.status(204).end();
});

// ================ LOBBY MEMBERS ============================

// get lobby members
app.get('/api/lobbies/:id/members', (req, res) => {
  const id = String(req.params.id);
  res.json(lobbyMembers[id] || []);
});

// add lobby member
app.post('/api/lobbies/:id/members', (req, res) => {
  const id = String(req.params.id);
  const body = req.body || {};
  const name = (body.userName || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Missing userName' });

  const list = lobbyMembers[id] || [];
  if (!list.includes(name)) list.push(name);
  lobbyMembers[id] = list;

  const lobby = getLobbyById(id);
  if (lobby) {
    lobby.people = (lobby.people || 0) + 1;
  }

  res.status(201).json(list);
});

// remove lobby member
app.delete('/api/lobbies/:id/members', (req, res) => {
  const id = String(req.params.id);
  const body = req.body || {};
  const name = (body.userName || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Missing userName' });

  const list = lobbyMembers[id] || [];
  const idx = list.indexOf(name);
  if (idx >= 0) list.splice(idx, 1);
  lobbyMembers[id] = list;

  const lobby = getLobbyById(id);
  if (lobby) {
    lobby.people = Math.max(0, (lobby.people || 0) - 1);
  }

  res.status(204).end();
});

// ================ LOBBY CHAT ===============================

// get chat log
app.get('/api/lobbies/:id/chat', (req, res) => {
  const id = String(req.params.id);
  res.json(lobbyChat[id] || []);
});

// post chat message
app.post('/api/lobbies/:id/chat', (req, res) => {
  const id = String(req.params.id);
  const body = req.body || {};
  const text = (body.text || '').toString().trim();
  const user = (body.userName || 'anon').toString();
  if (!text) return res.status(400).json({ error: 'Empty message' });

  const log = lobbyChat[id] || [];
  const msg = { user, text, ts: Date.now() };
  log.push(msg);
  lobbyChat[id] = log;

  res.status(201).json(msg);
});

// =================== PROFILES ==============================
// NOTE: since this is a simple in-memory backend, we pass the
// userName as a query param: /api/profile?userName=foo

app.get('/api/profile', (req, res) => {
  const userName = (req.query.userName || '').toString().trim();
  if (!userName) return res.status(401).json({ error: 'Not logged in' });

  if (!profiles[userName]) {
    profiles[userName] = {
      userName,
      bio: '',
      interests: [],
      memberSince: new Date().toISOString().slice(0, 10),
      topActivities: [],
      avatarUrl: 'DefaultProfileImg.png',
    };
  }
  res.json(profiles[userName]);
});

app.put('/api/profile', (req, res) => {
  const userName = (req.query.userName || '').toString().trim();
  if (!userName) return res.status(401).json({ error: 'Not logged in' });

  const prev = profiles[userName] || {
    userName,
    bio: '',
    interests: [],
    memberSince: new Date().toISOString().slice(0, 10),
    topActivities: [],
    avatarUrl: 'DefaultProfileImg.png',
  };
  const body = req.body || {};
  const merged = { ...prev, ...body, userName };
  profiles[userName] = merged;
  res.json(merged);
});

// Optional: public profile endpoint (no seed data; uses saved profiles)
app.get('/api/publicProfile/:userName', (req, res) => {
  const name = String(req.params.userName || '').toLowerCase();
  const profile = Object.values(profiles).find(
    p => (p.userName || '').toLowerCase() === name
  );
  if (!profile) return res.status(404).json({ error: 'User not found' });
  res.json(profile);
});

// -------------- SPA fallback ----------------
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
