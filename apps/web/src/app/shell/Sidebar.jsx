// apps/web/src/app/shell/Sidebar.jsx
import { useLayoutEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FaBook,
  FaProjectDiagram,
  FaUsers,
  FaComments,
  FaBars,
  FaTimes,
  FaThLarge,
  FaCalendarAlt,
  FaChartPie,
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
const SIDEBAR_HEAD_HEIGHT = 72;

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
      { to: '/journal/analyse',  label: 'Analyse',           icon: FaChartPie },
      { to: '/journal/logs',     label: 'Trade logs',        icon: FaBook },
      { to: '/journal/calendar', label: 'Economic Calendar', icon: FaCalendarAlt },
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
/*                                                                    */
/*  Layout strategy:                                                  */
/*    .sb-root       → position: relative, full height                */
/*    .sb-head       → position: absolute, top: 0, height: 72px       */
/*    .sb-nav        → position: absolute, top: 72px, bottom: 0       */
/*                                                                    */
/*  Absolute positioning removes any dependency on flex ordering      */
/*  from parent containers, so the nav tiles are guaranteed to        */
/*  render from the top of the nav region down.                       */
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

    position: relative;
    display: block;
    height: 100%;
    min-height: 0;
    width: 100%;
    background: linear-gradient(180deg, #0F121A 0%, #0A0D13 100%);
    border-right: 1px solid var(--line);
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    user-select: none;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .sb-root.is-open { box-shadow: 12px 0 40px -20px rgba(0,0,0,.75); }


  /* ---------- Header (absolute, pinned top) ---------- */
  .sb-head {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: ${SIDEBAR_HEAD_HEIGHT}px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px 0 18px;
    z-index: 2;
    background: inherit;
  }
  .sb-head::after {
    content: '';
    position: absolute;
    left: 0; right: 0; bottom: 0; height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,.085) 12%,
      rgba(255,255,255,.085) 88%,
      transparent
    );
    pointer-events: none;
  }
  .sb-head::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      120% 100% at 22% 0%,
      rgba(245,158,11,.07),
      transparent 62%
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity .5s ease;
  }
  .sb-root.is-open .sb-head::before { opacity: 1; }

  .sb-root.is-collapsed .sb-head {
    justify-content: center;
    padding: 0;
  }

  /* ---------- Brand ---------- */
  .sb-brand {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 1;
    height: 100%;
  }
  .sb-brand::before {
    content: '';
    position: absolute;
    left: -22px;
    top: 50%;
    transform: translateY(-50%);
    width: 220px;
    height: 80px;
    background: radial-gradient(
      closest-side,
      rgba(245,158,11,.20),
      rgba(245,158,11,.05) 45%,
      transparent 75%
    );
    pointer-events: none;
    filter: blur(6px);
  }
  .sb-logo {
    position: relative;
    height: 36px;
    width: auto;
    max-width: 100%;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 2px 12px rgba(245,158,11,.28));
    transition: filter .35s ease;
  }
  .sb-root:hover .sb-logo {
    filter: drop-shadow(0 2px 18px rgba(245,158,11,.46));
  }

  /* ---------- Collapse / expand toggle ---------- */
  .sb-toggle {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 10px;
    background: rgba(255,255,255,.025);
    border: 1px solid rgba(255,255,255,.07);
    color: var(--ink-3);
    cursor: pointer;
    flex-shrink: 0;
    z-index: 2;
    transition:
      color .22s cubic-bezier(.2,.8,.25,1),
      background .22s cubic-bezier(.2,.8,.25,1),
      border-color .22s cubic-bezier(.2,.8,.25,1),
      box-shadow .25s ease,
      transform .15s ease;
  }
  .sb-toggle svg {
    transition: transform .35s cubic-bezier(.2,.8,.25,1);
  }
  .sb-toggle:hover {
    color: var(--accent);
    background: linear-gradient(135deg, rgba(245,158,11,.14), rgba(245,158,11,.05));
    border-color: var(--accent-soft2);
    box-shadow:
      0 0 22px -6px rgba(245,158,11,.6),
      inset 0 1px 0 rgba(255,255,255,.06);
    transform: translateY(-1px);
  }
  .sb-toggle:hover svg { transform: scale(1.14); }
  .sb-toggle:active { transform: translateY(0) scale(.94); }
  .sb-toggle:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.20);
  }

  .sb-toggle.is-expand {
    width: 46px;
    height: 46px;
    border-radius: 13px;
    color: var(--ink-2);
    background: linear-gradient(135deg, rgba(245,158,11,.06), rgba(255,255,255,.02));
    border-color: rgba(255,255,255,.09);
  }
  .sb-toggle.is-expand:hover {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.06));
    box-shadow:
      0 0 30px -6px rgba(245,158,11,.7),
      inset 0 1px 0 rgba(255,255,255,.10);
  }
  .sb-toggle.is-expand:hover svg { transform: scale(1.12); }

  /* ---------- Nav (absolute, pinned below header) ---------- */
  .sb-nav {
    position: absolute;
    top: ${SIDEBAR_HEAD_HEIGHT}px;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 14px 8px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    gap: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,.08) transparent;
    z-index: 1;
  }
  .sb-nav::-webkit-scrollbar { width: 6px; }
  .sb-nav::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  /* Collapsed mode — icon tiles, centered horizontally, top-aligned vertically */
  .sb-root.is-collapsed .sb-nav {
    padding: 14px 8px;
    gap: 10px;
    align-items: center;
  }

  /* ---------- Group ---------- */
  .sb-group { display: flex; flex-direction: column; flex-shrink: 0; }
  .sb-group + .sb-group {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,.035);
  }

  .sb-group-head {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 10px 6px;
    color: var(--label);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    text-align: left;
    user-select: none;
  }
  .sb-group.has-active .sb-group-head { color: var(--ink-3); }

  .sb-group-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-group-items-wrap { display: block; }
  .sb-group-items {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 2px 0 2px;
  }

  /* ---------- Item ---------- */
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
    flex-shrink: 0;
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

  /* ---------- Animations ---------- */
  @keyframes sbFlyoutIn {
    from { opacity: 0; transform: translateX(-6px) scale(.98); }
    to   { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sb-item, .sb-toggle, .sb-icon { transition: none !important; }
    .sb-flyout { animation: none !important; }
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
/*  Expanded: static group label + always-visible items                */
/* ------------------------------------------------------------------ */
function ExpandedGroup({ group, onNavigate, pathname }) {
  const hasActive = groupHasActive(pathname, group);

  return (
    <div className={`sb-group${hasActive ? ' has-active' : ''}`}>
      <div className="sb-group-head">
        <span className="sb-group-label">{group.label}</span>
      </div>

      <div className="sb-group-items-wrap">
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
  onCollapseToggle,
  onNavigate,
}) {
  useSidebarStyles();

  const { pathname } = useLocation();

  return (
    <div className={`sb-root ${collapsed ? 'is-collapsed' : 'is-open'}`}>
      <div className="sb-head">
        {!collapsed ? (
          <>
            <div className="sb-brand">
              <img src={navLogo} alt="Mavrix" className="sb-logo" />
            </div>
            {showCollapseButton && (
              <button
                type="button"
                onClick={onCollapseToggle}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="sb-toggle"
              >
                <FaTimes size={14} />
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
            <FaBars size={19} />
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
              onNavigate={onNavigate}
              pathname={pathname}
            />
          )
        )}
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop aside                                                      */
/* ------------------------------------------------------------------ */
export default function Sidebar({ collapsed, onCollapseToggle }) {
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
      />
    </aside>
  );
}