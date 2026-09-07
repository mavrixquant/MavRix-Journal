// src/components/filters/LimitsModal.jsx
import { useState } from 'react';
import { useFilters } from '../../hooks/useFilters';
import Portal from '../common/Portal';

export default function LimitsModal({ isOpen, onClose }) {
  const { activeFilterType, filterParams, setActiveFilterType, setFilterParams } = useFilters();

  const [localType, setLocalType] = useState(activeFilterType);
  const [localParams, setLocalParams] = useState({ ...filterParams });

  if (!isOpen) return null;

  const handleApply = () => {
    setActiveFilterType(localType);
    setFilterParams(localParams);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const updateParam = (key, value) => {
    setLocalParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Portal>
      <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal-content">
          <h2 style={{ fontFamily: 'var(--disp)', marginBottom: '16px' }}>Advanced Limits</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            Select one filter to apply on top of your dynamic filters.
          </p>

          <div className="modal-radio-group">
            <label className="modal-option">
              <input
                type="radio"
                name="filterType"
                value="none"
                checked={localType === 'none'}
                onChange={() => setLocalType('none')}
              />
              <span>No Limits</span>
            </label>
            <label className="modal-option">
              <input
                type="radio"
                name="filterType"
                value="session"
                checked={localType === 'session'}
                onChange={() => setLocalType('session')}
              />
              <span>Trades Per Session</span>
              <input
                type="number"
                className="modal-input"
                value={localParams.sessionLimit}
                onChange={(e) => updateParam('sessionLimit', Number(e.target.value) || 1)}
                min="1"
                step="1"
                style={{ width: '60px', marginLeft: '8px' }}
              />
            </label>
            <label className="modal-option">
              <input
                type="radio"
                name="filterType"
                value="day"
                checked={localType === 'day'}
                onChange={() => setLocalType('day')}
              />
              <span>Trades Per Day</span>
              <input
                type="number"
                className="modal-input"
                value={localParams.dayLimit}
                onChange={(e) => updateParam('dayLimit', Number(e.target.value) || 1)}
                min="1"
                step="1"
                style={{ width: '60px', marginLeft: '8px' }}
              />
            </label>
            <label className="modal-option">
              <input
                type="radio"
                name="filterType"
                value="rrLimit"
                checked={localType === 'rrLimit'}
                onChange={() => setLocalType('rrLimit')}
              />
              <span>Daily RR Limit</span>
              <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                <label style={{ fontSize: '11px' }}>Win:</label>
                <input
                  type="number"
                  className="modal-input"
                  value={localParams.winLimit}
                  onChange={(e) => updateParam('winLimit', Number(e.target.value) || 0.1)}
                  min="0.1"
                  step="0.1"
                  style={{ width: '50px' }}
                />
                <label style={{ fontSize: '11px' }}>Loss:</label>
                <input
                  type="number"
                  className="modal-input"
                  value={localParams.lossLimit}
                  onChange={(e) => updateParam('lossLimit', Number(e.target.value) || 0.1)}
                  min="0.1"
                  step="0.1"
                  style={{ width: '50px' }}
                />
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button className="btn-upload" onClick={handleCancel} style={{ borderStyle: 'solid', padding: '6px 16px' }}>
              Cancel
            </button>
            <button
              className="btn-upload"
              onClick={handleApply}
              style={{ borderStyle: 'solid', borderColor: 'var(--amber)', color: 'var(--amber)', padding: '6px 16px' }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}