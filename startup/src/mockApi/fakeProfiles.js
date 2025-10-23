// src/mockApi/fakeProfiles.js
import { http, HttpResponse } from 'msw'

const DEMO_PROFILES = {
  test: {
    userName: 'test',
    bio: 'Just here to test the vibes 🌄 and see how everything looks on the site.',
    interests: ['Outdoors', 'Coding', 'Boba', 'Music', 'Photography'],
    memberSince: '2023-01-12',
    topActivities: ['Hiking', 'React projects', 'Board games', 'Photography walks', 'Camping'],
    avatarUrl: 'https://i.pravatar.cc/150?img=3',
  },
  john: {
    userName: 'john',
    bio: 'Basketball, burritos, and bad puns. Always down for a pickup game or late-night tacos 🌮',
    interests: ['Sports', 'Food', 'Movies', 'Travel', 'Comedy'],
    memberSince: '2024-05-01',
    topActivities: ['Basketball', 'Cooking', 'Stand-up shows', 'Hiking', 'Traveling'],
    avatarUrl: 'https://i.pravatar.cc/150?img=11',
  },
  sarah: {
    userName: 'sarah',
    bio: 'Study group queen 👑 and coffee enthusiast. If I’m not coding, I’m at a cafe ☕',
    interests: ['Study', 'Coffee', 'Friends', 'Music', 'Writing'],
    memberSince: '2024-07-20',
    topActivities: ['CS260 study sessions', 'Cafe hopping', 'Reading', 'Singing', 'Hiking'],
    avatarUrl: 'https://i.pravatar.cc/150?img=47',
  },
  tyler: {
    userName: 'tyler',
    bio: 'Frontend dev in training 🚀 — trying to make clean UI and better coffee.',
    interests: ['Coding', 'Gaming', 'Music', 'Design', 'Cats'],
    memberSince: '2025-01-03',
    topActivities: ['React experiments', 'Valorant', 'UI mockups', 'Coffee brewing', 'Guitar'],
    avatarUrl: 'https://i.pravatar.cc/150?img=15',
  },
  emma: {
    userName: 'emma',
    bio: 'Loves sunsets, new recipes, and organizing group hikes 🏔️',
    interests: ['Outdoors', 'Cooking', 'Yoga', 'Photography', 'Travel'],
    memberSince: '2023-10-18',
    topActivities: ['Mountain hiking', 'Baking', 'Pilates', 'Food photography', 'Road trips'],
    avatarUrl: 'https://i.pravatar.cc/150?img=26',
  },
  alex: {
    userName: 'alex',
    bio: 'Sports junkie who’s also secretly a huge nerd. Ask me about Star Wars ⚔️',
    interests: ['Sports', 'Movies', 'Tech', 'Comics', 'Fitness'],
    memberSince: '2022-12-04',
    topActivities: ['Soccer', 'Weightlifting', 'Marvel marathons', 'Coding', 'Travel'],
    avatarUrl: 'https://i.pravatar.cc/150?img=32',
  },
  lily: {
    userName: 'lily',
    bio: 'Design student, boba addict, and part-time illustrator. 🎨',
    interests: ['Art', 'Design', 'Boba', 'Fashion', 'Games'],
    memberSince: '2024-02-10',
    topActivities: ['Digital painting', 'Cafe sketching', 'Shopping', 'Switch gaming', 'Photography'],
    avatarUrl: 'https://i.pravatar.cc/150?img=67',
  },
}


export const profileHandlers = [
  // read/write current user
  http.get('/api/profile', () => {
    const userName = localStorage.getItem('userName') || ''
    const KEY = `profile:${userName}`
    if (!userName) return HttpResponse.json({ error: 'Not logged in' }, { status: 401 })
    const existing = localStorage.getItem(KEY)
    if (existing) return HttpResponse.json(JSON.parse(existing))
    const p = {
      userName,
      bio: 'Default bio.',
      interests: ['Outdoors', 'Sports'],
      memberSince: new Date().toISOString().slice(0, 10),
      topActivities: ['Hiking', 'Basketball'],
      avatarUrl: 'DefaultProfileImg.png',
    }
    localStorage.setItem(KEY, JSON.stringify(p))
    return HttpResponse.json(p)
  }),
  http.put('/api/profile', async ({ request }) => {
    const userName = localStorage.getItem('userName') || ''
    if (!userName) return HttpResponse.json({ error: 'Not logged in' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const KEY = `profile:${userName}`
    const merged = { ...(JSON.parse(localStorage.getItem(KEY) || '{}')), ...body, userName }
    localStorage.setItem(KEY, JSON.stringify(merged))
    return HttpResponse.json(merged)
  }),
  // public demo profiles
  http.get('/api/publicProfile/:userName', ({ params }) => {
    const p = DEMO_PROFILES[params.userName?.toLowerCase()]
    return p
      ? HttpResponse.json(p)
      : HttpResponse.json({ error: 'User not found' }, { status: 404 })
  }),
]
