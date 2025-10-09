import React from 'react';
import '../styles.css';


export function LobbyInfo() {
  return (
    <main className="container-fluid bg-secondary text-center">
      <h1>Lobby Info</h1>
        <div id="LobbyInfoContainer">
            <div id="Members">
                <h2>Activity Name</h2>
                <div>
                    <strong>Members</strong>
                    <div className="member">
                        Profile Picture/Button
                        Member Name
                    </div>
                    <div div className="member">
                        Profile Picture/Button
                        Member Name
                    </div>
                    <div div className="member">
                        Profile Picture/Button
                        Member Name
                    </div>
                </div>
            </div>
            <div id="location">
                <h2>Location</h2>
                <div>Map API call Here</div>
                <div>
                    <h3>Time</h3>
                    <h3>Date</h3>
                </div>
            </div>
            <div id="Chat">
                <h2>Chat</h2>
                <div className="chat-log">
                    <div>api call to data base: Message Here</div>
                    <div>Message Here</div>
                    <div>Message Here</div>
                    <div>Message Here</div>
                    <div>Message Here</div>
                    <div>Message Here</div>
                    <div>Message Here</div>
                    <div>Message Here</div>
                </div>
                <div className="chat-input">
                    <textarea name="" id="">Enter Message Here</textarea>
                    <button type="button"><strong>Send</strong></button>
                </div>
            </div>
        </div>
    </main>
  );
}