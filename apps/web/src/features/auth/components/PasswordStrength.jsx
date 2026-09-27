// apps/web/src/features/auth/components/PasswordStrength.jsx
import { useMemo } from 'react';

const CHECKS = [
  { key: 'len',  label: '8+ chars',  test: (p) => p.length >= 8 },
  { key: 'case', label: 'A-a',        test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { key: 'num',  label: '0-9',        test: (p) => /\d/.test(p) },
  { key: 'sym',  label: '!@#',        test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

export default function PasswordStrength({ password = '' }) {
  const score = useMemo(
    () => CHECKS.reduce((n, c) => n + (c.test(password) ? 1 : 0), 0),
    [password]
  );

  if (!password) return null;

  return (
    <div style={{ marginTop: -6, marginBottom: 14, paddingLeft: 4 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {CHECKS.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: i < score ? COLORS[score] : 'rgba(255,255,255,.08)',
              transition: 'background-color .25s ease',
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: 10.5,
          letterSpacing: '.02em',
        }}
      >
        <span style={{ color: score ? COLORS[score] : '#545E6E', fontWeight: 700 }}>
          {LABELS[score]}
        </span>
        <span style={{ color: '#545E6E' }}>
          {score}/4 criteria met
        </span>
      </div>
    </div>
  );
}