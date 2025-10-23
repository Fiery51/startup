import { setupWorker } from 'msw/browser'
import { http, HttpResponse } from 'msw'

//LOBBIES ==================================================================================================
const FAKE_LOBBIES = [
  { id: 1, name: 'Sunset Hike @ Y-Mountain', tag: 'Outdoors', people: 6, max: 10, time: 'Today 7:30 PM', location: 'Provo, UT' },
  { id: 2, name: 'Board Games & Boba',       tag: 'Casual',   people: 3, max: 6,  time: 'Fri 8:00 PM',   location: 'Riv. Commons' },
  { id: 3, name: 'Pick-up Basketball',       tag: 'Sports',   people: 9, max: 12, time: 'Sat 10:00 AM',  location: 'RB Courts' },
  { id: 4, name: 'Study Session – CS260',    tag: 'Study',    people: 4, max: 8,  time: 'Sun 3:00 PM',   location: 'HBLL' },
  { id: 5, name: 'Pickleball',               tag: 'Sports',   people: 4, max: 4,  time: 'Mon 1:00 PM',   location: 'HBLL' },
  { id: 6, name: 'Study Session – CS235',    tag: 'Study',    people: 4, max: 8,  time: 'Tue 3:00 PM',   location: 'TNRB' },
]
//Make it so this is all stored in that localstorage thing
const KEY = 'lobbies'
const delay = (ms) => new Promise(res => setTimeout(res, ms))

const db = {
    
    load() {
      try {
        const raw = localStorage.getItem(KEY)
        if (raw) return JSON.parse(raw)
      } catch {}
      localStorage.setItem(KEY, JSON.stringify(FAKE_LOBBIES))
      return [...FAKE_LOBBIES]
    },
  
    save(list) {
      localStorage.setItem(KEY, JSON.stringify(list))
    },
  
    all() {
      return this.load()
    },
  
    get(id) {
      return this.load().find(x => String(x.id) === String(id))
    },
  
    add(input) {
      const list = this.load()
      const id = list.length ? Math.max(...list.map(x => Number(x.id))) + 1 : 1
      const item = { id, people: 0, ...input }
      list.push(item)
      this.save(list)
      return item
    },
  
    update(id, patch, replace = false) {
      const list = this.load()
      const i = list.findIndex(x => String(x.id) === String(id))
      if (i === -1) return null
      list[i] = replace ? { ...patch, id: Number(id) } : { ...list[i], ...patch, id: Number(id) }
      this.save(list)
      return list[i]
    },

    remove(id) {
      const list = this.load()
      const i = list.findIndex(x => String(x.id) === String(id))
      if (i === -1) return false
      list.splice(i, 1)
      this.save(list)
      return true
    },
}

//LOGIN ==================================================================================================
// (these were missing)
const USER_KEY = 'users'
const seedUsers = [{ id: 1, userName: 'demo@demo.com', password: 'pass123' }]

const userDb = {
  load() {
    try {
      const raw = localStorage.getItem(USER_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    localStorage.setItem(USER_KEY, JSON.stringify(seedUsers))
    return [...seedUsers]
  },
  save(list) {
    localStorage.setItem(USER_KEY, JSON.stringify(list))
  },
  add(u) {
    const list = this.load()
    const id = list.length ? Math.max(...list.map(x => x.id)) + 1 : 1
    const user = { id, ...u }
    list.push(user)
    this.save(list)
    return user
  },
  find(name) {
    return this.load().find(u => u.userName === name)
  },
}


//because im gonna end up calling it with -5e5 people or something idk man. alsooo hiiiii whoever is grading this! If you see this comment lemme know in the comments of the assignment lol ^-^/
function validateLobby(body) {
  const required = ['name', 'tag', 'max', 'time', 'location']
  const missing = required.filter(k => body[k] === undefined || body[k] === null || body[k] === '')
  if (missing.length) return `Missing: ${missing.join(', ')}`
  if (typeof body.max !== 'number' || body.max <= 0) return 'max must be a positive number'
  if (body.people !== undefined && (typeof body.people !== 'number' || body.people < 0)) return 'people must be a non-negative number'
  return null
}


//Actual routes that return stuff now

export const worker = setupWorker(
  // GET /api/lobbies
  http.get('/api/lobbies', async (_req) => {
    try {
      await delay(200)
      return HttpResponse.json(db.all())
    } catch (e) {
      console.error('GET /api/lobbies failed', e)
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }),

  // GET /api/lobbies/:id
  http.get('/api/lobbies/:id', async (req) => {
    try {
      await delay(120)
      const item = db.get(req.params.id)
      return item
        ? HttpResponse.json(item)
        : HttpResponse.json({ error: 'Not found' }, { status: 404 })
    } catch (e) {
      console.error('GET /api/lobbies/:id failed', e)
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }),

  // POST /api/lobbies
  http.post('/api/lobbies', async (req) => {
    try {
      // IMPORTANT: real request body is on req.request (v2)
      const raw = await req.request.json().catch(() => ({}))
      // coerce + trim so strings from inputs don’t explode validation
      const body = {
        name: (raw.name ?? ''),
        tag: (raw.tag ?? ''),
        time: (raw.time ?? ''),
        location: (raw.location ?? ''),
        max: Number(raw.max),
        people: raw.people === undefined || raw.people === '' ? 0 : Number(raw.people),
      }
      const err = validateLobby(body)
      if (err) return HttpResponse.json({ error: err }, { status: 400 })
      await delay(200)
      const created = db.add(body)
      return HttpResponse.json(created, { status: 201 })
    } catch (e) {
      console.error('POST /api/lobbies failed', e)
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }),

  // PUT /api/lobbies/:id
  http.put('/api/lobbies/:id', async (req) => {
    try {
      const raw = await req.request.json().catch(() => ({}))  // <-- was req.json()
      const body = {
        name: (raw.name ?? '').toString().trim(),
        tag: (raw.tag ?? '').toString().trim(),
        time: (raw.time ?? '').toString().trim(),
        location: (raw.location ?? '').toString().trim(),
        max: Number(raw.max),
        people: raw.people === undefined || raw.people === '' ? 0 : Number(raw.people),
      }
      const err = validateLobby(body)
      if (err) return HttpResponse.json({ error: err }, { status: 400 })
      await delay(180)
      const updated = db.update(req.params.id, body, true)
      return updated
        ? HttpResponse.json(updated)
        : HttpResponse.json({ error: 'Not found' }, { status: 404 })
    } catch (e) {
      console.error('PUT /api/lobbies/:id failed', e)
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }),

  // PATCH /api/lobbies/:id
  http.patch('/api/lobbies/:id', async (req) => {
    try {
      const raw = await req.request.json().catch(() => ({}))  // <-- was req.json()
      const patch = { ...raw }
      if (patch.max !== undefined) patch.max = Number(patch.max)
      if (patch.people !== undefined) patch.people = Number(patch.people)
      await delay(160)
      const updated = db.update(req.params.id, patch, false)
      return updated
        ? HttpResponse.json(updated)
        : HttpResponse.json({ error: 'Not found' }, { status: 404 })
    } catch (e) {
      console.error('PATCH /api/lobbies/:id failed', e)
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }),

  // DELETE /api/lobbies/:id
  http.delete('/api/lobbies/:id', async (req) => {
    try {
      await delay(140)
      const ok = db.remove(req.params.id)
      return ok
        ? new HttpResponse(null, { status: 204 })
        : HttpResponse.json({ error: 'Not found' }, { status: 404 })
    } catch (e) {
      console.error('DELETE /api/lobbies/:id failed', e)
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }),
)


// User endpoints (login/create/list) =====================================================================

worker.use(
  // GET /api/users
  http.get('/api/users', () => HttpResponse.json(userDb.load())),

  // POST /api/users (register)
  http.post('/api/users', async req => {
    const body = await req.request.json().catch(() => ({}))
    if (!body.userName || !body.password)
      return HttpResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (userDb.find(body.userName))
      return HttpResponse.json({ error: 'User already exists' }, { status: 409 })
    const created = userDb.add(body)
    return HttpResponse.json({ id: created.id, userName: created.userName }, { status: 201 })
  }),

  // POST /api/login
  http.post('/api/login', async req => {
    const body = await req.request.json().catch(() => ({}))
    const user = userDb.find(body.userName)
    if (!user || user.password !== body.password)
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    return HttpResponse.json({ id: user.id, userName: user.userName })
  }),
)


//LOBBY + PROFILE INFO ========================================================================================================================
const LOBBY_MEMBERS_KEY = 'lobbyMembers'   // { [lobbyId]: [userName, ...] }
const LOBBY_CHAT_KEY    = 'lobbyChat'      // { [lobbyId]: [{user, text, ts}, ...] }

function loadMap(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  localStorage.setItem(key, JSON.stringify(fallback))
  return { ...fallback }
}
function saveMap(key, map) {
  localStorage.setItem(key, JSON.stringify(map))
}

// seed: put the creator of each seed lobby as a member (optional)
(function seedMembers() {
  const members = loadMap(LOBBY_MEMBERS_KEY, {})
  const chats = loadMap(LOBBY_CHAT_KEY, {})
  for (const l of FAKE_LOBBIES) {
    if (!members[l.id]) members[l.id] = []
    if (!chats[l.id]) chats[l.id] = []
  }
  saveMap(LOBBY_MEMBERS_KEY, members)
  saveMap(LOBBY_CHAT_KEY, chats)
})()

worker.use(
  // GET members
  http.get('/api/lobbies/:id/members', (req) => {
    const id = String(req.params.id)
    const members = loadMap(LOBBY_MEMBERS_KEY, {})
    return HttpResponse.json(members[id] || [])
  }),

  // POST join  { userName }
  http.post('/api/lobbies/:id/members', async (req) => {
    const id = String(req.params.id)
    const body = await req.request.json().catch(() => ({}))
    const name = (body.userName || '').toString().trim()
    if (!name) return HttpResponse.json({ error: 'Missing userName' }, { status: 400 })

    const members = loadMap(LOBBY_MEMBERS_KEY, {})
    const list = members[id] || []
    if (!list.includes(name)) list.push(name)
    members[id] = list
    saveMap(LOBBY_MEMBERS_KEY, members)

    // bump people count in lobby too
    const lobby = db.get(id)
    if (lobby) db.update(id, { people: (lobby.people || 0) + 1 })

    return HttpResponse.json(list, { status: 201 })
  }),

  // DELETE leave  (reads user from localStorage on client; but we accept body too)
  http.delete('/api/lobbies/:id/members', async (req) => {
    const id = String(req.params.id)
    const body = await req.request.json().catch(() => ({}))
    const name = (body.userName || '').toString().trim()
    if (!name) return HttpResponse.json({ error: 'Missing userName' }, { status: 400 })

    const members = loadMap(LOBBY_MEMBERS_KEY, {})
    const list = members[id] || []
    const idx = list.indexOf(name)
    if (idx >= 0) list.splice(idx, 1)
    members[id] = list
    saveMap(LOBBY_MEMBERS_KEY, members)

    const lobby = db.get(id)
    if (lobby) db.update(id, { people: Math.max(0, (lobby.people || 0) - 1) })

    return new HttpResponse(null, { status: 204 })
  }),

  // GET chat log
  http.get('/api/lobbies/:id/chat', (req) => {
    const id = String(req.params.id)
    const chats = loadMap(LOBBY_CHAT_KEY, {})
    return HttpResponse.json(chats[id] || [])
  }),

  // POST chat  { text, userName? }
  http.post('/api/lobbies/:id/chat', async (req) => {
    const id = String(req.params.id)
    const body = await req.request.json().catch(() => ({}))
    const text = (body.text || '').toString().trim()
    const user = (body.userName || localStorage.getItem('userName') || 'anon').toString()
    if (!text) return HttpResponse.json({ error: 'Empty message' }, { status: 400 })

    const chats = loadMap(LOBBY_CHAT_KEY, {})
    const log = chats[id] || []
    log.push({ user, text, ts: Date.now() })
    chats[id] = log
    saveMap(LOBBY_CHAT_KEY, chats)
    return HttpResponse.json(log[log.length - 1], { status: 201 })
  }),

  // PROFILE: get/update current user’s profile
  // Shape: { userName, bio, interests: string[], memberSince: string, topActivities: string[], avatarUrl?: string }
  http.get('/api/profile', () => {
    const userName = localStorage.getItem('userName') || ''
    const KEY = `profile:${userName}`
    if (!userName) return HttpResponse.json({ error: 'Not logged in' }, { status: 401 })

    const existing = localStorage.getItem(KEY)
    if (existing) return HttpResponse.json(JSON.parse(existing))

    // seed a default profile
    const profile = {
      userName,
      bio: 'Hi! This is my totally legit bio.',
      interests: ['Outdoors', 'Sports'],
      memberSince: new Date().toISOString().slice(0, 10),
      topActivities: ['Hiking', 'Basketball', 'Boba'],
      avatarUrl: 'DefaultProfileImg.png',
    }
    localStorage.setItem(KEY, JSON.stringify(profile))
    return HttpResponse.json(profile)
  }),

  http.put('/api/profile', async (req) => {
    const userName = localStorage.getItem('userName') || ''
    if (!userName) return HttpResponse.json({ error: 'Not logged in' }, { status: 401 })
    const body = await req.request.json().catch(() => ({}))
    const KEY = `profile:${userName}`
    const merged = { ...(JSON.parse(localStorage.getItem(KEY) || '{}')), ...body, userName }
    localStorage.setItem(KEY, JSON.stringify(merged))
    return HttpResponse.json(merged)
  }),
)

export async function enableFakeData() {
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
