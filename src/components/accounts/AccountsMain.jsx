// src/components/accounts/AccountsMain.jsx
import { useState, useEffect } from 'react';
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
  FaFilter
} from 'react-icons/fa';
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
  
  // Filter state defaulting to 'Live'
  const [selectedType, setSelectedType] = useState('Live');

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

  // Real-time subscription to user's accounts
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
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

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
    if (account.riskType === 'variable' || !account.riskType) return 'Variable';
    const value = account.riskValue !== undefined && account.riskValue !== null ? account.riskValue : 0;
    const unit = account.riskUnit === 'percent' ? '%' : getCurrencySymbol(account.currency);
    return `${value}${unit}`;
  };

  const formatSlValue = (account) => {
    if (account.slType === 'variable' || !account.slType) return 'Variable';
    const value = account.slValue !== undefined && account.slValue !== null ? account.slValue : 0;
    const unit = account.slUnit === 'ticks' ? ' ticks' : ' pts';
    return `${value}${unit}`;
  };

  // Filter accounts according to selectedType ('All' option included optional)
  const filteredAccounts = accounts.filter(acc => {
    if (selectedType === 'All') return true;
    return (acc.type || 'Backtest') === selectedType;
  });

  // Calculations for KPI Header Cards based on filtered results
  const totalBalance = filteredAccounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
  const totalPnlAll = filteredAccounts.reduce((sum, acc) => sum + (pnlMap[acc.id]?.pnl || 0), 0);
  const totalTradesAll = filteredAccounts.reduce((sum, acc) => sum + (pnlMap[acc.id]?.count || 0), 0);

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-dim, #8f9bba)', fontFamily: 'var(--mono)' }}>
        Loading account metrics...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--disp)', fontSize: '24px', fontWeight: '700', margin: 0, color: 'var(--text, #f0f2f5)', letterSpacing: '-0.5px' }}>
            Portfolio Accounts
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-dim, #8f9bba)' }}>
            Monitor account capital, risk parameters, and aggregate net return
          </p>
        </div>

        {/* Filter Controls & Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--panel-bg, #12161f)', border: '1px solid var(--border-soft, rgba(255,255,255,0.08))', padding: '4px', borderRadius: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FaFilter size={10} /> Type:
            </span>
            {ACCOUNT_TYPES.map((type) => {
              const active = selectedType === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  style={{
                    background: active ? 'rgba(255, 176, 32, 0.15)' : 'transparent',
                    color: active ? 'var(--amber, #ffb020)' : 'var(--text-dim)',
                    border: active ? '1px solid rgba(255, 176, 32, 0.3)' : 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: active ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>

          <button
            onClick={openCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--amber, #ffb020)',
              color: '#0A0D13',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 176, 32, 0.25)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(255, 176, 32, 0.35)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(255, 176, 32, 0.25)'; }}
          >
            <FaPlus size={12} /> New Account
          </button>
        </div>
      </div>

      {/* KPI Summary Cards Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: 'var(--panel-bg, #12161f)', border: '1px solid var(--border-soft, rgba(255,255,255,0.08))', padding: '18px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255, 176, 32, 0.1)', color: 'var(--amber, #ffb020)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <FaWallet />
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', fontWeight: '600' }}>Combined Capital</span>
            <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'var(--mono)', color: 'var(--text)', marginTop: '2px' }}>
              {formatCurrency(totalBalance, 'USD')}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--panel-bg, #12161f)', border: '1px solid var(--border-soft, rgba(255,255,255,0.08))', padding: '18px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: totalPnlAll >= 0 ? 'rgba(32, 201, 151, 0.1)' : 'rgba(255, 77, 77, 0.1)', color: totalPnlAll >= 0 ? 'var(--win, #20c997)' : 'var(--loss, #ff4d4d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <FaChartLine />
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', fontWeight: '600' }}>Cumulative P&L</span>
            <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'var(--mono)', color: totalPnlAll > 0 ? 'var(--win, #20c997)' : totalPnlAll < 0 ? 'var(--loss, #ff4d4d)' : 'var(--text)', marginTop: '2px' }}>
              {formatCurrency(totalPnlAll, 'USD')}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--panel-bg, #12161f)', border: '1px solid var(--border-soft, rgba(255,255,255,0.08))', padding: '18px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <FaExchangeAlt />
          </div>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', fontWeight: '600' }}>Total Executed Trades</span>
            <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'var(--mono)', color: 'var(--text)', marginTop: '2px' }}>
              {totalTradesAll}
            </div>
          </div>
        </div>
      </div>

      {/* Account Cards Grid */}
      {filteredAccounts.length === 0 ? (
        <div style={{ background: 'var(--panel-bg, #12161f)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>
            <FaFolderOpen />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--text)' }}>
            No {selectedType} Accounts Found
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' }}>
            No accounts matching the selected filter category ({selectedType}).
          </p>
          <button
            onClick={openCreate}
            style={{
              marginTop: '20px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.12))',
              color: 'var(--text)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            + Create Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredAccounts.map((acc) => {
            const accPnl = pnlMap[acc.id]?.pnl || 0;
            const tradesCount = pnlMap[acc.id]?.count || 0;
            const isLive = acc.type === 'Live';
            const isDemo = acc.type === 'Demo';

            return (
              <div
                key={acc.id}
                style={{
                  background: 'var(--panel-bg, #12161f)',
                  border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-soft, rgba(255, 255, 255, 0.08))';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  {/* Top Header Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                        {acc.name}
                      </h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                        Base: {acc.currency}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        background: isLive 
                          ? 'rgba(32, 201, 151, 0.12)' 
                          : isDemo 
                          ? 'rgba(255, 176, 32, 0.12)' 
                          : 'rgba(255, 255, 255, 0.06)',
                        color: isLive 
                          ? 'var(--win, #20c997)' 
                          : isDemo 
                          ? 'var(--amber, #ffb020)' 
                          : 'var(--text-dim, #8f9bba)',
                        border: `1px solid ${
                          isLive 
                            ? 'rgba(32, 201, 151, 0.25)' 
                            : isDemo 
                            ? 'rgba(255, 176, 32, 0.25)' 
                            : 'rgba(255, 255, 255, 0.1)'
                        }`,
                      }}
                    >
                      {acc.type || 'Backtest'}
                    </span>
                  </div>

                  {/* Main Metric Highlight */}
                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '600', letterSpacing: '0.5px' }}>Starting Capital</span>
                      <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                        {formatCurrency(acc.balance, acc.currency)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: '600', letterSpacing: '0.5px' }}>Total P&L</span>
                      <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'var(--mono)', color: accPnl > 0 ? 'var(--win, #20c997)' : accPnl < 0 ? 'var(--loss, #ff4d4d)' : 'var(--text-dim)' }}>
                        {tradesCount === 0 ? '—' : formatCurrency(accPnl, acc.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Settings Breakdown Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)' }}>
                      <FaShieldAlt style={{ color: 'var(--amber, #ffb020)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Risk Model</div>
                        <div style={{ color: 'var(--text)', fontWeight: '500', textTransform: 'capitalize' }}>
                          {acc.riskType || '—'} ({formatRiskValue(acc)})
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)' }}>
                      <FaSlidersH style={{ color: 'var(--amber, #ffb020)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Stop Loss</div>
                        <div style={{ color: 'var(--text)', fontWeight: '500', textTransform: 'capitalize' }}>
                          {acc.slType || '—'} {acc.type === 'Backtest' && `(${formatSlValue(acc)})`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-soft, rgba(255, 255, 255, 0.06))' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                    {tradesCount} {tradesCount === 1 ? 'trade' : 'trades'}
                  </span>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openEdit(acc)}
                      title="Edit Account"
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        padding: '6px 10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
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
                      <FaEdit /> Edit
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
                        padding: '6px 10px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
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
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              backdropFilter: 'blur(6px)',
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
                maxWidth: '500px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'var(--panel-bg, #12161f)',
                border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                padding: '24px',
                color: 'var(--text, #f0f2f5)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-soft, rgba(255,255,255,0.08))' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--disp)', fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--text)' }}>
                    {editingId ? 'Edit Trading Account' : 'Create Trading Account'}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
                    {editingId ? 'Update risk rules and account parameters' : 'Set up a portfolio with default risk rules'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Account Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
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
                      fontSize: '13px',
                      fontFamily: 'var(--mono)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    placeholder="e.g., Main Prop Account"
                  />
                </div>

                {/* Grid for Balance, Currency & Account Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
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
                        fontSize: '13px',
                        fontFamily: 'var(--mono)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
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
                        fontSize: '13px',
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
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-dim)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      Type
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
                        fontSize: '13px',
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
                    Risk Strategy
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: riskType === 'fixed' ? '1fr 1fr' : '1fr', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                        Risk Model
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
                          fontSize: '12px',
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
                          Per Trade Target
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
                                padding: '8px 26px 8px 10px',
                                background: 'var(--bg-alt, #0d1017)',
                                border: '1px solid var(--border-soft, rgba(255,255,255,0.1))',
                                borderRadius: '6px',
                                color: 'var(--text)',
                                fontSize: '12px',
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
                                fontSize: '11px',
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
                              padding: '8px',
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
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', lineHeight: '1.4' }}>
                      ℹ Variable Risk allows individual position sizes per logged trade.
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
                      Stop Loss Defaults
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: slType === 'fixed' ? '1fr 1fr' : '1fr', gap: '12px', alignItems: 'center' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                          SL Mode
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
                            fontSize: '12px',
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
                            SL Distance
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
                                fontSize: '12px',
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
                                padding: '8px',
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
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--mono)', lineHeight: '1.4' }}>
                        ℹ Variable SL defaults will be calculated dynamically on execution.
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
                      padding: '8px 16px',
                      background: 'transparent',
                      border: '1px solid var(--border-soft, rgba(255,255,255,0.15))',
                      borderRadius: '8px',
                      color: 'var(--text-dim)',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 20px',
                      background: 'var(--amber, #ffb020)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#0A0D13',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(255,176,32,0.3)',
                    }}
                  >
                    {editingId ? 'Save Changes' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Alert Overlays */}
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
  );
}