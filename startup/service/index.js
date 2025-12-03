const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const { connectToDatabase } = require('./db');
const { peerProxy, broadcastToLobby } = require('./peerProxy');

const secureCookie = process.env.NODE_ENV === 'production';

const adminUsers = new Set(
  (process.env.ADMIN_USERS || '')
    .split(',')
    .map((n) => (n || '').trim().toLowerCase())
    .filter(Boolean)
);

let mapsConfig = { apiKey: '' };
try {
  // Load server-side maps config (not checked into VCS)
  // eslint-disable-next-line global-require, import/no-dynamic-require
  mapsConfig = require('./mapsConfig.json');
} catch {
  console.warn('mapsConfig.json not found; /api/maps-key will return empty apiKey');
}

const app = express();
const port = process.argv.length > 2 ? process.argv[2] : 4000;
const authCookieName = 'token';
app.set('trust proxy', 1);

// ------------ Middleware -------------
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());

app.use((req, _res, next) => {
  const token = req.cookies?.[authCookieName];
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'likeASecretKeyOrSomethinIdkMan'
    );
    req.user = decoded;
  } catch (err) {
    req.user = null;
  }

  next();
});

let fetchImplCache = null;
async function getFetch() {
  if (typeof global.fetch === 'function') {
    return global.fetch.bind(global);
  }
  if (!fetchImplCache) {
    const mod = await import('node-fetch');
    fetchImplCache = mod.default;
  }
  return fetchImplCache;
}

const collections = {
  users: null,
  lobbies: null,
  memberships: null,
  profiles: null,
  chats: null,
};

const normalizeName = (name) => (name || '').toString().trim().toLowerCase();

const isAdminUser = (user) => {
  if (!user) return false;
  const normalized = normalizeName(user.userName);
  return user.role === 'admin' || adminUsers.has(normalized);
};

function parseLobbyNumber(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return null;
  return num;
}

function toLobbyResponse(doc, user = null) {
  if (!doc) return null;
  return {
    id: doc.id,
    name: doc.name,
    tag: doc.tag,
    max: doc.max,
    time: doc.time,
    location: doc.location,
    people: doc.people ?? 0,
    joke: doc.joke,
    coords: doc.coords ? { lat: doc.coords.lat, lng: doc.coords.lng } : null,
    creatorUserId: doc.creatorUserId ? doc.creatorUserId.toString() : undefined,
    creatorUserName: doc.creatorUserName,
    canEdit: isOwnerOrAdmin(user, doc),
  };
}

function toProfileResponse(doc) {
  if (!doc) return null;
  return {
    userName: doc.userName,
    bio: doc.bio || '',
    interests: Array.isArray(doc.interests) ? doc.interests : [],
    memberSince: doc.memberSince,
    topActivities: Array.isArray(doc.topActivities) ? doc.topActivities : [],
    avatarUrl: doc.avatarUrl || 'DefaultProfileImg.png',
  };
}

async function findUser(userName) {
  const normalized = normalizeName(userName);
  if (!normalized) return null;
  return collections.users.findOne({ normalizedUserName: normalized });
}

async function ensureProfile(userName) {
  const trimmed = (userName || '').toString().trim();
  if (!trimmed) return null;
  const normalized = normalizeName(trimmed);
  const existing = await collections.profiles.findOne({ normalizedUserName: normalized });
  if (existing) return toProfileResponse(existing);

  const fresh = {
    userName: trimmed,
    normalizedUserName: normalized,
    bio: '',
    interests: [],
    topActivities: [],
    avatarUrl: 'DefaultProfileImg.png',
    memberSince: new Date().toISOString().slice(0, 10),
  };
  await collections.profiles.insertOne(fresh);
  return toProfileResponse(fresh);
}

async function updateLobbyPeopleCount(lobbyId) {
  const count = await collections.memberships.countDocuments({ lobbyId });
  await collections.lobbies.updateOne({ _id: lobbyId }, { $set: { people: count } });
  return count;
}

async function fetchLobbyJoke() {
  try {
    const fetchFn = await getFetch();
    const res = await fetchFn('https://official-joke-api.appspot.com/random_joke', { cache: 'no-store' });
    if (!res?.ok) throw new Error(`Unexpected status ${res?.status}`);
    const data = await res.json();
    if (data?.setup && data?.punchline) {
      return `${data.setup} ${data.punchline}`;
    }
  } catch (err) {
    console.warn('Failed to fetch lobby joke', err);
  }
  return null;
}

function setAuthCookie(res, authToken) {
  res.cookie(authCookieName, authToken, {
    maxAge: 1000 * 60 * 60 * 24 * 365,
    secure: secureCookie,
    httpOnly: true,
    sameSite: secureCookie ? 'strict' : 'lax',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(authCookieName, {
    secure: secureCookie,
    httpOnly: true,
    sameSite: secureCookie ? 'strict' : 'lax',
  });
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
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
  if (body.coords) {
    const lat = Number(body.coords.lat);
    const lng = Number(body.coords.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return 'coords.lat and coords.lng must be numbers';
    }
  }
  return null;
}

async function getLobbyByPublicId(idParam) {
  const numericId = parseLobbyNumber(idParam);
  if (numericId === null) return null;
  return collections.lobbies.findOne({ id: numericId });
}

function isOwnerOrAdmin(user, lobby) {
  if (!user || !lobby) return false;
  if (user.role === 'admin') return true;
  return lobby.creatorUserId && lobby.creatorUserId.toString() === user.id;
}

async function getNextLobbyId() {
  const [latest] = await collections.lobbies.find({}).sort({ id: -1 }).limit(1).toArray();
  const lastValue = Number(latest?.id);
  if (!Number.isFinite(lastValue) || lastValue < 0) {
    return 1;
  }
  return lastValue + 1;
}

async function listMembers(lobbyId) {
  const members = await collections.memberships
    .find({ lobbyId }, { projection: { _id: 0, userName: 1 } })
    .sort({ joinedAt: 1 })
    .toArray();
  return members.map(m => m.userName);
}

// ===================== AUTH / USERS =======================

app.get('/api/users', async (_req, res) => {
  const users = await collections.users
    .find({}, { projection: { userName: 1 } })
    .sort({ userName: 1 })
    .toArray();
  res.json(users.map(u => ({ id: u._id.toString(), userName: u.userName })));
});

app.post('/api/users', async (req, res) => {
  const { userName, password } = req.body || {};
  if (!userName || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const normalized = normalizeName(userName);
  const existing = await collections.users.findOne({ normalizedUserName: normalized });
  if (existing) {
    return res.status(409).json({ error: 'User exists' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const doc = {
      userName: userName.trim(),
      normalizedUserName: normalized,
      password: passwordHash,
      role: adminUsers.has(normalized) ? 'admin' : 'user',
      memberSince: new Date().toISOString().slice(0, 10),
      createdAt: new Date(),
    };
    const result = await collections.users.insertOne(doc);
    await ensureProfile(userName);
    res.status(201).json({ id: result.insertedId.toString(), userName: doc.userName });
  } catch (err) {
    console.error('Failed to create user', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/login', async (req, res) => {
  const { userName, password } = req.body || {};
  const user = await findUser(userName);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const ok = await bcrypt.compare(password || '', user.password || '');
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (isAdminUser(user) && user.role !== 'admin') {
    await collections.users.updateOne(
      { _id: user._id },
      { $set: { role: 'admin' } }
    );
    user.role = 'admin';
  }

  const token = jwt.sign(
    { id: user._id.toString(), userName: user.userName, role: user.role || 'user' },
    process.env.JWT_SECRET || 'likeASecretKeyOrSomethinIdkMan',
    { expiresIn: '1h' }
  );

  setAuthCookie(res, token);
  res.json({ message: 'Logged in :0' });
});

app.post('/api/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

// ===================== MAPS KEY ===========================
app.get('/api/maps-key', (_req, res) => {
  res.json({ apiKey: mapsConfig.apiKey || '' });
});

// ===================== LOBBIES ============================

app.get('/api/lobbies', async (_req, res) => {
  const lobbies = await collections.lobbies.find({}).sort({ createdAt: -1 }).toArray();
  res.json(lobbies.map((l) => toLobbyResponse(l)));
});

app.get('/api/lobbies/:id', async (req, res) => {
  const lobby = await getLobbyByPublicId(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  res.json(toLobbyResponse(lobby, req.user));
});

app.post('/api/lobbies', requireAuth, async (req, res) => {
  const raw = req.body || {};
  const body = {
    name: (raw.name ?? '').toString().trim(),
    tag: (raw.tag ?? '').toString().trim() || 'Casual',
    time: (raw.time ?? '').toString().trim(),
    location: (raw.location ?? '').toString().trim(),
    max: Number(raw.max),
    people: 0,
    coords: raw.coords ? { lat: Number(raw.coords.lat), lng: Number(raw.coords.lng) } : undefined,
  };

  const err = validateLobby(body);
  if (err) return res.status(400).json({ error: err });

  const doc = {
    ...body,
    id: await getNextLobbyId(),
    creatorUserId: req.user?.id,
    creatorUserName: req.user?.userName,
    createdAt: new Date(),
  };
  const joke = await fetchLobbyJoke();
  if (joke) doc.joke = joke;

  const result = await collections.lobbies.insertOne(doc);
  const inserted = await collections.lobbies.findOne({ _id: result.insertedId });
  res.status(201).json(toLobbyResponse(inserted, req.user));
});

app.put('/api/lobbies/:id', requireAuth, async (req, res) => {
  const lobby = await getLobbyByPublicId(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerOrAdmin(req.user, lobby)) return res.status(403).json({ error: 'Forbidden' });
  const raw = req.body || {};
  const body = {
    name: (raw.name ?? '').toString().trim(),
    tag: (raw.tag ?? '').toString().trim(),
    time: (raw.time ?? '').toString().trim(),
    location: (raw.location ?? '').toString().trim(),
    max: Number(raw.max),
    coords: raw.coords ? { lat: Number(raw.coords.lat), lng: Number(raw.coords.lng) } : lobby.coords,
  };
  const members = await collections.memberships.countDocuments({ lobbyId: lobby._id });
  const err = validateLobby({ ...body, people: members });
  if (err) return res.status(400).json({ error: err });
  if (body.max < members) {
    return res.status(400).json({ error: 'max cannot be less than current member count' });
  }
  await collections.lobbies.updateOne(
    { _id: lobby._id },
    { $set: { ...body, people: members } }
  );
  const updated = await collections.lobbies.findOne({ _id: lobby._id });
  res.json(toLobbyResponse(updated, req.user));
});

app.patch('/api/lobbies/:id', requireAuth, async (req, res) => {
  const lobby = await getLobbyByPublicId(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerOrAdmin(req.user, lobby)) return res.status(403).json({ error: 'Forbidden' });
  const patch = { ...(req.body || {}) };
  if (patch.people !== undefined) delete patch.people;
  if (patch.max !== undefined) patch.max = Number(patch.max);
  if (patch.coords) {
    patch.coords = { lat: Number(patch.coords.lat), lng: Number(patch.coords.lng) };
  }
  const members = await collections.memberships.countDocuments({ lobbyId: lobby._id });
  const merged = { ...lobby, ...patch, people: members };
  const err = validateLobby(merged);
  if (err) return res.status(400).json({ error: err });
  await collections.lobbies.updateOne(
    { _id: lobby._id },
    { $set: merged }
  );
  const updated = await collections.lobbies.findOne({ _id: lobby._id });
  res.json(toLobbyResponse(updated, req.user));
});

app.delete('/api/lobbies/:id', requireAuth, async (req, res) => {
  const lobby = await getLobbyByPublicId(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerOrAdmin(req.user, lobby)) return res.status(403).json({ error: 'Forbidden' });
  await collections.lobbies.deleteOne({ _id: lobby._id });
  await collections.memberships.deleteMany({ lobbyId: lobby._id });
  await collections.chats.deleteMany({ lobbyId: lobby._id });
  res.status(204).end();
});

// ================ LOBBY MEMBERS ============================

app.get('/api/lobbies/:id/members', async (req, res) => {
  const lobby = await getLobbyByPublicId(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
  const members = await listMembers(lobby._id);
  res.json(members);
});

app.post('/api/lobbies/:id/members', requireAuth, async (req, res) => {
  const lobby = await getLobbyByPublicId(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

  const name = (req.body?.userName || req.user?.userName || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Missing userName' });
  const normalized = normalizeName(name);

  const existing = await collections.memberships.findOne({ lobbyId: lobby._id, normalizedUserName: normalized });
  if (existing) {
    const members = await listMembers(lobby._id);
    return res.status(200).json(members);
  }

  const memberCount = await collections.memberships.countDocuments({ lobbyId: lobby._id });
  if (memberCount >= lobby.max) {
    return res.status(409).json({ error: 'Lobby is full' });
  }

  await collections.memberships.insertOne({
    lobbyId: lobby._id,
    userName: name,
    normalizedUserName: normalized,
    joinedAt: new Date(),
  });
  await updateLobbyPeopleCount(lobby._id);
  const members = await listMembers(lobby._id);
  res.status(201).json(members);
});

app.delete('/api/lobbies/:id/members', requireAuth, async (req, res) => {
  const lobby = await getLobbyByPublicId(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });

  const name = (req.body?.userName || req.user?.userName || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'Missing userName' });
  const normalized = normalizeName(name);

  await collections.memberships.deleteOne({ lobbyId: lobby._id, normalizedUserName: normalized });
  await updateLobbyPeopleCount(lobby._id);
  res.status(204).end();
});

app.get('/api/users/:userName/lobbies', async (req, res) => {
  const userName = (req.params.userName || '').toString().trim();
  if (!userName) return res.status(400).json({ error: 'Missing userName' });
  const normalized = normalizeName(userName);
  const membershipDocs = await collections.memberships
    .find({ normalizedUserName: normalized })
    .sort({ joinedAt: 1 })
    .toArray();
  if (!membershipDocs.length) return res.json([]);
  const lobbyIds = membershipDocs.map(m => m.lobbyId);
  const lobbyDocs = await collections.lobbies
    .find({ _id: { $in: lobbyIds } })
    .toArray();
  const map = new Map(lobbyDocs.map(doc => [doc._id.toString(), doc]));
  const ordered = membershipDocs
    .map(m => map.get(m.lobbyId.toString()))
    .filter(Boolean)
    .map(toLobbyResponse);
  res.json(ordered);
});

// ================ LOBBY CHAT ===============================

app.get('/api/lobbies/:id/chat', async (req, res) => {
  const lobby = await getLobbyByPublicId(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
  const lobbyId = lobby._id;
  const messages = await collections.chats
    .find({ lobbyId }, { projection: { _id: 0, user: 1, text: 1, ts: 1 } })
    .sort({ ts: 1 })
    .toArray();
  res.json(messages);
});

app.post('/api/lobbies/:id/chat', async (req, res) => {
  const lobby = await getLobbyByPublicId(req.params.id);
  if (!lobby) return res.status(404).json({ error: 'Lobby not found' });
  const lobbyId = lobby._id;
  const body = req.body || {};
  const text = (body.text || '').toString().trim();
  const user = (body.userName || 'anon').toString();
  if (!text) return res.status(400).json({ error: 'Empty message' });
  const msg = { lobbyId, user, text, ts: Date.now() };
  await collections.chats.insertOne(msg);
  broadcastToLobby(lobby.id?.toString(), { user, text, ts: msg.ts });
  res.status(201).json({ user, text, ts: msg.ts });
});

// =================== PROFILES ==============================

app.get('/api/profile', requireAuth, async (req, res) => {
  const userName = (req.query.userName || req.user?.userName || '').toString().trim();
  if (!userName) return res.status(401).json({ error: 'Not logged in' });
  const profile = await ensureProfile(userName);
  res.json(profile);
});

app.put('/api/profile', requireAuth, async (req, res) => {
  const userName = (req.query.userName || req.user?.userName || '').toString().trim();
  if (!userName) return res.status(401).json({ error: 'Not logged in' });
  const normalized = normalizeName(userName);
  const existing = await collections.profiles.findOne({ normalizedUserName: normalized });
  const payload = {
    bio: req.body?.bio || '',
    interests: Array.isArray(req.body?.interests) ? req.body.interests : [],
    topActivities: Array.isArray(req.body?.topActivities) ? req.body.topActivities : [],
    avatarUrl: req.body?.avatarUrl || 'DefaultProfileImg.png',
    userName,
    normalizedUserName: normalized,
  };

  const updated = await collections.profiles.findOneAndUpdate(
    { normalizedUserName: normalized },
    {
      $set: {
        ...payload,
        memberSince: existing?.memberSince || new Date().toISOString().slice(0, 10),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
  res.json(toProfileResponse(updated.value));
});

app.get('/api/publicProfile/:userName', async (req, res) => {
  const rawName = (req.params.userName || '').toString().trim();
  if (!rawName) return res.status(400).json({ error: 'Missing userName' });
  const normalized = normalizeName(rawName);
  const profile = await collections.profiles.findOne({ normalizedUserName: normalized });
  if (profile) return res.json(toProfileResponse(profile));

  const user = await collections.users.findOne({ normalizedUserName: normalized });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ensured = await ensureProfile(user.userName);
  res.json(ensured);
});

// -------------- SPA fallback ----------------
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  try {
    const db = await connectToDatabase();
    collections.users = db.collection('users');
    collections.lobbies = db.collection('lobbies');
    collections.memberships = db.collection('memberships');
    collections.profiles = db.collection('profiles');
    collections.chats = db.collection('chats');

    await Promise.all([
      collections.users.createIndex({ normalizedUserName: 1 }, { unique: true }),
      collections.memberships.createIndex({ lobbyId: 1, normalizedUserName: 1 }, { unique: true }),
      collections.profiles.createIndex({ normalizedUserName: 1 }, { unique: true }),
      collections.lobbies.createIndex({ id: 1 }, { unique: true }),
      collections.lobbies.createIndex({ tag: 1 }),
      collections.chats.createIndex({ lobbyId: 1, ts: 1 }),
    ]);

    const httpService = app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
    peerProxy(httpService);
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();


