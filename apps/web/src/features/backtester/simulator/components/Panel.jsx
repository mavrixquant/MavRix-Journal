export default function Panel({ title, note, actions, children, className = '' }) {
  return (
    <section className={`sx-card sx-panel ${className}`}>
      <header className="sx-panel-head">
        <div>
          <h3 className="sx-panel-title">{title}</h3>
          {note && <p className="sx-panel-note">{note}</p>}
        </div>
        {actions && <div className="sx-panel-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
