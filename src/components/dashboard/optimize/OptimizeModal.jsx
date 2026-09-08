// src/components/optimize/OptimizeModal.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import Portal from '../../common/Portal';
import { useOptimization } from '../../../hooks/useOptimization';
import { useAppContext } from '../../../context/AppContext';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
const OPTIMIZE_PAGE_SIZE = 50;

export default function OptimizeModal({ isOpen, onClose }) {
  const { state } = useAppContext();
  const {
    columnEnabled,
    columnValues,
    rrSelected,
    isRunning,
    progress,
    status,
    results,
    currentPage,
    totalPages,
    pageResults,
    toggleColumn,
    setColumnValues,
    setRRSelection,
    runOptimizationAsync,
    goToPage,
    resetOptimization,
  } = useOptimization();

  const [openPanelKey, setOpenPanelKey] = useState(null);
  const [rrPanelOpen, setRrPanelOpen] = useState(false);
  const panelRefs = useRef({});

  // Get available filter columns: only those with >1 and <10 unique values, excluding 'session'
  const filterColumns = useMemo(() => {
    const counts = {};
    state.dynamicFilterKeys.forEach(key => {
      counts[key] = new Set(state.trades.map(t => t.dynamic[key])).size;
    });
    return state.dynamicFilterKeys.filter(key =>
      key.toLowerCase() !== 'session' &&
      counts[key] > 1 &&
      counts[key] < 10
    );
  }, [state.dynamicFilterKeys, state.trades]);

  // Get all possible values for a column
  const getColumnOptions = (key) => {
    const values = [...new Set(state.trades.map(t => t.dynamic[key]))]
      .filter(v => v && v !== '—')
      .sort();
    return values;
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      resetOptimization();
      setOpenPanelKey(null);
      setRrPanelOpen(false);
    }
  }, [isOpen, resetOptimization]);

  // Click outside handler for panels
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openPanelKey !== null) {
        const panel = panelRefs.current[openPanelKey];
        if (panel && !panel.contains(e.target)) {
          setOpenPanelKey(null);
        }
      }
      if (rrPanelOpen) {
        const rrPanel = document.getElementById('rrPanel');
        if (rrPanel && !rrPanel.contains(e.target) && !e.target.closest('[data-rr="true"]')) {
          setRrPanelOpen(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openPanelKey, rrPanelOpen]);

  if (!isOpen) return null;

  const togglePanel = (key) => {
    setOpenPanelKey(prev => (prev === key ? null : key));
  };

  const toggleRrPanel = (e) => {
    e.stopPropagation();
    setRrPanelOpen(prev => !prev);
  };

  const handleColumnToggle = (key, enabled) => {
    toggleColumn(key, enabled);
  };

  const handleValueChange = (key, value, checked) => {
    const current = columnValues[key] || [];
    let newValues;
    if (checked) {
      newValues = [...current, value];
    } else {
      newValues = current.filter(v => v !== value);
    }
    setColumnValues(key, newValues);
  };

  const handleSelectAll = (key, checked) => {
    const allValues = getColumnOptions(key);
    setColumnValues(key, checked ? allValues : []);
  };

  const handleRRToggle = (rr, checked) => {
    let newSelection;
    if (checked) {
      newSelection = [...rrSelected, rr].sort((a, b) => a - b);
    } else {
      newSelection = rrSelected.filter(v => v !== rr);
    }
    setRRSelection(newSelection);
  };

  const handleSelectAllRR = (checked) => {
    setRRSelection(checked ? [...RR_LEVELS] : []);
  };

  const handleRun = async () => {
    await runOptimizationAsync(rrSelected);
  };

  const handleClose = () => {
    if (isRunning) {
      if (window.confirm('Optimization is running. Are you sure you want to cancel?')) {
        resetOptimization();
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getButtonLabel = (key) => {
    const selected = columnValues[key] || [];
    const options = getColumnOptions(key);
    if (selected.length === 0) return 'None';
    if (selected.length === options.length) return 'All';
    return '…';
  };

  const getRRButtonLabel = () => {
    if (rrSelected.length === 0) return 'None';
    if (rrSelected.length === RR_LEVELS.length) return 'All';
    return rrSelected.map(v => '1:' + v).join(', ');
  };

  const hasEnabledColumns = Object.values(columnEnabled).some(v => v === true);

  const stopPropagation = (e) => e.stopPropagation();

  return (
    <Portal>
      <div id="optimizeModal" className={`modal-overlay ${isOpen ? 'open' : ''}`}>
        <div className="modal-content" onClick={stopPropagation}>
          <button id="optimizeCloseX" onClick={handleClose}>✕</button>

          <h2 style={{ fontFamily: 'var(--disp)', marginBottom: '8px', paddingRight: '40px' }}>
            🔍 Optimize Filter Combinations
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
            Select the filter columns to include. All possible combinations will be tested on the trades filtered by your current
            <b> Limits</b> and <b>Session/Time</b> filters. The full results table (sorted by Total R) will be shown below.
          </p>

          {/* Column selection */}
          <div style={{ marginBottom: '12px', flexShrink: 0 }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-faint)', marginBottom: '6px' }}>
              Select filter columns:
            </p>
            <div id="optimizeCheckboxes">
              {filterColumns.length === 0 ? (
                <p style={{ color: 'var(--text-faint)', fontFamily: 'var(--mono)', fontSize: '11px' }}>
                  No filter columns available.
                </p>
              ) : (
                filterColumns.map(key => {
                  const options = getColumnOptions(key);
                  const enabled = columnEnabled[key] || false;
                  const selected = columnValues[key] || [];
                  const isOpen = openPanelKey === key;

                  return (
                    <div key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'var(--bg-alt)', borderRadius: '4px', border: '1px solid var(--border-soft)' }}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleColumnToggle(key, e.target.checked);
                        }}
                        style={{ accentColor: 'var(--amber)', width: '14px', height: '14px', cursor: 'pointer' }}
                      />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                        {key}
                      </span>
                      <div className="ms-filter" ref={el => panelRefs.current[key] = el}>
                        <button
                          className="ms-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (enabled) togglePanel(key);
                          }}
                          style={{
                            padding: '4px 12px',
                            fontSize: '12px',
                            opacity: enabled ? 1 : 0.5,
                            cursor: enabled ? 'pointer' : 'default',
                          }}
                        >
                          {getButtonLabel(key)}
                        </button>
                        <div className={`ms-panel ${isOpen ? 'open' : ''}`} onClick={stopPropagation}>
                          {options.length === 0 ? (
                            <div className="ms-empty">No options</div>
                          ) : (
                            <>
                              <label className="ms-option" onClick={stopPropagation}>
                                <input
                                  type="checkbox"
                                  checked={selected.length === options.length && options.length > 0}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSelectAll(key, e.target.checked);
                                  }}
                                  disabled={!enabled}
                                />
                                <span>All</span>
                              </label>
                              {options.map(val => (
                                <label key={val} className="ms-option" onClick={stopPropagation}>
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(val)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleValueChange(key, val, e.target.checked);
                                    }}
                                    disabled={!enabled}
                                  />
                                  <span>{val}</span>
                                </label>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Controls row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', flexShrink: 0 }}>
            <button
              className="btn-upload"
              onClick={handleRun}
              disabled={isRunning || !hasEnabledColumns || rrSelected.length === 0}
              style={{
                borderStyle: 'solid',
                borderColor: 'var(--amber)',
                color: 'var(--amber)',
                padding: '6px 16px',
                opacity: (isRunning || !hasEnabledColumns || rrSelected.length === 0) ? 0.5 : 1,
                cursor: (isRunning || !hasEnabledColumns || rrSelected.length === 0) ? 'default' : 'pointer',
              }}
            >
              ▶ Run Optimization
            </button>
            <button
              className="btn-upload"
              onClick={handleClose}
              style={{ borderStyle: 'solid', padding: '6px 16px' }}
            >
              ✕ Cancel
            </button>

            {/* RR Multi-select */}
            <label style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              RR Target:
              <div className="ms-filter" style={{ display: 'inline-block', position: 'relative' }}>
                <button
                  className="ms-btn"
                  onClick={toggleRrPanel}
                  type="button"
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                  data-rr="true"
                >
                  {getRRButtonLabel()}
                </button>
                <div
                  id="rrPanel"
                  className="ms-panel"
                  style={{
                    display: rrPanelOpen ? 'block' : 'none',
                    minWidth: '120px',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 1000,
                    background: 'var(--panel)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '8px',
                    padding: '6px',
                    boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
                  }}
                  onClick={stopPropagation}
                >
                  <label className="ms-option" onClick={stopPropagation}>
                    <input
                      type="checkbox"
                      checked={rrSelected.length === RR_LEVELS.length}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectAllRR(e.target.checked);
                      }}
                    />
                    <span>All</span>
                  </label>
                  {RR_LEVELS.map(r => (
                    <label key={r} className="ms-option" onClick={stopPropagation}>
                      <input
                        type="checkbox"
                        checked={rrSelected.includes(r)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRRToggle(r, e.target.checked);
                        }}
                      />
                      <span>1:{r}</span>
                    </label>
                  ))}
                </div>
              </div>
            </label>

            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-faint)' }}>
              {status}
            </span>
          </div>

          {/* Progress bar */}
          {isRunning && (
            <div style={{ display: 'block', marginBottom: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-faint)' }}>
                <span>{progress}%</span>
                <span>Processing...</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-alt)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--amber)', transition: 'width 0.2s' }}></div>
              </div>
            </div>
          )}

          {/* Results table */}
          {results.length > 0 && (
            <>
              <div id="optimizeResults">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Combination</th>
                      <th style={{ textAlign: 'right' }}>Total R</th>
                      <th style={{ textAlign: 'right' }}>Win Rate</th>
                      <th style={{ textAlign: 'right' }}>Profit Factor</th>
                      <th style={{ textAlign: 'right' }}>Expectancy</th>
                      <th style={{ textAlign: 'right' }}>Loss Streak</th>
                      <th style={{ textAlign: 'right' }}>Trades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageResults.map((r, idx) => {
                      const globalIndex = (currentPage - 1) * OPTIMIZE_PAGE_SIZE + idx + 1;
                      return (
                        <tr key={globalIndex}>
                          <td style={{ textAlign: 'center' }}>{globalIndex}</td>
                          <td>{r.comboDisplay}</td>
                          <td style={{ textAlign: 'right', color: r.totalR >= 0 ? 'var(--win)' : 'var(--loss)' }}>
                            {(r.totalR >= 0 ? '+' : '') + r.totalR.toFixed(2) + 'R'}
                          </td>
                          <td style={{ textAlign: 'right' }}>{r.winRate.toFixed(1)}%</td>
                          <td style={{ textAlign: 'right' }}>{r.profitFactor.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>{(r.expectancy >= 0 ? '+' : '') + r.expectancy.toFixed(2) + 'R'}</td>
                          <td style={{ textAlign: 'right' }}>{r.lossStreak}</td>
                          <td style={{ textAlign: 'right' }}>{r.trades}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div id="optimizePagination" style={{ display: 'flex', flexShrink: 0, marginTop: '8px', justifyContent: 'center', alignItems: 'center', gap: '16px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-faint)' }}>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="btn-upload"
                  style={{ borderStyle: 'solid', padding: '4px 12px' }}
                >
                  ← Prev
                </button>
                <span>Page {currentPage} / {totalPages}</span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="btn-upload"
                  style={{ borderStyle: 'solid', padding: '4px 12px' }}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}