// src/components/filters/DynamicFilters.jsx
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useFilters } from '../../../hooks/useFilters';

export default function DynamicFilters() {
  const { state } = useAppContext();
  const { setFilterSelection } = useFilters();
  const [openPanelKey, setOpenPanelKey] = useState(null);
  const panelRefs = useRef({});

  // Compute unique values for a given dynamic key
  const getOptions = useCallback(
    (key) => {
      const values = [...new Set(state.trades.map((t) => t.dynamic?.[key]))]
        .filter((v) => v && v !== '—')
        .sort();
      return values;
    },
    [state.trades]
  );

  // Compute the number of unique values for each key
  const uniqueCounts = useMemo(() => {
    const counts = {};
    state.dynamicFilterKeys.forEach((key) => {
      counts[key] = new Set(state.trades.map((t) => t.dynamic?.[key])).size;
    });
    return counts;
  }, [state.dynamicFilterKeys, state.trades]);

  // Filter keys to only those with more than 1 and less than 10 unique values
  const eligibleKeys = useMemo(() => {
    return state.dynamicFilterKeys.filter(
      (key) => uniqueCounts[key] > 1 && uniqueCounts[key] < 10
    );
  }, [state.dynamicFilterKeys, uniqueCounts]);

  // Clear selections for keys that are no longer eligible
  useEffect(() => {
    const invalidKeys = Object.keys(state.filterSelections).filter(
      (key) => !eligibleKeys.includes(key)
    );
    if (invalidKeys.length > 0) {
      invalidKeys.forEach((key) => {
        setFilterSelection(key, []);
      });
    }
  }, [eligibleKeys, state.filterSelections, setFilterSelection]);

  const togglePanel = (key) => {
    setOpenPanelKey((prev) => (prev === key ? null : key));
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openPanelKey !== null) {
        const panel = panelRefs.current[openPanelKey];
        if (panel && !panel.contains(e.target)) {
          setOpenPanelKey(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPanelKey]);

  const handleCheckboxChange = (key, value, checked) => {
    const currentSelections = state.filterSelections[key] || [];
    let newSelections;
    if (checked) {
      newSelections = [...currentSelections, value];
    } else {
      newSelections = currentSelections.filter((v) => v !== value);
    }
    setFilterSelection(key, newSelections);
  };

  const selectAll = (key, options) => {
    setFilterSelection(key, [...options]);
  };

  const clearAll = (key) => {
    setFilterSelection(key, []);
  };

  if (eligibleKeys.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {eligibleKeys.map((key) => {
        const options = getOptions(key);
        const selected = state.filterSelections[key] || [];
        const isOpen = openPanelKey === key;
        const hasSelection = selected.length > 0;

        return (
          <div
            key={key}
            ref={(el) => (panelRefs.current[key] = el)}
            style={{ position: 'relative', display: 'inline-block' }}
          >
            {/* Filter Trigger Button */}
            <button
              type="button"
              onClick={() => togglePanel(key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '34px',
                padding: '0 12px',
                backgroundColor: hasSelection ? 'rgba(255, 176, 32, 0.08)' : '#161B26',
                border: `1px solid ${hasSelection ? '#FFB020' : isOpen ? '#3A4456' : '#212836'}`,
                borderRadius: '8px',
                color: hasSelection ? '#FFFFFF' : '#C5C9D3',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              <span>{key}</span>

              {/* Badge or Selection Indicator */}
              {hasSelection ? (
                <span
                  style={{
                    backgroundColor: '#FFB020',
                    color: '#0D1117',
                    fontSize: '10px',
                    fontWeight: '700',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {selected.length}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    color: '#545E6E',
                    fontWeight: '400',
                  }}
                >
                  All
                </span>
              )}

              {/* Chevron Icon */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={hasSelection ? '#FFB020' : '#8892A3'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 99,
                  minWidth: '200px',
                  maxWidth: '280px',
                  backgroundColor: '#11151F',
                  border: '1px solid #212836',
                  borderRadius: '10px',
                  boxShadow: '0 12px 28px -6px rgba(0, 0, 0, 0.65)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {/* Header with Quick Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #1A2029',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#8892A3' }}>
                    {key} Options
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => selectAll(key, options)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#FFB020',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => clearAll(key)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#545E6E',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#8892A3')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#545E6E')}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Options List */}
                <div
                  style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    paddingRight: '2px',
                  }}
                >
                  {options.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#545E6E', padding: '8px', textAlign: 'center' }}>
                      No options available
                    </div>
                  ) : (
                    options.map((val) => {
                      const isChecked = selected.includes(val);
                      return (
                        <label
                          key={val}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: isChecked ? 'rgba(255, 176, 32, 0.06)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isChecked) e.currentTarget.style.backgroundColor = '#161B26';
                          }}
                          onMouseLeave={(e) => {
                            if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              color: isChecked ? '#FFFFFF' : '#C5C9D3',
                              fontWeight: isChecked ? '500' : '400',
                            }}
                          >
                            {val}
                          </span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(key, val, e.target.checked)}
                            style={{
                              accentColor: '#FFB020',
                              cursor: 'pointer',
                              width: '14px',
                              height: '14px',
                              margin: 0,
                            }}
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}