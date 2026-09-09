// src/components/accounts/AccountsMain.jsx
import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Portal from '../common/Portal';
import Alert from '../common/Alert';
import LoadingOverlay from '../common/LoadingOverlay';
import { useAuth } from '../../context/AuthContext';
import {
  createAccount,
  updateAccount,
  deleteAccount,
  subscribeToAccounts,
} from '../../firebase/accountsService';
import {
  getTrades,
  deleteTradesByAccountId,
} from '../../firebase/tradesService';

const CURRENCIES = ['USD', 'EUR', 'INR', 'GBP'];
const ACCOUNT_TYPES = ['Backtest', 'Live', 'Demo'];

export default function AccountsMain() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    balance: '',
    currency: 'USD',
    type: 'Backtest',
  });
  const [riskType, setRiskType] = useState('fixed');
  const [riskValue, setRiskValue] = useState('');
  const [riskUnit, setRiskUnit] = useState('percent');

  const [slType, setSlType] = useState('fixed');
  const [slValue, setSlValue] = useState('');
  const [slUnit, setSlUnit] = useState('ticks');

  const [deleteAlert, setDeleteAlert] = useState({ show: false, accountId: null, accountName: '', tradesCount: 0 });
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [successAlert, setSuccessAlert] = useState({ show: false, message: '' });
  const [errorAlert, setErrorAlert] = useState({ show: false, message: '' });

  const [pnlMap, setPnlMap] = useState({});

  // Real‑time subscription to user's accounts
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = subscribeToAccounts(user.uid, (fetchedAccounts) => {
      setAccounts(fetchedAccounts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!accounts.length) return;
    let isMounted = true;

    const fetchPnlForAccounts = async () => {
      const map = {};
      await Promise.all(
        accounts.map(async (acc) => {
          try {
            const trades = await getTrades(acc.id);
            const totalPnl = trades.reduce((sum, t) => {
              const pnl = parseFloat(t.pnl);
              return sum + (isNaN(pnl) ? 0 : pnl);
            }, 0);
            map[acc.id] = { pnl: totalPnl, count: trades.length };
          } catch (err) {
            console.error(`Error fetching trades for account ${acc.id}:`, err);
            map[acc.id] = { pnl: 0, count: 0 };
          }
        })
      );
      if (isMounted) setPnlMap(map);
    };

    fetchPnlForAccounts();
    return () => { isMounted = false; };
  }, [accounts]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', balance: '', currency: 'USD', type: 'Backtest' });
    setRiskType('fixed');
    setRiskValue('');
    setRiskUnit('percent');
    setSlType('fixed');
    setSlValue('');
    setSlUnit('ticks');
    setModalOpen(true);
  };

  const openEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      balance: account.balance,
      currency: account.currency,
      type: account.type || 'Backtest',
    });
    setRiskType(account.riskType || 'fixed');
    setRiskValue(account.riskValue !== undefined ? account.riskValue : '');
    setRiskUnit(account.riskUnit || 'percent');
    setSlType(account.slType || 'fixed');
    setSlValue(account.slValue !== undefined ? account.slValue : '');
    setSlUnit(account.slUnit || 'ticks');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, balance, currency, type } = formData;
    if (!name.trim() || !balance) return;

    const accountData = {
      name: name.trim(),
      balance: parseFloat(balance),
      currency,
      type,
      riskType,
      riskValue: riskType === 'fixed' ? parseFloat(riskValue) || 0 : null,
      riskUnit: riskType === 'fixed' ? riskUnit : null,
      slType: type === 'Backtest' ? slType : null,
      slValue: type === 'Backtest' && slType === 'fixed' ? parseFloat(slValue) || 0 : null,
      slUnit: type === 'Backtest' && slType === 'fixed' ? slUnit : null,
    };

    try {
      if (editingId) {
        await updateAccount(editingId, accountData);
      } else {
        await createAccount(user.uid, accountData);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account. Please try again.');
    }
  };

  const handleDelete = async (account) => {
    try {
      const trades = await getTrades(account.id);
      const tradesCount = trades.length;
      setDeleteAlert({
        show: true,
        accountId: account.id,
        accountName: account.name,
        tradesCount,
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
      setDeleteAlert({ show: false, accountId: null, accountName: '', tradesCount: 0 });
      setSuccessAlert({ show: true, message: `Account "${accountName}" and ${tradesCount} trade(s) deleted successfully.` });
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

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPnL = (account) => {
    const data = pnlMap[account.id];
    if (!data || data.count === 0) return '—';
    const { pnl } = data;
    const formatted = formatCurrency(pnl, account.currency);
    const color = pnl > 0 ? 'var(--win, #20c997)' : pnl < 0 ? 'var(--loss, #ff4d4d)' : 'var(--text-dim, #8f9bba)';
    return (
      <span style={{ color, fontWeight: '600' }}>{formatted}</span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim, #8f9bba)', fontFamily: 'var(--mono)' }}>
        Loading accounts...
      </div>
    );
  }

  const getCurrencySymbol = (currency) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  const formatRiskValue = (account) => {
    if (account.riskType === 'variable' || !account.riskType) return '—';
    const value = account.riskValue !== undefined && account.riskValue !== null ? account.riskValue : 0;
    const unit = account.riskUnit === 'percent' ? '%' : getCurrencySymbol(account.currency);
    return `${value}${unit}`;
  };

  const formatSlValue = (account) => {
    if (account.slType === 'variable' || !account.slType) return '—';
    const value = account.slValue !== undefined && account.slValue !== null ? account.slValue : 0;
    const unit = account.slUnit === 'ticks' ? ' ticks' : ' pts';
    return `${value}${unit}`;
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--disp)', fontSize: '22px', fontWeight: '600', margin: 0, color: 'var(--text, #f0f2f5)' }}>
            Trading Accounts
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-dim, #8f9bba)' }}>
            Manage portfolios, balances, and risk preferences
          </p>
        </div>
        <span style={{ 
          fontFamily: 'var(--mono)', 
          fontSize: '12px', 
          color: 'var(--text-dim)',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-soft, rgba(255,255,255,0.08))',
          padding: '4px 12px',
          borderRadius: '20px',
        }}>
          {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
        </span>
      </div>

      {/* Main Table Container */}
      <div 
        className="panel" 
        style={{ 
          marginBottom: '24px',
          background: 'var(--panel-bg, #12161f)',
          border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ 
                borderBottom: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                background: 'rgba(0, 0, 0, 0.15)',
              }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Currency</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risk Type</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risk Value</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SL Type</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SL Value</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>P&L</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Trades</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: '13px' }}>
                    No accounts found. Click the floating action button (+) to create one.
                  </td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr 
                    key={acc.id}
                    style={{ 
                      borderBottom: '1px solid var(--border-soft, rgba(255, 255, 255, 0.04))',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: '500', color: 'var(--text)' }}>{acc.name}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                      {formatCurrency(acc.balance, acc.currency)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>{acc.currency}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          display: 'inline-block',
                          background: acc.type === 'Live' 
                            ? 'rgba(32, 201, 151, 0.12)' 
                            : acc.type === 'Demo' 
                            ? 'rgba(255, 176, 32, 0.12)' 
                            : 'rgba(255, 255, 255, 0.06)',
                          color: acc.type === 'Live' 
                            ? 'var(--win, #20c997)' 
                            : acc.type === 'Demo' 
                            ? 'var(--amber, #ffb020)' 
                            : 'var(--text-dim, #8f9bba)',
                          border: `1px solid ${
                            acc.type === 'Live' 
                              ? 'rgba(32, 201, 151, 0.25)' 
                              : acc.type === 'Demo' 
                              ? 'rgba(255, 176, 32, 0.25)' 
                              : 'rgba(255, 255, 255, 0.1)'
                          }`,
                        }}
                      >
                        {acc.type || 'Backtest'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: 'var(--text-dim)' }}>{acc.riskType || '—'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{formatRiskValue(acc)}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: 'var(--text-dim)' }}>{acc.slType || '—'}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{formatSlValue(acc)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--mono)' }}>{getPnL(acc)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--text-dim)' }}>
                      {pnlMap[acc.id]?.count || 0}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => openEdit(acc)}
                          title="Edit Account"
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--amber, #ffb020)';
                            e.currentTarget.style.borderColor = 'rgba(255, 176, 32, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-dim)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(acc)}
                          title="Delete Account"
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--loss, #ff4d4d)';
                            e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-dim)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAB Floating Action Button */}
      <button
        onClick={openCreate}
        className="fab"
        title="Create New Account"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--amber, #ffb020)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(255,176,32,0.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          color: '#0A0D13',
          transition: 'transform 0.2s, box-shadow 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 26px rgba(255,176,32,0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,176,32,0.45)';
        }}
      >
        <FaPlus />
      </button>

      {/* Account Modal */}
      {modalOpen && (
        <Portal>
          <div 
            className="modal-overlay" 
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(5, 7, 10, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
            }}
          >
            <div 
              className="modal-content"
              style={{
                width: '100%',
                maxWidth: '520px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'var(--panel-bg, #12161f)',
                border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                borderRadius: '14px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                padding: '24px',
                color: 'var(--text, #f0f2f5)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.08))' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--disp)', fontSize: '20px', fontWeight: '600', margin: 0, color: 'var(--text)' }}>
                    {editingId ? 'Edit Account' : 'Create Account'}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                    {editingId ? 'Modify trading account parameters' : 'Set up a new trading account and risk strategy'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'none'; }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Account Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: 'var(--text-dim)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                    Account Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'var(--bg-alt, #0d1017)',
                      border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                      borderRadius: '8px',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontFamily: 'var(--mono)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    placeholder="e.g., Main Backtest Account"
                  />
                </div>

                {/* Grid for Balance, Currency & Account Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: 'var(--text-dim)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                      Balance
                    </label>
                    <input
                      type="number"
                      name="balance"
                      value={formData.balance}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'var(--bg-alt, #0d1017)',
                        border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '14px',
                        fontFamily: 'var(--mono)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: 'var(--text-dim)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-alt, #0d1017)',
                        border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '14px',
                        fontFamily: 'var(--mono)',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      {CURRENCIES.map(curr => (
                        <option key={curr} value={curr}>{curr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: 'var(--text-dim)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                      Account Type
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-alt, #0d1017)',
                        border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '14px',
                        fontFamily: 'var(--mono)',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      {ACCOUNT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section: Risk Settings Card */}
                <div style={{
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-soft, rgba(255,255,255,0.06))',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--amber, #ffb020)' }}>
                    Risk Configuration
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: riskType === 'fixed' ? '1fr 1fr' : '1fr', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                        Risk Type
                      </label>
                      <select
                        value={riskType}
                        onChange={(e) => setRiskType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'var(--bg-alt, #0d1017)',
                          border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                          borderRadius: '6px',
                          color: 'var(--text)',
                          fontSize: '13px',
                          fontFamily: 'var(--mono)',
                          cursor: 'pointer',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="fixed">Fixed Risk</option>
                        <option value="variable">Variable Risk</option>
                      </select>
                    </div>

                    {riskType === 'fixed' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                          Risk Value & Unit
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              type="number"
                              value={riskValue}
                              onChange={(e) => setRiskValue(e.target.value)}
                              required
                              min="0"
                              step="0.01"
                              style={{
                                width: '100%',
                                padding: '8px 28px 8px 10px',
                                background: 'var(--bg-alt, #0d1017)',
                                border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                                borderRadius: '6px',
                                color: 'var(--text)',
                                fontSize: '13px',
                                fontFamily: 'var(--mono)',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                              placeholder="0.00"
                            />
                            <span
                              style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-dim)',
                                fontSize: '12px',
                                fontFamily: 'var(--mono)',
                                pointerEvents: 'none',
                              }}
                            >
                              {riskUnit === 'percent' ? '%' : getCurrencySymbol(formData.currency)}
                            </span>
                          </div>
                          <select
                            value={riskUnit}
                            onChange={(e) => setRiskUnit(e.target.value)}
                            style={{
                              padding: '8px 8px',
                              background: 'var(--bg-alt, #0d1017)',
                              border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                              borderRadius: '6px',
                              color: 'var(--text)',
                              fontSize: '12px',
                              fontFamily: 'var(--mono)',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="percent">%</option>
                            <option value="amount">{formData.currency}</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {riskType === 'variable' && (
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', lineHeight: '1.4' }}>
                      ℹ Variable Risk will consider Risk Amount individually from recorded Trades.
                    </p>
                  )}
                </div>

                {/* Section: Stop Loss Settings Card (Only for Backtest) */}
                {formData.type === 'Backtest' && (
                  <div style={{
                    padding: '14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-soft, rgba(255,255,255,0.06))',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--amber, #ffb020)' }}>
                      Stop Loss Configuration
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: slType === 'fixed' ? '1fr 1fr' : '1fr', gap: '12px', alignItems: 'center' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                          SL Type
                        </label>
                        <select
                          value={slType}
                          onChange={(e) => setSlType(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'var(--bg-alt, #0d1017)',
                            border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                            borderRadius: '6px',
                            color: 'var(--text)',
                            fontSize: '13px',
                            fontFamily: 'var(--mono)',
                            cursor: 'pointer',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        >
                          <option value="fixed">Fixed SL</option>
                          <option value="variable">Variable SL</option>
                        </select>
                      </div>

                      {slType === 'fixed' && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                            SL Value & Unit
                          </label>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="number"
                              value={slValue}
                              onChange={(e) => setSlValue(e.target.value)}
                              required
                              min="0"
                              step="0.01"
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                background: 'var(--bg-alt, #0d1017)',
                                border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                                borderRadius: '6px',
                                color: 'var(--text)',
                                fontSize: '13px',
                                fontFamily: 'var(--mono)',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                              placeholder="0.00"
                            />
                            <select
                              value={slUnit}
                              onChange={(e) => setSlUnit(e.target.value)}
                              style={{
                                padding: '8px 8px',
                                background: 'var(--bg-alt, #0d1017)',
                                border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                                borderRadius: '6px',
                                color: 'var(--text)',
                                fontSize: '12px',
                                fontFamily: 'var(--mono)',
                                cursor: 'pointer',
                                outline: 'none',
                              }}
                            >
                              <option value="ticks">Ticks</option>
                              <option value="points">Points</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {slType === 'variable' && (
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', lineHeight: '1.4' }}>
                        ℹ Variable SL will be determined individually per trade.
                      </p>
                    )}
                  </div>
                )}

                {/* Footer Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-soft, rgba(255,255,255,0.08))' }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      padding: '8px 18px',
                      background: 'transparent',
                      border: '1px solid var(--border-soft, rgba(255,255,255,0.15))',
                      borderRadius: '8px',
                      color: 'var(--text-dim)',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-soft, rgba(255,255,255,0.15))'; }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 22px',
                      background: 'var(--amber, #ffb020)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#0A0D13',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(255,176,32,0.3)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,176,32,0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(255,176,32,0.3)'; }}
                  >
                    {editingId ? 'Update Account' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      <Alert
        isOpen={deleteAlert.show}
        title="Delete Account"
        message={`Deleting account "${deleteAlert.accountName}" will also delete ${deleteAlert.tradesCount} associated trade(s). This cannot be undone.`}
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
  );
}