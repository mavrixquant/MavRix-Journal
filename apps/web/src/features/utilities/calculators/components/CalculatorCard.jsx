import { Link } from 'react-router-dom';
import { getCategory } from '../registry';

export default function CalculatorCard({ calc, showCategory = false }) {
  const cat = getCategory(calc.category);
  const Icon = calc.icon;
  return (
    <Link
      to={`/utilities/calculators/${calc.category}/${calc.id}`}
      className="cx-card"
      style={{ '--cat': cat?.color }}
    >
      <span className="cx-ico" aria-hidden><Icon size={18} /></span>
      <span className="cx-card-body">
        {showCategory && cat && <span className="cx-card-cat">{cat.label}</span>}
        <span className="cx-card-title">{calc.title}</span>
        <span className="cx-card-desc">{calc.desc}</span>
      </span>
    </Link>
  );
}
