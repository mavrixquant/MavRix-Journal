// apps/web/src/features/personal/chats/components/ChatPageFab.jsx
//
// Context-aware action FAB, rendered inside the ConversationList pane.
//
// Why in-pane and not viewport-fixed:
//   The message composer's Send button lives in the bottom-right corner of
//   the thread. A viewport-fixed FAB would collide with it. Anchoring the
//   FAB inside .chat-list keeps it scoped to the left column and 100%
//   clear of the composer.
//
// Actions by active tab:
//   'dms'    → New DM
//   'groups' → New Group (admins only) + Discover Group
//   other    → not rendered (this component is only mounted from
//              ConversationList, which is only used on dms/groups)
//
// Interaction mirrors DashboardFab:
//   • Click main → toggle
//   • Menu icon ⇄ X cross-fade
//   • Actions slide/fade in with staggered delays
//   • Click outside or Escape closes

import { useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  MessageSquarePlus,
  Users,
  Compass,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Scoped styles                                                      */
/* ------------------------------------------------------------------ */

const CSS = `
  .chat-fab-root {
    position: absolute;
    bottom: 14px;
    right: 14px;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    pointer-events: none;
  }

  .chat-fab-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    pointer-events: none;
  }
  .chat-fab-root.is-open .chat-fab-actions {
    pointer-events: auto;
  }

  .chat-fab-action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px 7px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,.10);
    background: linear-gradient(180deg, #1A2030 0%, #12161F 100%);
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
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

  .chat-fab-root.is-open .chat-fab-action {
    opacity: 1;
    transform: none;
    transition-delay: var(--chat-fab-delay, 0ms);
  }

  .chat-fab-action:hover {
    color: var(--accent-2);
    border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    background: linear-gradient(180deg, #202836 0%, #161C28 100%);
    box-shadow:
      0 16px 36px -14px color-mix(in srgb, var(--accent) 38%, transparent),
      inset 0 1px 0 rgba(255,255,255,.06);
  }

  .chat-fab-action:focus-visible {
    border-color: var(--accent);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent),
      0 12px 30px -12px rgba(0,0,0,.85);
  }

  .chat-fab-action:active {
    transform: translateY(1px) scale(.98);
  }

  .chat-fab-action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    color: var(--accent);
    flex-shrink: 0;
    transition: transform .22s cubic-bezier(.2,.8,.25,1), background .18s ease;
  }
  .chat-fab-action:hover .chat-fab-action-icon {
    transform: scale(1.08);
    background: color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .chat-fab-action-label {
    line-height: 1;
  }

  .chat-fab-main {
    position: relative;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: none;
    padding: 0;
    cursor: pointer;
    outline: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
    color: #0D1117;
    box-shadow:
      0 16px 40px -14px color-mix(in srgb, var(--accent) 65%, transparent),
      0 6px 18px -8px rgba(0,0,0,.70),
      inset 0 1px 0 rgba(255,255,255,.50);
    transition:
      transform .28s cubic-bezier(.2,.8,.25,1),
      box-shadow .28s ease;
  }

  .chat-fab-main:hover {
    transform: translateY(-2px) scale(1.04);
    box-shadow:
      0 22px 50px -14px color-mix(in srgb, var(--accent) 85%, transparent),
      0 8px 22px -8px rgba(0,0,0,.70),
      inset 0 1px 0 rgba(255,255,255,.60);
  }

  .chat-fab-main:active {
    transform: translateY(0) scale(.97);
  }

  .chat-fab-main:focus-visible {
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--accent) 30%, transparent),
      0 16px 40px -14px color-mix(in srgb, var(--accent) 65%, transparent),
      inset 0 1px 0 rgba(255,255,255,.50);
  }

  .chat-fab-halo {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(circle, color-mix(in srgb, var(--accent) 48%, transparent) 0%, transparent 68%);
    opacity: 0;
    transform: scale(1.15);
    animation: chatFabPulse 2.6s ease-in-out infinite;
    z-index: 0;
  }

  .chat-fab-main-icon {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  }
  .chat-fab-main-icon svg {
    position: absolute;
    top: 50%;
    left: 50%;
    transition:
      opacity .28s ease,
      transform .42s cubic-bezier(.2,.8,.25,1);
    will-change: transform, opacity;
    pointer-events: none;
  }

  .chat-fab-icon-menu {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }
  .chat-fab-icon-close {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(-120deg) scale(.4);
  }
  .chat-fab-root.is-open .chat-fab-icon-menu {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(120deg) scale(.4);
  }
  .chat-fab-root.is-open .chat-fab-icon-close {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
  }

  @keyframes chatFabPulse {
    0%   { opacity: 0;    transform: scale(1.15); }
    45%  { opacity: .55;  transform: scale(1.38); }
    100% { opacity: 0;    transform: scale(1.15); }
  }

  @media (prefers-reduced-motion: reduce) {
    .chat-fab-halo { animation: none; display: none; }
    .chat-fab-main,
    .chat-fab-main-icon svg,
    .chat-fab-action,
    .chat-fab-action-icon {
      transition: none !important;
      animation: none !important;
    }
    .chat-fab-action {
      opacity: 1;
      transform: none;
      transition-delay: 0ms !important;
    }
    .chat-fab-icon-menu,
    .chat-fab-icon-close,
    .chat-fab-root.is-open .chat-fab-icon-menu,
    .chat-fab-root.is-open .chat-fab-icon-close {
      transform: translate(-50%, -50%);
    }
    .chat-fab-icon-menu { opacity: 1; }
    .chat-fab-icon-close { opacity: 0; }
    .chat-fab-root.is-open .chat-fab-icon-menu { opacity: 0; }
    .chat-fab-root.is-open .chat-fab-icon-close { opacity: 1; }
  }

  @media (max-width: 640px) {
    .chat-fab-root { bottom: 10px; right: 10px; gap: 8px; }
    .chat-fab-main { width: 46px; height: 46px; }
    .chat-fab-action {
      width: 40px;
      height: 40px;
      padding: 0;
      justify-content: center;
      border-radius: 50%;
      gap: 0;
    }
    .chat-fab-action-label { display: none; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChatPageFab({
  activeTab,     // 'dms' | 'groups'
  isAdmin,
  onNewDm,
  onNewGroup,
  onDiscover,
}) {
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

  /* -------- Build the action list for this tab -------- */
  const actions = [];

  if (activeTab === 'dms') {
    actions.push({
      id: 'new-dm',
      label: 'New DM',
      icon: MessageSquarePlus,
      delay: '40ms',
      onClick: () => {
        setOpen(false);
        onNewDm();
      },
    });
  } else if (activeTab === 'groups') {
    if (isAdmin) {
      actions.push({
        id: 'new-group',
        label: 'New Group',
        icon: Users,
        delay: '120ms',
        onClick: () => {
          setOpen(false);
          onNewGroup();
        },
      });
    }
    actions.push({
      id: 'discover',
      label: 'Discover',
      icon: Compass,
      delay: isAdmin ? '40ms' : '40ms',
      onClick: () => {
        setOpen(false);
        onDiscover();
      },
    });
  }

  if (actions.length === 0) return null;

  return (
    <>
      <style>{CSS}</style>

      <div
        ref={rootRef}
        className={`chat-fab-root${open ? ' is-open' : ''}`}
      >
        <div className="chat-fab-actions" aria-hidden={!open}>
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                className="chat-fab-action"
                style={{ '--chat-fab-delay': a.delay }}
                onClick={a.onClick}
                tabIndex={open ? 0 : -1}
                aria-label={a.label}
              >
                <span className="chat-fab-action-icon" aria-hidden>
                  <Icon size={13} strokeWidth={2.4} />
                </span>
                <span className="chat-fab-action-label">{a.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="chat-fab-main"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close actions' : 'Open actions'}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="chat-fab-halo" aria-hidden />

          <span className="chat-fab-main-icon" aria-hidden>
            <Menu
              size={20}
              strokeWidth={2.6}
              className="chat-fab-icon-menu"
            />
            <X
              size={20}
              strokeWidth={2.6}
              className="chat-fab-icon-close"
            />
          </span>
        </button>
      </div>
    </>
  );
}