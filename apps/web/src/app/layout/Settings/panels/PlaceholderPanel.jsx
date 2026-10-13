// apps/web/src/app/layout/Settings/panels/PlaceholderPanel.jsx
//
// Reusable "Coming in Phase 2" panel. Rendered by every Settings tab
// except Account until Phase 2 ships the real panels.

export default function PlaceholderPanel({ title, description }) {
  return (
    <div className="settings-placeholder">
      <span className="settings-placeholder-badge">Coming in Phase 2</span>
      {title && <h3 className="settings-placeholder-title">{title}</h3>}
      {description && <p className="settings-placeholder-desc">{description}</p>}
    </div>
  );
}