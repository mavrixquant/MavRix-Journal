import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Search, SearchX, Star } from 'lucide-react';

import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import EmptyState from '@/shared/components/EmptyState';
import CalcStyles from './components/CalcStyles';
import CalculatorCard from './components/CalculatorCard';
import {
  CALCULATORS, CATEGORIES, POPULAR_IDS, calculatorPath, calculatorsIn, findCalculator, getCategory, searchCalculators,
} from './registry';
import { usePinned } from './lib/usePinned.js';

/**
 * The whole calculator section on ONE page:
 * every category as a heading with its calculators inside. One click opens a calculator.
 * Filter pills (?cat=risk), search ("/" to focus, Enter opens the top match) and pins.
 */
export default function CalculatorsHubPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const { pins } = usePinned();

  const pinned = useMemo(() => pins.map(findCalculator).filter(Boolean), [pins]);
  const popular = useMemo(() => POPULAR_IDS.map(findCalculator).filter(Boolean), []);

  const raw = params.get('cat');
  const active = raw === 'pinned' ? 'pinned' : getCategory(raw) ? raw : 'all';
  const setActive = (id) => setParams(id === 'all' ? {} : { cat: id }, { replace: true });

  usePageHeader({
    title: 'Calculators',
    subtitle: `${CALCULATORS.length} trading calculators · ${CATEGORIES.length} categories`,
  });

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
  const visibleCats = active === 'all' ? CATEGORIES : CATEGORIES.filter((c) => c.id === active);
  const showQuick = !searching && active === 'all';

  const onSearchKey = (e) => {
    if (e.key === 'Escape') {
      setQuery('');
      e.currentTarget.blur();
    } else if (e.key === 'Enter' && searching && matches[0]) {
      navigate(calculatorPath(matches[0]));
    }
  };

  return (
    <>
      <CalcStyles />
      <div className="cx-root page-fade-in">
        {/* ---------- hero + search ---------- */}
        <section className="cx-hero">
          <div className="cx-hero-text">
            <div className="cx-eyebrow">Calculator hub</div>
            <h1 className="cx-hero-title">What do you want to calculate?</h1>
            <p className="cx-desc">
              {CALCULATORS.length} calculators in one place. Pick one and start typing — results update live and your inputs are remembered.
            </p>
          </div>

          <label className="cx-search is-hero">
            <Search size={18} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Search: position size, pip value, Kelly, pivots…"
              aria-label="Search calculators"
            />
            {searching ? (
              <span className="cx-search-hint"><span className="cx-kbd">↵</span> open first</span>
            ) : (
              <span className="cx-kbd">/</span>
            )}
          </label>

          {!searching && (
            <div className="cx-popular">
              <span>Popular</span>
              {popular.map((c) => (
                <Link key={c.id} to={calculatorPath(c)} className="cx-pop" style={{ '--cat': getCategory(c.category)?.color }}>
                  <i /> {c.title}
                </Link>
              ))}
            </div>
          )}
        </section>

        {searching ? (
          <>
            <div className="cx-section-label">Results <i>{matches.length}</i></div>
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
                  <CalculatorCard key={c.id} calc={c} showCategory />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* ---------- filter pills ---------- */}
            <nav className="cx-filters" aria-label="Filter calculators by category">
              <button type="button" className={`cx-pill${active === 'all' ? ' is-active' : ''}`} onClick={() => setActive('all')}>
                <LayoutGrid size={13} /> All <em>{CALCULATORS.length}</em>
              </button>
              {pinned.length > 0 && (
                <button type="button" className={`cx-pill${active === 'pinned' ? ' is-active' : ''}`} style={{ '--cat': '#F5C04A' }} onClick={() => setActive('pinned')}>
                  <Star size={13} /> Pinned <em>{pinned.length}</em>
                </button>
              )}
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`cx-pill${active === cat.id ? ' is-active' : ''}`}
                    style={{ '--cat': cat.color }}
                    onClick={() => setActive(cat.id)}
                  >
                    <Icon size={13} /> {cat.label} <em>{calculatorsIn(cat.id).length}</em>
                  </button>
                );
              })}
            </nav>

            {/* ---------- quick access ---------- */}
            {showQuick && pinned.length > 0 && (
              <section aria-label="Pinned calculators">
                <div className="cx-section-label"><Star size={12} /> Pinned <i>{pinned.length}</i></div>
                <div className="cx-cards">
                  {pinned.map((c) => <CalculatorCard key={c.id} calc={c} showCategory />)}
                </div>
              </section>
            )}

            {/* ---------- pinned filter ---------- */}
            {active === 'pinned' &&
              (pinned.length === 0 ? (
                <EmptyState
                  size="md"
                  icon={Star}
                  eyebrow="Nothing pinned"
                  title="Pin the calculators you use most"
                  description="Tap the star on any calculator and it will live here and at the top of this page."
                  actions={[{ label: 'Browse all', onClick: () => setActive('all') }]}
                />
              ) : (
                <div className="cx-cards">
                  {pinned.map((c) => <CalculatorCard key={c.id} calc={c} showCategory />)}
                </div>
              ))}

            {/* ---------- every category, calculators inside ---------- */}
            {active !== 'pinned' &&
              visibleCats.map((cat) => {
                const list = calculatorsIn(cat.id);
                const Icon = cat.icon;
                return (
                  <section key={cat.id} className="cx-sec" style={{ '--cat': cat.color }} aria-labelledby={`cx-sec-${cat.id}`}>
                    <header className="cx-sec-head">
                      <div>
                        <h2 id={`cx-sec-${cat.id}`} className="cx-sec-title">{cat.label}</h2>
                        <p className="cx-sec-blurb">{cat.blurb}</p>
                      </div>
                      <span className="cx-cat-count">{list.length}</span>
                    </header>
                    <div className="cx-cards">
                      {list.map((c) => <CalculatorCard key={c.id} calc={c} />)}
                    </div>
                  </section>
                );
              })}
          </>
        )}
      </div>
    </>
  );
}
