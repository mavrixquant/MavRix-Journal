import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';

import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import EmptyState from '@/shared/components/EmptyState';
import CalcStyles from './components/CalcStyles';
import CalculatorEngine from './components/CalculatorEngine';
import CalculatorShell from './components/CalculatorShell';
import { HUB_PATH, calculatorPath, calculatorsIn, getCalculator, getCategory } from './registry';
import { pushRecent } from './lib/storage.js';

export default function CalculatorPage() {
  const { category, calcId } = useParams();
  const cat = getCategory(category);
  const calc = getCalculator(category, calcId);

  usePageHeader({
    title: calc ? calc.title : 'Calculators',
    subtitle: cat ? cat.label : null,
  });

  useEffect(() => {
    if (calc) pushRecent(`${calc.category}/${calc.id}`);
  }, [calc]);

  if (!cat || !calc) {
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

  const siblings = calculatorsIn(cat.id);
  const i = siblings.findIndex((c) => c.id === calc.id);
  const prev = i > 0 ? siblings[i - 1] : null;
  const next = i < siblings.length - 1 ? siblings[i + 1] : null;

  return (
    <>
      <CalcStyles />
      <CalculatorShell
        back={{ to: `${HUB_PATH}/${cat.id}`, label: cat.label }}
        crumbs={[{ to: HUB_PATH, label: 'Calculators' }, { to: `${HUB_PATH}/${cat.id}`, label: cat.label }, { label: calc.title }]}
        eyebrow={cat.label}
        title={calc.title}
        description={calc.desc}
        icon={calc.icon}
        color={cat.color}
      >
        {siblings.length > 1 && (
          <nav className="cx-panel cx-strip" aria-label={`${cat.label} calculators`}>
            {siblings.map((c) => (
              <Link
                key={c.id}
                to={calculatorPath(c)}
                className={`cx-chip${c.id === calc.id ? ' is-active' : ''}`}
                aria-current={c.id === calc.id ? 'page' : undefined}
              >
                {c.title}
              </Link>
            ))}
          </nav>
        )}

        <CalculatorEngine key={calc.id} calc={calc} />

        {(prev || next) && (
          <div className="cx-pn">
            {prev && (
              <Link to={calculatorPath(prev)}>
                <small>Previous</small>
                <span>{prev.title}</span>
              </Link>
            )}
            {next && (
              <Link to={calculatorPath(next)} className="is-next">
                <small>Next</small>
                <span>{next.title}</span>
              </Link>
            )}
          </div>
        )}

        <div className="cx-foot">
          <span><span className="cx-kbd">Enter</span> next field</span>
          <span><span className="cx-kbd">↑</span> <span className="cx-kbd">↓</span> adjust · <span className="cx-kbd">Shift</span> ×10 · <span className="cx-kbd">Alt</span> ×0.1</span>
          <span>Click any result to copy</span>
        </div>
      </CalculatorShell>
    </>
  );
}
