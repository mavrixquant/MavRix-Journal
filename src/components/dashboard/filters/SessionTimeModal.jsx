// src/components/filters/SessionTimeModal.jsx
import { useState, useEffect, useMemo } from 'react';
import { useFilters } from '../../../hooks/useFilters';
import { generateTimeBlocks } from '../../../utils/timeHelpers';
import Portal from '../../common/Portal';

const SESSIONS = [
  { id: 'Asia', name: 'Asia', detail: '00:00 - 08:00 UTC' },
  { id: 'London', name: 'London', detail: '07:00 - 15:00 UTC' },
  { id: 'NY Pre-Market', name: 'NY Pre-Market', detail: '12:00 - 14:30 UTC' },
  { id: 'NY AM', name: 'NY AM Session', detail: '14:30 - 17:00 UTC' },
  { id: 'NY Lunch', name: 'NY Lunch Hour', detail: '17:00 - 18:30 UTC' },
  { id: 'NY PM', name: 'NY PM Session', detail: '18:30 - 21:00 UTC' },
  { id: 'After Hours', name: 'After Hours', detail: '21:00 - 00:00 UTC' },
];

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
  const [localSessions, setLocalSessions] = useState([]);
  const [localTimeBlocks, setLocalTimeBlocks] = useState([]);

  const timeBlocks = useMemo(() => generateTimeBlocks(), []);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalMode(stMode || 'session');
      setLocalSessions([...(selectedSessions || [])]);
      setLocalTimeBlocks([...(selectedTimeBlocks || [])]);
    }
  }, [isOpen, stMode, selectedSessions, selectedTimeBlocks]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApply = () => {
    setSTMode(localMode);
    setSelectedSessions(localSessions);
    setSelectedTimeBlocks(localTimeBlocks);
    onClose();
  };

  const toggleSession = (sessionId) => {
    setLocalSessions((prev) =>
      prev.includes(sessionId) ? prev.filter((s) => s !== sessionId) : [...prev, sessionId]
    );
  };

  const toggleTimeBlock = (blockVal) => {
    setLocalTimeBlocks((prev) =>
      prev.includes(blockVal) ? prev.filter((b) => b !== blockVal) : [...prev, blockVal]
    );
  };

  const selectAll = () => {
    if (localMode === 'session') {
      setLocalSessions(SESSIONS.map((s) => s.id));
    } else {
      setLocalTimeBlocks(timeBlocks.map((t) => t.value));
    }
  };

  const clearAll = () => {
    if (localMode === 'session') {
      setLocalSessions([]);
    } else {
      setLocalTimeBlocks([]);
    }
  };

  const currentSelectionCount =
    localMode === 'session' ? localSessions.length : localTimeBlocks.length;
  const maxSelectionCount = localMode === 'session' ? SESSIONS.length : timeBlocks.length;

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(5, 7, 10, 0.75)',
          backdropFilter: 'blur(6px)',
          padding: '16px',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#11151F',
            border: '1px solid #212836',
            borderRadius: '14px',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
            color: '#E7E9EE',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid #1A2029',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Session & Time Filter
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: '#8892A3',
                  marginTop: '4px',
                  marginBottom: 0,
                }}
              >
                Filter trade statistics by market session or 30-minute execution windows.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#545E6E',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#E7E9EE')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#545E6E')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Body Content */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {/* Segmented Control Mode Switcher */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                backgroundColor: '#161B26',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #212836',
                marginBottom: '20px',
              }}
            >
              <button
                type="button"
                onClick={() => setLocalMode('session')}
                style={{
                  backgroundColor: localMode === 'session' ? '#212836' : 'transparent',
                  color: localMode === 'session' ? '#FFB020' : '#8892A3',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Market Sessions
              </button>
              <button
                type="button"
                onClick={() => setLocalMode('time')}
                style={{
                  backgroundColor: localMode === 'time' ? '#212836' : 'transparent',
                  color: localMode === 'time' ? '#FFB020' : '#8892A3',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                30-Min Time Blocks
              </button>
            </div>

            {/* Quick Actions & Selection Tracker */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: '#8892A3',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                Selected: <strong style={{ color: '#E7E9EE' }}>{currentSelectionCount}</strong> / {maxSelectionCount}
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={selectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFB020',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#545E6E',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#8892A3')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#545E6E')}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Session Cards Grid */}
            {localMode === 'session' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '8px',
                }}
              >
                {SESSIONS.map((s) => {
                  const isChecked = localSessions.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSession(s.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: isChecked ? 'rgba(255, 176, 32, 0.05)' : '#161B26',
                        border: `1px solid ${isChecked ? '#FFB020' : '#212836'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: isChecked ? '#FFFFFF' : '#C5C9D3',
                          }}
                        >
                          {s.name}
                        </div>
                        <div
                          style={{
                            fontSize: '10px',
                            color: '#8892A3',
                            fontFamily: "'IBM Plex Mono', monospace",
                            marginTop: '2px',
                          }}
                        >
                          {s.detail}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{
                          accentColor: '#FFB020',
                          cursor: 'pointer',
                          width: '15px',
                          height: '15px',
                          margin: 0,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* 30-Min Time Chips Grid */}
            {localMode === 'time' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '6px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {timeBlocks.map((t) => {
                  const isChecked = localTimeBlocks.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleTimeBlock(t.value)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        backgroundColor: isChecked ? 'rgba(255, 176, 32, 0.1)' : '#161B26',
                        border: `1px solid ${isChecked ? '#FFB020' : '#212836'}`,
                        color: isChecked ? '#FFB020' : '#8892A3',
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '11px',
                        fontWeight: isChecked ? '600' : '400',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '16px 24px',
              borderTop: '1px solid #1A2029',
              backgroundColor: '#11151F',
            }}
          >
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #212836',
                borderRadius: '8px',
                color: '#8892A3',
                fontSize: '12px',
                fontWeight: '500',
                padding: '8px 18px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2A3241';
                e.currentTarget.style.color = '#E7E9EE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#212836';
                e.currentTarget.style.color = '#8892A3';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              style={{
                backgroundColor: '#FFB020',
                border: 'none',
                borderRadius: '8px',
                color: '#0D1117',
                fontSize: '12px',
                fontWeight: '600',
                padding: '8px 20px',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(255, 176, 32, 0.2)',
                transition: 'transform 0.1s ease, background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFC04D')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFB020')}
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}