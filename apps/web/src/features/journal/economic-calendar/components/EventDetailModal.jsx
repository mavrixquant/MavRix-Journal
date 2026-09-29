// apps/web/src/features/journal/economic-calendar/components/EventDetailModal.jsx
//
// Full detail for a single economic event. Opens as an overlay from the list.
// Closes on backdrop click, X button, or Escape key.
//
// Reads the event from the already-cached event list via the passed-in object
// (no extra fetch).

import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import Portal from '@/shared/components/Portal';
import {
  IMPACT_META,
  CURRENCY_NAMES,
} from '@mavrix/shared';

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .edm-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: edmFade .18s ease;
  }
  .edm-modal {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --impact-high: #F59E0B;
    --impact-medium: #60A5FA;
    --impact-low: #545E6E;
    --win: #22c55e;
    width: 100%;
    max-width: 520px;
    max-height: calc(100vh - 32px);
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px rgba(245,158,11,.10);
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    animation: edmIn .28s cubic-bezier(.2,.8,.25,1);
  }
  .edm-modal::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: edmGrad 4s linear infinite;
    pointer-events: none;
  }
  .edm-head {
    padding: 20px 22px 16px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .edm-impact {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 700;
  }
  .edm-impact.high {
    background: rgba(245,158,11,.12);
    border: 1px solid rgba(245,158,11,.35);
    color: var(--impact-high);
    box-shadow: 0 0 24px -8px rgba(245,158,11,.6);
  }
  .edm-impact.medium {
    background: rgba(96,165,250,.12);
    border: 1px solid rgba(96,165,250,.35);
    color: var(--impact-medium);
  }
  .edm-impact.low {
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.1);
    color: var(--ink-3);
  }
  .edm-headtext {
    flex: 1;
    min-width: 0;
  }
  .edm-name {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
    line-height: 1.3;
  }
  .edm-sub {
    margin-top: 5px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-2);
    letter-spacing: .02em;
    flex-wrap: wrap;
  }
  .edm-sub-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 99px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  .edm-close {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--ink-2);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: all .2s;
  }
  .edm-close:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
  }
  .edm-body {
    padding: 20px 22px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .edm-vals {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .edm-val-card {
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .edm-val-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .edm-val-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 17px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
  }
  .edm-val-value.is-empty { color: var(--ink-3); }
  .edm-val-value.is-actual { color: var(--win); }

  .edm-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .edm-section-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .edm-kv {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 6px 14px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
  }
  .edm-kv dt { color: var(--ink-3); }
  .edm-kv dd { color: var(--ink-1); margin: 0; }

  .edm-foot {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    background: rgba(0,0,0,.15);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-shrink: 0;
  }
  .edm-link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 16px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: all .2s;
  }
  .edm-link:hover {
    color: var(--accent);
    border-color: rgba(245,158,11,.35);
    background: rgba(245,158,11,.06);
  }

  @keyframes edmFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes edmIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes edmGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .edm-modal::before { animation: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(v) {
  if (v === null || v === undefined || v === '') return null;
  return String(v);
}

function fmtTime(iso, timeUtc) {
  if (!iso) return timeUtc || '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return timeUtc || '';
  return `${timeUtc} UTC · ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} local`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EventDetailModal({ event, onClose }) {
  useEffect(() => {
    if (!event) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [event, onClose]);

  if (!event) return null;

  const impact = IMPACT_META[event.impact] || IMPACT_META.low;
  const actual = fmt(event.actual);
  const forecast = fmt(event.forecast);
  const previous = fmt(event.previous);
  const revisedPrevious = fmt(event.revisedPrevious);
  const released = actual !== null;

  const currencyName = CURRENCY_NAMES[event.currency] || event.currency;

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="edm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="edm-modal" role="dialog" aria-modal="true">
          <div className="edm-head">
            <div className={`edm-impact ${event.impact}`}>
              {impact.label.toUpperCase()}
            </div>
            <div className="edm-headtext">
              <h2 className="edm-name">{event.event}</h2>
              <div className="edm-sub">
                <span className="edm-sub-badge">{event.currency}</span>
                <span>{currencyName}</span>
                {event.countryCode && (
                  <>
                    <span style={{ color: 'var(--ink-3)' }}>·</span>
                    <span>{event.countryCode}</span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              className="edm-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="edm-body">
            {/* ---------- Values ---------- */}
            <div className="edm-vals">
              <div className="edm-val-card">
                <span className="edm-val-label">Actual</span>
                <span className={`edm-val-value ${released ? 'is-actual' : 'is-empty'}`}>
                  {actual ?? 'Pending'}
                </span>
              </div>
              <div className="edm-val-card">
                <span className="edm-val-label">Forecast</span>
                <span className={`edm-val-value ${forecast === null ? 'is-empty' : ''}`}>
                  {forecast ?? '—'}
                </span>
              </div>
              <div className="edm-val-card">
                <span className="edm-val-label">Previous</span>
                <span className={`edm-val-value ${previous === null ? 'is-empty' : ''}`}>
                  {previous ?? '—'}
                </span>
              </div>
            </div>

            {/* ---------- Details ---------- */}
            <div className="edm-section">
              <span className="edm-section-title">Release details</span>
              <dl className="edm-kv">
                <dt>Date</dt>
                <dd>{event.date}</dd>

                <dt>Time</dt>
                <dd>{fmtTime(event.dateTimeUtc, event.timeUtc)}</dd>

                {event.timeMode && event.timeMode !== 'exact' && (
                  <>
                    <dt>Time mode</dt>
                    <dd style={{ textTransform: 'capitalize' }}>{event.timeMode}</dd>
                  </>
                )}

                {revisedPrevious && (
                  <>
                    <dt>Revised previous</dt>
                    <dd>{revisedPrevious}</dd>
                  </>
                )}

                {event.unit && (
                  <>
                    <dt>Unit</dt>
                    <dd>{event.unit}</dd>
                  </>
                )}

                {event.sector && (
                  <>
                    <dt>Sector</dt>
                    <dd style={{ textTransform: 'capitalize' }}>{event.sector}</dd>
                  </>
                )}

                {event.eventType && (
                  <>
                    <dt>Type</dt>
                    <dd style={{ textTransform: 'capitalize' }}>{event.eventType}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="edm-foot">
            {event.sourceUrl && (
              <a
                className="edm-link"
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={12} />
                Source
              </a>
            )}
            <button
              type="button"
              className="edm-link"
              onClick={onClose}
              style={{ color: 'var(--ink-2)' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}