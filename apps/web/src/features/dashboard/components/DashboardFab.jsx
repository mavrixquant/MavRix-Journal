// apps/web/src/features/dashboard/components/DashboardFab.jsx
//
// Floating action button used on BOTH dashboard routes:
//   /journal/*     — Live + Demo accounts
//   /backtester/*  — Backtest accounts
//
// Lives under features/dashboard/ so both journal and backtester feature
// folders can import it without violating the ESLint feature-boundary rule.
//
// Actions
// -------
//   Add Trade  — navigates to <addTradePath>?addTrade=1. The trade-logs
//                page reads that query param and auto-opens the
//                AddTradeModal (see TradeLogsView.jsx).
//
//   Customize  — enters dashboard edit mode. Hidden entirely when the
//                current account has no trades (nothing to lay out yet).
//
// Visual language
// ---------------
//   • Main button: 58px amber-gradient circle with a pulsing halo.
//   • Icon rotates 0° → 135° when open (plus becomes ×).
//   • Actions stack upward with a staggered reveal (bottom-most first,
//     so the stack appears to "grow" out of the FAB).
//   • Closes on outside click, Escape, or any action click.
//   • Fully reduced-motion aware; icon-only on mobile (< 640px).
//
// z-index note
// ------------
// FAB sits at z-index 80. Every modal in the app is >= 1000, so the FAB
// is always behind an open modal — no overlap, no focus stealing.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, SlidersHorizontal, TrendingUp } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */
const CSS = `
  /* ---------- Root ---------- */
  .fab-root {
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 80;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 14px;
    pointer-events: none;                 /* clicks pass through when idle */
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Action stack ---------- */
  .fab-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    pointer-events: none;                 /* enabled only when open */
  }
  .fab-root.is-open .fab-actions {
    pointer-events: auto;
  }

  /* ---------- Individual action pill ---------- */
  .fab-action {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 16px 8px 9px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,.10);
    background: linear-gradient(180deg, #1A2030 0%, #12161F 100%);
    color: #E7E9EE;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .02em;
    white-space: nowrap;
    cursor: pointer;
    outline: none;

    box-shadow:
      0 12px 30px -12px rgba(0,0,0,.85),
      inset 0 1px 0 rgba(255,255,255,.05);

    /* Closed state — pushed down + faded. */
    opacity: 0;
    transform: translateY(14px) scale(.92);

    transition:
      opacity .28s ease,
      transform .34s cubic-bezier(.2,.8,.25,1),
      border-color .18s ease,
      background .18s ease,
      box-shadow .22s ease,
      color .18s ease;

    transition-delay: 0ms;
  }

  .fab-root.is-open .fab-action {
    opacity: 1;
    transform: none;
    /* Stagger comes from a CSS variable set per pill in JSX. */
    transition-delay: var(--fab-delay, 0ms);
  }

  .fab-action:hover {
    color: #FDE68A;
    border-color: rgba(245,158,11,.42);
    background: linear-gradient(180deg, #202836 0%, #161C28 100%);
    box-shadow:
      0 16px 36px -14px rgba(245,158,11,.38),
      inset 0 1px 0 rgba(255,255,255,.06);
  }

  .fab-action:focus-visible {
    border-color: #F59E0B;
    box-shadow:
      0 0 0 3px rgba(245,158,11,.22),
      0 12px 30px -12px rgba(0,0,0,.85);
  }

  .fab-action:active {
    transform: translateY(1px) scale(.98);
  }

  /* Primary emphasis (Add Trade) — subtle amber tint */
  .fab-action.is-primary {
    border-color: rgba(245,158,11,.32);
    background: linear-gradient(180deg, rgba(245,158,11,.14) 0%, rgba(245,158,11,.04) 100%);
  }
  .fab-action.is-primary:hover {
    border-color: rgba(245,158,11,.55);
    background: linear-gradient(180deg, rgba(245,158,11,.22) 0%, rgba(245,158,11,.08) 100%);
  }

  /* ---------- Icon tile inside pill ---------- */
  .fab-action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(245,158,11,.12);
    border: 1px solid rgba(245,158,11,.30);
    color: #F59E0B;
    flex-shrink: 0;
    transition: transform .22s cubic-bezier(.2,.8,.25,1), background .18s ease;
  }
  .fab-action:hover .fab-action-icon {
    transform: scale(1.08);
    background: rgba(245,158,11,.20);
  }
  .fab-action.is-primary .fab-action-icon {
    background: rgba(245,158,11,.20);
  }

  .fab-action-label {
    line-height: 1;
  }

  /* ---------- Main FAB button ---------- */
  .fab-main {
    position: relative;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    border: none;
    padding: 0;
    cursor: pointer;
    outline: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;                 /* always clickable */

    background: linear-gradient(135deg, #F59E0B 0%, #FDE68A 100%);
    color: #0D1117;

    box-shadow:
      0 16px 40px -14px rgba(245,158,11,.65),
      0 6px 18px -8px rgba(0,0,0,.70),
      inset 0 1px 0 rgba(255,255,255,.50);

    transition:
      transform .28s cubic-bezier(.2,.8,.25,1),
      box-shadow .28s ease;
  }

  .fab-main:hover {
    transform: translateY(-2px) scale(1.04);
    box-shadow:
      0 22px 50px -14px rgba(245,158,11,.85),
      0 8px 22px -8px rgba(0,0,0,.70),
      inset 0 1px 0 rgba(255,255,255,.60);
  }
  .fab-main:active {
    transform: translateY(0) scale(.97);
  }
  .fab-main:focus-visible {
    box-shadow:
      0 0 0 4px rgba(245,158,11,.30),
      0 16px 40px -14px rgba(245,158,11,.65),
      inset 0 1px 0 rgba(255,255,255,.50);
  }

  /* ---------- Pulsing halo behind the button ---------- */
  .fab-halo {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle, rgba(245,158,11,.48) 0%, transparent 68%);
    opacity: 0;
    transform: scale(1.15);
    animation: fabPulse 2.6s ease-in-out infinite;
    z-index: 0;
  }

  /* ---------- Plus icon (rotates to ×) ---------- */
  .fab-main-icon {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform .38s cubic-bezier(.2,.8,.25,1);
  }
  .fab-root.is-open .fab-main-icon {
    transform: rotate(135deg);
  }

  /* ---------- Keyframes ---------- */
  @keyframes fabPulse {
    0%   { opacity: 0;    transform: scale(1.15); }
    45%  { opacity: .55;  transform: scale(1.38); }
    100% { opacity: 0;    transform: scale(1.15); }
  }

  /* ---------- Reduced motion ---------- */
  @media (prefers-reduced-motion: reduce) {
    .fab-halo { animation: none; display: none; }

    .fab-main,
    .fab-main-icon,
    .fab-action,
    .fab-action-icon {
      transition: none !important;
      animation: none !important;
    }
    .fab-action {
      opacity: 1;
      transform: none;
      transition-delay: 0ms !important;
    }
  }

  /* ---------- Mobile: icon-only pills ---------- */
  @media (max-width: 640px) {
    .fab-root {
      bottom: 18px;
      right: 16px;
      gap: 10px;
    }
    .fab-main {
      width: 52px;
      height: 52px;
    }
    .fab-actions {
      gap: 8px;
    }
    .fab-action {
      width: 44px;
      height: 44px;
      padding: 0;
      justify-content: center;
      border-radius: 50%;
      gap: 0;
    }
    .fab-action-label { display: none; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function DashboardFab({
  onCustomize,
  addTradePath,
  hasData = false,
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  /* -------- Close on outside click + Escape -------- */
  useEffect(() => {
    if (!open) return undefined;

    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* -------- Handlers -------- */
  const handleToggle = () => setOpen((v) => !v);

  const handleAddTrade = () => {
    setOpen(false);
    navigate(`${addTradePath}?addTrade=1`);
  };

  const handleCustomize = () => {
    setOpen(false);
    if (hasData && typeof onCustomize === 'function') onCustomize();
  };

  /* -------- Render -------- */
  return (
    <>
      <style>{CSS}</style>

      <div
        ref={rootRef}
        className={`fab-root${open ? ' is-open' : ''}`}
      >
        <div className="fab-actions" aria-hidden={!open}>
          {hasData && (
            <button
              type="button"
              className="fab-action"
              style={{ '--fab-delay': '120ms' }}
              onClick={handleCustomize}
              aria-label="Customize dashboard"
              tabIndex={open ? 0 : -1}
            >
              <span className="fab-action-icon" aria-hidden>
                <SlidersHorizontal size={13} strokeWidth={2.4} />
              </span>
              <span className="fab-action-label">Customize</span>
            </button>
          )}

          <button
            type="button"
            className="fab-action"
            style={{ '--fab-delay': '40ms' }}
            onClick={handleAddTrade}
            aria-label="Add trade"
            tabIndex={open ? 0 : -1}
          >
            <span className="fab-action-icon" aria-hidden>
              <TrendingUp size={13} strokeWidth={2.4} />
            </span>
            <span className="fab-action-label">Add Trade</span>
          </button>
        </div>

        <button
          type="button"
          className="fab-main"
          onClick={handleToggle}
          aria-label={open ? 'Close actions' : 'Open actions'}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="fab-halo" aria-hidden />
          <span className="fab-main-icon" aria-hidden>
            <Plus size={22} strokeWidth={2.6} />
          </span>
        </button>
      </div>
    </>
  );
}