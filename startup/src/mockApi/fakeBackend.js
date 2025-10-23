import { setupWorker, rest } from 'msw'

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
