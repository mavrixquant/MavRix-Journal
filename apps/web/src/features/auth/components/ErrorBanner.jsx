// apps/web/src/features/auth/components/ErrorBanner.jsx
export function ErrorBanner({ message }) {
  return (
    <div
      role="alert"
      style={{
        background: 'rgba(239,68,68,.08)',
        border: '1px solid rgba(239,68,68,.28)',
        color: '#fca5a5',
        padding: '11px 13px',
        borderRadius: 10,
        fontSize: 12,
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        lineHeight: 1.55,
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span style={{ flexShrink: 0 }}>⚠</span>
      <span>{message}</span>
    </div>
  );
}

export default ErrorBanner;