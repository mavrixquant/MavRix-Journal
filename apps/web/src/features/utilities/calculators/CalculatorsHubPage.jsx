import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Search, SearchX } from 'lucide-react';

import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import EmptyState from '@/shared/components/EmptyState';
import CalcStyles from './components/CalcStyles';
import CalculatorCard from './components/CalculatorCard';
import { CALCULATORS, CATEGORIES, HUB_PATH, calculatorsIn, getCalculator, searchCalculators } from './registry';
import { getRecent } from './lib/storage.js';

export default function CalculatorsHubPage() {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const [recent] = useState(() =>
    getRecent()
      .map((k) => {
        const [cat, id] = k.split('/');
        return getCalculator(cat, id);
      })
      .filter(Boolean)
  );

  usePageHeader({
    title: 'Calculators',
    subtitle: `${CALCULATORS.length} trading calculators · ${CATEGORIES.length} categories`,
  });

  // "/" focuses search, like the rest of the app's keyboard shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const searching = query.trim() !== '';
  const matches = useMemo(() => searchCalculators(query), [query]);

  return (
    <>
      <CalcStyles />
      <div className="cx-root page-fade-in">
        <label className="cx-search">
          <Search size={16} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
            placeholder="Search calculators: position size, pip value, Kelly, pivots…"
            aria-label="Search calculators"
          />
          {!searching && <span className="cx-kbd">/</span>}
        </label>

        {searching ? (
          <>
            <div className="cx-section-label">
              Results <i>{matches.length}</i>
            </div>
            {matches.length === 0 ? (
              <EmptyState
                size="md"
                icon={SearchX}
                eyebrow="No matches"
                title="No calculator matches that search"
                description="Try a broader term like “risk”, “futures” or “options”."
                actions={[{ label: 'Clear search', onClick: () => setQuery('') }]}
              />
            ) : (
              <div className="cx-cards">
                {matches.map((c) => (
                  <CalculatorCard key={`${c.category}/${c.id}`} calc={c} showCategory />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {recent.length > 0 && (
              <>
                <div className="cx-section-label"><History size={12} /> Recently used</div>
                <div className="cx-cards">
                  {recent.slice(0, 3).map((c) => (
                    <CalculatorCard key={`${c.category}/${c.id}`} calc={c} showCategory />
                  ))}
                </div>
              </>
            )}

            <div className="cx-section-label">Categories <i>{CATEGORIES.length}</i></div>
            <div className="cx-cats">
              {CATEGORIES.map((cat) => {
                const list = calculatorsIn(cat.id);
                const Icon = cat.icon;
                return (
                  <Link key={cat.id} to={`${HUB_PATH}/${cat.id}`} className="cx-cat" style={{ '--cat': cat.color }}>
                    <span className="cx-cat-top">
                      <span className="cx-ico" aria-hidden><Icon size={19} /></span>
                      <span className="cx-cat-name">{cat.label}</span>
                      <span className="cx-cat-count">{list.length}</span>
                    </span>
                    <p className="cx-cat-blurb">{cat.blurb}</p>
                    <span className="cx-cat-list">
                      {list.slice(0, 4).map((c) => (
                        <span key={c.id} className="cx-chip-s">{c.title}</span>
                      ))}
                      {list.length > 4 && <span className="cx-chip-s">+{list.length - 4} more</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
