import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useBacktestSessions, useDeleteBacktestSession } from '@/shared/api/backtestSessions';
import Portal from '@/shared/components/Portal';
import { getSelectablePropFirms } from './selectablePropFirms';

import SessionCard from './SessionCard';
import SessionFormModal from './SessionFormModal';
import { BT_CSS } from '../backtesterStyles';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
];

/* Finds { firm, plan, tier } for a plan id (and optional account size). */
function findTemplate(planId, size) {
  for (const firm of getSelectablePropFirms()) {
    const plan = firm.plans.find((p) => p.id === planId && p.tiers?.length);
    if (plan) {
      const tier = plan.tiers.find((t) => t.size === Number(size)) || plan.tiers[0];
      return { firm, plan, tier };
    }
  }
  return null;
}

/**
 * Opens the "New session" modal pre-filled from a prop firm plan.
 * URL: /backtester?plan=<planId>[&size=<accountSize>]   e.g. ?plan=ftmo-2step&size=100000
 * Prop: planTemplate = { firm, plan, tier? } (same shape the modal expects).
 */
export default function SessionListPage({ planTemplate: initialPlanTemplate }) {
  usePageHeader({ title: 'Backtester' });
  const { data: sessions = [], isLoading, isError, refetch } = useBacktestSessions();
  const deleteM = useDeleteBacktestSession();
  const [filter, setFilter] = useState('all');
  const [creating, setCreating] = useState(Boolean(initialPlanTemplate));
  const [currentPlan, setCurrentPlan] = useState(initialPlanTemplate || null);
  const [toDelete, setToDelete] = useState(null);
  const [typed, setTyped] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const handledRef = useRef(false);

  const planIdFromUrl = searchParams.get('plan');
  const sizeFromUrl = searchParams.get('size');

  // Open the modal from ?plan=..., then remove the params so a refresh doesn't reopen it.
  useEffect(() => {
    if (!planIdFromUrl || handledRef.current) return;
    handledRef.current = true;
    const template = findTemplate(planIdFromUrl, sizeFromUrl);
    if (template) {
      setCurrentPlan(template);
      setCreating(true);
    } else {
      toast.error('That prop firm plan no longer exists.');
    }
    const params = new URLSearchParams(searchParams);
    params.delete('plan');
    params.delete('size');
    setSearchParams(params, { replace: true });
  }, [planIdFromUrl, sizeFromUrl, searchParams, setSearchParams]);

  const shown = useMemo(
    () => (filter === 'all' ? sessions : sessions.filter((s) => s.status === filter)),
    [sessions, filter],
  );

  const confirmDelete = async () => {
    try {
      await deleteM.mutateAsync(toDelete.id);
      toast.success(`Deleted "${toDelete.name}"`);
      setToDelete(null);
      setTyped('');
    } catch (e) {
      toast.error(e?.message || 'Could not delete the session.');
    }
  };

  return (
    <>
      <style>{BT_CSS}</style>
      <div className="bt-root page-fade-in">
        <div className="bt-pagehead">
          <div>
            <h1>Backtest sessions</h1>
            <p>Replay history bar by bar, place trades, and review the results.</p>
          </div>
          <button type="button" className="bt-btn is-primary is-lg" onClick={() => setCreating(true)}>
            <Plus size={15} /> New session
          </button>
        </div>

        {sessions.length > 0 && (
          <div className="bt-filters" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id}
                className={filter === f.id ? 'is-on' : ''} onClick={() => setFilter(f.id)}>
                {f.label}
                <em>{f.id === 'all' ? sessions.length : sessions.filter((s) => s.status === f.id).length}</em>
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="bt-grid">{[0, 1, 2].map((i) => <div key={i} className="bt-skel" />)}</div>
        ) : isError ? (
          <div className="bt-empty">
            <b>Couldn't load your sessions</b>
            <p>Check your connection and try again.</p>
            <button type="button" className="bt-btn" onClick={() => refetch()}>Retry</button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bt-empty">
            <FlaskConical size={30} />
            <b>No sessions yet</b>
            <p>Create a session, pick a date range and replay the market one candle at a time. Every trade you place is saved to the session.</p>
            <button type="button" className="bt-btn is-primary is-lg" onClick={() => setCreating(true)}><Plus size={15} /> Create your first session</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="bt-empty"><b>Nothing here</b><p>No {filter} sessions.</p></div>
        ) : (
          <div className="bt-grid">
            {shown.map((s) => <SessionCard key={s.id} session={s} onDelete={(x) => { setToDelete(x); setTyped(''); }} />)}
          </div>
        )}
      </div>

      <SessionFormModal
        isOpen={creating}
        onClose={() => { setCreating(false); setCurrentPlan(null); }}
        planTemplate={currentPlan}
      />

      {toDelete && (
        <Portal>
          <div className="bt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !deleteM.isPending) setToDelete(null); }}>
            <div className="bt-modal is-sm" role="dialog" aria-modal="true" aria-label="Delete session">
              <div className="bt-modal-head">
                <div className="bt-modal-titles"><h2>Delete session?</h2><p>{toDelete.name}</p></div>
              </div>
              <div className="bt-modal-body">
                <p className="bt-note">
                  This permanently deletes the session
                  {toDelete.tradesCount > 0 ? <> and its <b>{toDelete.tradesCount} trade{toDelete.tradesCount === 1 ? '' : 's'}</b></> : null}.
                  This can't be undone.
                </p>
                {toDelete.tradesCount > 0 && (
                  <label className="bt-field">
                    <span>Type the session name to confirm</span>
                    <input className="bt-input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus placeholder={toDelete.name} />
                  </label>
                )}
              </div>
              <div className="bt-modal-foot">
                <button type="button" className="bt-btn" onClick={() => setToDelete(null)} disabled={deleteM.isPending}>Cancel</button>
                <button
                  type="button" className="bt-btn is-danger" onClick={confirmDelete}
                  disabled={deleteM.isPending || (toDelete.tradesCount > 0 && typed.trim() !== toDelete.name)}
                >
                  {deleteM.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}