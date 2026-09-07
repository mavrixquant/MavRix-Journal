// src/components/common/Sidebar.jsx
import { FaChartPie, FaBook, FaUsers, FaBars, FaTimes, FaUserCircle, FaSignOutAlt } from 'react-icons/fa';
import navLogo from '../../assets/navLOGO.png';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <FaChartPie size={22} /> },
  { id: 'journal', label: 'Journal', icon: <FaBook size={22} /> },
  { id: 'accounts', label: 'Accounts', icon: <FaUsers size={22} /> },
];

export default function Sidebar({ isOpen, onToggle, activeTab, onTabChange, user, onLogout }) {
  const displayName = user?.displayName || user?.email || 'User';

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Header: Logo + Toggle */}
      <div className="sidebar-header">
        {isOpen ? (
          <>
            <img src={navLogo} alt="Logo" className="sidebar-logo-img" />
            <button className="sidebar-toggle" onClick={onToggle}>
              <FaTimes size={20} />
            </button>
          </>
        ) : (
          <button className="sidebar-toggle" onClick={onToggle} title="Expand sidebar">
            <FaBars size={24} />
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
            title={!isOpen ? item.label : ''}   // Show tooltip only when closed
          >
            <span className="nav-icon">{item.icon}</span>
            {isOpen && <span className="nav-label">{item.label}</span>}
          </div>
        ))}
      </nav>

      {/* Bottom: User Info + Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user" title={!isOpen ? displayName : ''}>
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