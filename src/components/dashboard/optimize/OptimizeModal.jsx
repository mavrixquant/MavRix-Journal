import { useState, useEffect, useRef, useMemo } from 'react';
import Portal from '../../common/Portal';
import { useOptimization } from '../../../hooks/useOptimization';
import { useAppContext } from '../../../context/AppContext';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
const OPTIMIZE_PAGE_SIZE = 50;

const optimalizeModalStyles = `
  :root {
    --opt-bg: #121318;
    --opt-card-bg: #1a1c23;
    --opt-border: #2a2d3d;
    --opt-text: #e2e8f0;
    --opt-text-dim: #94a3b8;
    --opt-amber: #f59e0b;
    --opt-amber-hover: #d97706;
    --opt-win: #10b981;
    --opt-loss: #ef4444;
  }

  /* Modal Overlay & Card */
  .opt-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .opt-modal-overlay.is-open {
    opacity: 1;
  }

  .opt-modal-container {
    background: var(--opt-bg);
    border: 1px solid var(--opt-border);
    border-radius: 12px;
    width: 90vw;
    max-width: 1000px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    color: var(--opt-text);
    overflow: hidden;
  }

  /* Header */
  .opt-modal-header {
    padding: 18px 24px;
    border-bottom: 1px solid var(--opt-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .opt-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .opt-header-title h2 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }

  .opt-subtitle {
    font-size: 12px;
    color: var(--opt-text-dim);
    margin: 2px 0 0 0;
  }

  .opt-close-btn {
    background: none;
    border: none;
    color: var(--opt-text-dim);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .opt-close-btn:hover {
    color: #fff;
    background: var(--opt-border);
  }

  /* Body */
  .opt-modal-body {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Grid & Cards */
  .opt-section-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--opt-text-dim);
    margin-bottom: 8px;
    display: block;
  }

  .opt-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .opt-card {
    background: var(--opt-card-bg);
    border: 1px solid var(--opt-border);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: border-color 0.15s ease;
  }

  .opt-card.active {
    border-color: rgba(245, 158, 11, 0.4);
  }

  .opt-checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
  }

  /* Dropdown */
  .opt-dropdown-container {
    position: relative;
  }

  .opt-dropdown-btn {
    background: var(--opt-bg);
    border: 1px solid var(--opt-border);
    color: var(--opt-text);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .opt-dropdown-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .opt-dropdown-panel {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--opt-card-bg);
    border: 1px solid var(--opt-border);
    border-radius: 8px;
    padding: 6px;
    min-width: 140px;
    max-height: 180px;
    overflow-y: auto;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    z-index: 10;
  }

  .opt-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
  }

  .opt-dropdown-item:hover {
    background: var(--opt-border);
  }

  .opt-dropdown-divider {
    height: 1px;
    background: var(--opt-border);
    margin: 4px 0;
  }

  /* Controls Bar */
  .opt-controls-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 12px;
    background: var(--opt-card-bg);
    border-radius: 8px;
    border: 1px solid var(--opt-border);
  }

  .opt-rr-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .opt-control-label {
    font-size: 12px;
    color: var(--opt-text-dim);
  }

  /* Buttons */
  .opt-btn {
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
  }

  .opt-btn-primary {
    background: var(--opt-amber);
    color: #000;
    font-weight: 600;
  }

  .opt-btn-primary:hover:not(:disabled) {
    background: var(--opt-amber-hover);
  }

  .opt-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .opt-btn-secondary {
    background: var(--opt-bg);
    border: 1px solid var(--opt-border);
    color: var(--opt-text);
  }

  .opt-btn-secondary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Table */
  .opt-table-wrapper {
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid var(--opt-border);
    border-radius: 8px;
  }

  .opt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .opt-table th {
    position: sticky;
    top: 0;
    background: var(--opt-card-bg);
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    color: var(--opt-text-dim);
    border-bottom: 1px solid var(--opt-border);
  }

  .opt-table td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--opt-border);
  }

  .opt-table tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  /* Pagination */
  .opt-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 12px;
  }

  /* Utilities */
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .text-win { color: var(--opt-win); }
  .text-loss { color: var(--opt-loss); }
  .font-mono { font-family: monospace; }
  .font-bold { font-weight: 600; }

`

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

  // Filter columns: only those with >1 and <10 unique values, excluding 'session'
  const filterColumns = useMemo(() => {
    const counts = {};
    (state.dynamicFilterKeys || []).forEach(key => {
      counts[key] = new Set((state.trades || []).map(t => t.dynamic?.[key])).size;
    });
    return (state.dynamicFilterKeys || []).filter(key =>
      key.toLowerCase() !== 'session' &&
      counts[key] > 1 &&
      counts[key] < 10
    );
  }, [state.dynamicFilterKeys, state.trades]);

  const getColumnOptions = (key) => {
    return [...new Set((state.trades || []).map(t => t.dynamic?.[key]))]
      .filter(v => v && v !== '—')
      .sort();
  };

  useEffect(() => {
    if (isOpen) {
      resetOptimization();
      setOpenPanelKey(null);
      setRrPanelOpen(false);
    }
  }, [isOpen, resetOptimization]);

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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPanelKey, rrPanelOpen]);

  if (!isOpen) return null;

  const togglePanel = (key) => {
    setOpenPanelKey(prev => (prev === key ? null : key));
  };

  const toggleRrPanel = (e) => {
    e.stopPropagation();
    setRrPanelOpen(prev => !prev);
  };

  const handleValueChange = (key, value, checked) => {
    const current = columnValues[key] || [];
    const newValues = checked
      ? [...current, value]
      : current.filter(v => v !== value);
    setColumnValues(key, newValues);
  };

  const handleSelectAll = (key, checked) => {
    const allValues = getColumnOptions(key);
    setColumnValues(key, checked ? allValues : []);
  };

  const handleRRToggle = (rr, checked) => {
    const newSelection = checked
      ? [...rrSelected, rr].sort((a, b) => a - b)
      : rrSelected.filter(v => v !== rr);
    setRRSelection(newSelection);
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
    return `${selected.length} Selected`;
  };

  const getRRButtonLabel = () => {
    if (rrSelected.length === 0) return 'None Selected';
    if (rrSelected.length === RR_LEVELS.length) return 'All R:R';
    return rrSelected.map(v => `1:${v}`).join(', ');
  };

  const hasEnabledColumns = Object.values(columnEnabled).some(Boolean);

  return (
    <Portal>
      <style>{optimalizeModalStyles}</style>
      <div className={`opt-modal-overlay ${isOpen ? 'is-open' : ''}`} onClick={handleClose}>
        <div className="opt-modal-container" onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div className="opt-modal-header">
            <div className="opt-header-title">
              <span className="opt-icon">🔍</span>
              <div>
                <h2>Optimize Filter Combinations</h2>
                <p className="opt-subtitle">
                  Select parameters to compute multi-variable trade results across your current session parameters.
                </p>
              </div>
            </div>
            <button className="opt-close-btn" onClick={handleClose} aria-label="Close">✕</button>
          </div>

          {/* Body Section */}
          <div className="opt-modal-body">

            {/* Filter Configuration */}
            <div className="opt-section">
              <label className="opt-section-label">Select Active Filter Columns</label>
              <div className="opt-grid">
                {filterColumns.length === 0 ? (
                  <p className="opt-empty-text">No eligible filter columns found (requires 2–9 unique values).</p>
                ) : (
                  filterColumns.map(key => {
                    const options = getColumnOptions(key);
                    const enabled = columnEnabled[key] || false;
                    const selected = columnValues[key] || [];
                    const isPanelOpen = openPanelKey === key;

                    return (
                      <div key={key} className={`opt-card ${enabled ? 'active' : ''}`}>
                        <label className="opt-checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => toggleColumn(key, e.target.checked)}
                          />
                          <span className="opt-card-title">{key}</span>
                        </label>

                        <div className="opt-dropdown-container" ref={el => panelRefs.current[key] = el}>
                          <button
                            type="button"
                            className="opt-dropdown-btn"
                            disabled={!enabled}
                            onClick={() => togglePanel(key)}
                          >
                            <span>{getButtonLabel(key)}</span>
                            <span className="opt-caret">▾</span>
                          </button>

                          {isPanelOpen && enabled && (
                            <div className="opt-dropdown-panel">
                              <label className="opt-dropdown-item font-bold">
                                <input
                                  type="checkbox"
                                  checked={selected.length === options.length && options.length > 0}
                                  onChange={(e) => handleSelectAll(key, e.target.checked)}
                                />
                                <span>Select All ({options.length})</span>
                              </label>
                              <div className="opt-dropdown-divider" />
                              {options.map(val => (
                                <label key={val} className="opt-dropdown-item">
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(val)}
                                    onChange={(e) => handleValueChange(key, val, e.target.checked)}
                                  />
                                  <span>{val}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Controls Bar */}
            <div className="opt-controls-bar">
              <div className="opt-rr-wrapper">
                <span className="opt-control-label">Target R:R</span>
                <div className="opt-dropdown-container">
                  <button
                    type="button"
                    className="opt-dropdown-btn opt-rr-btn"
                    data-rr="true"
                    onClick={toggleRrPanel}
                  >
                    <span>{getRRButtonLabel()}</span>
                    <span className="opt-caret">▾</span>
                  </button>

                  {rrPanelOpen && (
                    <div id="rrPanel" className="opt-dropdown-panel opt-rr-panel">
                      <label className="opt-dropdown-item font-bold">
                        <input
                          type="checkbox"
                          checked={rrSelected.length === RR_LEVELS.length}
                          onChange={(e) => setRRSelection(e.target.checked ? [...RR_LEVELS] : [])}
                        />
                        <span>All Target R:R</span>
                      </label>
                      <div className="opt-dropdown-divider" />
                      {RR_LEVELS.map(r => (
                        <label key={r} className="opt-dropdown-item">
                          <input
                            type="checkbox"
                            checked={rrSelected.includes(r)}
                            onChange={(e) => handleRRToggle(r, e.target.checked)}
                          />
                          <span>1:{r}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="opt-actions">
                <button
                  type="button"
                  className="opt-btn opt-btn-primary"
                  onClick={handleRun}
                  disabled={isRunning || !hasEnabledColumns || rrSelected.length === 0}
                >
                  {isRunning ? 'Optimizing...' : '▶ Run Optimization'}
                </button>
              </div>

              {status && <div className="opt-status-badge">{status}</div>}
            </div>

            {/* Progress Bar */}
            {isRunning && (
              <div className="opt-progress-container">
                <div className="opt-progress-header">
                  <span>Processing Combinations</span>
                  <span>: {progress}%</span>
                </div>
                <div className="opt-progress-track">
                  <div className="opt-progress-bar" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Results Table */}
            {results.length > 0 && (
              <div className="opt-results-section">
                <div className="opt-table-wrapper">
                  <table className="opt-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px' }}>Rank</th>
                        <th>Combination Breakdown</th>
                        <th className="text-right">Total R</th>
                        <th className="text-right">Win Rate</th>
                        <th className="text-right">Profit Factor</th>
                        <th className="text-right">Expectancy</th>
                        <th className="text-right">Max Loss Streak</th>
                        <th className="text-right">Trades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageResults.map((r, idx) => {
                        const globalIndex = (currentPage - 1) * OPTIMIZE_PAGE_SIZE + idx + 1;
                        const isWin = r.totalR >= 0;

                        return (
                          <tr key={globalIndex}>
                            <td className="text-center font-mono rank-cell">#{globalIndex}</td>
                            <td className="font-medium">{r.comboDisplay}</td>
                            <td className={`text-right font-mono font-bold ${isWin ? 'text-win' : 'text-loss'}`}>
                              {isWin ? '+' : ''}{r.totalR.toFixed(2)}R
                            </td>
                            <td className="text-right font-mono">{r.winRate.toFixed(1)}%</td>
                            <td className="text-right font-mono">{r.profitFactor.toFixed(2)}</td>
                            <td className={`text-right font-mono ${r.expectancy >= 0 ? 'text-win' : 'text-loss'}`}>
                              {r.expectancy >= 0 ? '+' : ''}{r.expectancy.toFixed(2)}R
                            </td>
                            <td className="text-right font-mono">{r.lossStreak}</td>
                            <td className="text-right font-mono">{r.trades}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="opt-pagination">
                  <button
                    className="opt-btn opt-btn-secondary"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    ← Prev
                  </button>
                  <span className="opt-page-info">
                    Page <b>{currentPage}</b> of <b>{totalPages}</b>
                  </span>
                  <button
                    className="opt-btn opt-btn-secondary"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}