const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.argv.length > 2 ? process.argv[2] : 4000;

// ------------ Middleware -------------
app.use(express.json());
app.use(express.static('public'));

// ========== In-memory ==========

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

// User memberships: { [userName]: Set<lobbyId> }
const userMemberships = {};

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
  if (body.people !== undefined) {
    if (typeof body.people !== 'number' || Number.isNaN(body.people) || body.people < 0) {
      return 'people must be a non-negative number';
    }
    if (body.people > body.max) {
      return 'people cannot exceed max';
    }
  }
  return null;
}

function getLobbyById(id) {
  return lobbies.find(l => String(l.id) === String(id));
}

function addMembership(userName, lobbyId) {
  const id = String(lobbyId);
  if (!userMemberships[userName]) {
    userMemberships[userName] = new Set();
  }
  userMemberships[userName].add(id);
}

function removeMembership(userName, lobbyId) {
  const id = String(lobbyId);
  const set = userMemberships[userName];
  if (set) {
    set.delete(id);
    if (set.size === 0) {
      delete userMemberships[userName];
    }
  }
}

function removeLobbyFromAllMemberships(lobbyId) {
  const id = String(lobbyId);
  Object.keys(userMemberships).forEach(user => {
    removeMembership(user, id);
  });
}

function getUserLobbyIds(userName) {
  const set = userMemberships[userName];
  if (!set) return [];
  return Array.from(set);
}

function syncLobbyCount(lobbyId) {
  const id = String(lobbyId);
  const lobby = getLobbyById(id);
  if (lobby) {
    const list = lobbyMembers[id] || [];
    lobby.people = list.length;
  }
}

// ===================== AUTH / USERS =======================

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

  // make the java web token
  const token = jwt.sign(
    { id: user.id, userName: user.userName },   
    process.env.JWT_SECRET || 'likeASecretKeyOrSomethinIdkMan',
    { expiresIn: '1h' }                         
  );

  // Set cookie with token
  res.cookie('token', token, {
    httpOnly: true,
    secure: true, 
    maxAge: 3600000,    // 1 hour
    sameSite: 'strict',
  });

  res.json({ message: 'Logged in :0' });
});


// ===================== LOBBIES ============================

// list lobbies
app.get('/api/lobbies', (req, res) => {
  lobbies.forEach(l => syncLobbyCount(l.id));
  res.json(lobbies);
});

// get single lobby
app.get('/api/lobbies/:id', (req, res) => {
  syncLobbyCount(req.params.id);
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
    people: 0,
  };

  const err = validateLobby(body);
  if (err) return res.status(400).json({ error: err });

  const id = lobbies.length ? Math.max(...lobbies.map(l => Number(l.id))) + 1 : 1;
  const lobby = { id, ...body };
  lobbies.push(lobby);

  // seed helpers maps
  if (!lobbyMembers[id]) lobbyMembers[id] = [];
  if (!lobbyChat[id]) lobbyChat[id] = [];

  syncLobbyCount(id);

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
    people: 0,
  };

  const err = validateLobby(body);
  if (err) return res.status(400).json({ error: err });

  const index = lobbies.findIndex(l => String(l.id) === String(id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const members = lobbyMembers[id] || [];
  if (body.max < members.length) {
    return res.status(400).json({ error: 'max cannot be less than current member count' });
  }

  const updated = { id: Number(id), ...body, people: members.length };
  lobbies[index] = updated;
  res.json(updated);
});

// partial update lobby
app.patch('/api/lobbies/:id', (req, res) => {
  const id = req.params.id;
  const patch = { ...(req.body || {}) };

  if (patch.max !== undefined) patch.max = Number(patch.max);
  if (patch.people !== undefined) delete patch.people;

  const index = lobbies.findIndex(l => String(l.id) === String(id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const members = lobbyMembers[id] || [];
  const merged = { ...lobbies[index], ...patch, id: Number(id) };
  if (merged.max < members.length) {
    return res.status(400).json({ error: 'max cannot be less than current member count' });
  }
  merged.people = members.length;

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
  removeLobbyFromAllMemberships(id);

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

  const lobby = getLobbyById(id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

  if (!lobbyMembers[id]) lobbyMembers[id] = [];
  const list = lobbyMembers[id];

  if (list.includes(name)) {
    return res.status(200).json(list);
  }

  if (list.length >= lobby.max) {
    return res.status(409).json({ error: 'Lobby is full' });
  }

  list.push(name);
  lobbyMembers[id] = list;
  addMembership(name, id);
  syncLobbyCount(id);

  res.status(201).json(list);
});

// remove lobby member
app.delete('/api/lobbies/:id/members', (req, res) => {
  const id = String(req.params.id);
  const body = req.body || {};
  const name = (body.userName || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Missing userName' });

  const lobby = getLobbyById(id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

  const list = lobbyMembers[id] || [];
  const idx = list.indexOf(name);
  if (idx >= 0) list.splice(idx, 1);
  lobbyMembers[id] = list;

  removeMembership(name, id);
  syncLobbyCount(id);

  res.status(204).end();
});

// list lobbies a user has joined
app.get('/api/users/:userName/lobbies', (req, res) => {
  const userName = (req.params.userName || '').toString().trim();
  if (!userName) return res.status(400).json({ error: 'Missing userName' });

  const ids = getUserLobbyIds(userName);
  const joined = ids
    .map(id => {
      syncLobbyCount(id);
      return getLobbyById(id);
    })
    .filter(Boolean);

  res.json(joined);
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
