// src/profileSkeleton/profileSkeleton.jsx
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../styles.css';

export function ProfileSkeleton() {
  const { userName } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentUser = (localStorage.getItem('userName') || '').toLowerCase();

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

  const isOwnProfile = currentUser && profile.userName?.toLowerCase() === currentUser;
  const interests = Array.isArray(profile.interests) ? profile.interests : [];
  const topActivities = Array.isArray(profile.topActivities) ? profile.topActivities : [];

  return (
    <main className="profile-view">
      <div className="profile-view__card card">
        <div className="profile-view__header">
          <div className="profile-view__avatar">
            <img
              src={profile.avatarUrl || 'DefaultProfileImg.png'}
              alt={`${profile.userName}'s profile`}
            />
          </div>
          <div>
            <h1>{profile.userName}</h1>
            <p className="muted">Member since {profile.memberSince}</p>
          </div>
          {isOwnProfile && (
            <Link className="kbtn kbtn-primary" to="/profile/edit">
              Edit profile
            </Link>
          )}
        </div>

        <div className="profile-view__body">
          <section>
            <h3>Bio</h3>
            <p>{profile.bio || 'No bio yet.'}</p>
          </section>

          <section>
            <h3>Interests</h3>
            {interests.length === 0 ? (
              <p className="muted">No interests shared yet.</p>
            ) : (
              <ul className="profile-list">
                {interests.map((interest, idx) => (
                  <li key={idx}>{interest}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3>Top activities</h3>
            {topActivities.length === 0 ? (
              <p className="muted">Nothing listed yet.</p>
            ) : (
              <ol className="profile-list">
                {topActivities.map((activity, idx) => (
                  <li key={idx}>{activity}</li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
