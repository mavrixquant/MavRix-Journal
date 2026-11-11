import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FaArrowLeft, FaBrain, FaEdit, FaCopy, FaPause, FaPlay, FaArchive, FaTrash,
  FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaInfoCircle,
} from 'react-icons/fa';
import { toast } from 'sonner';
import { PLAYBOOK_SECTIONS } from '@mavrix/shared';

import {
  useStrategyPerformance, useUpdateStrategy, useArchiveStrategy,
  useDuplicateStrategy, useDeleteStrategy,
} from '@/shared/api/strategies';
import Alert from '@/shared/components/Alert';
import EmptyState from '@/shared/components/EmptyState';
import DataTable from '@/shared/ui/data-table';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import StrategyFormModal from './StrategyFormModal';
import { EquityChart, BarList, MonthlyBars, DailyHeatmap, Histogram } from './components/charts';
import { Stat, Segmented, ScopeBar, StatusPill, Menu } from './components/ui';
import { money, pct, pf, tone, minutes, fmtDate, rangeToFilter } from './lib/format';
import './strategies.css';

const TONE_ICON = { good: FaCheckCircle, warn: FaExclamationTriangle, bad: FaTimesCircle, info: FaInfoCircle };

function Panel({ title, sub, right, children, className = '' }) {
  return (
    <section className={`sx-panel sx-pad ${className}`}>
      <header className="sx-panel-head">
        <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
        {right}
      </header>
      {children}
    </section>
  );
}

const Row = ({ k, v, t }) => (
  <div className="sx-kv"><span>{k}</span><b className={t || ''}>{v}</b></div>
);

const Dir = ({ value }) => (
  <span className={value === 'Long' ? 'pos' : value === 'Short' ? 'neg' : ''}>{value || '—'}</span>
);

export default function StrategyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState('all');
  const [accountId, setAccountId] = useState('all');
  const [range, setRange] = useState('all');
  const [tab, setTab] = useState('performance');
  const [curve, setCurve] = useState('equity');
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'archive' | 'delete'

  const filters = useMemo(
    () => ({
      accountType: account === 'all' ? undefined : account,
      accountId: accountId === 'all' ? undefined : accountId,
      ...rangeToFilter(range),
    }),
    [account, accountId, range],
  );

  const { data, isLoading, isFetching, error } = useStrategyPerformance(id, filters);
  const updateM = useUpdateStrategy();
  const archiveM = useArchiveStrategy();
  const duplicateM = useDuplicateStrategy();
  const deleteM = useDeleteStrategy();

  const strategy = data?.strategy;
  const s = data?.stats;

  usePageHeader({
    title: strategy?.name || 'Strategy',
    subtitle: strategy ? 'Strategy performance and playbook' : '',
    badge: strategy?.status,
  });

  const columns = useMemo(() => [
    { id: 'date', accessorKey: 'date', header: 'Date', meta: { label: 'Date' }, size: 110, cell: (c) => c.getValue() || '—' },
    { id: 'entry', accessorKey: 'entryTime', header: 'Entry', meta: { label: 'Entry' }, size: 80, cell: (c) => c.getValue() || '—' },
    { id: 'exit', accessorKey: 'exitTime', header: 'Exit', meta: { label: 'Exit' }, size: 80, cell: (c) => c.getValue() || '—' },
    { id: 'direction', accessorKey: 'direction', header: 'Dir', meta: { label: 'Direction' }, size: 70, cell: (c) => <Dir value={c.getValue()} /> },
    { id: 'symbol', accessorKey: 'symbol', header: 'Symbol', meta: { label: 'Symbol' }, size: 90, cell: (c) => c.getValue() || '—' },
    { id: 'account', accessorKey: 'accountName', header: 'Account', meta: { label: 'Account' }, size: 130, cell: (c) => c.getValue() || '—' },
    { id: 'quantity', accessorKey: 'quantity', header: 'Qty', meta: { label: 'Qty' }, size: 70, cell: (c) => c.getValue() ?? '—' },
    {
      id: 'pnl', accessorKey: 'pnl', header: 'P&L', meta: { label: 'P&L' }, size: 100,
      cell: (c) => <span className={tone(c.getValue())}>{money(c.getValue(), { sign: true })}</span>,
    },
    { id: 'notes', accessorKey: 'notes', header: 'Notes', meta: { label: 'Notes' }, size: 220, cell: (c) => c.getValue() || '' },
  ], []);

  const run = async (fn, ok) => {
    try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(e?.message || 'Action failed'); }
  };

  if (isLoading) return <PageSkeleton />;

  if (error || !strategy) {
    return (
      <div className="sx-root page-fade-in">
        <Link to="/manage/strategies" className="sx-back"><FaArrowLeft size={11} /> Back to Strategies</Link>
        <EmptyState size="lg" icon={FaBrain} eyebrow="Not found" title="Strategy not found"
          description={error?.message || 'The strategy you tried to open does not exist.'} />
      </div>
    );
  }

  const hasTrades = s.n > 0;
  const filtered = account !== 'all' || accountId !== 'all' || range !== 'all';
  const playbookCount = PLAYBOOK_SECTIONS.reduce((n, sec) => n + (strategy.playbook?.[sec.key]?.length || 0), 0);
  const issues = data.compliance.filter((c) => c.violations > 0).length;

  const tabs = [
    { id: 'performance', label: 'Performance' },
    { id: 'playbook', label: 'Playbook', count: playbookCount || null },
    { id: 'trades', label: 'Trades', count: s.n || null },
    { id: 'insights', label: 'Insights', count: data.insights.length + issues || null },
  ];

  const isActive = strategy.status === 'active';

  return (
    <div className="sx-root page-fade-in" style={{ '--sx-c': strategy.color }}>
      <div className="sx-detail-top">
        <Link to="/manage/strategies" className="sx-back"><FaArrowLeft size={11} /> Back to Strategies</Link>
        <div className="sx-detail-actions">
          <button type="button" className="sx-btn" onClick={() => setEditOpen(true)}><FaEdit size={11} /> Edit</button>
          {strategy.status !== 'archived' && (
            <button type="button" className="sx-btn" onClick={() => run(() => updateM.mutateAsync({ id, patch: { status: isActive ? 'paused' : 'active' } }), isActive ? 'Strategy paused' : 'Strategy activated')}>
              {isActive ? <><FaPause size={10} /> Pause</> : <><FaPlay size={10} /> Activate</>}
            </button>
          )}
          <Menu items={[
            { label: 'Duplicate', icon: <FaCopy />, onClick: () => run(async () => { const c = await duplicateM.mutateAsync(id); toast.success(`Created "${c.name}"`); navigate(`/manage/strategies/${c.id}`); }) },
            strategy.status !== 'archived'
              ? { label: 'Archive', icon: <FaArchive />, onClick: () => setConfirm('archive') }
              : { label: 'Restore', icon: <FaPlay />, onClick: () => run(() => updateM.mutateAsync({ id, patch: { status: 'active' } }), 'Strategy restored') },
            { label: 'Delete', icon: <FaTrash />, danger: true, onClick: () => setConfirm('delete') },
          ]} />
        </div>
      </div>

      <header className="sx-title-block">
        <span className="sx-title-dot" />
        <div>
          <h1>{strategy.name}</h1>
          <div className="sx-title-meta">
            <StatusPill status={strategy.status} />
            <span className="sx-chip">{strategy.direction || 'Long & Short'}</span>
            {strategy.timeframe && <span className="sx-chip">{strategy.timeframe}</span>}
            {strategy.tags.map((t) => <span key={t} className="sx-chip is-tag">#{t}</span>)}
          </div>
          {strategy.description && <p className="sx-title-desc">{strategy.description}</p>}
        </div>
      </header>

      <ScopeBar account={account} onAccount={(v) => { setAccount(v); setAccountId('all'); }} range={range} onRange={setRange}
        extra={
          <>
            {data.accounts.length > 1 && (
              <select className="sx-select" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Account">
                <option value="all">All matching accounts</option>
                {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.n})</option>)}
              </select>
            )}
            <span className={`sx-sync ${isFetching ? 'is-on' : ''}`}>Updating…</span>
          </>
        } />

      <section className="sx-kpis">
        <Stat label="Net P&L" value={hasTrades ? money(s.net, { sign: true }) : '—'} tone={tone(s.net)} sub={hasTrades ? `${s.n} trades · ${s.tradingDays} days` : 'No trades'} />
        <Stat label="Win rate" value={hasTrades ? pct(s.winRate) : '—'} sub={hasTrades ? `${s.wins}W · ${s.losses}L · ${s.breakeven}BE` : null} />
        <Stat label="Profit factor" value={hasTrades ? pf(s) : '—'} sub={hasTrades ? `${money(s.grossProfit, { compact: true })} / ${money(s.grossLoss, { compact: true })}` : null} hint="Gross profit divided by gross loss" />
        <Stat label="Expectancy" value={hasTrades ? money(s.expectancy, { sign: true }) : '—'} tone={tone(s.expectancy)} sub="per trade" hint="Average P&L per trade" />
        <Stat label="Payoff ratio" value={hasTrades && s.payoff != null ? `${s.payoff}:1` : '—'} sub={hasTrades ? `${money(s.avgWin, { compact: true })} / ${money(s.avgLoss, { compact: true })}` : null} hint="Average win divided by average loss" />
        <Stat label="Max drawdown" value={hasTrades ? money(-s.maxDrawdown) : '—'} tone={s.maxDrawdown ? 'neg' : ''} sub={hasTrades && s.currentDrawdown ? `now ${money(-s.currentDrawdown)}` : null} />
      </section>

      <Segmented ariaLabel="Section" value={tab} onChange={setTab} options={tabs} />

      {tab === 'performance' && (
        !hasTrades ? (
          <EmptyState icon={FaBrain} eyebrow={filtered ? 'No matches' : 'No trades yet'}
            title={filtered ? 'No trades in this scope' : 'Tag trades with this strategy'}
            description={filtered ? 'Widen the date range or account filter.' : 'Open a trade, pick this strategy, and its performance appears here.'} />
        ) : (
          <div className="sx-stack">
            <Panel title={curve === 'equity' ? 'Equity curve' : 'Drawdown'} sub="Cumulative P&L by trade, oldest to newest"
              right={<Segmented ariaLabel="Chart" value={curve} onChange={setCurve} options={[{ id: 'equity', label: 'Equity' }, { id: 'drawdown', label: 'Drawdown' }]} />}>
              <EquityChart equity={s.equity} drawdown={s.drawdown} mode={curve} color={strategy.color} />
            </Panel>

            <div className="sx-cols">
              <Panel title="By session" sub="Net P&L by entry window"><BarList rows={s.bySession} /></Panel>
              <Panel title="By weekday"><BarList rows={s.byDow} /></Panel>
              <Panel title="By direction"><BarList rows={s.byDirection} /></Panel>
            </div>

            <div className="sx-cols two">
              <Panel title="Monthly P&L"><MonthlyBars rows={s.monthly} /></Panel>
              <Panel title="P&L distribution" sub="How wins and losses are spread"><Histogram bins={s.distribution} /></Panel>
            </div>

            <div className="sx-cols two">
              <Panel title="By entry hour"><BarList rows={s.byHour} /></Panel>
              <Panel title="By instrument" sub="Top 10 by net P&L"><BarList rows={s.bySymbol} /></Panel>
            </div>

            <Panel title="Daily activity" sub="Last 26 weeks"><DailyHeatmap days={s.daily} /></Panel>

            <div className="sx-cols two">
              <Panel title="Trade quality">
                <Row k="Largest win" v={money(s.largestWin, { sign: true })} t="pos" />
                <Row k="Largest loss" v={money(s.largestLoss)} t="neg" />
                <Row k="Best win streak" v={s.bestWinStreak} />
                <Row k="Worst losing streak" v={s.worstLossStreak} />
                <Row k="Current streak" v={s.currentStreak.type ? `${s.currentStreak.count} ${s.currentStreak.type}${s.currentStreak.count === 1 ? '' : 's'}` : '—'} />
                <Row k="SQN" v={s.sqn ?? '—'} />
                <Row k="Recovery factor" v={s.recoveryFactor ?? '—'} />
              </Panel>
              <Panel title="Behaviour">
                <Row k="Avg hold (all)" v={minutes(s.avgHold)} />
                <Row k="Avg hold (winners)" v={minutes(s.avgHoldWin)} />
                <Row k="Avg hold (losers)" v={minutes(s.avgHoldLoss)} />
                <Row k="Trades per day" v={`${s.avgTradesPerDay} avg · ${s.maxTradesInDay} max`} />
                <Row k="Winning days" v={`${s.winningDays}/${s.tradingDays} (${pct(s.winningDayRate, 0)})`} />
                <Row k="Best day" v={s.bestDay ? `${money(s.bestDay.net, { sign: true })} · ${fmtDate(s.bestDay.date, { month: 'short', day: 'numeric' })}` : '—'} t="pos" />
                <Row k="Worst day" v={s.worstDay ? `${money(s.worstDay.net)} · ${fmtDate(s.worstDay.date, { month: 'short', day: 'numeric' })}` : '—'} t="neg" />
                <Row k="Commissions" v={money(s.commission)} />
              </Panel>
            </div>
          </div>
        )
      )}

      {tab === 'playbook' && (
        <div className="sx-stack">
          <Panel title="Trade plan" right={<button type="button" className="sx-btn" onClick={() => setEditOpen(true)}><FaEdit size={11} /> Edit</button>}>
            <div className="sx-plan">
              <Row k="Direction" v={strategy.direction || 'Both'} />
              <Row k="Timeframe" v={strategy.timeframe || '—'} />
              <Row k="Sessions" v={strategy.sessions.length ? strategy.sessions.join(', ') : 'Any'} />
              <Row k="Instruments" v={strategy.symbols.length ? strategy.symbols.join(', ') : 'Any'} />
              <Row k="Target R:R" v={strategy.targetRR ? `${strategy.targetRR}R` : '—'} />
              <Row k="Risk per trade" v={strategy.riskPerTrade ? `${strategy.riskPerTrade}%` : '—'} />
              <Row k="Max trades / day" v={strategy.maxTradesPerDay || '—'} />
            </div>
          </Panel>

          {playbookCount === 0 && !strategy.rules ? (
            <EmptyState icon={FaBrain} eyebrow="Empty playbook" title="Write down the rules"
              description="Entry, exit, risk and management rules turn a vague idea into something you can measure yourself against."
              actions={[{ label: 'Add rules', icon: FaEdit, variant: 'primary', onClick: () => setEditOpen(true) }]} />
          ) : (
            <div className="sx-cols two">
              {PLAYBOOK_SECTIONS.map((sec) => {
                const list = strategy.playbook?.[sec.key] || [];
                return (
                  <Panel key={sec.key} title={sec.label} sub={sec.hint}>
                    {list.length ? (
                      <ol className="sx-rules">{list.map((r) => <li key={r.id}>{r.text}</li>)}</ol>
                    ) : <p className="sx-muted">No {sec.label.toLowerCase()} rules yet.</p>}
                  </Panel>
                );
              })}
            </div>
          )}

          {strategy.rules && <Panel title="Notes"><p className="sx-notes">{strategy.rules}</p></Panel>}
        </div>
      )}

      {tab === 'trades' && (
        <Panel title="Tagged trades" sub={data.truncated ? 'Showing the most recent 5,000' : `${s.n} in scope`}>
          {s.n === 0 ? <p className="sx-muted">No trades in this scope.</p> : (
            <DataTable data={data.trades} columns={columns} getRowId={(row) => row.id}
              searchPlaceholder="Search trades…" searchableColumnIds={['date', 'symbol', 'notes']}
              initialSort={[{ id: 'date', desc: true }]} estimateRowHeight={36} maxHeight={560} emptyMessage="No trades match." />
          )}
        </Panel>
      )}

      {tab === 'insights' && (
        <div className="sx-stack">
          <Panel title="Plan adherence" sub="Your written plan, checked against what you actually did">
            {data.compliance.length === 0 ? (
              <p className="sx-muted">Add sessions, instruments, a direction or a daily trade cap to the trade plan and adherence is measured here.</p>
            ) : (
              <div className="sx-compl">
                {data.compliance.map((c) => (
                  <div key={c.key} className="sx-compl-row">
                    <div className="sx-compl-top">
                      <span>{c.label} <em>{c.planned}</em></span>
                      <b className={c.adherence >= 90 ? 'pos' : c.adherence >= 70 ? 'warn' : 'neg'}>{pct(c.adherence, 0)}</b>
                    </div>
                    <div className="sx-meter"><i style={{ width: `${c.adherence}%` }} className={c.adherence >= 90 ? 'w' : c.adherence >= 70 ? 'm' : 'l'} /></div>
                    <span className="sx-compl-sub">
                      {c.violations === 0 ? 'No breaks' : `${c.violations} off-plan trade${c.violations === 1 ? '' : 's'} · ${money(c.net, { sign: true })} combined`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="What the data says" sub={`Sample confidence: ${s.confidence}`}>
            {data.insights.length === 0 ? <p className="sx-muted">Not enough trades yet to say anything useful.</p> : (
              <ul className="sx-insights">
                {data.insights.map((i) => {
                  const Icon = TONE_ICON[i.tone] || FaInfoCircle;
                  return (
                    <li key={i.id} className={`is-${i.tone}`}>
                      <Icon size={14} />
                      <div><b>{i.title}</b><span>{i.detail}</span></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <StrategyFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} strategy={strategy} />

      <Alert isOpen={confirm === 'archive'} type="confirm" title="Archive this strategy?"
        message={`"${strategy.name}" will be hidden from pickers but its ${strategy.tradeCount} tagged trade${strategy.tradeCount === 1 ? '' : 's'} will keep the tag. You can restore it any time.`}
        confirmText="Archive" cancelText="Cancel"
        onConfirm={async () => { setConfirm(null); await run(() => archiveM.mutateAsync(id), `"${strategy.name}" archived`); }}
        onCancel={() => setConfirm(null)} />

      <Alert isOpen={confirm === 'delete'} type="confirm" title="Delete strategy?"
        message={`"${strategy.name}" will be permanently deleted. ${strategy.tradeCount > 0 ? `${strategy.tradeCount} tagged trade${strategy.tradeCount === 1 ? '' : 's'} will be UNTAGGED but kept. ` : ''}This cannot be undone.`}
        confirmText="Delete" cancelText="Cancel"
        onConfirm={async () => {
          setConfirm(null);
          await run(async () => { await deleteM.mutateAsync(id); toast.success(`Deleted "${strategy.name}"`); navigate('/manage/strategies'); });
        }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
}
