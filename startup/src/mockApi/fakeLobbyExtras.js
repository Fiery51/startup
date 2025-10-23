// src/mockApi/fakeLobbyExtras.js
import { http, HttpResponse } from 'msw'
import { db, FAKE_LOBBIES } from './fakeLobbies'

const MEMBERS_KEY = 'lobbyMembers'
const CHAT_KEY = 'lobbyChat'

function loadMap(key, fallback = {}) {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) } catch {}
  localStorage.setItem(key, JSON.stringify(fallback))
  return { ...fallback }
}
function saveMap(key, map) { localStorage.setItem(key, JSON.stringify(map)) }

// seed default empty rooms
;(function seed() {
  const members = loadMap(MEMBERS_KEY, {})
  const chats = loadMap(CHAT_KEY, {})
  for (const l of FAKE_LOBBIES) {
    members[l.id] ||= []
    chats[l.id] ||= []
  }
  saveMap(MEMBERS_KEY, members)
  saveMap(CHAT_KEY, chats)
})()

export const lobbyExtrasHandlers = [
  http.get('/api/lobbies/:id/members', ({ params }) => {
    const m = loadMap(MEMBERS_KEY, {})
    return HttpResponse.json(m[params.id] || [])
  }),
  http.post('/api/lobbies/:id/members', async ({ params, request }) => {
    const body = await request.json().catch(() => ({}))
    const name = (body.userName || '').trim()
    if (!name) return HttpResponse.json({ error: 'Missing userName' }, { status: 400 })
    const m = loadMap(MEMBERS_KEY, {})
    const list = m[params.id] || []
    if (!list.includes(name)) list.push(name)
    m[params.id] = list
    saveMap(MEMBERS_KEY, m)
    const l = db.get(params.id)
    if (l) db.update(params.id, { people: list.length })
    return HttpResponse.json(list)
  }),
  http.get('/api/lobbies/:id/chat', ({ params }) => {
    const c = loadMap(CHAT_KEY, {})
    return HttpResponse.json(c[params.id] || [])
  }),
  http.post('/api/lobbies/:id/chat', async ({ params, request }) => {
    const body = await request.json().catch(() => ({}))
    const text = (body.text || '').trim()
    const user = body.userName || localStorage.getItem('userName') || 'anon'
    if (!text) return HttpResponse.json({ error: 'Empty message' }, { status: 400 })
    const c = loadMap(CHAT_KEY, {})
    const log = c[params.id] || []
    log.push({ user, text, ts: Date.now() })
    c[params.id] = log
    saveMap(CHAT_KEY, c)
    return HttpResponse.json(log[log.length - 1], { status: 201 })
  }),
]
