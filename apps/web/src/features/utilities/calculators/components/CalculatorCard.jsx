import { Link } from 'react-router-dom';
import { ArrowUpRight, Star } from 'lucide-react';
import { calculatorPath, getCategory } from '../registry';
import { usePinned } from '../lib/usePinned.js';

/** One click opens the calculator. The star pins it to the top of the hub. */
export default function CalculatorCard({ calc, showCategory = false }) {
  const cat = getCategory(calc.category);
  const Icon = calc.icon;
  const { isPinned, toggle } = usePinned();
  const pinned = isPinned(calc.id);

  return (
    <div className="cx-card-wrap" style={{ '--cat': cat?.color }}>
      <Link to={calculatorPath(calc)} className="cx-card">
        <span className="cx-ico" aria-hidden><Icon size={18} /></span>
        <span className="cx-card-body">
          {showCategory && cat && <span className="cx-card-cat">{cat.label}</span>}
          <span className="cx-card-title">{calc.title}</span>
          <span className="cx-card-desc">{calc.desc}</span>
        </span>
        <ArrowUpRight className="cx-card-go" size={15} aria-hidden />
      </Link>
      <button
        type="button"
        className={`cx-star${pinned ? ' is-on' : ''}`}
        aria-pressed={pinned}
        aria-label={pinned ? `Unpin ${calc.title}` : `Pin ${calc.title}`}
        title={pinned ? 'Unpin' : 'Pin to top'}
        onClick={() => toggle(calc.id)}
      >
        <Star size={14} fill={pinned ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}
