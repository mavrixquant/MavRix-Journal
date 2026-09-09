// src/components/common/Sidebar.jsx
import { FaChartPie, FaBook, FaUsers, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import navLogo from '../../assets/navLOGO.png';
import smLogo from '../../assets/smLOGO.png';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <FaChartPie size={18} /> },
  { id: 'journal', label: 'Journal', icon: <FaBook size={18} /> },
  { id: 'accounts', label: 'Accounts', icon: <FaUsers size={18} /> },
];

export default function Sidebar({
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  user,
  onLogout,
  onMouseEnter,
  onMouseLeave,
  onAccountClick,
}) {
  const displayName = user?.displayName || user?.email || 'User';

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: isOpen ? '240px' : '68px',
        backgroundColor: '#11151F',
        borderRight: '1px solid #212836',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isOpen ? '12px 0 32px rgba(0, 0, 0, 0.45)' : 'none',
        zIndex: 1000,
        userSelect: 'none',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top Header & Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Logo Area */}
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'flex-start' : 'center',
            padding: isOpen ? '0 18px' : '0',
            borderBottom: '1px solid #1A2029',
          }}
        >
          {isOpen ? (
            <div
              onClick={onToggle}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                gap: '10px',
              }}
            >
              <img
                src={navLogo}
                alt="Logo"
                style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              title="Expand sidebar"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={smLogo} alt="Logo" style={{ height: '32px', width: 'auto' }} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  height: '42px',
                  padding: isOpen ? '0 12px' : '0',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  backgroundColor: isActive ? 'rgba(255, 176, 32, 0.08)' : 'transparent',
                  color: isActive ? '#FFB020' : '#8892A3',
                  border: 'none',
                  borderLeft: isActive ? '3px solid #FFB020' : '3px solid transparent',
                  borderRadius: isOpen ? '0 8px 8px 0' : '8px',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#161B26';
                    e.currentTarget.style.color = '#E7E9EE';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#8892A3';
                  }
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? '#FFB020' : '#8892A3',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                {isOpen && (
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer: User Account & Logout */}
      <div
        style={{
          padding: '12px 8px',
          borderTop: '1px solid #1A2029',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {/* Account Button */}
        <div
          onClick={onAccountClick}
          title={!isOpen ? displayName : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: isOpen ? '8px 10px' : '8px 0',
            justifyContent: isOpen ? 'flex-start' : 'center',
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
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#E7E9EE',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displayName}
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          title="Logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            height: '36px',
            padding: isOpen ? '0 10px' : '0',
            justifyContent: isOpen ? 'flex-start' : 'center',
            backgroundColor: 'transparent',
            color: '#545E6E',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 92, 92, 0.12)';
            e.currentTarget.style.color = '#FF5C5C';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#545E6E';
          }}
        >
          <FaSignOutAlt size={16} style={{ flexShrink: 0 }} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}