// src/components/common/Sidebar.jsx
import {
  FaChartPie,
  FaBook,
  FaUsers,
  FaUserCircle,
  FaSignOutAlt,
  FaProjectDiagram,
  FaBars,
  FaTimes,
} from 'react-icons/fa';
import navLogo from '../../assets/navLOGO.png';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <FaChartPie size={16} /> },
  { id: 'journal',   label: 'Journal',   icon: <FaBook size={16} /> },
  { id: 'accounts',  label: 'Accounts',  icon: <FaUsers size={16} /> },
  { id: 'simulator', label: 'Simulator', icon: <FaProjectDiagram size={16} />, beta: true },
];

/* ------------------------------------------------------------------ */
/*  Scoped CSS — matches JournalMain / AccountsMain / modals           */
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
    --win: #22c55e;
    --loss: #ef4444;

    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 240px;
    background: linear-gradient(180deg, #0F121A 0%, #0A0D13 100%);
    border-right: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: width .4s cubic-bezier(.16,1,.3,1);
    z-index: 1000;
    user-select: none;
    overflow: hidden;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: var(--ink-1);
    -webkit-font-smoothing: antialiased;
  }
  .sb-root.is-collapsed { width: 68px; }
  .sb-root.is-open { box-shadow: 12px 0 40px -20px rgba(0,0,0,.75); }

  /* Animated amber strip at the very top */
  .sb-root::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: sbGrad 4s linear infinite;
    pointer-events: none;
    z-index: 2;
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
    position: relative;
  }
  .sb-root.is-collapsed .sb-head {
    justify-content: center;
    padding: 0;
  }

  .sb-logo {
    height: 44px;
    width: auto;
    object-fit: contain;
    display: block;
  }

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
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .sb-toggle:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2);
    box-shadow: 0 0 18px -6px rgba(245,158,11,.5);
  }
  .sb-toggle:active { transform: scale(.94); }
  .sb-toggle.is-expand {
    width: 40px;
    height: 40px;
  }

  /* ---------- Nav ---------- */
  .sb-nav {
    padding: 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sb-root.is-collapsed .sb-nav { padding: 14px 8px; }

  .sb-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 42px;
    padding: 0 14px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 10px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    outline: none;
    text-align: left;
    white-space: nowrap;
  }
  .sb-root.is-collapsed .sb-item {
    justify-content: center;
    padding: 0;
  }

  .sb-item:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.045);
    border-color: rgba(255,255,255,.08);
  }
  .sb-item:active { transform: scale(.98); }

  .sb-item.is-active {
    color: var(--accent);
    background: linear-gradient(90deg, rgba(245,158,11,.14), rgba(245,158,11,.04) 70%, transparent);
    border-color: var(--accent-soft2);
    box-shadow:
      0 8px 24px -12px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.04);
  }
  /* Amber bar on the left edge when active */
  .sb-item.is-active::before {
    content: '';
    position: absolute;
    left: -1px;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 12px rgba(245,158,11,.7);
  }
  .sb-root.is-collapsed .sb-item.is-active::before { display: none; }

  .sb-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: inherit;
    transition: transform .22s cubic-bezier(.2,.8,.25,1);
  }
  .sb-item:hover .sb-icon { transform: scale(1.06); }
  .sb-item.is-active .sb-icon { filter: drop-shadow(0 0 8px rgba(245,158,11,.55)); }

  .sb-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sb-beta {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--blue);
    background: rgba(11, 179, 245, 0.12);
    border: 1px solid var(--blue-soft2);
    border-radius: 4px;
    padding: 1px 5px;
    line-height: 1.4;
    flex-shrink: 0;
  }

  /* ---------- Footer ---------- */
  .sb-foot {
    padding: 12px 10px 14px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
    position: relative;
  }
  .sb-root.is-collapsed .sb-foot { padding: 12px 8px 14px; }

  .sb-user {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .sb-user:hover {
    background: rgba(255,255,255,.045);
    border-color: rgba(255,255,255,.08);
  }
  .sb-root.is-collapsed .sb-user {
    justify-content: center;
    padding: 8px 0;
  }

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
  .sb-root.is-collapsed .sb-logout {
    justify-content: center;
    padding: 0;
  }
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

  @media (prefers-reduced-motion: reduce) {
    .sb-root, .sb-item, .sb-toggle, .sb-user, .sb-logout { transition: none !important; }
    .sb-root::before { animation: none !important; }
    .sb-icon { transition: none !important; }
  }
`;

export default function Sidebar({
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  user,
  onLogout,
  onAccountClick,
}) {
  const displayName = user?.displayName || user?.email || 'User';
  const initials = (displayName.match(/\b[A-Za-z]/g) || []).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <aside className={`sb-root ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      <style>{SB_CSS}</style>

      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Logo / toggle */}
        <div className="sb-head">
          {isOpen ? (
            <>
              <img src={navLogo} alt="Logo" className="sb-logo" />
              <button
                type="button"
                onClick={onToggle}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="sb-toggle"
              >
                <FaTimes size={15} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="sb-toggle is-expand"
            >
              <FaBars size={17} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="sb-nav">
          {navItems.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                title={!isOpen ? item.label : undefined}
                className={`sb-item ${isActive ? 'is-active' : ''}`}
              >
                <span className="sb-icon">{item.icon}</span>

                {isOpen && (
                  <>
                    <span className="sb-label">{item.label}</span>
                    {item.beta && <span className="sb-beta">Beta</span>}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer — user + logout */}
      <div className="sb-foot">
        <div
          className="sb-user"
          onClick={onAccountClick}
          title={!isOpen ? displayName : undefined}
        >
          <span className="sb-avatar">{initials}</span>
          {isOpen && (
            <div className="sb-user-text">
              <span className="sb-user-name">{displayName}</span>
              <span className="sb-user-hint">Account</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sb-logout"
          onClick={onLogout}
          title="Logout"
        >
          <FaSignOutAlt size={15} style={{ flexShrink: 0 }} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}