// apps/web/src/features/auth/components/SuccessBanner.jsx
export function SuccessBanner({ message }) {
  return (
    <div
      role="status"
      style={{
        background: 'rgba(34,197,94,.08)',
        border: '1px solid rgba(34,197,94,.28)',
        color: '#86efac',
        padding: '11px 13px',
        borderRadius: 10,
        fontSize: 12,
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        lineHeight: 1.55,
        marginBottom: 18,
      }}
    >
      {message}
    </div>
  );
}

export default SuccessBanner;