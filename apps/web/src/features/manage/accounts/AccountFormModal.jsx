import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

import Portal from '@/shared/components/Portal';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  createAccount,
  updateAccount,
} from '@/shared/api/accounts';
import { queryClient } from '@/shared/api/queryClient';

import './AccountFormModal.css';

const CURRENCIES = ['USD', 'EUR', 'INR', 'GBP'];
const ACCOUNT_TYPES = ['Backtest', 'Live', 'Demo'];

const EMPTY_FORM = {
  name: '',
  balance: '',
  currency: 'USD',
  type: 'Backtest',
};

export default function AccountFormModal({ isOpen, account, onClose }) {
  const { user } = useAuth();
  const editingId = account?.id ?? null;

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (account) {
      setFormData({
        name: account.name ?? '',
        balance: account.balance ?? '',
        currency: account.currency ?? 'USD',
        type: account.type || 'Backtest',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setError('');
    setSubmitting(false);
  }, [isOpen, account]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    const { name, balance, currency, type } = formData;
    const trimmed = name.trim();
    const parsedBalance = parseFloat(balance);

    if (!trimmed) {
      setError('Account name is required.');
      return;
    }
    if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
      setError('Balance must be a non-negative number.');
      return;
    }

    const accountData = {
      name: trimmed,
      balance: parsedBalance,
      currency,
      type,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await updateAccount(editingId, accountData);
      } else {
        await createAccount(user.uid, accountData);
      }
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
    } catch (err) {
      console.error('Error saving account:', err);
      setError(err?.message || 'Failed to save account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <div
        className="acc-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      >
        <div className="acc-modal">
          <div className="acc-modal-head">
            <div>
              <h2 className="acc-modal-title">
                {editingId ? 'Edit Trading Account' : 'Create Trading Account'}
              </h2>
              <p className="acc-modal-sub">
                {editingId
                  ? 'Update account details'
                  : 'Set up a capital container for your trades'}
              </p>
            </div>
            <button
              type="button"
              className="acc-modal-close"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
          >
            <div className="acc-modal-body">
              {error && <div className="acc-error">{error}</div>}

              <div>
                <label className="acc-label">Account Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="acc-input"
                  placeholder="e.g., Main Prop Account"
                  disabled={submitting}
                />
              </div>

              <div className="acc-grid-3">
                <div>
                  <label className="acc-label">Balance</label>
                  <input
                    type="number"
                    name="balance"
                    value={formData.balance}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="acc-input"
                    placeholder="0.00"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="acc-label">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="acc-input"
                    disabled={submitting}
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="acc-label">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="acc-input"
                    disabled={submitting}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="acc-modal-foot">
              <button
                type="button"
                className="acc-btn"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="acc-btn-primary"
                disabled={submitting}
              >
                {submitting
                  ? 'Saving…'
                  : editingId
                    ? 'Save Changes'
                    : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}