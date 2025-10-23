// src/mockApi/fakeAuth.js
import { http, HttpResponse } from 'msw'

const USER_KEY = 'users'
const seedUsers = [{ id: 1, userName: 'demo@demo.com', password: 'pass123' }]

const userDb = {
  load() {
    try { const raw = localStorage.getItem(USER_KEY); if (raw) return JSON.parse(raw) } catch {}
    localStorage.setItem(USER_KEY, JSON.stringify(seedUsers))
    return [...seedUsers]
  },
  save(list) { localStorage.setItem(USER_KEY, JSON.stringify(list)) },
  find(name) { return this.load().find(u => u.userName === name) },
  add(u) {
    const list = this.load()
    const id = list.length ? Math.max(...list.map(x => x.id)) + 1 : 1
    const user = { id, ...u }
    list.push(user)
    this.save(list)
    return user
  },
}

export const authHandlers = [
  http.get('/api/users', () => HttpResponse.json(userDb.load())),
  http.post('/api/users', async (req) => {
    const body = await req.request.json().catch(() => ({}))
    if (!body.userName || !body.password)
      return HttpResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (userDb.find(body.userName))
      return HttpResponse.json({ error: 'User exists' }, { status: 409 })
    const created = userDb.add(body)
    return HttpResponse.json({ id: created.id, userName: created.userName }, { status: 201 })
  }),
  http.post('/api/login', async (req) => {
    const body = await req.request.json().catch(() => ({}))
    const user = userDb.find(body.userName)
    if (!user || user.password !== body.password)
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    localStorage.setItem('userName', user.userName)
    return HttpResponse.json({ id: user.id, userName: user.userName })
  }),
]
