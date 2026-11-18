import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Flag, Play, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { resolveTimezone } from '@/shared/format/datetime';
import {
  useBacktestSession, useBacktestTrades, useUpdateBacktestSession, useDeleteBacktestSession,
} from '@/shared/api/backtestSessions';

import '@/features/dashboard/dashboardShell.css';
import { BT_CSS } from '../backtesterStyles';
import { computeSessionStats } from '../lib/sessionStats';
import { evaluatePropRules } from '../lib/propRules';
import { fmtMoney, fmtSigned, toneOf } from '../lib/format';

import OverviewTab from './tabs/OverviewTab';
import TradesTab from './tabs/TradesTab';
import RiskTab from './tabs/RiskTab';
import PropRulesTab from './tabs/PropRulesTab';

const EMPTY = [];

function Skeleton() {
  return (
    <div className="dash-root">
      <div className="dsk"><i className="a" /><i className="b" /><i className="c" /><i className="d" /><i className="d" /><i className="d" /></div>
    </div>
  );
}

export default function BacktesterDashboardPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const tz = useMemo(() => resolveTimezone(settings?.preferences?.timezone || 'auto'), [settings]);

  // `fresh`: always re-read the rows from the server — every number below is recomputed from them.
  const sessionQ = useBacktestSession(sessionId, { fresh: true });
  const tradesQ = useBacktestTrades(sessionId, { fresh: true });
  const updateM = useUpdateBacktestSession();
  const deleteM = useDeleteBacktestSession();
  const [tab, setTab] = useState('overview');

  const session = sessionQ.data;
  const trades = tradesQ.data || EMPTY;
  usePageHeader({ title: 'Backtester', subtitle: session?.name });

  const stats = useMemo(() => (session ? computeSessionStats(trades, session, { tz }) : null), [trades, session, tz]);
  const prop = useMemo(
    () => (session?.type === 'prop' ? evaluatePropRules(session, trades, { tz }) : null),
    [session, trades, tz],
  );

  if (sessionQ.isLoading || tradesQ.isLoading) return <><style>{BT_CSS}</style><Skeleton /></>;

  if (sessionQ.isError || !session) {
    return (
      <>
        <style>{BT_CSS}</style>
        <div className="bt-root"><div className="bt-empty">
          <b>Session not found</b>
          <p>It may have been deleted, or it belongs to another account.</p>
          <Link to="/backtester" className="bt-btn is-primary">Back to sessions</Link>
        </div></div>
      </>
    );
  }

  const cur = session.currency;
  const isPropSession = session.type === 'prop';
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'trades', label: `Trades${trades.length ? ` (${trades.length})` : ''}` },
    { id: 'risk', label: 'Risk' },
    ...(isPropSession ? [{ id: 'prop', label: 'Prop rules' }] : []),
  ];
  const activeTab = tabs.some((t) => t.id === tab) ? tab : 'overview';

  const setStatus = async (status, msg) => {
    try { await updateM.mutateAsync({ id: session.id, patch: { status } }); toast.success(msg); } catch (e) { toast.error(e?.message || 'Could not update the session.'); }
  };

  const remove = async () => {
    const ok = window.confirm(`Delete “${session.name}” and its ${trades.length} trade${trades.length === 1 ? '' : 's'}? This can’t be undone.`);
    if (!ok) return;
    try { await deleteM.mutateAsync(session.id); toast.success('Session deleted'); navigate('/backtester'); } catch (e) { toast.error(e?.message || 'Could not delete.'); }
  };

  return (
    <>
      <style>{BT_CSS}</style>
      <div className="dash-root bt-dash page-fade-in">
        <div className="hdr-root">
          <div className="hdr-bar">
            <div className="hdr-section">
              <Link to="/backtester" className="hdr-btn" aria-label="All sessions"><ArrowLeft size={14} /> Sessions</Link>
              <span className="hdr-divider" />
              <div className="bt-dash-title">
                <b>{session.name}</b>
                <span>
                  <i className={`bt-badge is-${session.type}`}>{isPropSession ? `Prop · ${prop?.firmLabel}` : 'Standard'}</i>
                  <i className={`bt-status is-${session.status}`}>{session.status}</i>
                  <em>{session.instruments.join(' · ')} · {session.interval.toUpperCase()} · {session.fromDate} → {session.toDate}</em>
                </span>
              </div>
            </div>

            <div className="hdr-section bt-dash-bal">
              <div><span className="hdr-label">Balance</span><b>{fmtMoney(session.currentBalance, cur)}</b></div>
              <div><span className="hdr-label">Net</span><b className={toneOf(stats.netPnl)}>{fmtSigned(stats.netPnl, cur)}</b></div>
              {prop && <div><span className="hdr-label">Challenge</span><b className={`bt-prop-${prop.status}`}>{prop.status === 'passed' ? 'Passed' : prop.status === 'failed' ? 'Failed' : 'In progress'}</b></div>}
            </div>

            <div className="hdr-section hdr-actions">
              <Link to={`/backtester/${session.id}/replay`} className="hdr-btn is-optimize">
                <Play size={14} /> {session.status === 'active' ? 'Resume replay' : 'Open chart'}
              </Link>
              {session.status === 'active' ? (
                <button type="button" className="hdr-btn" onClick={() => setStatus('completed', 'Session concluded')}
                  disabled={updateM.isPending || stats.openCount > 0 || stats.pendingCount > 0}
                  title={stats.openCount + stats.pendingCount > 0 ? 'Close open positions and cancel pending orders in the replay first (or use Conclude there)' : 'Lock trades and mark as completed'}>
                  <Flag size={14} /> Conclude
                </button>
              ) : (
                <button type="button" className="hdr-btn" onClick={() => setStatus('active', 'Session reopened')} disabled={updateM.isPending}>
                  <RotateCcw size={14} /> Reopen
                </button>
              )}
              <button type="button" className="hdr-btn-reset" onClick={remove} disabled={deleteM.isPending} aria-label="Delete session" title="Delete session"><Trash2 size={14} /></button>
            </div>
          </div>
        </div>

        <div className="bt-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} className={activeTab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === 'prop' && prop && <i className={`bt-dot is-${prop.status}`} />}
            </button>
          ))}
        </div>

        {tradesQ.isError && (
          <div className="bt-error" role="alert">Couldn’t refresh trades — the numbers below may be out of date. <button type="button" className="bt-link" onClick={() => tradesQ.refetch()}>Retry</button></div>
        )}

        {activeTab === 'overview' && <OverviewTab session={session} stats={stats} tz={tz} />}
        {activeTab === 'trades' && <TradesTab session={session} trades={trades} tz={tz} />}
        {activeTab === 'risk' && <RiskTab session={session} stats={stats} />}
        {activeTab === 'prop' && <PropRulesTab session={session} prop={prop} />}
      </div>
    </>
  );
}
