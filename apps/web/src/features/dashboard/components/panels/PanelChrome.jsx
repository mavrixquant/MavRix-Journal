/**
 * NEW FILE: apps/web/src/features/dashboard/components/panels/PanelChrome.jsx
 *
 * One consistent frame for every dashboard panel: accent dot + title,
 * optional note pill, optional right-side actions, and a body that fills
 * the remaining height. Styles live in dashboardShell.css (.pc-*).
 */
export default function PanelChrome({
  title,
  note,
  actions,
  children,
  flush = false,
  scrollable = false,
}) {
  const hasHead = title || note || actions;
  const bodyClass = ['pc-body', flush ? 'is-flush' : '', scrollable ? 'is-scroll' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="pc">
      {hasHead && (
        <div className="pc-head">
          <div className="pc-title-wrap">
            <span className="pc-dot" />
            {title && <span className="pc-title">{title}</span>}
          </div>
          <div className="pc-right">
            {actions}
            {note && <span className="pc-note">{note}</span>}
          </div>
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

export function PanelEmpty({ title = 'No data yet', hint }) {
  return (
    <div className="pc-empty">
      <b>{title}</b>
      {hint && <span>{hint}</span>}
    </div>
  );
}
