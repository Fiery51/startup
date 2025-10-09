import React from 'react';
import '../styles.css';


export function Dashboard() {
  return (
    <main>
      <div>
            <h2>Open Lobbys</h2>
            <select name="Filter" id="Filter">
                <option value="Filter One">Filter One</option>
                <option value="Filter Two">Filter Two</option>
                <option value="Filter Three">Filter Three</option>
                <option value="Filter Four">Filter Four</option>
            </select>
        </div>
        <div id="LobbyContainer">
            <div className="lobby">
                <h3>Lobby 1</h3>
                <div>Information Here</div>
                <div>More Information here</div>
                <div>Even more info here</div>
                <button>Join</button>
            </div>
            <div className="lobby">
                <h3>Lobby 2</h3>
                <div>Information Here</div>
                <div>More Information here</div>
                <div>Even more info here</div>
                <button>Join</button>
            </div>
            <div className="lobby">
                <h3>Lobby 3</h3>
                <div>Information Here</div>
                <div>More Information here</div>
                <div>Even more info here</div>
                <button>Join</button>
            </div>
            <div className="lobby">
                <h3>Lobby 4</h3>
                <div>Information Here</div>
                <div>More Information here</div>
                <div>Even more info here</div>
                <button>Join</button>
            </div>
            <div className="lobby">
                <h3>Lobby 5</h3>
                <div>Information Here</div>
                <div>More Information here</div>
                <div>Even more info here</div>
                <button>Join</button>
            </div>
            <div className="lobby">
                <h3>Lobby 6</h3>
                <div>Information Here</div>
                <div>More Information here</div>
                <div>Even more info here</div>
                <button>Join</button>
            </div>
        </div>
    </main>
  );
}