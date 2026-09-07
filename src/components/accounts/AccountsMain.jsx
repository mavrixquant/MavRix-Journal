// src/components/accounts/AccountsMain.jsx
import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Portal from '../common/Portal';

const CURRENCIES = ['USD', 'EUR', 'INR', 'GBP'];

export default function AccountsMain() {
  const [accounts, setAccounts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', balance: '', currency: 'USD' });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accounts');
    if (saved) setAccounts(JSON.parse(saved));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('accounts', JSON.stringify(accounts));
  }, [accounts]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', balance: '', currency: 'USD' });
    setModalOpen(true);
  };

  const openEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      balance: account.balance,
      currency: account.currency,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, balance, currency } = formData;
    if (!name.trim() || !balance) return;

    const account = {
      id: editingId || Date.now().toString(),
      name: name.trim(),
      balance: parseFloat(balance),
      currency,
      createdAt: editingId ? undefined : new Date().toISOString(),
    };

    if (editingId) {
      setAccounts(prev => prev.map(acc => acc.id === editingId ? account : acc));
    } else {
      setAccounts(prev => [...prev, account]);
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this account?')) {
      setAccounts(prev => prev.filter(acc => acc.id !== id));
    }
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <h2 style={{ fontFamily: 'var(--disp)', marginBottom: '16px' }}>Accounts</h2>

      {/* Table */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Balance</th>
                <th>Currency</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">No accounts. Click the + button to create one.</td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id}>
                    <td>{acc.name}</td>
                    <td>{formatCurrency(acc.balance, acc.currency)}</td>
                    <td>{acc.currency}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => openEdit(acc)}
                        className="icon-btn edit"
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
                        onClick={() => handleDelete(acc.id)}
                        className="icon-btn delete"
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
                <div style={{ marginBottom: '20px' }}>
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
    </div>
  );
}