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
  { id: 'dashboard', label: 'Dashboard', icon: <FaChartPie size={18} /> },
  { id: 'journal', label: 'Journal', icon: <FaBook size={18} /> },
  { id: 'accounts', label: 'Accounts', icon: <FaUsers size={18} /> },
  { id: 'simulator', label: 'Simulator', icon: <FaProjectDiagram size={18} />, beta: true },
];

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

  return (
    <aside
      style={{
        position: 'fixed', top: 0, left: 0, height: '100vh',
        width: isOpen ? '240px' : '68px',
        backgroundColor: '#11151F',
        borderRight: '1px solid #212836',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isOpen ? '12px 0 32px rgba(0, 0, 0, 0.45)' : 'none',
        zIndex: 1000, userSelect: 'none', overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Logo / Menu bar */}
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'space-between' : 'center',
            padding: isOpen ? '0 18px' : '0',
            borderBottom: '1px solid #1A2029',
          }}
        >
          {isOpen ? (
            <>
              <img
                src={navLogo}
                alt="Logo"
                style={{ height: '46px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
              <button
                type="button"
                onClick={onToggle}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '30px', height: '30px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#8892A3',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 0.15s ease, background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFB020';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 176, 32, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#8892A3';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <FaTimes size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '38px', height: '38px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#8892A3',
                cursor: 'pointer',
                padding: 0,
                transition: 'color 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#FFB020';
                e.currentTarget.style.backgroundColor = 'rgba(255, 176, 32, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#8892A3';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FaBars size={18} />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                title={!isOpen ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', height: '42px',
                  padding: '0 14px',
                  justifyContent: 'flex-start',
                  backgroundColor: isActive ? 'rgba(255, 176, 32, 0.08)' : 'transparent',
                  color: isActive ? '#FFB020' : '#8892A3',
                  border: 'none',
                  borderLeft: isActive ? '3px solid #FFB020' : '3px solid transparent',
                  borderRadius: isOpen ? '0 8px 8px 0' : '8px',
                  fontSize: '13px', fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, color 0.15s ease, border-radius 0.15s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = '#161B26'; e.currentTarget.style.color = '#E7E9EE'; } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#8892A3'; } }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#FFB020' : '#8892A3', flexShrink: 0 }}>
                  {item.icon}
                </span>

                {isOpen && (
                  <>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>

                    {item.beta && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '8.5px',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#FFB020',
                          background: 'rgba(255, 176, 32, 0.12)',
                          border: '1px solid rgba(255, 176, 32, 0.35)',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          lineHeight: 1.4,
                          flexShrink: 0,
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        Beta
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer — account + logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #1A2029', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          onClick={onAccountClick}
          title={!isOpen ? displayName : undefined}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 14px',
            justifyContent: 'flex-start',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#161B26')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <FaUserCircle size={20} style={{ color: '#8892A3', flexShrink: 0 }} />
          {isOpen && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#E7E9EE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          title="Logout"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', height: '36px',
            padding: '0 14px',
            justifyContent: 'flex-start',
            backgroundColor: 'transparent',
            color: '#545E6E',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px', fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease, color 0.15s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 92, 92, 0.12)'; e.currentTarget.style.color = '#FF5C5C'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#545E6E'; }}
        >
          <FaSignOutAlt size={16} style={{ flexShrink: 0 }} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}