
export function AnalyseSection({ num, title, note, children }) {
  return (
    <section className="as-root">
      <div className="as-head">
        <span className="as-num">{num}</span>
        <h2 className="as-title">{title}</h2>
        <div className="as-rule" />
        {note && <span className="as-note">{note}</span>}
      </div>
      <div className="as-body">{children}</div>
    </section>
  );
}

export function AnalysePanel({ title, note, height = 320, children }) {
  const hasHeader = !!(title || note);
  return (
    <div className="as-panel">
      {hasHeader && (
        <div className="as-panel-head">
          {title && <span className="as-panel-title">{title}</span>}
          {note && <span className="as-panel-note">{note}</span>}
        </div>
      )}
      <div
        className="as-panel-body"
        style={height === 'auto' ? undefined : { height }}
      >
        {children}
      </div>
    </div>
  );
}