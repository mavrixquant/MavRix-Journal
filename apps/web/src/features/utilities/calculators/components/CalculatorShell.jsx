import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * Shared page frame for the hub, category pages and calculators:
 * breadcrumb + back link, icon header, description, optional actions.
 *
 * back: { to, label }        crumbs: [{ to?, label }]
 */
export default function CalculatorShell({ back, crumbs = [], eyebrow, title, description, icon: Icon, color, actions, children }) {
  return (
    <div className="cx-root page-fade-in" style={color ? { '--cat': color } : undefined}>
      <nav className="cx-crumbs" aria-label="Breadcrumb">
        {back && (
          <>
            <Link to={back.to}><ChevronLeft size={13} /> {back.label}</Link>
            <span className="cx-sep">|</span>
          </>
        )}
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            {c.to ? <Link to={c.to}>{c.label}</Link> : <b>{c.label}</b>}
            {i < crumbs.length - 1 && <span className="cx-sep">/</span>}
          </span>
        ))}
      </nav>

      <header className="cx-head">
        {Icon && (
          <span className="cx-head-icon" aria-hidden>
            <Icon size={24} />
          </span>
        )}
        <div className="cx-head-text">
          {eyebrow && <div className="cx-eyebrow">{eyebrow}</div>}
          <h1 className="cx-title">{title}</h1>
          {description && <p className="cx-desc">{description}</p>}
        </div>
        {actions}
      </header>

      {children}
    </div>
  );
}
