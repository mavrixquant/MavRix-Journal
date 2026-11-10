/**
 * Avatar — one avatar for every surface in Chats.
 * Photo when available, otherwise initials on a deterministic per-person tint
 * (so people are recognisable at a glance in long lists).
 */

export function initialsOf(user) {
  if (!user) return '?';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (user.username) return user.username.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return '?';
}

export function displayNameOf(user) {
  if (!user) return 'Unknown';
  const a = (user.firstName || '').trim();
  const b = (user.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return user.username || user.email || 'Unknown';
}

function hueOf(seed) {
  let h = 7;
  const s = String(seed || '?');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export default function Avatar({ user, size = 40, className = '' }) {
  const seed = user?.id || user?.username || user?.email || displayNameOf(user);
  const style = {
    width: size,
    height: size,
    fontSize: Math.max(10, Math.round(size * 0.36)),
    '--av-h': hueOf(seed),
  };

  return (
    <span className={`cx-avatar ${className}`.trim()} style={style} aria-hidden>
      {user?.photoUrl ? <img src={user.photoUrl} alt="" loading="lazy" /> : initialsOf(user)}
    </span>
  );
}
