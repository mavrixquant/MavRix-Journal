// apps/web/src/app/shell/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  Activity,
  LogOut,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import navLogo from '@/assets/navLOGO.png';

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 84;

const NAV_ITEMS = [
  { to: '/dashboard',           label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/journal',   label: 'Journal',   icon: BookOpen },
  { to: '/dashboard/accounts',  label: 'Accounts',  icon: Wallet },
  { to: '/dashboard/simulator', label: 'Simulator', icon: Activity, beta: true },
];

/* ------------------------------------------------------------------ */
/*  Inner content — reused by desktop aside and mobile Sheet          */
/* ------------------------------------------------------------------ */
export function SidebarContent({
  collapsed = false,
  onNavigate,
  user,
  onLogout,
  onAccountClick,
  onCollapseToggle,
  showCollapseButton = true,
}) {
  const displayName = user?.displayName || user?.email || 'User';
  const initials =
    (displayName.match(/\b[A-Za-z]/g) || [])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const ICON_SIZE = collapsed ? 20 : 16;
  const ITEM_SIZE = collapsed ? 52 : 44;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'linear-gradient(180deg, #0F121A 0%, #0A0D13 100%)',
        borderRight: '1px solid rgba(255,255,255,.085)',
        color: '#E7E9EE',
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ---------- Header ---------- */}
      <div
        style={{
          height: 72,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? 0 : '0 18px',
          borderBottom: '1px solid rgba(255,255,255,.05)',
        }}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onCollapseToggle}
            aria-label="Expand sidebar"
            title="Expand sidebar (Ctrl+B)"
            style={{
              width: 44,
              height: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,.08)',
              background: 'rgba(255,255,255,.03)',
              color: '#8892A3',
              cursor: 'pointer',
              transition: 'all .22s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F59E0B';
              e.currentTarget.style.background = 'rgba(245,158,11,.10)';
              e.currentTarget.style.borderColor = 'rgba(245,158,11,.35)';
              e.currentTarget.style.boxShadow =
                '0 0 20px -6px rgba(245,158,11,.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#8892A3';
              e.currentTarget.style.background = 'rgba(255,255,255,.03)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <PanelLeftOpen size={18} />
          </button>
        ) : (
          <>
            <img
              src={navLogo}
              alt="Mavrix"
              style={{
                height: 38,
                width: 'auto',
                maxWidth: 150,
                objectFit: 'contain',
                display: 'block',
              }}
            />
            {showCollapseButton && (
              <button
                type="button"
                onClick={onCollapseToggle}
                aria-label="Collapse sidebar"
                title="Collapse sidebar (Ctrl+B)"
                style={{
                  width: 32,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: '#8892A3',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all .22s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#F59E0B';
                  e.currentTarget.style.background = 'rgba(245,158,11,.08)';
                  e.currentTarget.style.borderColor = 'rgba(245,158,11,.28)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8892A3';
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <PanelLeftClose size={15} />
              </button>
            )}
          </>
        )}
      </div>

      {/* ---------- Nav ---------- */}
      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: collapsed ? 6 : 4,
          padding: collapsed ? '16px 0' : '14px 12px',
          alignItems: collapsed ? 'center' : 'stretch',
          flexShrink: 0,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              style={({ isActive }) => ({
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 12,
                width: collapsed ? ITEM_SIZE : '100%',
                height: ITEM_SIZE,
                padding: collapsed ? 0 : '0 14px',
                borderRadius: collapsed ? 12 : 10,
                border: `1px solid ${
                  isActive ? 'rgba(245,158,11,.32)' : 'transparent'
                }`,
                background: isActive
                  ? collapsed
                    ? 'rgba(245,158,11,.14)'
                    : 'linear-gradient(90deg, rgba(245,158,11,.14), rgba(245,158,11,.04) 70%, transparent)'
                  : collapsed
                    ? 'rgba(255,255,255,.02)'
                    : 'transparent',
                color: isActive ? '#F59E0B' : '#8892A3',
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: 12.5,
                fontWeight: 600,
                letterSpacing: '.02em',
                textDecoration: 'none',
                transition: 'all .22s cubic-bezier(.2,.8,.25,1)',
                whiteSpace: 'nowrap',
                boxShadow: isActive
                  ? '0 8px 24px -12px rgba(245,158,11,.55), inset 0 1px 0 rgba(255,255,255,.04)'
                  : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  {/* Left accent bar — only when NOT collapsed */}
                  {isActive && !collapsed && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: -1,
                        top: 8,
                        bottom: 8,
                        width: 3,
                        borderRadius: '0 3px 3px 0',
                        background:
                          'linear-gradient(180deg, #F59E0B, #FDE68A)',
                        boxShadow: '0 0 12px rgba(245,158,11,.7)',
                      }}
                    />
                  )}

                  {/* Active dot — only when collapsed */}
                  {isActive && collapsed && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#FDE68A',
                        boxShadow: '0 0 8px rgba(245,158,11,.9)',
                      }}
                    />
                  )}

                  <Icon
                    size={ICON_SIZE}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    style={{
                      flexShrink: 0,
                      filter: isActive
                        ? 'drop-shadow(0 0 8px rgba(245,158,11,.55))'
                        : 'none',
                    }}
                  />

                  {!collapsed && (
                    <>
                      <span
                        style={{
                          flex: '1 1 0',
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.label}
                      </span>

                      {item.beta && (
                        <span
                          style={{
                            flexShrink: 0,
                            fontFamily:
                              "'IBM Plex Mono', ui-monospace, monospace",
                            fontSize: 8.5,
                            fontWeight: 700,
                            letterSpacing: '.12em',
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: 4,
                            color: '#60A5FA',
                            background: 'rgba(96,165,250,.12)',
                            border: '1px solid rgba(96,165,250,.32)',
                            lineHeight: 1.4,
                          }}
                        >
                          Beta
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.to} delayDuration={250}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={12}
                  className="border-white/10 bg-[#11151F] font-mono text-[11px] text-[#E7E9EE]"
                >
                  {item.label}
                  {item.beta && (
                    <span className="ml-2 rounded bg-blue-400/15 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-widest text-blue-400">
                      Beta
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      <div style={{ flex: 1, minHeight: 20 }} />

      {/* ---------- Footer ---------- */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'stretch',
          gap: collapsed ? 10 : 4,
          padding: collapsed ? '14px 0 18px' : '12px 12px 16px',
          borderTop: '1px solid rgba(255,255,255,.05)',
        }}
      >
        {/* Account button */}
        <button
          type="button"
          onClick={onAccountClick}
          title={collapsed ? displayName : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10,
            width: collapsed ? 52 : '100%',
            height: collapsed ? 52 : 48,
            padding: collapsed ? 0 : '8px 12px',
            borderRadius: 12,
            border: '1px solid transparent',
            background: 'transparent',
            color: '#E7E9EE',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all .22s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)';
            e.currentTarget.style.background = 'rgba(255,255,255,.045)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span
            style={{
              width: collapsed ? 40 : 34,
              height: collapsed ? 40 : 34,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: '1px solid rgba(245,158,11,.32)',
              background:
                'linear-gradient(135deg, rgba(245,158,11,.20), rgba(245,158,11,.06))',
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: collapsed ? 13 : 12,
              fontWeight: 700,
              color: '#F59E0B',
              boxShadow: '0 0 22px -8px rgba(245,158,11,.6)',
            }}
          >
            {initials}
          </span>
          {!collapsed && (
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: '-.01em',
                  color: '#E7E9EE',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {displayName}
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: '#545E6E',
                }}
              >
                Account
              </span>
            </span>
          )}
        </button>

        {/* Logout button */}
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10,
            width: collapsed ? 44 : '100%',
            height: collapsed ? 44 : 40,
            padding: collapsed ? 0 : '0 14px',
            borderRadius: 10,
            border: '1px solid transparent',
            background: 'transparent',
            color: '#545E6E',
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '.02em',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all .22s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.background = 'rgba(239,68,68,.08)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#545E6E';
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <LogOut size={collapsed ? 18 : 15} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop aside — fixed, width from inline style                    */
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
        boxShadow: '12px 0 40px -20px rgba(0,0,0,.75)',
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