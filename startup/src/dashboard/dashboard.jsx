import React, { useEffect, useMemo, useState } from 'react';
import '../styles.css';
import { LobbyCard } from '../components/lobbyCard';

import {fakeFetchLobbies, LOBBIES} from '../mockApi/lobbyData';



export function Dashboard() {
  const [all, setAll] = useState([]);
  const [tag, setTag] = useState('All');
  const [form, setForm] = useState({ name: '', tag: 'Casual', max: 10, time: '', location: '', people: 0,})

  //Grab the data on loading straight away
  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/lobbies')
      if (!res.ok) {
        console.error('Failed to load lobbies')
        return
      }
      setAll(await res.json())
    })()
  }, [])

  //alright we've gotten the data, now which ones do we actually show according to whatever that filter is set to
  const visible = useMemo(() => {
    //If the tag is equal to all just immediatly return, no need to filter through here
    if(tag === 'All') return all;
    //if we get here, filter through and return the portions of data that have the tag thats the same as the filter value here
    return all.filter(d => d.tag === tag);
  }, [all, tag])

  //Heres what actually to do when we wanna delete and add new events

  async function handleAdd(e) {
    e.preventDefault()
    const res = await fetch('/api/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        tag: form.tag,
        max: Number(form.max),
        time: form.time,
        location: form.location,
        people: Number(form.people) || 0,
      }),
    })
    if (!res.ok) {
      const msg = await res.json().catch(() => ({}))
      alert(`Failed to create: ${msg.error ?? res.status}`)
      return
    }
    const created = await res.json()
    setAll((prev) => [...prev, created])
    // reset a bit
    setForm((f) => ({ ...f, name: '', time: '', location: '' }))
  }

  
  async function handleDelete(id) {
    const res = await fetch(`/api/lobbies/${id}`, { method: 'DELETE' })
    if (res.status === 204) {
      setAll((prev) => prev.filter((x) => x.id !== id))
    } else {
      alert('Failed to delete')
    }
  }


  return (
    <main>
      <div>
            <h2>Open Lobbies</h2>
            <select value={tag} onChange={e => setTag(e.target.value)} name="Filter" id="Filter">
                <option value="All">All</option>
                <option value="Outdoors">Outdoors</option>
                <option value="Casual">Casual</option>
                <option value="Sports">Sports</option>
                <option value="Study">Study</option>
            </select>
        </div>

        {/*Filler - ill change this when i get around to styling the rest of the website, im tired */} 
        <form onSubmit={handleAdd} style={{ margin: '1rem 0', display: 'grid', gap: '.5rem', maxWidth: 520 }}>
            <input required placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div style={{ display: 'flex', gap: '.5rem' }}>
                <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
                    <option>Outdoors</option>
                    <option>Casual</option>
                    <option>Sports</option>
                    <option>Study</option>
                </select>
                <input type="number" min="1" placeholder="Max" value={form.max} onChange={e => setForm(f => ({ ...f, max: e.target.value }))} />
                <input type="number" min="0" placeholder="People" value={form.people}
                     onChange={e => setForm(f => ({ ...f, people: e.target.value }))} />
            </div>
            <input required placeholder="Time (e.g., Fri 8:00 PM)" value={form.time}
                   onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            <input required placeholder="Location" value={form.location}
                   onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            <button type="submit">Add Lobby</button>
        </form>


        <div id="LobbyContainer">
            {visible.length === 0 ? <p>No lobbies match that filter.</p> : (
              visible.map(d => <LobbyCard key={d.id} l={d} onDelete={() => handleDelete(d.id)} />)
            )}
        </div>
    </main>
  );
}