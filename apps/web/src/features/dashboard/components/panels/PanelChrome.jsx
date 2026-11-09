/**
 * Shared frame for every panel: accent dot + title (+ optional subtitle),
 * right-side actions, and a body that fills the remaining height.
 */
export default function PanelChrome({ title, subtitle, note, actions, children, flush = false, scrollable = false }) {
  const hasHead = title || note || actions;
  const bodyClass = ['pc-body', flush ? 'is-flush' : '', scrollable ? 'is-scroll' : ''].filter(Boolean).join(' ');

  return (
    <div className="pc">
      {hasHead && (
        <div className="pc-head">
          <div className="pc-title-wrap">
            <span className="pc-dot" />
            <div className="pc-titles">
              {title && <span className="pc-title">{title}</span>}
              {subtitle && <span className="pc-subtitle">{subtitle}</span>}
            </div>
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
