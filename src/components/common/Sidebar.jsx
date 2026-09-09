import { FaChartPie, FaBook, FaUsers, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import navLogo from '../../assets/navLOGO.png';
import smLogo from '../../assets/smLOGO.png';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <FaChartPie size={22} /> },
  { id: 'journal', label: 'Journal', icon: <FaBook size={22} /> },
  { id: 'accounts', label: 'Accounts', icon: <FaUsers size={22} /> },
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
  onAccountClick, // <-- new prop
}) {
  const displayName = user?.displayName || user?.email || 'User';

  return (
    <div
      className={`sidebar ${isOpen ? 'open' : 'closed'}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header: Logo acts as toggle */}
      <div className="sidebar-header" style={{ justifyContent: 'flex-start', paddingLeft: isOpen ? '12px' : '12px' }}>
        {isOpen ? (
          <img
            src={navLogo}
            alt="Logo"
            className="sidebar-logo-img"
            onClick={onToggle}
            style={{ cursor: 'pointer' }}
          />
        ) : (
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            title="Expand sidebar"
            style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
          >
            <img src={smLogo} alt="Logo" style={{ height: '40px', width: 'auto' }} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${item.id === activeTab ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={!isOpen ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {isOpen && <span className="nav-label">{item.label}</span>}
          </div>
        ))}
      </nav>

      {/* Bottom: User Info + Logout */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user"
          title={!isOpen ? displayName : ''}
          onClick={onAccountClick}
          style={{ cursor: 'pointer' }}
        >
          <FaUserCircle size={isOpen ? 28 : 24} className="sidebar-user-icon" />
          {isOpen && <span className="sidebar-user-name">{displayName}</span>}
        </div>
        <button
          className="sidebar-logout-btn"
          onClick={onLogout}
          title="Logout"
        >
          <FaSignOutAlt size={isOpen ? 18 : 20} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}