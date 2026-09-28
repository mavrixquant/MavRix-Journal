// apps/web/src/shared/components/ComingSoon.jsx
//
// Placeholder page used by in-progress routes.
// Matches the app-wide glass-panel design language.

import { FaTools } from 'react-icons/fa';

const CSS = `
  .cs-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    min-height: calc(100vh - 120px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: var(--ink-1);
    -webkit-font-smoothing: antialiased;
  }
  .cs-card {
    position: relative;
    max-width: 520px;
    width: 100%;
    padding: 56px 40px 48px;
    border-radius: 26px;
    background:
      radial-gradient(400px 220px at 50% 0%, rgba(245,158,11,.12), transparent 70%),
      linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012));
    border: 1px solid rgba(255,255,255,.1);
    box-shadow:
      0 40px 90px -50px rgba(245,158,11,.5),
      inset 0 1px 0 rgba(255,255,255,.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    overflow: hidden;
  }
  .cs-card::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: csGrad 4s linear infinite;
    pointer-events: none;
  }
  .cs-icon {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-bottom: 22px;
    box-shadow: 0 0 40px -8px rgba(245,158,11,.5);
  }
  .cs-eyebrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 10px;
    opacity: .9;
  }
  .cs-title {
    margin: 0 0 10px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -.02em;
    color: var(--ink-1);
    line-height: 1.2;
  }
  .cs-desc {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.7;
    color: rgba(255,255,255,.62);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .01em;
    max-width: 400px;
  }
  .cs-note {
    margin-top: 22px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(255,255,255,.03);
    border: 1px solid var(--line-soft);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  @keyframes csGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cs-card::before { animation: none !important; }
  }
`;

export default function ComingSoon({
  eyebrow = 'Coming soon',
  title,
  description,
  icon: Icon = FaTools,
  note = 'Under construction',
}) {
  return (
    <>
      <style>{CSS}</style>
      <div className="cs-root">
        <div className="cs-card">
          <div className="cs-icon">
            <Icon />
          </div>
          <span className="cs-eyebrow">{eyebrow}</span>
          <h2 className="cs-title">{title}</h2>
          {description && <p className="cs-desc">{description}</p>}
          {note && <div className="cs-note">{note}</div>}
        </div>
      </div>
    </>
  );
}