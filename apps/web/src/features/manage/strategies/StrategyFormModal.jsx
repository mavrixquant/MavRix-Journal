// apps/web/src/features/manage/strategies/StrategyFormModal.jsx
//
// Create / edit modal for a strategy.
//
// If `strategy` prop is provided → edit mode (PATCH).
// Otherwise → create mode (POST).

import { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaCheck } from 'react-icons/fa';

import Portal from '@/shared/components/Portal';
import {
  useCreateStrategy,
  useUpdateStrategy,
} from '@/shared/api/strategies';
import {
  STRATEGY_COLORS,
  STRATEGY_STATUSES,
  STRATEGY_DIRECTIONS,
  STRATEGY_DEFAULT_COLOR,
} from '@mavrix/shared';

const MAX_TAGS = 20;
const MAX_TAG_LEN = 40;

const EMPTY_FORM = {
  name: '',
  description: '',
  rules: '',
  status: 'active',
  color: STRATEGY_DEFAULT_COLOR,
  direction: '',
  timeframe: '',
  tags: [],
};

export default function StrategyFormModal({
  isOpen,
  onClose,
  strategy = null,
}) {
  const isEdit = !!strategy;

  const [form, setForm] = useState(EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateStrategy();
  const updateMutation = useUpdateStrategy();
  const saving = createMutation.isPending || updateMutation.isPending;

  // Hydrate / reset form whenever the modal opens or the target changes.
  useEffect(() => {
    if (!isOpen) return;
    if (strategy) {
      setForm({
        name: strategy.name || '',
        description: strategy.description || '',
        rules: strategy.rules || '',
        status: strategy.status || 'active',
        color: strategy.color || STRATEGY_DEFAULT_COLOR,
        direction: strategy.direction || '',
        timeframe: strategy.timeframe || '',
        tags: Array.isArray(strategy.tags) ? [...strategy.tags] : [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setTagInput('');
    setError('');
  }, [isOpen, strategy]);

  if (!isOpen) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const addTag = () => {
    const val = tagInput.trim().slice(0, MAX_TAG_LEN);
    if (!val) return;
    if (form.tags.includes(val)) {
      setTagInput('');
      return;
    }
    if (form.tags.length >= MAX_TAGS) {
      setError(`Maximum ${MAX_TAGS} tags.`);
      return;
    }
    set('tags', [...form.tags, val]);
    setTagInput('');
    setError('');
  };

  const removeTag = (t) => {
    set('tags', form.tags.filter((x) => x !== t));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && tagInput === '' && form.tags.length > 0) {
      e.preventDefault();
      removeTag(form.tags[form.tags.length - 1]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');

    const name = form.name.trim();
    if (!name) {
      setError('Name is required.');
      return;
    }

    const payload = {
      name,
      description: form.description.trim(),
      rules: form.rules,
      status: form.status,
      color: form.color,
      direction: form.direction || null,
      timeframe: form.timeframe.trim() || null,
      tags: form.tags,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: strategy.id, patch: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err?.message || `Could not ${isEdit ? 'update' : 'save'} strategy.`);
    }
  };

  return (
    <Portal>
      <div
        className="strat-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <form className="strat-modal" onSubmit={handleSubmit}>
          <div className="strat-modal-head">
            <div>
              <h2 className="strat-modal-title">
                {isEdit ? 'Edit Strategy' : 'New Strategy'}
              </h2>
              <p className="strat-modal-sub">
                {isEdit ? 'Update the playbook details' : 'Define a new playbook'}
              </p>
            </div>
            <button
              type="button"
              className="strat-modal-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>

          <div className="strat-modal-body">
            {error && <div className="strat-error">{error}</div>}

            <div className="strat-field">
              <label className="strat-label">
                Name<span className="req">*</span>
              </label>
              <input
                type="text"
                className="strat-input"
                value={form.name}
                maxLength={80}
                disabled={saving}
                autoFocus
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. VWAP Reversal"
              />
            </div>

            <div className="strat-field">
              <label className="strat-label">
                Description
                <span className="strat-label-hint">short summary</span>
              </label>
              <textarea
                className="strat-textarea"
                value={form.description}
                maxLength={2000}
                disabled={saving}
                onChange={(e) => set('description', e.target.value)}
                placeholder="One-line summary of what this strategy does."
              />
            </div>

            <div className="strat-field">
              <label className="strat-label">
                Rules
                <span className="strat-label-hint">entry / exit conditions</span>
              </label>
              <textarea
                className="strat-textarea"
                style={{ minHeight: 120 }}
                value={form.rules}
                maxLength={5000}
                disabled={saving}
                onChange={(e) => set('rules', e.target.value)}
                placeholder={'1. Wait for VWAP reclaim\n2. Enter on first pullback\n3. Stop below VWAP'}
              />
            </div>

            <div className="strat-grid-2">
              <div className="strat-field">
                <label className="strat-label">Status</label>
                <select
                  className="strat-select"
                  value={form.status}
                  disabled={saving}
                  onChange={(e) => set('status', e.target.value)}
                >
                  {STRATEGY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="strat-field">
                <label className="strat-label">
                  Direction
                  <span className="strat-label-hint">blank = both</span>
                </label>
                <select
                  className="strat-select"
                  value={form.direction || ''}
                  disabled={saving}
                  onChange={(e) => set('direction', e.target.value)}
                >
                  <option value="">Both</option>
                  {STRATEGY_DIRECTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="strat-field">
              <label className="strat-label">
                Timeframe
                <span className="strat-label-hint">optional, e.g. 5m</span>
              </label>
              <input
                type="text"
                className="strat-input"
                value={form.timeframe}
                maxLength={20}
                disabled={saving}
                onChange={(e) => set('timeframe', e.target.value)}
                placeholder="5m, 1h, 1d…"
              />
            </div>

            <div className="strat-field">
              <label className="strat-label">Colour</label>
              <div className="strat-colors">
                {STRATEGY_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`strat-color ${form.color === c.hex ? 'is-active' : ''}`}
                    style={{
                      background: c.hex,
                      '--swatch-color': c.hex,
                    }}
                    onClick={() => set('color', c.hex)}
                    disabled={saving}
                    title={c.label}
                    aria-label={c.label}
                    aria-pressed={form.color === c.hex}
                  />
                ))}
              </div>
            </div>

            <div className="strat-field">
              <label className="strat-label">
                Tags
                <span className="strat-label-hint">
                  Enter or comma to add · {form.tags.length}/{MAX_TAGS}
                </span>
              </label>
              <div className="strat-tags-input">
                {form.tags.map((t) => (
                  <span key={t} className="strat-tag-chip">
                    {t}
                    <button
                      type="button"
                      className="strat-tag-chip-remove"
                      onClick={() => removeTag(t)}
                      disabled={saving}
                      aria-label={`Remove tag ${t}`}
                    >
                      <FaTimes size={8} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  disabled={saving || form.tags.length >= MAX_TAGS}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => { if (tagInput.trim()) addTag(); }}
                  placeholder={form.tags.length === 0 ? 'Add a tag…' : ''}
                  maxLength={MAX_TAG_LEN}
                />
              </div>
            </div>
          </div>

          <div className="strat-modal-foot">
            <button
              type="button"
              className="strat-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="strat-btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="strat-spinner" />
                  <span>{isEdit ? 'Saving…' : 'Creating…'}</span>
                </>
              ) : (
                <>
                  {isEdit ? <FaCheck size={11} /> : <FaPlus size={11} />}
                  <span>{isEdit ? 'Save Changes' : 'Create Strategy'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}