import { useState, useEffect } from 'react';
import { FaTimes, FaCheck } from 'react-icons/fa';

import Portal from '@/shared/components/Portal';
import { useAuth } from '@/app/providers/AuthProvider';
import { createAccount, updateAccount } from '@/shared/api/accounts';
import { queryClient } from '@/shared/api/queryClient';

import './AccountFormModal.css';

const CURRENCIES = ['USD', 'EUR', 'INR', 'GBP'];

const TYPE_OPTIONS = [
  { value: 'Live', title: 'Live', desc: 'Real-money account' },
  { value: 'Demo', title: 'Demo', desc: 'Simulated / paper' },
  { value: 'Backtest', title: 'Backtest', desc: 'Historical testing' },
];

const EMPTY_FORM = { name: '', balance: '', currency: 'USD', type: 'Backtest' };

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

    const accountData = { name: trimmed, balance: parsedBalance, currency, type };

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
        className="afm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      >
        <div className="afm-modal" role="dialog" aria-modal="true" aria-label={editingId ? 'Edit trading account' : 'Create trading account'}>
          <div className="afm-head">
            <div>
              <h2 className="afm-title">{editingId ? 'Edit Trading Account' : 'Create Trading Account'}</h2>
              <p className="afm-sub">
                {editingId ? 'Update account details' : 'Set up a capital container for your trades'}
              </p>
            </div>
            <button type="button" className="afm-close" onClick={onClose} disabled={submitting} aria-label="Close">
              <FaTimes />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="afm-form">
            <div className="afm-body">
              {error && <div className="afm-error" role="alert">{error}</div>}

              <div>
                <label className="afm-label" htmlFor="afm-name">Account Name</label>
                <input
                  id="afm-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  autoFocus
                  className="afm-input"
                  placeholder="e.g., Main Prop Account"
                  disabled={submitting}
                />
              </div>

              <div>
                <span className="afm-label">Type</span>
                <div className="afm-types" role="radiogroup" aria-label="Account type">
                  {TYPE_OPTIONS.map((t) => {
                    const on = formData.type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={submitting}
                        className={`afm-type is-${t.value.toLowerCase()} ${on ? 'on' : ''}`}
                        onClick={() => setFormData((p) => ({ ...p, type: t.value }))}
                      >
                        <span className="afm-type-check">{on && <FaCheck size={8} />}</span>
                        <span className="afm-type-title">{t.title}</span>
                        <span className="afm-type-desc">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="afm-grid-2">
                <div>
                  <label className="afm-label" htmlFor="afm-balance">Starting Balance</label>
                  <input
                    id="afm-balance"
                    type="number"
                    name="balance"
                    value={formData.balance}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="afm-input"
                    placeholder="0.00"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="afm-label" htmlFor="afm-currency">Currency</label>
                  <select
                    id="afm-currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="afm-input afm-select"
                    disabled={submitting}
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="afm-foot">
              <button type="button" className="afm-btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="afm-btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}