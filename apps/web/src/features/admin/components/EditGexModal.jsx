import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Layers, Trash2, Plus, RefreshCw, Save,
  AlertTriangle, Copy, ClipboardCheck, ArrowUpDown,
  FileCode, Table, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

import Portal from '@/shared/components/Portal';
import {
  getAdminGexDay,
  useAdminUpsertGex,
} from '@/shared/api/gex';
import {
  GEX_SYMBOL_META,
  GEX_DEFAULT_TIMEZONE,
  serializeGexLevels,
  cleanGexLabel,
} from '@mavrix/shared';

function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

let nextId = 1;
function makeLevel(type = 'BL', price = 0, label = '') {
  return {
    _key: `lvl_${Date.now()}_${nextId++}`,
    type,
    price: Number(price) || 0,
    label: String(label || ''),
  };
}

export default function EditGexModal({ isOpen, onClose, gexDay, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState([]);
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'json' | 'preview'
  const [search, setSearch] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [copied, setCopied] = useState(false);

  const upsert = useAdminUpsertGex();

  const symbol = gexDay?.symbol || 'NQ';
  const date = gexDay?.date || '';
  const meta = useMemo(() => GEX_SYMBOL_META[symbol] || GEX_SYMBOL_META.NQ, [symbol]);

  // Load the full day data when opened
  useEffect(() => {
    if (!isOpen || !gexDay?.date || !gexDay?.symbol) return;

    let cancelled = false;
    setLoading(true);
    setJsonError(null);
    setActiveTab('table');
    setSearch('');

    (async () => {
      try {
        const day = await getAdminGexDay(gexDay.date, gexDay.symbol);
        if (cancelled) return;
        const initial = Array.isArray(day?.levels)
          ? day.levels.map((l) => makeLevel(l.type, l.price, l.label))
          : [];
        setLevels(initial);
        setJsonText(JSON.stringify(day?.levels || [], null, 2));
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || 'Failed to load GEX day details');
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, gexDay?.date, gexDay?.symbol, onClose]);

  // Live counts
  const counts = useMemo(() => {
    const total = levels.length;
    const bl = levels.filter((l) => l.type === 'BL').length;
    const gex = levels.filter((l) => l.type === 'GEX').length;
    const other = total - bl - gex;
    return { total, bl, gex, other };
  }, [levels]);

  // Converted TradingView pipe-string in real-time
  const convertedString = useMemo(() => {
    const valid = levels.filter((l) => Number.isFinite(l.price) && l.label.trim());
    return serializeGexLevels(valid);
  }, [levels]);

  // Tab switching: sync table -> json
  const handleTabChange = useCallback((nextTab) => {
    if (nextTab === 'json') {
      const clean = levels.map(({ type, price, label }) => ({
        type,
        price,
        label,
      }));
      setJsonText(JSON.stringify(clean, null, 2));
      setJsonError(null);
    }
    setActiveTab(nextTab);
  }, [levels]);

  // Sync from json -> table
  const handleApplyJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON root must be an array of levels');
      }
      const updated = parsed.map((item) => {
        const type = String(item.type || 'BL').toUpperCase();
        const price = Number(item.price);
        const label = cleanGexLabel(item.label || item.Name || '');
        if (!Number.isFinite(price)) {
          throw new Error(`Invalid price for level: "${label || type}"`);
        }
        return makeLevel(type, price, label);
      });
      setLevels(updated);
      setJsonError(null);
      setActiveTab('table');
      toast.success(`Updated ${updated.length} levels from JSON`);
    } catch (err) {
      setJsonError(err.message);
    }
  }, [jsonText]);

  // Level manipulation
  const handleUpdateLevel = useCallback((key, field, val) => {
    setLevels((prev) =>
      prev.map((l) => {
        if (l._key !== key) return l;
        if (field === 'price') {
          const num = Number(val);
          return { ...l, price: Number.isFinite(num) ? num : val };
        }
        if (field === 'label') {
          return { ...l, label: val };
        }
        if (field === 'type') {
          return { ...l, type: String(val).toUpperCase() };
        }
        return l;
      })
    );
  }, []);

  const handleRemoveLevel = useCallback((key) => {
    setLevels((prev) => prev.filter((l) => l._key !== key));
  }, []);

  const handleAddLevel = useCallback(() => {
    const newLvl = makeLevel('BL', 0, '');
    setLevels((prev) => [newLvl, ...prev]);
  }, []);

  const handleSortByPrice = useCallback((descending = true) => {
    setLevels((prev) =>
      [...prev].sort((a, b) =>
        descending ? Number(b.price) - Number(a.price) : Number(a.price) - Number(b.price)
      )
    );
  }, []);

  // Copy converted
  const handleCopyConverted = useCallback(async () => {
    if (!convertedString) return;
    try {
      await navigator.clipboard.writeText(convertedString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('TradingView string copied');
    } catch {
      toast.error('Copy failed');
    }
  }, [convertedString]);

  // Filtered levels for display
  const filteredLevels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return levels;
    return levels.filter(
      (l) =>
        String(l.price).includes(q) ||
        String(l.label).toLowerCase().includes(q) ||
        String(l.type).toLowerCase().includes(q)
    );
  }, [levels, search]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (levels.length === 0) {
      toast.error('Cannot save an empty GEX day. Add at least one level.');
      return;
    }

    // Validate levels
    for (let i = 0; i < levels.length; i++) {
      const l = levels[i];
      if (!Number.isFinite(Number(l.price))) {
        toast.error(`Level #${i + 1} has an invalid price`);
        return;
      }
      if (!String(l.label || '').trim()) {
        toast.error(`Level #${i + 1} (${l.type} @ ${l.price}) requires a label`);
        return;
      }
    }

    const payloadLevels = levels.map((l) => ({
      type: l.type,
      price: Number(l.price),
      label: cleanGexLabel(l.label),
    }));

    const converted = serializeGexLevels(payloadLevels);

    try {
      await upsert.mutateAsync({
        date,
        symbol,
        levels: payloadLevels,
        converted,
        sourceTimezone: GEX_DEFAULT_TIMEZONE,
        overwrite: true,
      });

      toast.success(`Updated ${symbol} GEX for ${formatDate(date)}`);
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Failed to update GEX levels');
    }
  }, [levels, date, symbol, upsert, onSaved, onClose]);

  if (!isOpen || !gexDay) return null;

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="egm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !upsert.isPending) onClose?.();
        }}
      >
        <div className="egm-modal" role="dialog" aria-modal="true" aria-labelledby="egm-title">
          {/* Top header */}
          <div className="egm-head">
            <div className="egm-head-meta">
              <span
                className="egm-sym-pill"
                style={{
                  color: meta.color,
                  borderColor: `${meta.color}66`,
                  background: `${meta.color}15`,
                }}
              >
                {symbol}
              </span>
              <div>
                <h3 className="egm-title" id="egm-title">
                  Edit GEX Levels
                </h3>
                <p className="egm-sub">
                  {formatDate(date)} · {counts.total} level{counts.total === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="egm-close"
              onClick={onClose}
              disabled={upsert.isPending}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Counts KPI Bar */}
          <div className="egm-kpi-bar">
            <div className="egm-kpi">
              <span className="egm-kpi-label">Total</span>
              <span className="egm-kpi-val">{counts.total}</span>
            </div>
            <div className="egm-kpi">
              <span className="egm-kpi-label">BL</span>
              <span className="egm-kpi-val is-bl">{counts.bl}</span>
            </div>
            <div className="egm-kpi">
              <span className="egm-kpi-label">GEX</span>
              <span className="egm-kpi-val is-gex">{counts.gex}</span>
            </div>
            <div className="egm-kpi">
              <span className="egm-kpi-label">Other</span>
              <span className="egm-kpi-val">{counts.other}</span>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="egm-nav-tabs">
            <button
              type="button"
              className={`egm-nav-tab${activeTab === 'table' ? ' is-active' : ''}`}
              onClick={() => handleTabChange('table')}
            >
              <Table size={13} />
              <span>Levels List</span>
            </button>
            <button
              type="button"
              className={`egm-nav-tab${activeTab === 'json' ? ' is-active' : ''}`}
              onClick={() => handleTabChange('json')}
            >
              <FileCode size={13} />
              <span>Raw JSON</span>
            </button>
            <button
              type="button"
              className={`egm-nav-tab${activeTab === 'preview' ? ' is-active' : ''}`}
              onClick={() => handleTabChange('preview')}
            >
              <Layers size={13} />
              <span>TradingView String</span>
            </button>
          </div>

          {/* Body */}
          <div className="egm-body">
            {loading ? (
              <div className="egm-loading">
                <RefreshCw size={18} className="egm-spin" />
                <span>Loading {symbol} levels for {formatDate(date)}…</span>
              </div>
            ) : activeTab === 'table' ? (
              <div className="egm-table-view">
                {/* Actions row */}
                <div className="egm-toolbar">
                  <input
                    type="text"
                    className="egm-search-input"
                    placeholder="Search price, label, type…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />

                  <div className="egm-actions-right">
                    <button
                      type="button"
                      className="egm-btn"
                      onClick={() => handleSortByPrice(true)}
                      title="Sort by price descending"
                    >
                      <ArrowUpDown size={11} />
                      Sort High → Low
                    </button>
                    <button
                      type="button"
                      className="egm-btn egm-btn-accent"
                      onClick={handleAddLevel}
                    >
                      <Plus size={11} />
                      Add Level
                    </button>
                  </div>
                </div>

                {/* Level items list */}
                <div className="egm-level-list">
                  {filteredLevels.length === 0 ? (
                    <div className="egm-empty">
                      {search ? 'No levels match your filter.' : 'No levels defined. Click "Add Level" to create one.'}
                    </div>
                  ) : (
                    filteredLevels.map((lvl, idx) => (
                      <div key={lvl._key} className="egm-level-row">
                        <span className="egm-level-num">#{idx + 1}</span>

                        <select
                          className={`egm-type-select is-${lvl.type.toLowerCase()}`}
                          value={lvl.type}
                          onChange={(e) => handleUpdateLevel(lvl._key, 'type', e.target.value)}
                        >
                          <option value="BL">BL</option>
                          <option value="GEX">GEX</option>
                          <option value="OTHER">OTHER</option>
                        </select>

                        <div className="egm-price-wrap">
                          <span className="egm-price-prefix">$</span>
                          <input
                            type="number"
                            step="any"
                            className="egm-price-input"
                            value={lvl.price}
                            onChange={(e) => handleUpdateLevel(lvl._key, 'price', e.target.value)}
                            placeholder="Price"
                          />
                        </div>

                        <input
                          type="text"
                          className="egm-label-input"
                          value={lvl.label}
                          onChange={(e) => handleUpdateLevel(lvl._key, 'label', e.target.value)}
                          placeholder="Label / description (e.g. Call Resistance 0DTE)"
                        />

                        <button
                          type="button"
                          className="egm-row-del"
                          title="Delete level"
                          onClick={() => handleRemoveLevel(lvl._key)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === 'json' ? (
              <div className="egm-json-view">
                <div className="egm-json-banner">
                  <span>Edit the raw levels array directly. Click <b>Apply JSON</b> to commit changes to the levels table.</span>
                </div>

                {jsonError && (
                  <div className="egm-json-err">
                    <AlertTriangle size={13} />
                    <span>{jsonError}</span>
                  </div>
                )}

                <textarea
                  className="egm-json-textarea"
                  spellCheck={false}
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    if (jsonError) setJsonError(null);
                  }}
                />

                <div className="egm-json-foot">
                  <button
                    type="button"
                    className="egm-btn egm-btn-accent"
                    onClick={handleApplyJson}
                  >
                    <CheckCircle2 size={12} />
                    Apply JSON to Table
                  </button>
                </div>
              </div>
            ) : (
              <div className="egm-preview-view">
                <div className="egm-preview-head">
                  <span>Generated TradingView indicator pipe-string</span>
                  <button
                    type="button"
                    className={`egm-btn${copied ? ' is-copied' : ''}`}
                    onClick={handleCopyConverted}
                  >
                    {copied ? (
                      <><ClipboardCheck size={11} /> Copied</>
                    ) : (
                      <><Copy size={11} /> Copy String</>
                    )}
                  </button>
                </div>

                <pre className="egm-preview-code">
                  {convertedString || 'No valid levels to serialize.'}
                </pre>

                <div className="egm-preview-hint">
                  This string will automatically update in TradingView and user charts once saved.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="egm-foot">
            <button
              type="button"
              className="egm-btn"
              onClick={onClose}
              disabled={upsert.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="egm-btn egm-btn-primary"
              onClick={handleSave}
              disabled={loading || upsert.isPending || levels.length === 0}
            >
              <Save size={12} />
              {upsert.isPending ? 'Saving…' : `Save ${symbol} Changes`}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

const CSS = `
  .egm-overlay {
    position: fixed; inset: 0;
    background: rgba(4,6,9,.78);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    z-index: 3000; padding: 16px;
    animation: egmFade .16s ease;
  }
  .egm-modal {
    width: 100%; max-width: 780px;
    max-height: 90vh; max-height: 90dvh;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 16px;
    color: #E7E9EE;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    display: flex; flex-direction: column;
    overflow: hidden;
    position: relative;
    animation: egmIn .24s cubic-bezier(.2,.8,.25,1);
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95);
  }
  .egm-modal::before {
    content: '';
    position: absolute; left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: egmGrad 4s linear infinite;
  }

  .egm-head {
    padding: 16px 20px 14px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid rgba(255,255,255,.05);
    flex-shrink: 0;
  }
  .egm-head-meta { display: flex; align-items: center; gap: 12px; }
  .egm-sym-pill {
    display: inline-flex; padding: 4px 10px; border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 700; letter-spacing: .06em;
    border: 1px solid;
  }
  .egm-title { margin: 0; font-size: 15px; font-weight: 700; color: #FFFFFF; }
  .egm-sub {
    margin: 2px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: #8892A3;
  }
  .egm-close {
    width: 28px; height: 28px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 8px; border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025); color: #8892A3;
    cursor: pointer; transition: all .18s;
  }
  .egm-close:hover { color: #E7E9EE; background: rgba(255,255,255,.06); }

  .egm-kpi-bar {
    display: grid; grid-template-columns: repeat(4, 1fr);
    padding: 10px 20px; gap: 10px;
    background: rgba(0,0,0,.22);
    border-bottom: 1px solid rgba(255,255,255,.04);
    flex-shrink: 0;
  }
  .egm-kpi {
    padding: 6px 10px; border-radius: 8px;
    background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.04);
    display: flex; flex-direction: column; gap: 1px;
  }
  .egm-kpi-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: #545E6E;
  }
  .egm-kpi-val {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 15px; font-weight: 700; color: #E7E9EE;
  }
  .egm-kpi-val.is-bl { color: var(--accent); }
  .egm-kpi-val.is-gex { color: #60A5FA; }

  .egm-nav-tabs {
    display: flex; padding: 0 20px;
    border-bottom: 1px solid rgba(255,255,255,.06);
    flex-shrink: 0; background: rgba(0,0,0,.12);
  }
  .egm-nav-tab {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 14px; background: transparent; border: none;
    border-bottom: 2px solid transparent; color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600; cursor: pointer;
    transition: all .16s;
  }
  .egm-nav-tab:hover { color: #E7E9EE; }
  .egm-nav-tab.is-active {
    color: var(--accent); border-bottom-color: var(--accent);
  }

  .egm-body {
    flex: 1 1 auto; min-height: 0; overflow-y: auto;
    padding: 16px 20px; display: flex; flex-direction: column;
  }
  .egm-loading {
    padding: 60px 20px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    color: #8892A3; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
  }
  .egm-spin { animation: egmSpin 1s linear infinite; color: var(--accent); }

  .egm-table-view { display: flex; flex-direction: column; gap: 12px; }
  .egm-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; flex-wrap: wrap;
  }
  .egm-search-input {
    flex: 1 1 200px; max-width: 280px;
    padding: 7px 11px; border-radius: 8px;
    background: rgba(10,13,19,.7);
    border: 1px solid rgba(255,255,255,.09);
    color: #E7E9EE; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; outline: none; transition: border-color .16s;
  }
  .egm-search-input:focus { border-color: var(--accent); }
  .egm-actions-right { display: flex; align-items: center; gap: 8px; }

  .egm-level-list {
    display: flex; flex-direction: column; gap: 6px;
    max-height: 380px; overflow-y: auto; padding-right: 4px;
  }
  .egm-level-list::-webkit-scrollbar { width: 6px; }
  .egm-level-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }

  .egm-level-row {
    display: grid;
    grid-template-columns: 36px 90px 140px 1fr 32px;
    align-items: center; gap: 8px;
    padding: 6px 10px; border-radius: 8px;
    background: rgba(255,255,255,.015);
    border: 1px solid rgba(255,255,255,.04);
    transition: background .12s, border-color .12s;
  }
  .egm-level-row:hover {
    background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.07);
  }
  .egm-level-num {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; color: #545E6E; font-weight: 600;
  }
  .egm-type-select {
    padding: 6px 8px; border-radius: 6px;
    background: rgba(10,13,19,.8); border: 1px solid rgba(255,255,255,.1);
    color: #E7E9EE; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 700; outline: none; cursor: pointer;
  }
  .egm-type-select.is-bl { color: var(--accent); }
  .egm-type-select.is-gex { color: #60A5FA; }

  .egm-price-wrap {
    position: relative; display: flex; align-items: center;
  }
  .egm-price-prefix {
    position: absolute; left: 8px; color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px;
    pointer-events: none;
  }
  .egm-price-input {
    width: 100%; padding: 6px 8px 6px 20px; border-radius: 6px;
    background: rgba(10,13,19,.8); border: 1px solid rgba(255,255,255,.1);
    color: #E7E9EE; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; font-weight: 700; outline: none;
    transition: border-color .14s; box-sizing: border-box;
  }
  .egm-price-input:focus { border-color: var(--accent); }

  .egm-label-input {
    width: 100%; padding: 6px 10px; border-radius: 6px;
    background: rgba(10,13,19,.8); border: 1px solid rgba(255,255,255,.1);
    color: #E7E9EE; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; outline: none; transition: border-color .14s;
    box-sizing: border-box;
  }
  .egm-label-input:focus { border-color: var(--accent); }

  .egm-row-del {
    width: 28px; height: 28px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 6px; border: 1px solid transparent;
    background: transparent; color: #545E6E; cursor: pointer;
    transition: all .14s;
  }
  .egm-row-del:hover {
    color: #f87171; background: rgba(239,68,68,.1);
    border-color: rgba(239,68,68,.25);
  }

  .egm-empty {
    padding: 36px 16px; text-align: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; color: #545E6E;
  }

  /* JSON view */
  .egm-json-view { display: flex; flex-direction: column; gap: 10px; }
  .egm-json-banner {
    padding: 8px 12px; border-radius: 8px;
    background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: #8892A3; line-height: 1.5;
  }
  .egm-json-err {
    padding: 8px 12px; border-radius: 8px;
    background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3);
    color: #fca5a5; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; display: flex; align-items: center; gap: 8px;
  }
  .egm-json-textarea {
    width: 100%; min-height: 280px; max-height: 380px;
    padding: 12px 14px; border-radius: 8px;
    background: rgba(10,13,19,.7); border: 1px solid rgba(255,255,255,.1);
    color: #E7E9EE; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.6; outline: none;
    resize: vertical; box-sizing: border-box;
  }
  .egm-json-textarea:focus { border-color: var(--accent); }
  .egm-json-foot { display: flex; justify-content: flex-end; }

  /* Preview view */
  .egm-preview-view { display: flex; flex-direction: column; gap: 10px; }
  .egm-preview-head {
    display: flex; align-items: center; justify-content: space-between;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: #8892A3; font-weight: 600;
  }
  .egm-preview-code {
    margin: 0; padding: 12px 14px; border-radius: 8px;
    background: rgba(10,13,19,.8); border: 1px solid rgba(255,255,255,.08);
    color: #E7E9EE; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.7; white-space: pre-wrap; word-break: break-all;
    max-height: 320px; overflow-y: auto;
  }
  .egm-preview-hint {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; color: #545E6E;
  }

  /* Shared buttons */
  .egm-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03);
    color: #8892A3; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600; cursor: pointer; transition: all .16s;
    white-space: nowrap;
  }
  .egm-btn:hover:not(:disabled) {
    color: #E7E9EE; background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.18); transform: translateY(-1px);
  }
  .egm-btn:disabled { opacity: .4; cursor: not-allowed; }
  .egm-btn.is-copied { color: #4ade80; border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.06); }
  .egm-btn-accent {
    color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .egm-btn-accent:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border-color: var(--accent); color: #FFFFFF;
  }
  .egm-btn-primary {
    border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; font-weight: 700;
    box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent);
  }
  .egm-btn-primary:hover:not(:disabled) {
    filter: brightness(1.08); transform: translateY(-1px);
  }

  .egm-foot {
    display: flex; justify-content: flex-end; gap: 10px;
    padding: 14px 20px; border-top: 1px solid rgba(255,255,255,.05);
    background: rgba(0,0,0,.15); flex-shrink: 0;
  }

  @keyframes egmFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes egmIn {
    from { opacity: 0; transform: translateY(-8px) scale(.98); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes egmGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes egmSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  @media (max-width: 600px) {
    .egm-level-row {
      grid-template-columns: 24px 75px 110px 1fr 28px;
      gap: 5px; padding: 6px;
    }
  }
`;
