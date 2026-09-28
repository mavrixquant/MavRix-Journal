// apps/web/src/features/dashboard/components/filters/SessionTimeModal.jsx
import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';

import { useFilters } from '@/features/dashboard/hooks/useFilters';
import { generateTimeBlocks } from '@/shared/trading/time';
import Portal from '@/shared/components/Portal';

/* ------------------------------------------------------------------ */
/*  Scoped styles                                                      */
/* ------------------------------------------------------------------ */
const CSS = `
  .st-overlay {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

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
    animation: stFade .18s ease;
  }
  .st-modal {
    width: 100%;
    max-width: 560px;
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
    animation: stModalIn .28s cubic-bezier(.2,.8,.25,1);
    position: relative;
  }
  .st-modal::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: stGrad 4s linear infinite;
    pointer-events: none;
  }

  /* Header */
  .st-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--line-soft);
    flex-shrink: 0;
  }
  .st-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -.02em;
    color: #FFFFFF;
  }
  .st-sub {
    margin: 5px 0 0;
    font-size: 12px;
    color: var(--ink-2);
    line-height: 1.5;
  }
  .st-close {
    background: none;
    border: none;
    color: var(--ink-3);
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: all .18s;
    flex-shrink: 0;
  }
  .st-close:hover {
    color: var(--accent);
    background: rgba(245,158,11,.08);
  }

  /* Body */
  .st-body {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
  }
  .st-body::-webkit-scrollbar { width: 8px; }
  .st-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  /* Mode switch */
  .st-switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 4px;
    background: #161B26;
    border: 1px solid var(--line);
    border-radius: 10px;
    margin-bottom: 20px;
  }
  .st-switch-btn {
    padding: 9px 12px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--ink-2);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all .18s;
  }
  .st-switch-btn:hover {
    color: var(--ink-1);
  }
  .st-switch-btn.active {
    background: #212836;
    color: var(--accent);
  }

  /* Quick actions row */
  .st-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .st-count {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-2);
  }
  .st-count strong {
    color: var(--ink-1);
    font-weight: 700;
  }
  .st-action-group {
    display: flex;
    gap: 12px;
  }
  .st-action-btn {
    background: none;
    border: none;
    color: var(--ink-3);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 5px;
    transition: all .15s;
  }
  .st-action-btn.all {
    color: var(--accent);
  }
  .st-action-btn.all:hover {
    background: rgba(245,158,11,.10);
  }
  .st-action-btn.clear:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.05);
  }

  /* Session cards */
  .st-sessions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 8px;
  }
  .st-session {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 11px 13px;
    border-radius: 9px;
    background: #161B26;
    border: 1px solid #212836;
    cursor: pointer;
    transition: all .15s;
    text-align: left;
  }
  .st-session:hover {
    border-color: #3A4456;
  }
  .st-session.checked {
    background: rgba(255, 176, 32, 0.06);
    border-color: var(--accent);
  }
  .st-session-name {
    font-size: 12px;
    font-weight: 600;
    color: #C5C9D3;
  }
  .st-session.checked .st-session-name {
    color: #FFFFFF;
  }
  .st-session-detail {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    color: var(--ink-2);
    margin-top: 3px;
  }
  .st-checkbox {
    width: 15px;
    height: 15px;
    accent-color: var(--accent);
    cursor: pointer;
    flex-shrink: 0;
  }

  /* Time blocks */
  .st-blocks-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 6px;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .st-block {
    padding: 7px 9px;
    border-radius: 7px;
    background: #161B26;
    border: 1px solid #212836;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    text-align: center;
    cursor: pointer;
    transition: all .15s;
  }
  .st-block:hover {
    border-color: #3A4456;
    color: var(--ink-1);
  }
  .st-block.checked {
    background: rgba(255, 176, 32, 0.10);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }

  /* Footer */
  .st-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid var(--line-soft);
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }
  .st-btn {
    padding: 9px 18px;
    border-radius: 9px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .st-btn-cancel {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.1);
    color: var(--ink-2);
  }
  .st-btn-cancel:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
  }
  .st-btn-apply {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    border: none;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .st-btn-apply:hover {
    transform: translateY(-1px);
    box-shadow:
      0 14px 38px -10px rgba(245,158,11,.7),
      inset 0 1px 0 rgba(255,255,255,.5);
  }

  @keyframes stFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes stModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes stGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const SESSIONS = [
  { id: 'Asia', name: 'Asia', detail: '00:00 - 08:00 UTC' },
  { id: 'London', name: 'London', detail: '07:00 - 15:00 UTC' },
  { id: 'NY Pre-Market', name: 'NY Pre-Market', detail: '12:00 - 14:30 UTC' },
  { id: 'NY AM', name: 'NY AM Session', detail: '14:30 - 17:00 UTC' },
  { id: 'NY Lunch', name: 'NY Lunch Hour', detail: '17:00 - 18:30 UTC' },
  { id: 'NY PM', name: 'NY PM Session', detail: '18:30 - 21:00 UTC' },
  { id: 'After Hours', name: 'After Hours', detail: '21:00 - 00:00 UTC' },
];

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */
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
  const [localBlocks, setLocalBlocks] = useState([]);

  const timeBlocks = useMemo(() => generateTimeBlocks(), []);

  // Sync local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalMode(stMode || 'session');
      setLocalSessions([...(selectedSessions || [])]);
      setLocalBlocks([...(selectedTimeBlocks || [])]);
    }
  }, [isOpen, stMode, selectedSessions, selectedTimeBlocks]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSession = (id) => {
    setLocalSessions((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleBlock = (val) => {
    setLocalBlocks((prev) =>
      prev.includes(val) ? prev.filter((b) => b !== val) : [...prev, val]
    );
  };

  const selectAll = () => {
    if (localMode === 'session') setLocalSessions(SESSIONS.map((s) => s.id));
    else setLocalBlocks(timeBlocks.map((t) => t.value));
  };

  const clearAll = () => {
    if (localMode === 'session') setLocalSessions([]);
    else setLocalBlocks([]);
  };

  const handleApply = () => {
    setSTMode(localMode);
    setSelectedSessions(localSessions);
    setSelectedTimeBlocks(localBlocks);
    onClose();
  };

  const currentCount = localMode === 'session' ? localSessions.length : localBlocks.length;
  const maxCount = localMode === 'session' ? SESSIONS.length : timeBlocks.length;

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="st-overlay"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="st-modal">
          {/* Header */}
          <div className="st-head">
            <div>
              <h2 className="st-title">Session & Time Filter</h2>
              <p className="st-sub">
                Filter trade statistics by market session or 30-minute execution windows.
              </p>
            </div>
            <button className="st-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="st-body">
            {/* Mode switch */}
            <div className="st-switch">
              <button
                type="button"
                className={`st-switch-btn ${localMode === 'session' ? 'active' : ''}`}
                onClick={() => setLocalMode('session')}
              >
                Market Sessions
              </button>
              <button
                type="button"
                className={`st-switch-btn ${localMode === 'time' ? 'active' : ''}`}
                onClick={() => setLocalMode('time')}
              >
                30-Min Time Blocks
              </button>
            </div>

            {/* Quick actions */}
            <div className="st-actions">
              <span className="st-count">
                Selected: <strong>{currentCount}</strong> / {maxCount}
              </span>
              <div className="st-action-group">
                <button className="st-action-btn all" onClick={selectAll}>
                  Select All
                </button>
                <button className="st-action-btn clear" onClick={clearAll}>
                  Clear
                </button>
              </div>
            </div>

            {/* Sessions */}
            {localMode === 'session' && (
              <div className="st-sessions-grid">
                {SESSIONS.map((s) => {
                  const checked = localSessions.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`st-session ${checked ? 'checked' : ''}`}
                    >
                      <div>
                        <div className="st-session-name">{s.name}</div>
                        <div className="st-session-detail">{s.detail}</div>
                      </div>
                      <input
                        type="checkbox"
                        className="st-checkbox"
                        checked={checked}
                        onChange={() => toggleSession(s.id)}
                      />
                    </label>
                  );
                })}
              </div>
            )}

            {/* Time blocks */}
            {localMode === 'time' && (
              <div className="st-blocks-grid">
                {timeBlocks.map((t) => {
                  const checked = localBlocks.includes(t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      className={`st-block ${checked ? 'checked' : ''}`}
                      onClick={() => toggleBlock(t.value)}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="st-foot">
            <button className="st-btn st-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="st-btn st-btn-apply" onClick={handleApply}>
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}