// apps/web/src/features/auth/components/Divider.jsx
export function Divider() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '22px 0',
      }}
    >
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
      <span
        style={{
          color: '#545E6E',
          fontSize: 10,
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          letterSpacing: '.18em',
          fontWeight: 700,
        }}
      >
        OR
      </span>
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
    </div>
  );
}

export default Divider;