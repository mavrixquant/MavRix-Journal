// apps/web/src/features/admin/components/HealthCheckTestRow.jsx
//
// One test result row. Collapsed = single line (dot + name + duration).
// Expanded = shows error / skip reason / notes.
//
// Statuses: 'pass' | 'fail' | 'skip' | 'running' | 'pending'

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const CSS = `
  .hct-row {
    border-bottom: 1px solid rgba(255,255,255,.04);
  }
  .hct-row:last-child { border-bottom: none; }

  .hct-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 14px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    color: #E7E9EE;
    outline: none;
    transition: background-color .15s ease;
  }
  .hct-toggle:hover:not(:disabled) {
    background: rgba(255,255,255,.02);
  }
  .hct-toggle:disabled { cursor: default; }
  .hct-toggle:focus-visible {
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }

  .hct-chevron {
    flex-shrink: 0;
    color: #545E6E;
    transition: transform .2s ease, color .2s ease;
  }
  .hct-row.is-open .hct-chevron {
    transform: rotate(180deg);
    color: var(--accent);
  }
  .hct-chevron.is-hidden {
    visibility: hidden;
  }

  .hct-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #545E6E;
  }
  .hct-row.is-pass .hct-dot {
    background: #4ade80;
    box-shadow: 0 0 8px rgba(74,222,128,.45);
  }
  .hct-row.is-fail .hct-dot {
    background: #f87171;
    box-shadow: 0 0 8px rgba(248,113,113,.5);
  }
  .hct-row.is-skip .hct-dot {
    background: #8892A3;
    opacity: .55;
  }
  .hct-row.is-running .hct-dot {
    background: var(--accent);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 70%, transparent);
    animation: hctPulse 1.2s ease-in-out infinite;
  }
  @keyframes hctPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: .5; transform: scale(.8); }
  }

  .hct-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #E7E9EE;
  }
  .hct-row.is-fail .hct-name { color: #fca5a5; }
  .hct-row.is-skip .hct-name { color: #8892A3; }

  .hct-dur {
    flex-shrink: 0;
    font-size: 10.5px;
    color: #545E6E;
    letter-spacing: .02em;
  }
  .hct-row.is-pass .hct-dur { color: #4ade80; opacity: .75; }
  .hct-row.is-fail .hct-dur { color: #f87171; opacity: .85; }

  .hct-details {
    padding: 8px 14px 12px 42px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.6;
    color: #8892A3;
  }
  .hct-error {
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(239,68,68,.06);
    border: 1px solid rgba(239,68,68,.22);
    color: #fca5a5;
    word-break: break-word;
    white-space: pre-wrap;
  }
  .hct-reason {
    color: #8892A3;
    font-style: italic;
  }
  .hct-notes {
    color: #8892A3;
    margin-top: 6px;
  }
  .hct-notes::before {
    content: 'Note: ';
    color: #545E6E;
    font-weight: 700;
  }

  @media (prefers-reduced-motion: reduce) {
    .hct-chevron,
    .hct-toggle { transition: none !important; }
    .hct-row.is-running .hct-dot { animation: none !important; }
  }
`;

export default function HealthCheckTestRow({ test }) {
  const [open, setOpen] = useState(false);

  const hasDetails = !!(test.error || test.reason || test.notes);
  const rowClass = [
    'hct-row',
    `is-${test.status || 'pending'}`,
    open ? 'is-open' : '',
  ].filter(Boolean).join(' ');

  const handleToggle = () => {
    if (hasDetails) setOpen((v) => !v);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className={rowClass}>
        <button
          type="button"
          className="hct-toggle"
          onClick={handleToggle}
          disabled={!hasDetails}
          aria-expanded={open}
        >
          <ChevronDown
            size={11}
            className={`hct-chevron${hasDetails ? '' : ' is-hidden'}`}
          />
          <span className="hct-dot" aria-hidden />
          <span className="hct-name" title={test.name}>
            {test.name}
          </span>
          {test.durationMs > 0 && (
            <span className="hct-dur">{test.durationMs}ms</span>
          )}
        </button>

        {open && hasDetails && (
          <div className="hct-details">
            {test.error && <div className="hct-error">{test.error}</div>}
            {test.reason && (
              <div className="hct-reason">Skipped — {test.reason}</div>
            )}
            {test.notes && <div className="hct-notes">{test.notes}</div>}
          </div>
        )}
      </div>
    </>
  );
}