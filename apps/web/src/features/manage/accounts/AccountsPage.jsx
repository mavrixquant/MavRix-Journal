import { useId, useMemo, useState } from 'react';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaWallet,
  FaChartLine,
  FaExchangeAlt,
  FaFolderOpen,
} from 'react-icons/fa';
import { useQueries } from '@tanstack/react-query';

import Alert from '@/shared/components/Alert';
import LoadingOverlay from '@/shared/components/LoadingOverlay';
import EmptyState from '@/shared/components/EmptyState';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import { useAccounts, deleteAccount } from '@/shared/api/accounts';
import { getTrades, deleteTradesByAccountId, tradesKeys } from '@/shared/api/trades';
import { queryClient } from '@/shared/api/queryClient';

import AccountFormModal from './AccountFormModal';
import './AccountsPage.css';

const FILTERS = ['All', 'Live', 'Demo', 'Backtest'];

const TYPE_META = {
  Live: { cls: 'is-live', color: '#4DD6B3' },
  Demo: { cls: 'is-demo', color: 'var(--accent)' },
  Backtest: { cls: 'is-backtest', color: '#60a5fa' },
};

function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `$${(amount || 0).toFixed(2)}`;
  }
}

function pct(v, signed = true) {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${signed && v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function Spark({ values }) {
  const uid = useId().replace(/:/g, '');
  if (values.length < 2) {
    return <div className="acc-spark-empty">No equity curve yet</div>;
  }
  const W = 280;
  const H = 54;
  const pad = 4;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const step = W / (values.length - 1);
  const pts = values.map((v, i) => [i * step, H - pad - ((v - min) / range) * (H - pad * 2)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const color = values[values.length - 1] >= 0 ? '#35C4A1' : '#FF5C5C';
  return (
    <svg className="acc-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#s${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function AccountsPage() {
  const { data: accounts = [], isLoading: loading } = useAccounts();

  const [selectedType, setSelectedType] = useState('Live');

  const [modalState, setModalState] = useState({ open: false, account: null });
  const openCreate = () => setModalState({ open: true, account: null });
  const openEdit = (account) => setModalState({ open: true, account });
  const closeModal = () => setModalState({ open: false, account: null });

  const [deleteAlert, setDeleteAlert] = useState({ show: false, accountId: null, accountName: '', tradesCount: 0 });
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [successAlert, setSuccessAlert] = useState({ show: false, message: '' });
  const [errorAlert, setErrorAlert] = useState({ show: false, message: '' });

  usePageHeader({
    title: 'Portfolio Accounts',
    subtitle: 'Monitor account capital and aggregate net return',
  });

  const metrics = useQueries({
    queries: accounts.map((acc) => ({
      queryKey: tradesKeys.byAccount(acc.id),
      queryFn: () => getTrades(acc.id),
      enabled: !!acc.id,
    })),
    combine: (results) => {
      const map = {};
      accounts.forEach((acc, i) => {
        const trades = [...(results[i]?.data || [])].sort((a, b) =>
          `${a.date || ''} ${a.entryTime || a.entry || ''}`.localeCompare(`${b.date || ''} ${b.entryTime || b.entry || ''}`)
        );
        let run = 0;
        let wins = 0;
        let losses = 0;
        const series = [];
        for (const t of trades) {
          const v = parseFloat(t.pnl);
          const n = isNaN(v) ? 0 : v;
          run += n;
          series.push(run);
          if (n > 0) wins++;
          else if (n < 0) losses++;
        }
        map[acc.id] = {
          pnl: run,
          count: trades.length,
          series,
          winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : null,
        };
      });
      return map;
    },
  });

  const handleDelete = async (account) => {
    try {
      const trades = await getTrades(account.id);
      setDeleteAlert({ show: true, accountId: account.id, accountName: account.name, tradesCount: trades.length });
    } catch (error) {
      console.error('Error fetching trades count:', error);
      setErrorAlert({ show: true, message: 'Failed to fetch trades count. Please try again.' });
    }
  };

  const resetDelete = () => setDeleteAlert({ show: false, accountId: null, accountName: '', tradesCount: 0 });

  const confirmDelete = async () => {
    const { accountId, accountName, tradesCount } = deleteAlert;
    if (!accountId) return;
    setLoadingDelete(true);
    try {
      await deleteTradesByAccountId(accountId);
      await deleteAccount(accountId);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      resetDelete();
      setSuccessAlert({
        show: true,
        message: `Account "${accountName}" and ${tradesCount} trade(s) deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting account and trades:', error);
      resetDelete();
      setErrorAlert({ show: true, message: 'Failed to delete account and trades. Please try again.' });
    } finally {
      setLoadingDelete(false);
    }
  };

  const typeOf = (acc) => acc.type || 'Backtest';

  const counts = useMemo(() => {
    const c = { All: accounts.length, Live: 0, Demo: 0, Backtest: 0 };
    accounts.forEach((a) => { c[typeOf(a)] = (c[typeOf(a)] || 0) + 1; });
    return c;
  }, [accounts]);

  const filteredAccounts = accounts.filter((acc) => selectedType === 'All' || typeOf(acc) === selectedType);

  const totalBalance = filteredAccounts.reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
  const totalPnlAll = filteredAccounts.reduce((s, a) => s + (metrics[a.id]?.pnl || 0), 0);
  const totalTradesAll = filteredAccounts.reduce((s, a) => s + (metrics[a.id]?.count || 0), 0);
  const totalReturn = totalBalance > 0 ? (totalPnlAll / totalBalance) * 100 : null;
  const pnlTone = totalPnlAll > 0 ? 'pos' : totalPnlAll < 0 ? 'neg' : 'zero';

  const allocation = useMemo(() => {
    const rows = filteredAccounts
      .map((a) => ({ id: a.id, name: a.name, type: typeOf(a), bal: parseFloat(a.balance) || 0 }))
      .filter((r) => r.bal > 0)
      .sort((a, b) => b.bal - a.bal);
    const sum = rows.reduce((s, r) => s + r.bal, 0);
    return rows.map((r, i) => ({ ...r, share: sum ? (r.bal / sum) * 100 : 0, shade: Math.max(0.35, 1 - i * 0.14) }));
  }, [filteredAccounts]);

  if (loading) return <LoadingOverlay message="Loading account metrics..." />;

  return (
    <>
      <div className="acc-root page-fade-in">
        {/* Toolbar */}
        <div className="acc-toolbar">
          <div className="acc-type-tabs" role="tablist" aria-label="Account type">
            {FILTERS.map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={selectedType === type}
                className={`acc-type-tab ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
              >
                {type}
                <span className="acc-type-count">{counts[type] || 0}</span>
              </button>
            ))}
          </div>
          <div className="acc-toolbar-spacer" />
          <button type="button" className="acc-btn-primary" onClick={openCreate}>
            <FaPlus size={11} /> New Account
          </button>
        </div>

        {/* Overview */}
        <section className="acc-overview">
          <div className="acc-ov-main">
            <div className="acc-ov-cell">
              <div className="acc-kpi-icon is-amber"><FaWallet /></div>
              <div>
                <span className="acc-kpi-label">Combined Capital</span>
                <span className="acc-kpi-value">{formatCurrency(totalBalance, 'USD')}</span>
              </div>
            </div>
            <div className="acc-ov-cell">
              <div className={`acc-kpi-icon ${pnlTone === 'pos' ? 'is-win' : pnlTone === 'neg' ? 'is-loss' : ''}`}><FaChartLine /></div>
              <div>
                <span className="acc-kpi-label">Cumulative P&amp;L</span>
                <span className={`acc-kpi-value ${pnlTone}`}>
                  {formatCurrency(totalPnlAll, 'USD')}
                  {totalReturn != null && totalTradesAll > 0 && (
                    <em className={`acc-delta ${totalReturn >= 0 ? 'pos' : 'neg'}`}>{pct(totalReturn)}</em>
                  )}
                </span>
              </div>
            </div>
            <div className="acc-ov-cell">
              <div className="acc-kpi-icon"><FaExchangeAlt /></div>
              <div>
                <span className="acc-kpi-label">Total Executed Trades</span>
                <span className="acc-kpi-value">{totalTradesAll}</span>
              </div>
            </div>
          </div>

          {allocation.length > 0 && (
            <div className="acc-alloc">
              <div className="acc-alloc-head">
                <span className="acc-kpi-label">Capital allocation</span>
                <span className="acc-alloc-note">{allocation.length} account{allocation.length === 1 ? '' : 's'}</span>
              </div>
              <div className="acc-alloc-bar" role="img" aria-label="Capital allocation by account">
                {allocation.map((r) => (
                  <span
                    key={r.id}
                    className="acc-alloc-seg"
                    style={{ flexGrow: r.share, background: TYPE_META[r.type]?.color || 'var(--accent)', opacity: r.shade }}
                    title={`${r.name} · ${r.share.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="acc-alloc-legend">
                {allocation.slice(0, 6).map((r) => (
                  <span key={r.id} className="acc-alloc-item">
                    <i style={{ background: TYPE_META[r.type]?.color || 'var(--accent)', opacity: r.shade }} />
                    <b>{r.name}</b>
                    <span>{r.share.toFixed(0)}%</span>
                  </span>
                ))}
                {allocation.length > 6 && <span className="acc-alloc-item"><span>+{allocation.length - 6} more</span></span>}
              </div>
            </div>
          )}
        </section>

        {/* Accounts */}
        {filteredAccounts.length === 0 ? (
          <EmptyState
            icon={FaFolderOpen}
            eyebrow="No accounts"
            title={`No ${selectedType === 'All' ? '' : selectedType + ' '}Accounts Found`}
            description={
              selectedType === 'All'
                ? 'Create your first trading account to start logging trades.'
                : `No accounts matching the selected filter category (${selectedType}).`
            }
            actions={[{ label: 'Create Account', icon: FaPlus, variant: 'primary', onClick: openCreate }]}
          />
        ) : (
          <div className="acc-grid">
            {filteredAccounts.map((acc) => {
              const m = metrics[acc.id] || { pnl: 0, count: 0, series: [], winRate: null };
              const type = typeOf(acc);
              const meta = TYPE_META[type] || TYPE_META.Backtest;
              const bal = parseFloat(acc.balance) || 0;
              const ret = bal > 0 && m.count > 0 ? (m.pnl / bal) * 100 : null;
              const pnlClass = m.count === 0 ? 'dim' : m.pnl > 0 ? 'pos' : m.pnl < 0 ? 'neg' : 'dim';

              return (
                <article key={acc.id} className={`acc-card acc-account ${meta.cls}`}>
                  <div className="acc-account-head">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="acc-name" title={acc.name}>{acc.name}</h3>
                      <span className="acc-base">Base · {acc.currency}</span>
                    </div>
                    <span className={`acc-badge ${meta.cls}`}>{type}</span>
                  </div>

                  <div className="acc-balance">
                    <span className="acc-metric-label">Starting Capital</span>
                    <span className="acc-balance-val">{formatCurrency(acc.balance, acc.currency)}</span>
                  </div>

                  <Spark values={m.series} />

                  <div className="acc-metric-bar">
                    <div className="acc-metric">
                      <span className="acc-metric-label">Total P&amp;L</span>
                      <span className={`acc-metric-value ${pnlClass}`}>
                        {m.count === 0 ? '—' : formatCurrency(m.pnl, acc.currency)}
                      </span>
                    </div>
                    <div className="acc-metric">
                      <span className="acc-metric-label">Return</span>
                      <span className={`acc-metric-value ${ret == null ? 'dim' : ret >= 0 ? 'pos' : 'neg'}`}>{pct(ret)}</span>
                    </div>
                    <div className="acc-metric">
                      <span className="acc-metric-label">Win rate</span>
                      <span className={`acc-metric-value ${m.winRate == null ? 'dim' : m.winRate >= 50 ? 'pos' : 'neg'}`}>
                        {m.winRate == null ? '—' : `${m.winRate.toFixed(0)}%`}
                      </span>
                    </div>
                  </div>

                  <div className="acc-account-footer">
                    <span className="acc-trades-count">
                      {m.count} {m.count === 1 ? (type === 'Backtest' ? 'test' : 'trade') : (type === 'Backtest' ? 'tests' : 'trades')}
                    </span>
                    <div className="acc-account-actions">
                      <button type="button" className="acc-icon-btn" onClick={() => openEdit(acc)}>
                        <FaEdit size={11} /> Edit
                      </button>
                      <button type="button" className="acc-icon-btn is-danger" onClick={() => handleDelete(acc)}>
                        <FaTrash size={11} /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            <button type="button" className="acc-new-tile" onClick={openCreate}>
              <span className="acc-new-plus"><FaPlus size={16} /></span>
              <span className="acc-new-title">New account</span>
              <span className="acc-new-sub">Live, Demo or Backtest</span>
            </button>
          </div>
        )}

        <AccountFormModal isOpen={modalState.open} account={modalState.account} onClose={closeModal} />

        <Alert
          isOpen={deleteAlert.show}
          title="Delete Account"
          message={`Deleting account "${deleteAlert.accountName}" will also delete ${deleteAlert.tradesCount} associated trade(s). This action cannot be reversed.`}
          type="confirm"
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={resetDelete}
          showCancel={true}
        />

        {loadingDelete && <LoadingOverlay message="Deleting account and trades..." />}

        <Alert
          isOpen={successAlert.show}
          title="Success"
          message={successAlert.message}
          type="success"
          confirmText="OK"
          onConfirm={() => setSuccessAlert({ show: false, message: '' })}
          showCancel={false}
        />

        <Alert
          isOpen={errorAlert.show}
          title="Error"
          message={errorAlert.message}
          type="error"
          confirmText="OK"
          onConfirm={() => setErrorAlert({ show: false, message: '' })}
          showCancel={false}
        />
      </div>
    </>
  );
}