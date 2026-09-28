// apps/web/src/features/accounts/components/AccountsMain.jsx
import { useState } from 'react';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaWallet,
  FaChartLine,
  FaShieldAlt,
  FaSlidersH,
  FaExchangeAlt,
  FaFolderOpen,
  FaFilter,
  FaCoins,
} from 'react-icons/fa';
import { useQueries } from '@tanstack/react-query';

import Alert from '@/shared/components/Alert';
import LoadingOverlay from '@/shared/components/LoadingOverlay';

import {
  useAccounts,
  deleteAccount,
} from '@/services/accounts.service';
import {
  getTrades,
  deleteTradesByAccountId,
  tradesKeys,
} from '@/services/trades.service';
import { queryClient } from '@/shared/api/queryClient';

import AccountFormModal from './AccountFormModal';
import './AccountsMain.css';

const ACCOUNT_TYPES = ['Backtest', 'Live', 'Demo'];

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function getCurrencySymbol(currency) {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'INR': return '₹';
    case 'GBP': return '£';
    default:    return '$';
  }
}

function formatRiskValue(account) {
  if (account.riskType === 'variable' || !account.riskType) return 'Variable';
  const value =
    account.riskValue !== undefined && account.riskValue !== null
      ? account.riskValue
      : 0;
  const unit = account.riskUnit === 'percent' ? '%' : getCurrencySymbol(account.currency);
  return `${value}${unit}`;
}

function formatSlUnit(account) {
  if (account.slUnit === 'ticks') return 'Ticks';
  if (account.slUnit === 'points') return 'Points';
  return '—';
}

function formatSlDefault(account) {
  if (account.slValue === undefined || account.slValue === null) return null;
  const unit = account.slUnit === 'ticks' ? ' ticks' : ' pts';
  return `${account.slValue}${unit}`;
}

function formatCommission(account) {
  const mode = account.commissionMode || 'none';
  if (mode === 'none') return 'None';
  const val = account.commissionValue;
  if (val === undefined || val === null) return 'None';
  const sym = getCurrencySymbol(account.currency);
  if (mode === 'flat') return `${sym}${val} flat`;
  if (mode === 'per_contract') return `${sym}${val}/contract`;
  return 'None';
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AccountsMain() {
  const { data: accounts = [], isLoading: loading } = useAccounts();

  // Filter state defaulting to 'Live'
  const [selectedType, setSelectedType] = useState('Live');

  // Modal state — { open, account } where account is null for create
  const [modalState, setModalState] = useState({ open: false, account: null });
  const openCreate = () => setModalState({ open: true, account: null });
  const openEdit = (account) => setModalState({ open: true, account });
  const closeModal = () => setModalState({ open: false, account: null });

  // Delete confirm + alerts
  const [deleteAlert, setDeleteAlert] = useState({ show: false, accountId: null, accountName: '', tradesCount: 0 });
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [successAlert, setSuccessAlert] = useState({ show: false, message: '' });
  const [errorAlert, setErrorAlert] = useState({ show: false, message: '' });

  // Per-account P&L roll-up for the KPI strip + cards
  const pnlMap = useQueries({
    queries: accounts.map((acc) => ({
      queryKey: tradesKeys.byAccount(acc.id),
      queryFn: () => getTrades(acc.id),
      enabled: !!acc.id,
    })),
    combine: (results) => {
      const map = {};
      accounts.forEach((acc, i) => {
        const trades = results[i]?.data || [];
        const totalPnl = trades.reduce((sum, t) => {
          const v = parseFloat(t.pnl);
          return sum + (isNaN(v) ? 0 : v);
        }, 0);
        map[acc.id] = { pnl: totalPnl, count: trades.length };
      });
      return map;
    },
  });

  const handleDelete = async (account) => {
    try {
      const trades = await getTrades(account.id);
      setDeleteAlert({
        show: true,
        accountId: account.id,
        accountName: account.name,
        tradesCount: trades.length,
      });
    } catch (error) {
      console.error('Error fetching trades count:', error);
      setErrorAlert({ show: true, message: 'Failed to fetch trades count. Please try again.' });
    }
  };

  const confirmDelete = async () => {
    const { accountId, accountName, tradesCount } = deleteAlert;
    if (!accountId) return;
    setLoadingDelete(true);
    try {
      await deleteTradesByAccountId(accountId);
      await deleteAccount(accountId);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      setDeleteAlert({ show: false, accountId: null, accountName: '', tradesCount: 0 });
      setSuccessAlert({
        show: true,
        message: `Account "${accountName}" and ${tradesCount} trade(s) deleted successfully.`,
      });
    } catch (error) {
      console.error('Error deleting account and trades:', error);
      setDeleteAlert({ show: false, accountId: null, accountName: '', tradesCount: 0 });
      setErrorAlert({ show: true, message: 'Failed to delete account and trades. Please try again.' });
    } finally {
      setLoadingDelete(false);
    }
  };

  const cancelDelete = () => {
    setDeleteAlert({ show: false, accountId: null, accountName: '', tradesCount: 0 });
  };

  const filteredAccounts = accounts.filter(acc => {
    if (selectedType === 'All') return true;
    return (acc.type || 'Backtest') === selectedType;
  });

  const totalBalance = filteredAccounts.reduce(
    (sum, acc) => sum + (parseFloat(acc.balance) || 0),
    0
  );
  const totalPnlAll = filteredAccounts.reduce(
    (sum, acc) => sum + (pnlMap[acc.id]?.pnl || 0),
    0
  );
  const totalTradesAll = filteredAccounts.reduce(
    (sum, acc) => sum + (pnlMap[acc.id]?.count || 0),
    0
  );

  if (loading) {
    return (
      <div className="acc-root">
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <LoadingOverlay message="Loading account metrics..." />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="acc-root">

        {/* ---------- Header ---------- */}
        <div className="acc-card acc-header">
          <div className="acc-header-left">
            <div>
              <h2 className="acc-title">Portfolio Accounts</h2>
              <p className="acc-subtitle">
                Monitor account capital, risk parameters, and aggregate net return
              </p>
            </div>
          </div>

          <div className="acc-header-right">
            <div className="acc-type-tabs">
              <span className="acc-type-label">
                <FaFilter size={9} />
                Type
              </span>
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`acc-type-tab ${selectedType === type ? 'active' : ''}`}
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </button>
              ))}
            </div>

            <button type="button" className="acc-btn-primary" onClick={openCreate}>
              <FaPlus size={11} /> New Account
            </button>
          </div>
        </div>

        {/* ---------- KPI summary ---------- */}
        <div className="acc-kpi-grid">
          <div className="acc-kpi">
            <div className="acc-kpi-icon is-amber"><FaWallet /></div>
            <div>
              <span className="acc-kpi-label">Combined Capital</span>
              <span className="acc-kpi-value">{formatCurrency(totalBalance, 'USD')}</span>
            </div>
          </div>

          <div className="acc-kpi">
            <div className={`acc-kpi-icon ${totalPnlAll > 0 ? 'is-win' : totalPnlAll < 0 ? 'is-loss' : ''}`}>
              <FaChartLine />
            </div>
            <div>
              <span className="acc-kpi-label">Cumulative P&L</span>
              <span className={`acc-kpi-value ${
                totalPnlAll > 0 ? 'pos' : totalPnlAll < 0 ? 'neg' : 'zero'
              }`}>
                {formatCurrency(totalPnlAll, 'USD')}
              </span>
            </div>
          </div>

          <div className="acc-kpi">
            <div className="acc-kpi-icon"><FaExchangeAlt /></div>
            <div>
              <span className="acc-kpi-label">Total Executed Trades</span>
              <span className="acc-kpi-value">{totalTradesAll}</span>
            </div>
          </div>
        </div>

        {/* ---------- Accounts grid ---------- */}
        {filteredAccounts.length === 0 ? (
          <div className="acc-empty">
            <div className="acc-empty-icon"><FaFolderOpen /></div>
            <h3>No {selectedType} Accounts Found</h3>
            <p>
              No accounts matching the selected filter category ({selectedType}).
            </p>
            <button type="button" className="acc-btn acc-empty-btn" onClick={openCreate}>
              <FaPlus size={10} /> Create Account
            </button>
          </div>
        ) : (
          <div className="acc-grid">
            {filteredAccounts.map((acc) => {
              const accPnl = pnlMap[acc.id]?.pnl || 0;
              const tradesCount = pnlMap[acc.id]?.count || 0;
              const badgeClass = acc.type === 'Live'
                ? 'is-live'
                : acc.type === 'Demo'
                  ? 'is-demo'
                  : 'is-backtest';
              const slDefault = formatSlDefault(acc);
              const pnlClass = tradesCount === 0
                ? 'dim'
                : accPnl > 0
                  ? 'pos'
                  : accPnl < 0
                    ? 'neg'
                    : 'dim';

              return (
                <div key={acc.id} className="acc-card acc-account">
                  {/* Head */}
                  <div className="acc-account-head">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="acc-name">{acc.name}</h3>
                      <span className="acc-base">Base: {acc.currency}</span>
                    </div>
                    <span className={`acc-badge ${badgeClass}`}>
                      {acc.type || 'Backtest'}
                    </span>
                  </div>

                  {/* Metric bar */}
                  <div className="acc-metric-bar">
                    <div className="acc-metric">
                      <span className="acc-metric-label">Starting Capital</span>
                      <span className="acc-metric-value">
                        {formatCurrency(acc.balance, acc.currency)}
                      </span>
                    </div>
                    <div className="acc-metric right">
                      <span className="acc-metric-label">Total P&L</span>
                      <span className={`acc-metric-value ${pnlClass}`}>
                        {tradesCount === 0 ? '—' : formatCurrency(accPnl, acc.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="acc-settings">
                    <div className="acc-setting">
                      <span className="acc-setting-icon"><FaShieldAlt /></span>
                      <div className="acc-setting-text">
                        <span className="acc-setting-label">Risk Model</span>
                        <span className="acc-setting-value" style={{ textTransform: 'capitalize' }}>
                          {acc.riskType || '—'} <span className="dim">({formatRiskValue(acc)})</span>
                        </span>
                      </div>
                    </div>

                    {acc.type === 'Backtest' && (
                      <div className="acc-setting">
                        <span className="acc-setting-icon"><FaSlidersH /></span>
                        <div className="acc-setting-text">
                          <span className="acc-setting-label">SL Column</span>
                          <span className="acc-setting-value">
                            {formatSlUnit(acc)}
                            {slDefault && <span className="dim"> · default {slDefault}</span>}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="acc-setting">
                      <span className="acc-setting-icon"><FaCoins /></span>
                      <div className="acc-setting-text">
                        <span className="acc-setting-label">Commission</span>
                        <span className="acc-setting-value">{formatCommission(acc)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="acc-account-footer">
                    <span className="acc-trades-count">
                      {tradesCount} {tradesCount === 1 ? 'trade' : 'trades'}
                    </span>
                    <div className="acc-account-actions">
                      <button
                        type="button"
                        className="acc-icon-btn"
                        onClick={() => openEdit(acc)}
                        title="Edit Account"
                      >
                        <FaEdit size={11} /> Edit
                      </button>
                      <button
                        type="button"
                        className="acc-icon-btn is-danger"
                        onClick={() => handleDelete(acc)}
                        title="Delete Account"
                      >
                        <FaTrash size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------- Create / Edit modal ---------- */}
        <AccountFormModal
          isOpen={modalState.open}
          account={modalState.account}
          onClose={closeModal}
        />

        {/* ---------- Alerts ---------- */}
        <Alert
          isOpen={deleteAlert.show}
          title="Delete Account"
          message={`Deleting account "${deleteAlert.accountName}" will also delete ${deleteAlert.tradesCount} associated trade(s). This action cannot be reversed.`}
          type="confirm"
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
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