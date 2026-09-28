// apps/web/src/features/accounts/components/AccountFormModal.jsx
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

function getCurrencySymbol(currency) {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'INR': return '₹';
    case 'GBP': return '£';
    default:    return '$';
  }
}

const EMPTY_FORM = {
  name: '',
  balance: '',
  currency: 'USD',
  type: 'Backtest',
};

/**
 * Create/edit modal for a trading account.
 *
 * Props:
 *   isOpen    — boolean. When true, the modal renders.
 *   account   — existing account object (edit mode) or null (create mode).
 *   onClose   — called when the modal should close (backdrop click, X,
 *               cancel button, successful save).
 */
export default function AccountFormModal({ isOpen, account, onClose }) {
  const { user } = useAuth();
  const editingId = account?.id ?? null;

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [riskType, setRiskType] = useState('fixed');
  const [riskValue, setRiskValue] = useState('');
  const [riskUnit, setRiskUnit] = useState('percent');

  const [slValue, setSlValue] = useState('');
  const [slUnit, setSlUnit] = useState('ticks');

  const [commissionMode, setCommissionMode] = useState('none');
  const [commissionValue, setCommissionValue] = useState('');

  // Hydrate form whenever the modal opens with a different target.
  useEffect(() => {
    if (!isOpen) return;

    if (account) {
      setFormData({
        name: account.name ?? '',
        balance: account.balance ?? '',
        currency: account.currency ?? 'USD',
        type: account.type || 'Backtest',
      });
      setRiskType(account.riskType || 'fixed');
      setRiskValue(
        account.riskValue !== undefined && account.riskValue !== null
          ? account.riskValue
          : ''
      );
      setRiskUnit(account.riskUnit || 'percent');
      setSlValue(
        account.slValue !== undefined && account.slValue !== null
          ? account.slValue
          : ''
      );
      setSlUnit(account.slUnit || 'ticks');
      setCommissionMode(account.commissionMode || 'none');
      setCommissionValue(
        account.commissionValue !== undefined && account.commissionValue !== null
          ? account.commissionValue
          : ''
      );
    } else {
      setFormData(EMPTY_FORM);
      setRiskType('fixed');
      setRiskValue('');
      setRiskUnit('percent');
      setSlValue('');
      setSlUnit('ticks');
      setCommissionMode('none');
      setCommissionValue('');
    }
  }, [isOpen, account]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, balance, currency, type } = formData;
    if (!name.trim() || !balance) return;

    const parsedSl = slValue === '' ? null : parseFloat(slValue);
    const hasSl = parsedSl !== null && !isNaN(parsedSl) && parsedSl > 0;

    const parsedCommission = commissionValue === '' ? null : parseFloat(commissionValue);
    const hasCommission =
      parsedCommission !== null && !isNaN(parsedCommission) && parsedCommission >= 0;

    const accountData = {
      name: name.trim(),
      balance: parseFloat(balance),
      currency,
      type,
      riskType,
      riskValue: riskType === 'fixed' ? parseFloat(riskValue) || 0 : null,
      riskUnit: riskType === 'fixed' ? riskUnit : null,
      slUnit: type === 'Backtest' ? slUnit : null,
      slValue: type === 'Backtest' && hasSl ? parsedSl : null,
      commissionMode: commissionMode,
      commissionValue:
        commissionMode !== 'none' && hasCommission ? parsedCommission : null,
    };

    try {
      if (editingId) {
        await updateAccount(editingId, accountData);
      } else {
        await createAccount(user.uid, accountData);
      }
      // Force the accounts query to refetch immediately:
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
    } catch (error) {
      console.error('Error saving account:', error);
      alert('Failed to save account. Please try again.');
    }
  };

  const currencySymbol = getCurrencySymbol(formData.currency);

  return (
    <Portal>
      <div
        className="acc-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="acc-modal">
          <div className="acc-modal-head">
            <div>
              <h2 className="acc-modal-title">
                {editingId ? 'Edit Trading Account' : 'Create Trading Account'}
              </h2>
              <p className="acc-modal-sub">
                {editingId
                  ? 'Update risk rules and account parameters'
                  : 'Set up a portfolio with default risk rules'}
              </p>
            </div>
            <button
              type="button"
              className="acc-modal-close"
              onClick={onClose}
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

              {/* Name */}
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
                />
              </div>

              {/* Balance / Currency / Type */}
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
                  />
                </div>
                <div>
                  <label className="acc-label">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="acc-input"
                  >
                    {CURRENCIES.map(curr => (
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
                  >
                    {ACCOUNT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Risk */}
              <div className="acc-field-group">
                <span className="acc-field-group-title">Risk Strategy</span>

                <div className={riskType === 'fixed' ? 'acc-grid-2' : ''}>
                  <div>
                    <label className="acc-label">Risk Model</label>
                    <select
                      value={riskType}
                      onChange={(e) => setRiskType(e.target.value)}
                      className="acc-input"
                    >
                      <option value="fixed">Fixed Risk</option>
                      <option value="variable">Variable Risk</option>
                    </select>
                  </div>

                  {riskType === 'fixed' && (
                    <div>
                      <label className="acc-label">Per Trade Target</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <div className="acc-input-wrap" style={{ flex: 1 }}>
                          <input
                            type="number"
                            value={riskValue}
                            onChange={(e) => setRiskValue(e.target.value)}
                            required
                            min="0"
                            step="0.01"
                            className="acc-input has-suffix"
                            placeholder="0.00"
                          />
                          <span className="acc-input-suffix">
                            {riskUnit === 'percent' ? '%' : currencySymbol}
                          </span>
                        </div>
                        <select
                          value={riskUnit}
                          onChange={(e) => setRiskUnit(e.target.value)}
                          className="acc-input"
                          style={{ width: 92, flexShrink: 0 }}
                        >
                          <option value="percent">%</option>
                          <option value="amount">{formData.currency}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {riskType === 'variable' && (
                  <p className="acc-hint">
                    ℹ Variable Risk allows individual position sizes per logged trade.
                  </p>
                )}
              </div>

              {/* Stop Loss (Backtest only) */}
              {formData.type === 'Backtest' && (
                <div className="acc-field-group">
                  <span className="acc-field-group-title">Stop Loss Settings</span>

                  <div className="acc-grid-2">
                    <div>
                      <label className="acc-label">
                        Default SL <span style={{ color: 'var(--ink-3)', letterSpacing: 0, textTransform: 'none' }}>(optional)</span>
                      </label>
                      <input
                        type="number"
                        value={slValue}
                        onChange={(e) => setSlValue(e.target.value)}
                        min="0"
                        step="0.01"
                        className="acc-input"
                        placeholder="e.g. 12.5"
                      />
                    </div>
                    <div>
                      <label className="acc-label">Unit</label>
                      <select
                        value={slUnit}
                        onChange={(e) => setSlUnit(e.target.value)}
                        className="acc-input"
                      >
                        <option value="points">Points</option>
                        <option value="ticks">Ticks</option>
                      </select>
                    </div>
                  </div>

                  <p className="acc-hint">
                    ℹ Stop-loss is read from your trade log's <b>SL</b> column (in the unit above).
                    The default value is used only for trades whose SL cell is empty.
                  </p>
                </div>
              )}

              {/* Commission */}
              <div className="acc-field-group">
                <span className="acc-field-group-title">Commission</span>

                <div className={commissionMode === 'none' ? '' : 'acc-grid-2'}>
                  <div>
                    <label className="acc-label">Mode</label>
                    <select
                      value={commissionMode}
                      onChange={(e) => setCommissionMode(e.target.value)}
                      className="acc-input"
                    >
                      <option value="none">None</option>
                      <option value="flat">Flat per trade</option>
                      <option value="per_contract">Per contract</option>
                    </select>
                  </div>

                  {commissionMode !== 'none' && (
                    <div>
                      <label className="acc-label">
                        {commissionMode === 'per_contract' ? 'Per Contract' : 'Per Trade'}
                      </label>
                      <div className="acc-input-wrap">
                        <input
                          type="number"
                          value={commissionValue}
                          onChange={(e) => setCommissionValue(e.target.value)}
                          min="0"
                          step="0.01"
                          className="acc-input has-suffix"
                          placeholder="0.00"
                        />
                        <span className="acc-input-suffix">{currencySymbol}</span>
                      </div>
                    </div>
                  )}
                </div>

                {commissionMode === 'per_contract' && (
                  <p className="acc-hint">
                    ℹ Your Excel must include a <b>Contracts</b> column.
                    Commission per trade = value × contracts.
                  </p>
                )}
                {commissionMode === 'flat' && (
                  <p className="acc-hint">
                    ℹ Same amount charged on every trade.
                  </p>
                )}
                {commissionMode === 'none' && (
                  <p className="acc-hint">
                    ℹ No fees — net P&L will equal gross P&L.
                  </p>
                )}
              </div>

            </div>

            <div className="acc-modal-foot">
              <button type="button" className="acc-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="acc-btn-primary">
                {editingId ? 'Save Changes' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}