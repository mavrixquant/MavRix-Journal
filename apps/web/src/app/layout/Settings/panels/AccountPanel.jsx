import { useEffect, useMemo, useState } from 'react';
import { Pencil, Save, X, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import * as authService from '@/features/auth/api';

const USERNAME_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

function formatRemaining(ms) {
  if (ms <= 0) return null;
  const totalMin = Math.ceil(ms / 60000);
  const days  = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins  = totalMin % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

export default function AccountPanel() {
  const { user, refreshUser } = useAuth();

  const [editing, setEditing]   = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [username,  setUsername]  = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [now, setNow]           = useState(() => Date.now());

  // Keep the cooldown countdown live.
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  // Seed the form whenever the user changes.
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setUsername(user.username || '');
  }, [user]);

  const usernameLockedUntil = useMemo(() => {
    if (!user?.usernameChangedAt) return null;
    const t = new Date(user.usernameChangedAt).getTime() + USERNAME_COOLDOWN_MS;
    return t > now ? t : null;
  }, [user?.usernameChangedAt, now]);

  const usernameLocked = !!usernameLockedUntil;
  const remaining = usernameLockedUntil
    ? formatRemaining(usernameLockedUntil - now)
    : null;

  if (!user) return null;

  const initials =
    ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() || 'U';
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.email ||
    'Anonymous';

  const enterEdit = () => {
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setUsername(user.username || '');
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    if (saving) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setUsername(user.username || '');
    setError('');
    setEditing(false);
  };

  const handleSave = async () => {
    setError('');

    if (!firstName.trim()) { setError('First name is required.'); return; }
    if (!lastName.trim())  { setError('Last name is required.');  return; }

    const cleanUsername = username.trim().toLowerCase();
    const isUsernameChange = cleanUsername && cleanUsername !== (user.username || '');

    if (isUsernameChange) {
      if (!/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
        setError('Username must be 3-30 characters: a-z, 0-9, _.');
        return;
      }
      if (usernameLocked) {
        setError(
          `Username can only be changed once every 3 days. Try again in ${remaining}.`
        );
        return;
      }
    }

    const payload = {
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
    };
    if (isUsernameChange) payload.username = cleanUsername;

    setSaving(true);
    try {
      await authService.updateProfile(payload);
      await refreshUser();
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      setError(err?.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-account">
      <div className="settings-account-head">
        {user.photoURL ? (
          <img src={user.photoURL} alt={displayName} className="settings-account-avatar" />
        ) : (
          <div className="settings-account-avatar">{initials}</div>
        )}
        <div className="settings-account-headmeta">
          <span className="settings-account-name">{displayName}</span>
          <span className="settings-account-email">{user.email}</span>
        </div>
      </div>

      <section className="settings-section">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 4,
          }}
        >
          <h4 className="settings-section-title" style={{ margin: 0 }}>
            Profile
          </h4>
          {!editing && (
            <button
              type="button"
              className="settings-btn settings-btn-primary"
              onClick={enterEdit}
            >
              <Pencil size={12} />
              Edit Profile
            </button>
          )}
        </div>

        {error && <div className="settings-error">{error}</div>}

        {!editing ? (
          <>
            {/* -------- read-only view -------- */}
            <div className="settings-field-row">
              <span className="settings-field-label">First Name</span>
              <span className="settings-field-value">{user.firstName || '—'}</span>
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">Last Name</span>
              <span className="settings-field-value">{user.lastName || '—'}</span>
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">Username</span>
              <span className="settings-field-value">
                {user.username ? '@' + user.username : 'Not set'}
              </span>
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">Email Address</span>
              <span className="settings-field-value">{user.email}</span>
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">Email Verification</span>
              <span
                className={`settings-verified-badge ${
                  user.emailVerified ? 'is-verified' : 'is-unverified'
                }`}
              >
                {user.emailVerified ? '✓ Verified' : '✕ Unverified'}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* -------- edit mode -------- */}
            <div className="settings-field-row stacked">
              <label className="settings-field-label" htmlFor="profile-first-name">
                First Name
              </label>
              <input
                id="profile-first-name"
                type="text"
                className="settings-text-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value.slice(0, 60))}
                disabled={saving}
                maxLength={60}
                autoFocus
              />
            </div>

            <div className="settings-field-row stacked">
              <label className="settings-field-label" htmlFor="profile-last-name">
                Last Name
              </label>
              <input
                id="profile-last-name"
                type="text"
                className="settings-text-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value.slice(0, 60))}
                disabled={saving}
                maxLength={60}
              />
            </div>

            <div className="settings-field-row stacked">
              <label className="settings-field-label" htmlFor="profile-username">
                Username
              </label>
              <input
                id="profile-username"
                type="text"
                className="settings-text-input"
                value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, 30).toLowerCase())}
                disabled={saving || usernameLocked}
                placeholder="3-30 chars, a-z 0-9 _"
                maxLength={30}
                spellCheck={false}
                autoComplete="off"
              />
              <span className="settings-inline-hint">
                {usernameLocked ? (
                  <>
                    <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    You can change your username again in <strong>{remaining}</strong>{' '}
                    (once every 3 days).
                  </>
                ) : (
                  'Lowercase letters, digits, and underscores only. You can change this once every 3 days.'
                )}
              </span>
            </div>

            <div className="settings-field-row">
              <span className="settings-field-label">Email Address</span>
              <span className="settings-field-value">{user.email}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 12,
              }}
            >
              <button
                type="button"
                className="settings-btn"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X size={12} />
                Cancel
              </button>
              <button
                type="button"
                className="settings-btn settings-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={12} className="settings-spin" />
                ) : (
                  <Save size={12} />
                )}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}