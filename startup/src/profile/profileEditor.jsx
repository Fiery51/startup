// src/profile/profileEditor.jsx
import React, { useEffect, useState } from 'react';
import '../styles.css';

const createEmptyForm = (userName) => ({
  userName,
  bio: '',
  interestsText: '',
  topActivitiesText: '',
  memberSince: '',
  avatarUrl: '',
});

export function ProfileEditor() {
  const userName = localStorage.getItem('userName') || '';
  const [form, setForm] = useState(() => createEmptyForm(userName));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await fetch(`/api/profile?userName=${encodeURIComponent(userName)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load profile');
        if (!cancelled) {
          setForm({
            userName: data.userName || userName,
            bio: data.bio || '',
            interestsText: Array.isArray(data.interests) ? data.interests.join(', ') : '',
            topActivitiesText: Array.isArray(data.topActivities) ? data.topActivities.join(', ') : '',
            memberSince: data.memberSince || '',
            avatarUrl: data.avatarUrl || '',
          });
          setSaved(false);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (userName) {
      loadProfile();
    } else {
      setLoading(false);
      setError('You must be logged in to edit a profile.');
    }

    return () => { cancelled = true; };
  }, [userName]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaved(false);
    try {
      const payload = {
        bio: form.bio,
        interests: form.interestsText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        topActivities: form.topActivitiesText
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        avatarUrl: form.avatarUrl,
      };

      const res = await fetch(`/api/profile?userName=${encodeURIComponent(userName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      setSaved(true);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <main><p>Loading profile editor...</p></main>;

  return (
    <main className="profile-edit">
      <div className="profile-edit__card card">
        <header className="profile-edit__header">
          <div>
            <h1>Edit profile</h1>
            <p className="muted">Share a short bio, interests, and the activities you love.</p>
            {form.memberSince && (
              <p className="profile-edit__meta muted">Member since {form.memberSince}</p>
            )}
          </div>
          {saved && <span className="profile-edit__status">Saved!</span>}
        </header>

        {error && <div className="profile-edit__error">{error}</div>}

        <form className="profile-edit__form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="profile-userName">Username</label>
            <input
              id="profile-userName"
              className="field-input"
              value={form.userName}
              readOnly
              disabled
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="profile-bio">Bio</label>
          <textarea
            id="profile-bio"
            className="field-input field-textarea"
            rows={4}
            value={form.bio}
            onChange={e => {
              setSaved(false);
              setForm(f => ({ ...f, bio: e.target.value }));
            }}
            placeholder="Tell people a little about you..."
          />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="profile-interests">Interests (comma separated)</label>
            <input
            id="profile-interests"
            className="field-input"
            value={form.interestsText}
            onChange={e => {
              setSaved(false);
              setForm(f => ({ ...f, interestsText: e.target.value }));
            }}
            placeholder="Pickleball, Board games, Hiking"
          />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="profile-topActivities">Top activities (comma separated)</label>
            <input
            id="profile-topActivities"
            className="field-input"
            value={form.topActivitiesText}
            onChange={e => {
              setSaved(false);
              setForm(f => ({ ...f, topActivitiesText: e.target.value }));
            }}
            placeholder="Saturday hikes, Sunday study group"
          />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="profile-avatar">Avatar URL</label>
            <input
            id="profile-avatar"
            className="field-input"
            value={form.avatarUrl}
            onChange={e => {
              setSaved(false);
              setForm(f => ({ ...f, avatarUrl: e.target.value }));
            }}
            placeholder="https://example.com/avatar.png"
          />
          </div>

          <div className="profile-edit__actions">
            <button type="submit" className="kbtn kbtn-primary">Save changes</button>
          </div>
        </form>
      </div>
    </main>
  );
}
