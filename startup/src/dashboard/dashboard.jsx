import React, { useEffect, useMemo, useState } from 'react';
import '../styles.css';
import { LobbyCard } from '../components/lobbyCard';

import {fakeFetchLobbies, LOBBIES} from '../mockApi/lobbyData';



export function Dashboard() {
  const [all, setAll] = useState([]);
  const [tag, setTag] = useState('All');

  //Grab the data on loading straight away
  useEffect(() =>{
    fakeFetchLobbies().then(setAll);
  }, []);

  //alright we've gotten the data, now which ones do we actually show according to whatever that filter is set to
  const visible = useMemo(() => {
    //If the tag is equal to all just immediatly return, no need to filter through here
    if(tag === 'All') return all;
    //if we get here, filter through and return the portions of data that have the tag thats the same as the filter value here
    return all.filter(d => d.tag === tag);
  }, [all, tag])


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
        <div id="LobbyContainer">
            {visible.length === 0 ? <p>No lobbies match that filter.</p> : (
              visible.map(d => <LobbyCard key={d.id} l={d} />)
            )}
        </div>
    </main>
  );
}