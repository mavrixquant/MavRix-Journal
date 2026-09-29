// apps/web/src/features/dashboard/components/filters/LimitsModal.jsx
import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

import { useFilters } from '@/features/dashboard/hooks/useFilters';
import { useStats } from '@/features/dashboard/hooks/useStats';
import Portal from '@/shared/components/Portal';

/* ------------------------------------------------------------------ */
/*  Scoped styles                                                      */
/* ------------------------------------------------------------------ */
const CSS = `
  .lim-overlay {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --win: #35C4A1;
    --loss: #FF5C5C;

    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    animation: limFade .18s ease;
  }
  .lim-modal {
    width: 100%;
    max-width: 480px;
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow:
      0 40px 100px -30px rgba(0,0,0,.95),
      0 0 0 1px rgba(245,158,11,.10);
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    overflow: hidden;
    animation: limModalIn .28s cubic-bezier(.2,.8,.25,1);
    position: relative;
  }
  .lim-modal::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: limGrad 4s linear infinite;
  }
  .lim-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--line-soft);
  }
  .lim-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -.02em;
    color: #FFFFFF;
  }
  .lim-sub {
    margin: 5px 0 0;
    font-size: 12px;
    color: var(--ink-2);
    line-height: 1.5;
  }
  .lim-close {
    background: none;
    border: none;
    color: var(--ink-3);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: all .18s;
  }
  .lim-close:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
  }
  .lim-body {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .lim-card {
    padding: 13px 15px;
    border-radius: 10px;
    background: #161B26;
    border: 1px solid #212836;
    cursor: pointer;
    transition: all .15s;
  }
  .lim-card:hover {
    border-color: #3A4456;
  }
  .lim-card.active {
    background: rgba(255, 176, 32, 0.05);
    border-color: var(--accent);
  }
  .lim-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .lim-radio-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .lim-radio {
    width: 15px;
    height: 15px;
    accent-color: var(--accent);
    cursor: pointer;
    margin: 0;
  }
  .lim-card-title {
    font-size: 13px;
    font-weight: 600;
    color: #C5C9D3;
    cursor: pointer;
  }
  .lim-card.active .lim-card-title {
    color: #FFFFFF;
  }
  .lim-desc {
    margin: 6px 0 0 25px;
    font-size: 11px;
    color: var(--ink-2);
    line-height: 1.55;
  }
  .lim-num-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .lim-num {
    width: 60px;
    background: #0D1117;
    border: 1px solid #2A3241;
    border-radius: 6px;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    text-align: center;
    padding: 5px 6px;
    outline: none;
    transition: all .15s;
  }
  .lim-num:focus {
    border-color: var(--accent);
    color: var(--accent);
  }
  .lim-num:disabled {
    opacity: .5;
    cursor: not-allowed;
  }
  .lim-num.positive:focus { border-color: var(--win); color: var(--win); }
  .lim-num.negative:focus { border-color: var(--loss); color: var(--loss); }
  .lim-num.positive:enabled { color: var(--win); }
  .lim-num.negative:enabled { color: var(--loss); }
  .lim-unit {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-2);
  }
  .lim-sign {
    font-size: 11px;
    font-weight: 700;
  }
  .lim-sign.plus { color: var(--win); }
  .lim-sign.minus { color: var(--loss); }
  .lim-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid var(--line-soft);
    background: rgba(0,0,0,.15);
  }
  .lim-btn {
    padding: 9px 18px;
    border-radius: 9px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s;
    border: 1px solid transparent;
  }
  .lim-btn-cancel {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.1);
    color: var(--ink-2);
  }
  .lim-btn-cancel:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
  }
  .lim-btn-apply {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .lim-btn-apply:hover {
    transform: translateY(-1px);
    box-shadow:
      0 14px 38px -10px rgba(245,158,11,.7),
      inset 0 1px 0 rgba(255,255,255,.5);
  }

  @keyframes limFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes limModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes limGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */
export default function LimitsModal({ isOpen, onClose }) {
  const {
    activeFilterType,
    filterParams,
    setActiveFilterType,
    setFilterParams,
  } = useFilters();
  const { metric } = useStats();
  const isMoney = metric === '$';

  const [localType, setLocalType] = useState(activeFilterType);
  const [localParams, setLocalParams] = useState({ ...filterParams });

  const OPTIONS = useMemo(
    () => [
      {
        id: 'none',
        title: 'No Limits',
        description: isMoney
          ? 'Evaluate all historical trades without session caps or daily $ limits.'
          : 'Evaluate all historical trades without session caps or R-multiple stops.',
      },
      {
        id: 'session',
        title: 'Trades Per Session',
        description: 'Restrict trade evaluations per execution session window.',
        paramKey: 'sessionLimit',
        unit: 'trades',
        min: 1,
      },
      {
        id: 'day',
        title: 'Trades Per Day',
        description: 'Cap the total allowed trades per calendar trading day.',
        paramKey: 'dayLimit',
        unit: 'trades',
        min: 1,
      },
      {
        id: 'rrLimit',
        title: isMoney ? 'Daily P&L Thresholds' : 'Daily R:R Thresholds',
        description: isMoney
          ? 'Stop daily simulation once target profit or max loss ($) is hit.'
          : 'Stop daily simulation once target profit or max drawdown R-multiple is hit.',
        isDouble: true,
      },
    ],
    [isMoney]
  );

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalType(activeFilterType || 'none');
      setLocalParams({
        sessionLimit: 2,
        dayLimit: 2,
        winLimit: isMoney ? 200 : 2.0,
        lossLimit: isMoney ? 100 : 1.0,
        ...filterParams,
      });
    }
  }, [isOpen, activeFilterType, filterParams, isMoney]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateParam = (key, value) =>
    setLocalParams((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => {
    setActiveFilterType(localType);
    setFilterParams(localParams);
    onClose();
  };

  const unitLabel = isMoney ? '$' : 'R';

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="lim-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="lim-modal">
          <div className="lim-head">
            <div>
              <h2 className="lim-title">Advanced Limits & Rules</h2>
              <p className="lim-sub">
                Apply execution caps or daily {isMoney ? '$' : 'R-multiple'} limits
                on top of active dynamic filters.
              </p>
            </div>
            <button className="lim-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="lim-body">
            {OPTIONS.map((opt) => {
              const isSelected = localType === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`lim-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setLocalType(opt.id)}
                >
                  <div className="lim-card-head">
                    <div className="lim-radio-wrap">
                      <input
                        type="radio"
                        className="lim-radio"
                        name="limit-type"
                        checked={isSelected}
                        onChange={() => setLocalType(opt.id)}
                      />
                      <label className="lim-card-title">{opt.title}</label>
                    </div>

                    {opt.paramKey && (
                      <div
                        className="lim-num-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          className="lim-num"
                          value={localParams[opt.paramKey] ?? 1}
                          min={opt.min}
                          step={1}
                          disabled={!isSelected}
                          onChange={(e) => {
                            setLocalType(opt.id);
                            updateParam(
                              opt.paramKey,
                              Math.max(opt.min, Number(e.target.value) || opt.min)
                            );
                          }}
                          onFocus={() => setLocalType(opt.id)}
                        />
                        <span className="lim-unit">{opt.unit}</span>
                      </div>
                    )}

                    {opt.isDouble && (
                      <div
                        className="lim-num-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="lim-sign plus">+</span>
                        <input
                          type="number"
                          className="lim-num positive"
                          value={localParams.winLimit ?? (isMoney ? 200 : 2.0)}
                          min={0.1}
                          step={isMoney ? 1 : 0.1}
                          disabled={!isSelected}
                          onChange={(e) => {
                            setLocalType(opt.id);
                            updateParam(
                              'winLimit',
                              Math.max(0.1, Number(e.target.value) || 0.1)
                            );
                          }}
                          onFocus={() => setLocalType(opt.id)}
                        />
                        <span className="lim-unit">{unitLabel}</span>

                        <span className="lim-sign minus">−</span>
                        <input
                          type="number"
                          className="lim-num negative"
                          value={localParams.lossLimit ?? (isMoney ? 100 : 1.0)}
                          min={0.1}
                          step={isMoney ? 1 : 0.1}
                          disabled={!isSelected}
                          onChange={(e) => {
                            setLocalType(opt.id);
                            updateParam(
                              'lossLimit',
                              Math.max(0.1, Number(e.target.value) || 0.1)
                            );
                          }}
                          onFocus={() => setLocalType(opt.id)}
                        />
                        <span className="lim-unit">{unitLabel}</span>
                      </div>
                    )}
                  </div>
                  <p className="lim-desc">{opt.description}</p>
                </div>
              );
            })}
          </div>

          <div className="lim-foot">
            <button className="lim-btn lim-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="lim-btn lim-btn-apply" onClick={handleApply}>
              Apply Limits
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}