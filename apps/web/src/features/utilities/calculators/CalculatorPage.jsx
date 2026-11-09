import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Check, Link2, SearchX, Star } from 'lucide-react';

import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import EmptyState from '@/shared/components/EmptyState';
import CalcStyles from './components/CalcStyles';
import CalculatorCard from './components/CalculatorCard';
import CalculatorEngine from './components/CalculatorEngine';
import CalculatorShell from './components/CalculatorShell';
import CalculatorSwitcher from './components/CalculatorSwitcher';
import { HUB_PATH, calculatorsIn, categoryPath, findCalculator, getCategory } from './registry';
import { usePinned } from './lib/usePinned.js';

/**
 * One flat URL per calculator:  /utilities/calculators/:calcId
 * Old URLs keep working:
 *   /utilities/calculators/:category/:calcId  → redirected to the flat URL
 *   /utilities/calculators/:category          → hub, filtered to that category
 */
export default function CalculatorPage() {
  const { calcId, category: legacyCategory } = useParams();
  const calc = findCalculator(calcId);
  const cat = calc ? getCategory(calc.category) : null;
  const { isPinned, toggle } = usePinned();
  const [linkCopied, setLinkCopied] = useState(false);

  usePageHeader({
    title: calc ? calc.title : 'Calculators',
    subtitle: cat ? cat.label : null,
  });

  if (legacyCategory) return <Navigate to={`${HUB_PATH}/${calcId}`} replace />;
  if (!calc && getCategory(calcId)) return <Navigate to={categoryPath(calcId)} replace />;

  if (!calc || !cat) {
    return (
      <>
        <CalcStyles />
        <div className="cx-root">
          <EmptyState
            size="lg"
            icon={SearchX}
            eyebrow="Not found"
            title="We couldn’t find that calculator"
            description="It may have been renamed or removed. Browse the full list instead."
            actions={[{ label: 'Back to calculators', to: HUB_PATH, variant: 'primary' }]}
          />
        </div>
      </>
    );
  }

  const pinned = isPinned(calc.id);
  const related = calculatorsIn(cat.id).filter((c) => c.id !== calc.id);

  const copyPageLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <CalcStyles />
      <CalculatorShell
        back={{ to: HUB_PATH, label: 'All calculators' }}
        category={{ to: categoryPath(cat.id), label: cat.label }}
        title={calc.title}
        description={calc.desc}
        icon={calc.icon}
        color={cat.color}
        toolbar={
          <>
            <CalculatorSwitcher currentId={calc.id} />
            <button
              type="button"
              className={`cx-btn${pinned ? ' is-pinned' : ''}`}
              aria-pressed={pinned}
              onClick={() => toggle(calc.id)}
              title={pinned ? 'Unpin from the hub' : 'Pin to the top of the hub'}
            >
              <Star size={12} fill={pinned ? 'currentColor' : 'none'} /> {pinned ? 'Pinned' : 'Pin'}
            </button>
            <button type="button" className={`cx-btn${linkCopied ? ' is-copied' : ''}`} onClick={copyPageLink} title="Copy link to this calculator">
              {linkCopied ? <Check size={12} /> : <Link2 size={12} />} {linkCopied ? 'Copied' : 'Link'}
            </button>
          </>
        }
      >
        <CalculatorEngine key={calc.id} calc={calc} />

        {related.length > 0 && (
          <section aria-label={`More ${cat.label} calculators`} className="cx-related">
            <div className="cx-section-label">More in {cat.label} <i>{related.length}</i></div>
            <div className="cx-cards">
              {related.map((c) => (
                <CalculatorCard key={c.id} calc={c} />
              ))}
            </div>
          </section>
        )}

        <div className="cx-foot">
          <span><span className="cx-kbd">Enter</span> next field</span>
          <span><span className="cx-kbd">↑</span> <span className="cx-kbd">↓</span> adjust · <span className="cx-kbd">Shift</span> ×10 · <span className="cx-kbd">Alt</span> ×0.1</span>
          <span><span className="cx-kbd">Ctrl/⌘</span> <span className="cx-kbd">K</span> switch calculator</span>
          <span>Click any result to copy</span>
        </div>
      </CalculatorShell>
    </>
  );
}
