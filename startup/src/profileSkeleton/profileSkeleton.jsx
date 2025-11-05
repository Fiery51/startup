// src/profileSkeleton/profileSkeleton.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../styles.css';

export function ProfileSkeleton() {
  const { userName } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/publicProfile/${userName}`);
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch {
          throw new Error('Unexpected response from server');
        }
        if (!res.ok) throw new Error(data.error || 'Failed to load profile');
        setProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (userName) loadProfile();
  }, [userName]);

  if (loading) return <main><p>Loading profile...</p></main>;
  if (error) return <main><p>Error: {error}</p></main>;
  if (!profile) return <main><p>No profile found.</p></main>;

  return (
    <main>
      <div className="BioContainer">
        <div className="bio">
          <h1>{profile.userName}</h1>
          <p>{profile.bio}</p>
        </div>

        <ul className="interests">
          {profile.interests.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>

        <p>Member since: {profile.memberSince}</p>

        <div>
          <h3>Top Activities</h3>
          <ol>
            {profile.topActivities.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ol>
        </div>
      </div>

      <img
        src={profile.avatarUrl || 'DefaultProfileImg.png'}
        alt={`${profile.userName}'s profile`}
        className="profileImg"
      />
    </main>
  );
}
