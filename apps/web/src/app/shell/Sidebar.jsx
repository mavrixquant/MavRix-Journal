// apps/web/src/app/shell/Sidebar.jsx
import { useLocation } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import navLogo from '@/assets/navLOGO.png';

import { SIDEBAR_GROUPS } from './nav.config';
import { ExpandedGroup } from './ExpandedGroup';
import { CollapsedGroupTile } from './CollapsedGroupTile';

import './Sidebar.css';

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 68;

/* ------------------------------------------------------------------ */
/*  SidebarContent                                                     */
/* ------------------------------------------------------------------ */
export function SidebarContent({
  collapsed = false,
  showCollapseButton = true,
  onCollapseToggle,
  onNavigate,
}) {
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