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
  const [deleteAlert, setDeleteAlert] = useState({ show: false, accountId: null, accountName: '', tradesCount: 0 });
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [successAlert, setSuccessAlert] = useState({ show: false, message: '' });
  const [errorAlert, setErrorAlert] = useState({ show: false, message: '' });

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

  // Open create modal
  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', balance: '', currency: 'USD', type: 'Backtest' });
    setModalOpen(true);
  };

  // Open edit modal with existing data
  const openEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      balance: account.balance,
      currency: account.currency,
      type: account.type || 'Backtest',
    });
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
  // Fetch trades count for this account
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
      // Delete all trades first, then the account
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

  // PLACEHOLDER: Compute P&L later
  const getPnL = (account) => {
    // TODO: Calculate P&L based on journal entries or other logic
    return '—';
    // Or return '0.00' if you prefer
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
        Loading accounts...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header with count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'var(--disp)' }}>Accounts</h2>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-faint)' }}>
          {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Balance</th>
                <th>Currency</th>
                <th>Type</th>
                <th>P&L</th>              {/* NEW COLUMN */}
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">No accounts. Click the + button to create one.</td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id}>
                    <td>{acc.name}</td>
                    <td>{formatCurrency(acc.balance, acc.currency)}</td>
                    <td>{acc.currency}</td>
                    <td>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: acc.type === 'Live' 
                            ? 'var(--win-dim)' 
                            : acc.type === 'Demo' 
                            ? 'var(--amber-dim)' 
                            : 'var(--panel-2)',
                          color: acc.type === 'Live' 
                            ? 'var(--win)' 
                            : acc.type === 'Demo' 
                            ? 'var(--amber)' 
                            : 'var(--text-dim)',
                        }}
                      >
                        {acc.type || 'Backtest'}
                      </span>
                    </td>
                    <td>{getPnL(acc)}</td>   {/* NEW COLUMN VALUE */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => openEdit(acc)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          marginRight: '12px',
                          fontSize: '16px',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--amber)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(acc)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          fontSize: '16px',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--loss)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={openCreate}
        className="fab"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--amber)',
          border: 'none',
          boxShadow: '0 4px 16px rgba(255,176,32,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          color: '#0A0D13',
          transition: 'transform 0.2s, box-shadow 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(255,176,32,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,176,32,0.4)';
        }}
      >
        <FaPlus />
      </button>

      {/* Modal */}
      {modalOpen && (
        <Portal>
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
            <div className="modal-content">
              <h2 style={{ fontFamily: 'var(--disp)', marginBottom: '16px' }}>
                {editingId ? 'Edit Account' : 'Create Account'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>
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
                      padding: '8px 12px',
                      background: 'var(--bg-alt)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontFamily: 'var(--mono)',
                    }}
                    placeholder="e.g., Trading Account"
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>
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
                      padding: '8px 12px',
                      background: 'var(--bg-alt)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontFamily: 'var(--mono)',
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-alt)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontFamily: 'var(--mono)',
                      cursor: 'pointer',
                    }}
                  >
                    {CURRENCIES.map(curr => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-dim)' }}>
                    Account Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-alt)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      fontSize: '14px',
                      fontFamily: 'var(--mono)',
                      cursor: 'pointer',
                    }}
                  >
                    {ACCOUNT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-upload"
                    style={{ borderStyle: 'solid', padding: '6px 16px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-upload"
                    style={{
                      borderStyle: 'solid',
                      borderColor: 'var(--amber)',
                      color: 'var(--amber)',
                      padding: '6px 16px',
                    }}
                  >
                    {editingId ? 'Update' : 'Create'}
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