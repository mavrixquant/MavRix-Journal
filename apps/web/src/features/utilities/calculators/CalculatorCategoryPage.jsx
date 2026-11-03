import { useParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';

import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import EmptyState from '@/shared/components/EmptyState';
import CalcStyles from './components/CalcStyles';
import CalculatorCard from './components/CalculatorCard';
import CalculatorShell from './components/CalculatorShell';
import { HUB_PATH, calculatorsIn, getCategory } from './registry';

export default function CalculatorCategoryPage() {
  const { category } = useParams();
  const cat = getCategory(category);
  const list = cat ? calculatorsIn(cat.id) : [];

  usePageHeader({
    title: cat ? cat.label : 'Calculators',
    subtitle: cat ? `${list.length} calculators` : null,
  });

  if (!cat) {
    return (
      <>
        <CalcStyles />
        <div className="cx-root">
          <EmptyState
            size="lg"
            icon={SearchX}
            eyebrow="Not found"
            title="That calculator category doesn’t exist"
            description="Pick a category from the calculator hub."
            actions={[{ label: 'Back to calculators', to: HUB_PATH, variant: 'primary' }]}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <CalcStyles />
      <CalculatorShell
        back={{ to: HUB_PATH, label: 'All calculators' }}
        crumbs={[{ to: HUB_PATH, label: 'Calculators' }, { label: cat.label }]}
        eyebrow="Category"
        title={cat.label}
        description={cat.blurb}
        icon={cat.icon}
        color={cat.color}
      >
        <div className="cx-cards">
          {list.map((c) => (
            <CalculatorCard key={c.id} calc={c} />
          ))}
        </div>
      </CalculatorShell>
    </>
  );
}
