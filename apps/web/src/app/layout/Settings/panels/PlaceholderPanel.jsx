
export default function PlaceholderPanel({ title, description }) {
  return (
    <div className="settings-placeholder">
      <span className="settings-placeholder-badge">Coming in Phase 2</span>
      {title && <h3 className="settings-placeholder-title">{title}</h3>}
      {description && <p className="settings-placeholder-desc">{description}</p>}
    </div>
  );
}