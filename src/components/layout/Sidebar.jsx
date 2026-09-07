// src/components/layout/Sidebar.jsx
import { FaChartPie, FaBook, FaChartLine, FaUsers, FaBars, FaTimes } from 'react-icons/fa';
import navLogo from '../../assets/navLOGO.png';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <FaChartPie size={22} /> },
  { id: 'journal', label: 'Journal', icon: <FaBook size={22} /> },
  { id: 'backtest', label: 'Backtest', icon: <FaChartLine size={22} /> },
  { id: 'accounts', label: 'Accounts', icon: <FaUsers size={22} /> },
];

export default function Sidebar({ isOpen, onToggle, activeTab, onTabChange }) {
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
          <button className="sidebar-toggle" onClick={onToggle}>
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
          >
            <span className="nav-icon">{item.icon}</span>
            {isOpen && <span className="nav-label">{item.label}</span>}
          </div>
        ))}
      </nav>
    </div>
  );
}