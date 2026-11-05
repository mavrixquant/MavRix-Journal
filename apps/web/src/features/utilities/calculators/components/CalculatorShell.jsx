import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * Page frame for a single calculator: one "back" link, a category pill,
 * a toolbar slot (switch / pin / share) and the icon header.
 *
 * back: { to, label }     category: { to, label }
 */
export default function CalculatorShell({ back, category, toolbar, title, description, icon: Icon, color, children }) {
  return (
    <div className="cx-root page-fade-in" style={color ? { '--cat': color } : undefined}>
      <div className="cx-topbar">
        {back && (
          <Link to={back.to} className="cx-back">
            <ChevronLeft size={14} /> {back.label}
          </Link>
        )}
        {category && (
          <Link to={category.to} className="cx-catpill" title={`More ${category.label} calculators`}>
            <i /> {category.label}
          </Link>
        )}
        <div className="cx-topbar-actions">{toolbar}</div>
      </div>

      <header className="cx-head">
        {Icon && (
          <span className="cx-head-icon" aria-hidden>
            <Icon size={24} />
          </span>
        )}
        <div className="cx-head-text">
          <h1 className="cx-title">{title}</h1>
          {description && <p className="cx-desc">{description}</p>}
        </div>
      </header>

      {children}
    </div>
  );
}
