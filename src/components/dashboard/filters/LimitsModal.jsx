// src/components/filters/LimitsModal.jsx
import { useState, useEffect } from 'react';
import { useFilters } from '../../../hooks/useFilters';
import Portal from '../../common/Portal';

const OPTIONS = [
  {
    id: 'none',
    title: 'No Limits',
    description: 'Evaluate all historical trades without session caps or R-multiple stops.',
  },
  {
    id: 'session',
    title: 'Trades Per Session',
    description: 'Restrict trade evaluations per execution session window.',
    paramKey: 'sessionLimit',
    unit: 'trades',
    min: 1,
    step: 1,
  },
  {
    id: 'day',
    title: 'Trades Per Day',
    description: 'Cap the total allowed trades per calendar trading day.',
    paramKey: 'dayLimit',
    unit: 'trades',
    min: 1,
    step: 1,
  },
  {
    id: 'rrLimit',
    title: 'Daily R:R Thresholds',
    description: 'Stop daily simulation once target profit or max drawdown R-multiple is hit.',
    isDouble: true,
  },
];

export default function LimitsModal({ isOpen, onClose }) {
  const { activeFilterType, filterParams, setActiveFilterType, setFilterParams } = useFilters();

  const [localType, setLocalType] = useState(activeFilterType);
  const [localParams, setLocalParams] = useState({ ...filterParams });

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalType(activeFilterType || 'none');
      setLocalParams({
        sessionLimit: 1,
        dayLimit: 1,
        winLimit: 2.0,
        lossLimit: 1.0,
        ...filterParams,
      });
    }
  }, [isOpen, activeFilterType, filterParams]);

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
    setActiveFilterType(localType);
    setFilterParams(localParams);
    onClose();
  };

  const updateParam = (key, value) => {
    setLocalParams((prev) => ({ ...prev, [key]: value }));
  };

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
            maxWidth: '480px',
            backgroundColor: '#11151F',
            border: '1px solid #212836',
            borderRadius: '14px',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
            padding: '24px',
            color: '#E7E9EE',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '20px',
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
                Advanced Limits & Rules
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: '#8892A3',
                  marginTop: '4px',
                  marginBottom: 0,
                }}
              >
                Apply execution caps or daily risk limits on top of active dynamic filters.
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

          {/* Option List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {OPTIONS.map((opt) => {
              const isSelected = localType === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => setLocalType(opt.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'rgba(255, 176, 32, 0.05)' : '#161B26',
                    border: `1px solid ${isSelected ? '#FFB020' : '#212836'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="radio"
                        id={`radio-${opt.id}`}
                        name="filterType"
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => setLocalType(opt.id)}
                        style={{
                          accentColor: '#FFB020',
                          cursor: 'pointer',
                          width: '15px',
                          height: '15px',
                          margin: 0,
                        }}
                      />
                      <label
                        htmlFor={`radio-${opt.id}`}
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: isSelected ? '#FFFFFF' : '#C5C9D3',
                          cursor: 'pointer',
                        }}
                      >
                        {opt.title}
                      </label>
                    </div>

                    {/* Single Numerical Parameter Input */}
                    {opt.paramKey && (
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          value={localParams[opt.paramKey] ?? 1}
                          onChange={(e) => {
                            setLocalType(opt.id);
                            updateParam(opt.paramKey, Math.max(opt.min, Number(e.target.value) || opt.min));
                          }}
                          onFocus={() => setLocalType(opt.id)}
                          min={opt.min}
                          step={opt.step}
                          disabled={!isSelected}
                          style={{
                            width: '56px',
                            backgroundColor: isSelected ? '#0D1117' : '#11151F',
                            border: `1px solid ${isSelected ? '#FFB020' : '#2A3241'}`,
                            borderRadius: '6px',
                            color: isSelected ? '#FFB020' : '#545E6E',
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '12px',
                            textAlign: 'center',
                            padding: '4px 6px',
                            outline: 'none',
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#8892A3', fontFamily: "'IBM Plex Mono', monospace" }}>
                          {opt.unit}
                        </span>
                      </div>
                    )}

                    {/* Double R:R Inputs */}
                    {opt.isDouble && (
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#35C4A1', fontWeight: '600' }}>+</span>
                          <input
                            type="number"
                            value={localParams.winLimit ?? 2.0}
                            onChange={(e) => {
                              setLocalType(opt.id);
                              updateParam('winLimit', Math.max(0.1, Number(e.target.value) || 0.1));
                            }}
                            onFocus={() => setLocalType(opt.id)}
                            min="0.1"
                            step="0.1"
                            disabled={!isSelected}
                            style={{
                              width: '48px',
                              backgroundColor: isSelected ? '#0D1117' : '#11151F',
                              border: `1px solid ${isSelected ? '#35C4A1' : '#2A3241'}`,
                              borderRadius: '6px',
                              color: isSelected ? '#35C4A1' : '#545E6E',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '11px',
                              textAlign: 'center',
                              padding: '4px 2px',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: '10px', color: '#8892A3' }}>R</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#FF5C5C', fontWeight: '600' }}>-</span>
                          <input
                            type="number"
                            value={localParams.lossLimit ?? 1.0}
                            onChange={(e) => {
                              setLocalType(opt.id);
                              updateParam('lossLimit', Math.max(0.1, Number(e.target.value) || 0.1));
                            }}
                            onFocus={() => setLocalType(opt.id)}
                            min="0.1"
                            step="0.1"
                            disabled={!isSelected}
                            style={{
                              width: '48px',
                              backgroundColor: isSelected ? '#0D1117' : '#11151F',
                              border: `1px solid ${isSelected ? '#FF5C5C' : '#2A3241'}`,
                              borderRadius: '6px',
                              color: isSelected ? '#FF5C5C' : '#545E6E',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '11px',
                              textAlign: 'center',
                              padding: '4px 2px',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: '10px', color: '#8892A3' }}>R</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: '11px',
                      color: '#8892A3',
                      marginTop: '6px',
                      marginBottom: 0,
                      paddingLeft: '25px',
                    }}
                  >
                    {opt.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #1A2029',
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
              Apply Limits
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}