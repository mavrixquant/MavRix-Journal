import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaPlus, FaBrain, FaSearch, FaStar, FaRegStar, FaEdit, FaCopy, FaPause, FaPlay,
  FaArchive, FaTrash, FaThLarge, FaList, FaMagic,
} from 'react-icons/fa';
import { toast } from 'sonner';

import {
  useStrategies, useStrategyOverview, useUpdateStrategy, useArchiveStrategy,
  useDuplicateStrategy, useDeleteStrategy,
} from '@/shared/api/strategies';
import Alert from '@/shared/components/Alert';
import EmptyState from '@/shared/components/EmptyState';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import StrategyFormModal from './StrategyFormModal';
import { Sparkline } from './components/charts';
import { Stat, Segmented, ScopeBar, StatusPill, Menu } from './components/ui';
import { STRATEGY_TEMPLATES } from './lib/templates';
import { money, pct, pf, tone, timeAgo, rangeToFilter } from './lib/format';
import './strategies.css';

const SORTS = [
  { id: 'net', label: 'Net P&L' },
  { id: 'winRate', label: 'Win rate' },
  { id: 'pf', label: 'Profit factor' },
  { id: 'expectancy', label: 'Expectancy' },
  { id: 'trades', label: 'Trades' },
  { id: 'recent', label: 'Last traded' },
  { id: 'name', label: 'Name' },
];

const sortValue = (s, st, key) => {
  if (key === 'name') return s.name.toLowerCase();
  if (!st) return key === 'recent' ? '' : -Infinity;
  if (key === 'net') return st.net;
  if (key === 'winRate') return st.winRate;
  if (key === 'pf') return st.profitFactor ?? (st.profitFactorInfinite ? 9999 : -1);
  if (key === 'expectancy') return st.expectancy;
  if (key === 'trades') return st.n;
  if (key === 'recent') return st.lastDate || '';
  return 0;
};

export default function StrategiesPage() {
  const navigate = useNavigate();

  const [account, setAccount] = useState('all');
  const [range, setRange] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('net');
  const [view, setView] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('sx-view')) || 'cards');
  const [editor, setEditor] = useState({ open: false, strategy: null, seed: null });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filters = useMemo(
    () => ({ accountType: account === 'all' ? undefined : account, ...rangeToFilter(range) }),
    [account, range],
  );

  const { data: strategies = [], isLoading } = useStrategies();
  const { data: overview, isFetching } = useStrategyOverview(filters);
  const updateM = useUpdateStrategy();
  const archiveM = useArchiveStrategy();
  const duplicateM = useDuplicateStrategy();
  const deleteM = useDeleteStrategy();

  usePageHeader({
    title: 'Strategies',
    subtitle: 'Define playbooks, tag trades, and see which setups actually pay',
  });

  const statsById = overview?.stats || {};
  const totals = overview?.totals;

  const counts = useMemo(() => {
    const c = { all: strategies.length, active: 0, paused: 0, archived: 0 };
    strategies.forEach((s) => { c[s.status] = (c[s.status] || 0) + 1; });
    return c;
  }, [strategies]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = strategies.filter((s) => {
      if (status !== 'all' && s.status !== status) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)) || (s.description || '').toLowerCase().includes(q);
    });
    const dir = sort === 'name' ? 1 : -1;
    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const av = sortValue(a, statsById[a.id], sort), bv = sortValue(b, statsById[b.id], sort);
      return av < bv ? -dir : av > bv ? dir : a.name.localeCompare(b.name);
    });
  }, [strategies, status, query, sort, statsById]);

  const setViewMode = (v) => { setView(v); try { localStorage.setItem('sx-view', v); } catch { /* ignore */ } };
  const openNew = (seed = null) => setEditor({ open: true, strategy: null, seed });
  const closeEditor = () => setEditor({ open: false, strategy: null, seed: null });

  const act = async (fn, okMsg) => {
    try { await fn(); if (okMsg) toast.success(okMsg); } catch (e) { toast.error(e?.message || 'Action failed'); }
  };
  const togglePin = (s) => act(() => updateM.mutateAsync({ id: s.id, patch: { pinned: !s.pinned } }));
  const toggleStatus = (s) => act(
    () => updateM.mutateAsync({ id: s.id, patch: { status: s.status === 'active' ? 'paused' : 'active' } }),
    s.status === 'active' ? `"${s.name}" paused` : `"${s.name}" is active`,
  );
  const duplicate = (s) => act(async () => { const c = await duplicateM.mutateAsync(s.id); toast.success(`Created "${c.name}"`); });
  const archive = (s) => act(() => archiveM.mutateAsync(s.id), `"${s.name}" archived`);
  const confirmDelete = async () => {
    const s = deleteTarget;
    setDeleteTarget(null);
    if (!s) return;
    await act(async () => {
      const res = await deleteM.mutateAsync(s.id);
      const n = res?.detachedTrades ?? s.tradeCount ?? 0;
      toast.success(n ? `Deleted "${s.name}" — ${n} trade${n === 1 ? '' : 's'} untagged` : `Deleted "${s.name}"`);
    });
  };

  const menuFor = (s) => [
    { label: 'Edit', icon: <FaEdit />, onClick: () => setEditor({ open: true, strategy: s, seed: null }) },
    { label: 'Duplicate', icon: <FaCopy />, onClick: () => duplicate(s) },
    s.status !== 'archived' && { label: s.status === 'active' ? 'Pause' : 'Activate', icon: s.status === 'active' ? <FaPause /> : <FaPlay />, onClick: () => toggleStatus(s) },
    s.status !== 'archived' && { label: 'Archive', icon: <FaArchive />, onClick: () => archive(s) },
    s.status === 'archived' && { label: 'Restore', icon: <FaPlay />, onClick: () => act(() => updateM.mutateAsync({ id: s.id, patch: { status: 'active' } }), `"${s.name}" restored`) },
    { label: 'Delete', icon: <FaTrash />, danger: true, onClick: () => setDeleteTarget(s) },
  ];

  if (isLoading) return <PageSkeleton />;

  const hasAny = strategies.length > 0;
  const untagged = overview?.untagged;

  return (
    <div className="sx-root page-fade-in">
      {hasAny && (
        <>
          <ScopeBar account={account} onAccount={setAccount} range={range} onRange={setRange}
            extra={<span className={`sx-sync ${isFetching ? 'is-on' : ''}`}>Updating…</span>} />

          <section className="sx-hero sx-panel">
            <div className="sx-hero-main">
              <span className="sx-eyebrow">Tagged performance</span>
              <div className={`sx-hero-net ${tone(totals?.net)}`}>{totals?.n ? money(totals.net, { sign: true }) : '—'}</div>
              <span className="sx-hero-sub">
                {totals?.n ? `${totals.n} trades across ${counts.active} active playbook${counts.active === 1 ? '' : 's'}` : 'No tagged trades in this scope yet'}
              </span>
            </div>
            <div className="sx-hero-chart">
              <Sparkline values={totals?.spark} color="#F59E0B" height={84} />
            </div>
            <div className="sx-hero-stats">
              <Stat label="Win rate" value={totals?.n ? pct(totals.winRate, 1) : '—'} />
              <Stat label="Profit factor" value={totals?.n ? pf(totals) : '—'} />
              <Stat label="Expectancy" value={totals?.n ? money(totals.expectancy, { sign: true }) : '—'} tone={tone(totals?.expectancy)} sub="per trade" />
              <Stat label="Max drawdown" value={totals?.n ? money(-totals.maxDrawdown) : '—'} tone={totals?.maxDrawdown ? 'neg' : ''} />
            </div>
            {untagged?.n > 0 && (
              <button type="button" className="sx-nudge" onClick={() => navigate('/journal')}>
                <b>{untagged.n}</b> trade{untagged.n === 1 ? '' : 's'} ({money(untagged.net, { sign: true })}) have no strategy. Tag them to see the full picture.
              </button>
            )}
          </section>

          <div className="sx-toolbar">
            <label className="sx-search">
              <FaSearch size={11} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, tag, summary…" aria-label="Search strategies" />
            </label>
            <Segmented ariaLabel="Status filter" value={status} onChange={setStatus}
              options={[{ id: 'all', label: 'All', count: counts.all }, { id: 'active', label: 'Active', count: counts.active }, { id: 'paused', label: 'Paused', count: counts.paused }, { id: 'archived', label: 'Archived', count: counts.archived }]} />
            <div className="sx-toolbar-spacer" />
            <select className="sx-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              {SORTS.map((s) => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
            </select>
            <div className="sx-view-toggle">
              <button type="button" className={view === 'cards' ? 'is-active' : ''} onClick={() => setViewMode('cards')} aria-label="Card view"><FaThLarge size={12} /></button>
              <button type="button" className={view === 'table' ? 'is-active' : ''} onClick={() => setViewMode('table')} aria-label="Table view"><FaList size={12} /></button>
            </div>
            <button type="button" className="sx-btn-primary" onClick={() => openNew()}><FaPlus size={11} /> New strategy</button>
          </div>
        </>
      )}

      {!hasAny ? (
        <div className="sx-first">
          <EmptyState icon={FaBrain} eyebrow="No strategies" title="Build your first playbook"
            description="A strategy is your written edge: the rules, the plan, and a tag you put on trades. Then this page shows which setups really pay."
            actions={[{ label: 'Create new strategy', icon: FaPlus, variant: 'primary', onClick: () => openNew() }]} />
          <div className="sx-templates">
            <span className="sx-eyebrow"><FaMagic size={10} /> Or start from a template</span>
            <div className="sx-template-grid">
              {STRATEGY_TEMPLATES.map((t) => (
                <button key={t.key} type="button" className="sx-template" style={{ '--sx-c': t.color }} onClick={() => openNew(t)}>
                  <b>{t.name}</b>
                  <span>{t.description}</span>
                  <em>{t.timeframe} · {t.targetRR}R · {t.sessions.join(', ')}</em>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={FaSearch} eyebrow="No matches" title="Nothing matches those filters" description="Clear the search or switch the status filter." />
      ) : view === 'cards' ? (
        <div className="sx-grid-cards">
          {rows.map((s) => {
            const st = statsById[s.id];
            return (
              <article key={s.id} className={`sx-card is-${s.status}`} style={{ '--sx-c': s.color }} tabIndex={0} role="link"
                onClick={() => navigate(`/manage/strategies/${s.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/manage/strategies/${s.id}`); }}>
                <header className="sx-card-head">
                  <span className="sx-card-dot" />
                  <h3>{s.name}</h3>
                  <button type="button" className={`sx-icon-btn sx-pin ${s.pinned ? 'is-on' : ''}`} aria-label={s.pinned ? 'Unpin' : 'Pin'} aria-pressed={s.pinned}
                    onClick={(e) => { e.stopPropagation(); togglePin(s); }}>
                    {s.pinned ? <FaStar size={12} /> : <FaRegStar size={12} />}
                  </button>
                  <Menu items={menuFor(s)} />
                </header>

                <div className="sx-card-meta">
                  <StatusPill status={s.status} />
                  <span className={`sx-chip ${s.direction === 'Long' ? 'is-long' : s.direction === 'Short' ? 'is-short' : ''}`}>
                    {s.direction === 'Long' ? '▲ Long' : s.direction === 'Short' ? '▼ Short' : '↕ Both'}
                  </span>
                  {s.timeframe && <span className="sx-chip">{s.timeframe}</span>}
                  {s.targetRR && <span className="sx-chip">{s.targetRR}R</span>}
                </div>

                <p className="sx-card-desc">{s.description || 'No summary yet.'}</p>

                <div className="sx-card-spark">
                  {st?.n ? <Sparkline values={st.spark} color={st.net >= 0 ? s.color : '#ef4444'} height={52} /> : <div className="sx-card-zero">No trades in this scope</div>}
                </div>

                <dl className="sx-card-stats">
                  <div><dt>Net</dt><dd className={tone(st?.net)}>{st?.n ? money(st.net, { sign: true, compact: true }) : '—'}</dd></div>
                  <div><dt>Win</dt><dd>{st?.n ? pct(st.winRate, 0) : '—'}</dd></div>
                  <div><dt>PF</dt><dd>{st?.n ? pf(st) : '—'}</dd></div>
                  <div><dt>Trades</dt><dd>{st?.n ?? 0}</dd></div>
                </dl>

                <footer className="sx-card-foot">
                  <span>{timeAgo(st?.lastDate)}</span>
                  {st?.confidence === 'low' && st.n > 0 && <span className="sx-warn-chip" title="Fewer than 30 trades">Small sample</span>}
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="sx-table-wrap sx-panel">
          <table className="sx-table">
            <thead>
              <tr><th>Strategy</th><th>Status</th><th className="r">Trades</th><th className="r">Win %</th><th className="r">PF</th><th className="r">Expectancy</th><th className="r">Max DD</th><th className="r">Net P&amp;L</th><th>Trend</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const st = statsById[s.id];
                return (
                  <tr key={s.id} style={{ '--sx-c': s.color }} onClick={() => navigate(`/manage/strategies/${s.id}`)}>
                    <td><span className="sx-name-cell"><i />{s.pinned && <FaStar size={10} className="sx-pin-ico" />}{s.name}</span></td>
                    <td><StatusPill status={s.status} /></td>
                    <td className="r">{st?.n ?? 0}</td>
                    <td className="r">{st?.n ? pct(st.winRate, 1) : '—'}</td>
                    <td className="r">{st?.n ? pf(st) : '—'}</td>
                    <td className={`r ${tone(st?.expectancy)}`}>{st?.n ? money(st.expectancy, { sign: true }) : '—'}</td>
                    <td className="r">{st?.n ? money(-st.maxDrawdown) : '—'}</td>
                    <td className={`r b ${tone(st?.net)}`}>{st?.n ? money(st.net, { sign: true }) : '—'}</td>
                    <td className="spark-cell">{st?.n ? <Sparkline values={st.spark} color={st.net >= 0 ? s.color : '#ef4444'} height={26} /> : null}</td>
                    <td className="r" onClick={(e) => e.stopPropagation()}><Menu items={menuFor(s)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <StrategyFormModal isOpen={editor.open} onClose={closeEditor} strategy={editor.strategy} seed={editor.seed}
        onSaved={(s) => { if (!editor.strategy && s?.id) toast.success(`Created "${s.name}"`); }} />

      <Alert isOpen={!!deleteTarget} type="confirm" title="Delete strategy?"
        message={deleteTarget ? `"${deleteTarget.name}" will be permanently deleted. ${deleteTarget.tradeCount > 0 ? `${deleteTarget.tradeCount} tagged trade${deleteTarget.tradeCount === 1 ? '' : 's'} will be UNTAGGED but kept. ` : ''}This cannot be undone.` : ''}
        confirmText="Delete" cancelText="Cancel" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
