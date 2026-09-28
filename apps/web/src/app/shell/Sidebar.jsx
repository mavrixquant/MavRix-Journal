// apps/web/src/app/shell/Sidebar.jsx
import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FaBook,
  FaProjectDiagram,
  FaUsers,
  FaComments,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaThLarge,
  FaCalendarAlt,
  FaFileAlt,
  FaChartLine,
  FaClipboardList,
  FaChartBar,
  FaWallet,
  FaBrain,
  FaCommentDots,
} from 'react-icons/fa';
import { HoverCard as HoverCardPrimitive } from 'radix-ui';
import navLogo from '@/assets/navLOGO.png';

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 68;

const FOLD_STORAGE_KEY = 'mavrix:sidebar:folded-groups';
const SB_STYLE_ID = 'mavrix-sidebar-styles';

/* ------------------------------------------------------------------ */
/*  Nav structure                                                     */
/* ------------------------------------------------------------------ */
const SIDEBAR_GROUPS = [
  {
    id: 'journal',
    label: 'Journal',
    icon: FaBook,
    items: [
      { to: '/journal',          label: 'Dashboard',         icon: FaThLarge,     end: true },
      { to: '/journal/logs',     label: 'Trade logs',        icon: FaBook },
      { to: '/journal/calendar', label: 'Economic Calendar', icon: FaCalendarAlt },
      { to: '/journal/reports',  label: 'Reports',           icon: FaFileAlt },
    ],
  },
  {
    id: 'backtester',
    label: 'Backtester',
    icon: FaProjectDiagram,
    items: [
      { to: '/backtester',           label: 'Dashboard', icon: FaChartLine, end: true },
      { to: '/backtester/logs',      label: 'Test logs', icon: FaClipboardList },
      { to: '/backtester/simulator', label: 'Simulator', icon: FaProjectDiagram },
      { to: '/backtester/chart',     label: 'Chart',     icon: FaChartBar },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: FaUsers,
    items: [
      { to: '/manage/accounts',   label: 'Accounts',   icon: FaWallet },
      { to: '/manage/strategies', label: 'Strategies', icon: FaBrain },
    ],
  },
  {
    id: 'personal',
    label: 'Personal Space',
    icon: FaComments,
    items: [
      { to: '/personal/discussion', label: 'Discussion', icon: FaComments },
      { to: '/personal/chats',      label: 'Chats',      icon: FaCommentDots },
    ],
  },
];

function isItemActive(pathname, item) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(item.to + '/');
}
function groupHasActive(pathname, group) {
  return group.items.some((item) => isItemActive(pathname, item));
}

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                        */
/*  Note: strip z-index is 0 (was 2) so .sb-head can sit above it.    */
/* ------------------------------------------------------------------ */
const SB_CSS = `
  .sb-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --label: #4A5468;

    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: linear-gradient(180deg, #0F121A 0%, #0A0D13 100%);
    border-right: 1px solid var(--line);
    justify-content: space-between;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    user-select: none;
    overflow: hidden;
    position: relative;
    -webkit-font-smoothing: antialiased;
  }
  .sb-root.is-open { box-shadow: 12px 0 40px -20px rgba(0,0,0,.75); }

  /* Amber strip — z-index 0, sits behind content */
  .sb-root::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: sbGrad 4s linear infinite;
    pointer-events: none;
    z-index: 0;
    opacity: 0;
    transition: opacity .3s ease;
  }
  .sb-root.is-open::before { opacity: 1; }

  /* ---------- Header ---------- */
  .sb-head {
    height: 64px;
    display: flex;
    align-items: center;
    padding: 0 18px;
    border-bottom: 1px solid var(--line-soft);
    justify-content: space-between;
    flex-shrink: 0;
    position: relative;   /* establishes stacking */
    z-index: 1;           /* above the amber strip */
    background: inherit;
  }
  .sb-root.is-collapsed .sb-head { justify-content: center; padding: 0; }
  .sb-logo { height: 44px; width: auto; object-fit: contain; display: block; }

  .sb-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--ink-2);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    pointer-events: auto;   /* belt & suspenders */
    position: relative;     /* stacking safe-haven */
    z-index: 2;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .sb-toggle:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2);
    box-shadow: 0 0 18px -6px rgba(245,158,11,.5);
  }
  .sb-toggle:active { transform: scale(.94); }
  .sb-toggle.is-expand { width: 40px; height: 40px; }

  /* ---------- Nav ---------- */
  .sb-nav {
    padding: 8px 8px 14px;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,.08) transparent;
    min-height: 0;
    position: relative;
    z-index: 1;
  }
  .sb-nav::-webkit-scrollbar { width: 6px; }
  .sb-nav::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }
  .sb-root.is-collapsed .sb-nav {
    padding: 14px 8px;
    gap: 10px;
    align-items: center;
    overflow: visible;
  }

  /* ---------- Group (expanded accordion) ---------- */
  .sb-group { display: flex; flex-direction: column; }
  .sb-group + .sb-group {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid rgba(255,255,255,.035);
  }

  .sb-group-head {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 10px 6px;
    background: transparent;
    border: none;
    color: var(--label);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    cursor: pointer;
    text-align: left;
    outline: none;
    transition: color .18s ease;
  }
  .sb-group-head:hover { color: var(--ink-2); }
  .sb-group-head:focus-visible {
    outline: 1px solid var(--accent-soft2);
    outline-offset: -2px;
    border-radius: 4px;
  }
  .sb-group.has-active .sb-group-head { color: var(--ink-3); }

  .sb-group-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sb-group-chev {
    flex-shrink: 0;
    color: inherit;
    opacity: .6;
    transition: transform .35s cubic-bezier(.2,.8,.25,1);
  }
  .sb-group.is-folded .sb-group-chev { transform: rotate(-90deg); }

  .sb-group-active-dot {
    flex-shrink: 0;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #FDE68A;
    box-shadow: 0 0 8px rgba(245,158,11,.9);
  }

  .sb-group-items-wrap {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows .35s cubic-bezier(.2,.8,.25,1);
  }
  .sb-group.is-folded .sb-group-items-wrap { grid-template-rows: 0fr; }
  .sb-group-items {
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 2px 0 2px;
  }

  /* ---------- Item (expanded) ---------- */
  .sb-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 34px;
    padding: 0 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 7px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: .01em;
    cursor: pointer;
    transition:
      background-color .18s cubic-bezier(.2,.8,.25,1),
      color .18s ease,
      border-color .18s ease,
      box-shadow .2s ease,
      transform .15s ease;
    outline: none;
    text-align: left;
    white-space: nowrap;
    text-decoration: none;
  }
  .sb-item:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.045);
    border-color: rgba(255,255,255,.06);
  }
  .sb-item:active { transform: scale(.985); }

  .sb-item.is-active {
    color: var(--accent);
    background: linear-gradient(90deg, rgba(245,158,11,.16), rgba(245,158,11,.05) 75%, transparent);
    border-color: var(--accent-soft2);
    font-weight: 600;
    box-shadow:
      0 6px 18px -12px rgba(245,158,11,.7),
      inset 0 1px 0 rgba(255,255,255,.05);
  }
  .sb-item.is-active::before {
    content: '';
    position: absolute;
    left: -1px;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 12px rgba(245,158,11,.75);
  }

  .sb-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    color: inherit;
    opacity: .9;
    transition: transform .18s cubic-bezier(.2,.8,.25,1), opacity .18s ease, filter .2s ease;
  }
  .sb-item:hover .sb-icon { opacity: 1; transform: scale(1.08); }
  .sb-item.is-active .sb-icon {
    opacity: 1;
    filter: drop-shadow(0 0 6px rgba(245,158,11,.65));
  }

  .sb-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ---------- Collapsed: group tile ---------- */
  .sb-root.is-collapsed .sb-group-tile {
    justify-content: center;
    padding: 0;
    gap: 0;
    width: 52px;
    min-height: 52px;
    border-radius: 12px;
  }
  .sb-root.is-collapsed .sb-item.is-active {
    color: var(--accent);
    background: linear-gradient(135deg, rgba(245,158,11,.30), rgba(245,158,11,.12));
    border-color: rgba(245,158,11,.55);
    box-shadow:
      0 0 26px -8px rgba(245,158,11,.85),
      inset 0 1px 0 rgba(255,255,255,.10);
  }
  .sb-root.is-collapsed .sb-item.is-active::before { display: none; }
  .sb-root.is-collapsed .sb-item.is-active::after {
    content: '';
    position: absolute;
    top: 7px;
    right: 7px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #FDE68A;
    box-shadow:
      0 0 10px rgba(245,158,11,.95),
      0 0 4px rgba(253,230,138,.9);
  }
  .sb-root.is-collapsed .sb-icon { width: auto; opacity: 1; }
  .sb-root.is-collapsed .sb-item.is-active .sb-icon {
    filter: drop-shadow(0 0 10px rgba(245,158,11,.9));
  }

  /* ---------- Collapsed: hover flyout ---------- */
  .sb-flyout {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --label: #4A5468;

    width: 208px;
    padding: 8px;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 12px;
    box-shadow:
      0 24px 60px -20px rgba(0,0,0,.9),
      0 0 0 1px rgba(245,158,11,.08);
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    z-index: 60;
    -webkit-font-smoothing: antialiased;
    animation: sbFlyoutIn .18s cubic-bezier(.2,.8,.25,1);
  }
  .sb-flyout-label {
    padding: 4px 8px 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--label);
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 6px;
  }
  .sb-flyout-items { display: flex; flex-direction: column; gap: 1px; }
  .sb-flyout-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 7px;
    border: 1px solid transparent;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: .01em;
    text-decoration: none;
    white-space: nowrap;
    transition: all .16s cubic-bezier(.2,.8,.25,1);
  }
  .sb-flyout-item:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.05);
    border-color: rgba(255,255,255,.07);
  }
  .sb-flyout-item.is-active {
    color: var(--accent);
    background: linear-gradient(90deg, rgba(245,158,11,.16), rgba(245,158,11,.05) 75%, transparent);
    border-color: var(--accent-soft2);
    font-weight: 600;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
  }
  .sb-flyout-item.is-active::before {
    content: '';
    position: absolute;
    left: -1px;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 12px rgba(245,158,11,.75);
  }
  .sb-flyout-item .sb-icon { width: 14px; }

  /* ---------- Footer ---------- */
  .sb-foot {
    padding: 12px 10px 14px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }
  .sb-root.is-collapsed .sb-foot { padding: 12px 8px 14px; }

  .sb-user {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .sb-user:hover {
    background: rgba(255,255,255,.045);
    border-color: rgba(255,255,255,.08);
  }
  .sb-root.is-collapsed .sb-user { justify-content: center; padding: 8px 0; }
  .sb-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    box-shadow: 0 0 20px -8px rgba(245,158,11,.5);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 700;
    font-size: 11px;
  }
  .sb-user-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    overflow: hidden;
  }
  .sb-user-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--ink-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -.01em;
  }
  .sb-user-hint {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    color: var(--ink-3);
    letter-spacing: .12em;
    text-transform: uppercase;
    font-weight: 700;
  }
  .sb-logout {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 38px;
    padding: 0 14px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    outline: none;
    text-align: left;
    white-space: nowrap;
  }
  .sb-root.is-collapsed .sb-logout { justify-content: center; padding: 0; }
  .sb-logout:hover {
    color: #f87171;
    background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.35);
    box-shadow: 0 0 20px -8px rgba(239,68,68,.5);
  }
  .sb-logout:active { transform: scale(.98); }

  /* ---------- Animations ---------- */
  @keyframes sbGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes sbFlyoutIn {
    from { opacity: 0; transform: translateX(-6px) scale(.98); }
    to   { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sb-root, .sb-item, .sb-toggle, .sb-user, .sb-logout,
    .sb-group-items-wrap, .sb-group-chev, .sb-icon { transition: none !important; }
    .sb-root::before, .sb-flyout { animation: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Inject the sidebar CSS into <head> BEFORE the first paint.        */
/*  Idempotent — safe under HMR and remounts.                         */
/* ------------------------------------------------------------------ */
function useSidebarStyles() {
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById(SB_STYLE_ID);
    if (existing) {
      // HMR: refresh the rules if the CSS string changed
      if (existing.textContent !== SB_CSS) existing.textContent = SB_CSS;
      return;
    }
    const el = document.createElement('style');
    el.id = SB_STYLE_ID;
    el.textContent = SB_CSS;
    document.head.appendChild(el);
  }, []);
}

/* ------------------------------------------------------------------ */
/*  Expanded: accordion group                                          */
/* ------------------------------------------------------------------ */
function ExpandedGroup({ group, folded, onToggle, onNavigate, pathname }) {
  const hasActive = groupHasActive(pathname, group);

  return (
    <div className={`sb-group${folded ? ' is-folded' : ''}${hasActive ? ' has-active' : ''}`}>
      <button
        type="button"
        className="sb-group-head"
        onClick={onToggle}
        aria-expanded={!folded}
      >
        <span className="sb-group-label">{group.label}</span>
        {hasActive && folded && <span className="sb-group-active-dot" />}
        <FaChevronDown className="sb-group-chev" size={9} />
      </button>

      <div className="sb-group-items-wrap" aria-hidden={folded}>
        <div className="sb-group-items">
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => `sb-item${isActive ? ' is-active' : ''}`}
              >
                <span className="sb-icon">
                  <Icon size={13} />
                </span>
                <span className="sb-label">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsed: group tile + hover flyout                               */
/* ------------------------------------------------------------------ */
function CollapsedGroupTile({ group, onNavigate, pathname }) {
  const hasActive = groupHasActive(pathname, group);
  const Icon = group.icon;
  const defaultItem = group.items[0];

  return (
    <HoverCardPrimitive.Root openDelay={80} closeDelay={80}>
      <HoverCardPrimitive.Trigger asChild>
        <NavLink
          to={defaultItem.to}
          end={defaultItem.end}
          onClick={onNavigate}
          className={`sb-item sb-group-tile${hasActive ? ' is-active' : ''}`}
          aria-label={group.label}
        >
          <span className="sb-icon">
            <Icon size={19} />
          </span>
        </NavLink>
      </HoverCardPrimitive.Trigger>

      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          side="right"
          align="start"
          sideOffset={10}
          className="sb-flyout"
        >
          <div className="sb-flyout-label">{group.label}</div>
          <div className="sb-flyout-items">
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `sb-flyout-item${isActive ? ' is-active' : ''}`
                  }
                >
                  <span className="sb-icon">
                    <ItemIcon size={12} />
                  </span>
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  SidebarContent                                                     */
/* ------------------------------------------------------------------ */
export function SidebarContent({
  collapsed = false,
  showCollapseButton = true,
  user,
  onLogout,
  onAccountClick,
  onCollapseToggle,
  onNavigate,
}) {
  useSidebarStyles();  // ← injects CSS before paint

  const { pathname } = useLocation();

  const [folded, setFolded] = useState(() => {
    try {
      const raw = localStorage.getItem(FOLD_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FOLD_STORAGE_KEY, JSON.stringify(folded));
    } catch { /* ignore */ }
  }, [folded]);

  useEffect(() => {
    const activeGroup = SIDEBAR_GROUPS.find((g) => groupHasActive(pathname, g));
    if (!activeGroup) return;
    setFolded((prev) =>
      prev[activeGroup.id] ? { ...prev, [activeGroup.id]: false } : prev
    );
  }, [pathname]);

  const toggleGroup = useCallback((id) => {
    setFolded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const displayName =
    (typeof user?.displayName === 'string' && user.displayName.trim()) ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'User';

  const initials =
    (displayName.match(/\b[A-Za-z]/g) || [])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  return (
    <div className={`sb-root ${collapsed ? 'is-collapsed' : 'is-open'}`}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
        <div className="sb-head">
          {!collapsed ? (
            <>
              <img src={navLogo} alt="Mavrix" className="sb-logo" />
              {showCollapseButton && (
                <button
                  type="button"
                  onClick={onCollapseToggle}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                  className="sb-toggle"
                >
                  <FaTimes size={15} />
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onCollapseToggle}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="sb-toggle is-expand"
            >
              <FaBars size={17} />
            </button>
          )}
        </div>

        <nav className="sb-nav">
          {SIDEBAR_GROUPS.map((group) =>
            collapsed ? (
              <CollapsedGroupTile
                key={group.id}
                group={group}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ) : (
              <ExpandedGroup
                key={group.id}
                group={group}
                folded={!!folded[group.id]}
                onToggle={() => toggleGroup(group.id)}
                onNavigate={onNavigate}
                pathname={pathname}
              />
            )
          )}
        </nav>
      </div>

      <div className="sb-foot">
        <button
          type="button"
          className="sb-user"
          onClick={onAccountClick}
          title={collapsed ? displayName : undefined}
        >
          <span className="sb-avatar">{initials}</span>
          {!collapsed && (
            <span className="sb-user-text">
              <span className="sb-user-name">{displayName}</span>
              <span className="sb-user-hint">Account</span>
            </span>
          )}
        </button>

        <button
          type="button"
          className="sb-logout"
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
        >
          <FaSignOutAlt size={15} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop aside                                                      */
/* ------------------------------------------------------------------ */
export default function Sidebar({
  collapsed,
  onCollapseToggle,
  user,
  onLogout,
  onAccountClick,
}) {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col"
      style={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        transition: 'width .4s cubic-bezier(.16, 1, .3, 1)',
        boxShadow: collapsed ? 'none' : '12px 0 40px -20px rgba(0,0,0,.75)',
      }}
    >
      <SidebarContent
        collapsed={collapsed}
        onCollapseToggle={onCollapseToggle}
        user={user}
        onLogout={onLogout}
        onAccountClick={onAccountClick}
      />
    </aside>
  );
}