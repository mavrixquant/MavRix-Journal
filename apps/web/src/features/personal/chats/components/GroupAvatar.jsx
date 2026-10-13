// apps/web/src/features/personal/chats/components/GroupAvatar.jsx
//
// Circular avatar for a chat group.
//
// Renders one of three things inside the circle, in priority order:
//   1. The group's `iconEmoji` if one is set
//   2. A lock glyph (🔒 in unicode) for private groups
//   3. A `#` hashtag glyph for public groups
//
// The circle itself is tinted with the group's `color`, following the same
// visual language as the DM avatar (soft gradient fill + colored border).
//
// Public API:
//   <GroupAvatar group={{ color, iconEmoji, visibility }} size={40} />
//   <GroupAvatar group={group} size={36} badge />

export default function GroupAvatar({ group, size = 40, badge = false }) {
  const color = group?.color || '#F59E0B';
  const emoji = group?.iconEmoji;
  const isPrivate = group?.visibility === 'private';

  const s = Math.max(20, Math.round(size));
  const fontSize = Math.round(s * 0.42);
  const badgeSize = Math.max(12, Math.round(s * 0.36));

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        width: s,
        height: s,
      }}
    >
      <span
        aria-hidden
        style={{
          width: s,
          height: s,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${hexA(color, 0.28)}, ${hexA(color, 0.08)})`,
          border: `1px solid ${hexA(color, 0.42)}`,
          color,
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontWeight: 700,
          fontSize,
          lineHeight: 1,
          letterSpacing: '-.01em',
          userSelect: 'none',
        }}
      >
        {emoji || (isPrivate ? '🔒' : '#')}
      </span>

      {badge && isPrivate && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: badgeSize,
            height: badgeSize,
            borderRadius: '50%',
            background: '#11151F',
            border: `1px solid ${hexA(color, 0.42)}`,
            color,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.max(8, Math.round(badgeSize * 0.6)),
            lineHeight: 1,
          }}
        >
          🔒
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Tiny hex → rgba helper (local so GroupAvatar has zero deps)        */
/* ------------------------------------------------------------------ */
function hexA(hex, alpha) {
  const h = String(hex).replace('#', '');
  if (h.length !== 6) return `rgba(245,158,11,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}