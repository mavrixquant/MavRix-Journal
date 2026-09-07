// src/components/filters/SessionTimeModal.jsx
import { useState } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { generateTimeBlocks } from '../../utils/timeHelpers';
import Portal from '../common/Portal';

const SESSIONS = ['Asia', 'London', 'NY Pre-Market', 'NY AM', 'NY Lunch', 'NY PM', 'After Hours'];

export default function SessionTimeModal({ isOpen, onClose }) {
  const {
    stMode,
    selectedSessions,
    selectedTimeBlocks,
    setSTMode,
    setSelectedSessions,
    setSelectedTimeBlocks,
  } = useFilters();

  const [localMode, setLocalMode] = useState(stMode);
  const [localSessions, setLocalSessions] = useState([...selectedSessions]);
  const [localTimeBlocks, setLocalTimeBlocks] = useState([...selectedTimeBlocks]);

  if (!isOpen) return null;

  const handleApply = () => {
    setSTMode(localMode);
    setSelectedSessions(localSessions);
    setSelectedTimeBlocks(localTimeBlocks);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const toggleSession = (session) => {
    setLocalSessions(prev =>
      prev.includes(session) ? prev.filter(s => s !== session) : [...prev, session]
    );
  };

  const toggleTimeBlock = (block) => {
    setLocalTimeBlocks(prev =>
      prev.includes(block) ? prev.filter(b => b !== block) : [...prev, block]
    );
  };

  const timeBlocks = generateTimeBlocks();

  return (
    <Portal>
      <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal-content">
          <h2 style={{ fontFamily: 'var(--disp)', marginBottom: '12px' }}>Session / Time Filter</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
            Choose one mode and select the sessions or time blocks you want to include.
          </p>

          <div className="modal-radio-group" style={{ marginBottom: '16px' }}>
            <label className="modal-option" style={{ border: 'none', padding: '4px 0' }}>
              <input
                type="radio"
                name="stMode"
                value="session"
                checked={localMode === 'session'}
                onChange={() => setLocalMode('session')}
              />
              <span style={{ fontWeight: 600 }}>Session Based</span>
            </label>
            <label className="modal-option" style={{ border: 'none', padding: '4px 0' }}>
              <input
                type="radio"
                name="stMode"
                value="time"
                checked={localMode === 'time'}
                onChange={() => setLocalMode('time')}
              />
              <span style={{ fontWeight: 600 }}>Time Based (30‑min)</span>
            </label>
          </div>

          {localMode === 'session' && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-faint)', marginBottom: '6px' }}>
                Select sessions:
              </p>
              <div className="modal-checkbox-grid">
                {SESSIONS.map(s => (
                  <label key={s}>
                    <input
                      type="checkbox"
                      checked={localSessions.includes(s)}
                      onChange={() => toggleSession(s)}
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {localMode === 'time' && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-faint)', marginBottom: '6px' }}>
                Select time blocks (ET):
              </p>
              <div className="modal-checkbox-grid">
                {timeBlocks.map(t => (
                  <label key={t.value}>
                    <input
                      type="checkbox"
                      checked={localTimeBlocks.includes(t.value)}
                      onChange={() => toggleTimeBlock(t.value)}
                    />
                    <span>{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
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