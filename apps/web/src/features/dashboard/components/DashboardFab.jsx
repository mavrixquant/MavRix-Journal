// apps/web/src/features/dashboard/components/DashboardFab.jsx
//
// Floating action button used on BOTH dashboard routes:
//   /journal/*     — Live + Demo accounts
//   /backtester/*  — Backtest accounts
//
// The main button shows a MENU icon when closed and an X (close) icon when
// open. The two icons cross-fade + rotate as the FAB opens/closes — no
// shared single icon, no 135° rotate trick.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu as MenuIcon,
  X,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';

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
    pointer-events: none;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Action stack ---------- */
  .fab-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    pointer-events: none;
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
    pointer-events: auto;

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

  /* ---------- Pulsing halo ---------- */
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

  /* ---------- Icon container (menu ⇄ close cross-fade) ---------- */
  .fab-main-icon {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
  }
  .fab-main-icon svg {
    position: absolute;
    top: 50%;
    left: 50%;
    transition:
      opacity .28s ease,
      transform .42s cubic-bezier(.2,.8,.25,1);
    will-change: transform, opacity;
    pointer-events: none;
  }

  /* Closed state — menu in, close out */
  .fab-icon-menu {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }
  .fab-icon-close {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-120deg) scale(.4);
  }

  /* Open state — menu out, close in */
  .fab-root.is-open .fab-icon-menu {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(120deg) scale(.4);
  }
  .fab-root.is-open .fab-icon-close {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
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
    .fab-main-icon svg,
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

    /* Collapse the icon swap — instant, no rotate */
    .fab-icon-menu,
    .fab-icon-close,
    .fab-root.is-open .fab-icon-menu,
    .fab-root.is-open .fab-icon-close {
      transform: translate(-50%, -50%);
    }
    .fab-icon-menu { opacity: 1; }
    .fab-icon-close { opacity: 0; }
    .fab-root.is-open .fab-icon-menu { opacity: 0; }
    .fab-root.is-open .fab-icon-close { opacity: 1; }
  }

  /* ---------- Mobile ---------- */
  @media (max-width: 640px) {
    .fab-root { bottom: 18px; right: 16px; gap: 10px; }
    .fab-main { width: 52px; height: 52px; }
    .fab-actions { gap: 8px; }
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
            <MenuIcon
              size={22}
              strokeWidth={2.6}
              className="fab-icon-menu"
            />
            <X
              size={22}
              strokeWidth={2.6}
              className="fab-icon-close"
            />
          </span>
        </button>
      </div>
    </>
  );
}