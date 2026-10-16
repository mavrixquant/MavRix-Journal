// apps/web/src/features/dashboard/components/optimize/OptimizeModal.jsx
//
// Optimize filter-combination sweep.
//
// PHASE 2.3 — CSS TOKEN SCOPE FIX + ASCII-ONLY GLYPHS
// ---------------------------------------------------
//   • Every --opt-* token is now declared on :root, NOT on a wrapper class.
//     Reason: Radix PopoverContent portals to document.body, which is a
//     SIBLING of the modal wrapper -- so tokens scoped to a wrapper class
//     were invisible to the portaled dropdown, causing transparent
//     backgrounds and missing borders.
//   • All decorative Unicode (emoji, box-drawing, arrows) removed and
//     replaced with ASCII text or inline SVG, so nothing renders as tofu
//     on any platform.
//
// PHASE 2.2 — RESULT TABLE + UI POLISH
//   • table-layout: fixed + explicit <col> widths so long Combination
//     strings cannot crush the numeric columns.
//   • Modal 1400x92vh, denser typography (10.5px body / 9.5px headers).
//   • Gold/silver/bronze rank medals, zebra rows, sticky header, summary
//     bar, empty state, gradient progress bar.
//
// PHASE 2.1 — DROPDOWN DISMISSAL
//   • Controlled Popovers keyed by a single `openKey` state.
//   • Document-level pointerdown + Escape close the open panel.

import { useState, useEffect, useMemo } from 'react';
import Portal from '@/shared/components/Portal';
import { useOptimization } from '@/features/dashboard/hooks/useOptimization';
import { useAppContext } from '@/app/providers/AppProvider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
const OPTIMIZE_PAGE_SIZE = 50;

/* ------------------------------------------------------------------ */
/*  Inline SVG icons (no font dependency, no tofu)                    */
/* ------------------------------------------------------------------ */

function ChevronDown() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="20" y1="20" x2="16" y2="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Scoped styles                                                      */
/*                                                                     */
/*  Tokens live on :root so the portaled Radix popover can read them.  */
/* ------------------------------------------------------------------ */

const optimalizeModalStyles = `
  /* ---------------- Design tokens (GLOBAL) ---------------- */
  :root {
    --opt-bg: #121318;
    --opt-card-bg: #1a1c23;
    --opt-card-bg-2: #16181f;
    --opt-border: #2a2d3d;
    --opt-border-soft: rgba(255,255,255,.055);
    --opt-text: #e2e8f0;
    --opt-text-dim: #94a3b8;
    --opt-text-faint: #64748b;
    --opt-amber: var(--accent);
    --opt-amber-hover: #d97706;
    --opt-win: #10b981;
    --opt-loss: #ef4444;
    --opt-gold: #fbbf24;
    --opt-silver: #cbd5e1;
    --opt-bronze: #d19a66;
    --opt-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
  }

  /* ---------------- Overlay + shell ---------------- */
  .opt-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 12px;
    opacity: 0;
    transition: opacity .18s ease;
  }
  .opt-modal-overlay.is-open { opacity: 1; }

  .opt-modal-container {
    background: var(--opt-bg);
    border: 1px solid var(--opt-border);
    border-radius: 14px;
    width: 96vw;
    max-width: 1400px;
    height: 92vh;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.6),
      0 0 0 1px color-mix(in srgb, var(--accent) 6%, transparent);
    color: var(--opt-text);
    overflow: hidden;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 12px;
  }

  /* ---------------- Header ---------------- */
  .opt-modal-header {
    padding: 14px 22px;
    border-bottom: 1px solid var(--opt-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .opt-header-title { display: flex; align-items: center; gap: 12px; }

  .opt-header-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    color: var(--opt-amber);
    flex-shrink: 0;
  }

  .opt-header-title h2 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -.01em;
  }
  .opt-subtitle {
    font-size: 11px;
    color: var(--opt-text-dim);
    margin: 2px 0 0 0;
    line-height: 1.4;
  }

  .opt-close-btn {
    background: none;
    border: 1px solid transparent;
    color: var(--opt-text-dim);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all .15s;
  }
  .opt-close-btn:hover {
    color: #fff;
    background: var(--opt-border);
    border-color: var(--opt-border);
  }

  /* ---------------- Body ---------------- */
  .opt-modal-body {
    padding: 16px 22px 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1 1 auto;
    min-height: 0;
  }
  .opt-modal-body::-webkit-scrollbar { width: 8px; }
  .opt-modal-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  /* ---------------- Section label ---------------- */
  .opt-section-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .14em;
    color: var(--opt-text-faint);
    margin-bottom: 8px;
    display: block;
  }
  .opt-empty-text {
    font-size: 11.5px;
    color: var(--opt-text-faint);
    font-family: var(--opt-mono);
    padding: 12px 0;
    margin: 0;
  }

  /* ---------------- Column cards ---------------- */
  .opt-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
  }
  .opt-card {
    background: var(--opt-card-bg);
    border: 1px solid var(--opt-border);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    transition: border-color .15s ease, background-color .15s ease;
  }
  .opt-card.active {
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent) 4%, var(--opt-card-bg)),
      var(--opt-card-bg)
    );
  }
  .opt-checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    font-weight: 500;
    font-size: 12px;
    min-width: 0;
    flex: 1;
  }
  .opt-checkbox-wrapper input[type="checkbox"] {
    accent-color: var(--opt-amber);
    width: 13px;
    height: 13px;
    flex-shrink: 0;
    cursor: pointer;
  }
  .opt-card-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ---------------- Dropdown trigger ---------------- */
  .opt-dropdown-container { position: relative; flex-shrink: 0; }

  .opt-dropdown-btn {
    background: var(--opt-bg);
    border: 1px solid var(--opt-border);
    color: var(--opt-text);
    padding: 4px 9px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    transition: border-color .15s;
  }
  .opt-dropdown-btn:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .opt-dropdown-btn:disabled {
    opacity: .4;
    cursor: not-allowed;
  }
  .opt-dropdown-btn svg { flex-shrink: 0; }

  /* ---------------- Radix popover content ----------------
     BACKGROUND IS HARD-CODED as a fallback IN ADDITION to the
     token, so it renders correctly even if the token somehow
     fails to load (e.g. before :root is parsed). */
  .opt-radix-pop {
    z-index: 10000 !important;
    min-width: 200px;
    max-height: 280px;
    overflow-y: auto;
    background: #1a1c23 !important;
    background: var(--opt-card-bg, #1a1c23) !important;
    border: 1px solid #2a2d3d !important;
    border-color: var(--opt-border, #2a2d3d) !important;
    border-radius: 8px !important;
    padding: 6px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55);
    color: #e2e8f0 !important;
    color: var(--opt-text, #e2e8f0) !important;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 11.5px;
  }
  .opt-radix-pop::-webkit-scrollbar { width: 6px; }
  .opt-radix-pop::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  .opt-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    font-size: 11.5px;
    border-radius: 4px;
    cursor: pointer;
    color: inherit;
  }
  .opt-dropdown-item:hover { background: rgba(255,255,255,.06); }
  .opt-dropdown-item input[type="checkbox"] {
    accent-color: var(--opt-amber, #f59e0b);
    width: 12px;
    height: 12px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .opt-dropdown-divider {
    height: 1px;
    background: rgba(255,255,255,.08);
    margin: 4px 0;
  }

  /* ---------------- Controls bar ---------------- */
  .opt-controls-bar {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    padding: 10px 12px;
    background: var(--opt-card-bg);
    border-radius: 8px;
    border: 1px solid var(--opt-border);
  }
  .opt-rr-wrapper { display: flex; align-items: center; gap: 8px; }
  .opt-control-label {
    font-size: 11px;
    color: var(--opt-text-dim);
    font-weight: 500;
  }

  .opt-btn {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
  }
  .opt-btn-primary {
    background: var(--opt-amber);
    color: #000;
    font-weight: 600;
  }
  .opt-btn-primary:hover:not(:disabled) { background: var(--opt-amber-hover); }
  .opt-btn-primary:disabled { opacity: .5; cursor: not-allowed; }

  .opt-btn-secondary {
    background: var(--opt-bg);
    border: 1px solid var(--opt-border);
    color: var(--opt-text);
  }
  .opt-btn-secondary:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .opt-btn-secondary:disabled { opacity: .4; cursor: not-allowed; }

  .opt-status-badge {
    font-size: 11px;
    color: var(--opt-text-dim);
    font-family: var(--opt-mono);
    letter-spacing: .02em;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(255,255,255,.03);
    border: 1px solid var(--opt-border-soft);
  }

  /* ---------------- Progress ---------------- */
  .opt-progress-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: var(--opt-card-bg);
    border: 1px solid var(--opt-border);
    border-radius: 8px;
  }
  .opt-progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--opt-text-dim);
    font-family: var(--opt-mono);
  }
  .opt-progress-track {
    height: 4px;
    background: rgba(255,255,255,.06);
    border-radius: 99px;
    overflow: hidden;
  }
  .opt-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--opt-amber), #fbbf24);
    border-radius: 99px;
    transition: width .2s ease;
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 50%, transparent);
  }

  /* ---------------- Results section ---------------- */
  .opt-results-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1 1 auto;
    min-height: 0;
  }
  .opt-results-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 12px;
    background: var(--opt-card-bg);
    border: 1px solid var(--opt-border);
    border-radius: 8px;
    font-size: 11.5px;
    color: var(--opt-text-dim);
    font-family: var(--opt-mono);
  }
  .opt-results-summary strong {
    color: var(--opt-text);
    font-weight: 700;
  }
  .opt-results-summary .pos { color: var(--opt-win); }
  .opt-results-summary .neg { color: var(--opt-loss); }
  .opt-results-summary-sep { color: var(--opt-text-faint); opacity: .6; }

  /* ---------------- Results table ---------------- */
  .opt-table-wrapper {
    flex: 1 1 auto;
    min-height: 0;
    max-height: 60vh;
    overflow: auto;
    border: 1px solid var(--opt-border);
    border-radius: 10px;
    background: var(--opt-card-bg-2);
  }
  .opt-table-wrapper::-webkit-scrollbar { width: 8px; height: 8px; }
  .opt-table-wrapper::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.10);
    border-radius: 99px;
  }
  .opt-table-wrapper::-webkit-scrollbar-corner { background: transparent; }

  .opt-table {
    width: 100%;
    min-width: 900px;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    font-size: 10.5px;
    font-family: var(--opt-mono);
  }

  .opt-table thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #1e2028;
    padding: 8px 10px;
    text-align: left;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--opt-text-dim);
    border-bottom: 1px solid var(--opt-border);
    white-space: nowrap;
    user-select: none;
  }
  .opt-table thead th.text-right { text-align: right; }
  .opt-table thead th.text-center { text-align: center; }

  .opt-table tbody tr {
    transition: background-color .1s ease;
  }
  .opt-table tbody tr:nth-child(even) {
    background: rgba(255,255,255,.012);
  }
  .opt-table tbody tr:hover {
    background: rgba(255,255,255,.045);
  }

  .opt-table td {
    padding: 7px 10px;
    border-bottom: 1px solid var(--opt-border-soft);
    color: var(--opt-text);
    vertical-align: middle;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .opt-rank {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    font-weight: 700;
    font-family: var(--opt-mono);
  }
  .opt-rank-1 { color: var(--opt-gold); }
  .opt-rank-2 { color: var(--opt-silver); }
  .opt-rank-3 { color: var(--opt-bronze); }
  .opt-rank-n { color: var(--opt-text-faint); }

  .opt-combo {
    color: var(--opt-text);
    font-family: var(--opt-mono);
    font-size: 10.5px;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .opt-num { text-align: right; font-variant-numeric: tabular-nums; }
  .opt-num.pos { color: var(--opt-win); font-weight: 700; }
  .opt-num.neg { color: var(--opt-loss); font-weight: 700; }
  .opt-num.dim { color: var(--opt-text-dim); }

  /* ---------------- Empty state ---------------- */
  .opt-empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--opt-text-faint);
    font-family: var(--opt-mono);
    font-size: 11.5px;
    line-height: 1.7;
    border: 1px dashed var(--opt-border);
    border-radius: 10px;
    background: rgba(255,255,255,.01);
  }
  .opt-empty-title {
    color: var(--opt-text-dim);
    font-weight: 600;
    margin-bottom: 4px;
  }

  /* ---------------- Pagination ---------------- */
  .opt-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
    font-size: 11.5px;
    color: var(--opt-text-dim);
    font-family: var(--opt-mono);
  }
  .opt-pagination b { color: var(--opt-text); }

  /* ---------------- Utilities ---------------- */
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-mono { font-family: var(--opt-mono); }
  .font-bold { font-weight: 600; }

  /* ---------------- Reduced motion ---------------- */
  @media (prefers-reduced-motion: reduce) {
    .opt-modal-overlay,
    .opt-progress-bar,
    .opt-btn,
    .opt-table tbody tr,
    .opt-dropdown-btn,
    .opt-close-btn { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Selectors used by the outside-click handler                        */
/* ------------------------------------------------------------------ */
const POPPER_CONTENT_SELECTOR = '[data-radix-popper-content-wrapper]';
const TRIGGER_SELECTOR = '[data-opt-pop-trigger]';

/* ------------------------------------------------------------------ */
/*  Number formatting                                                  */
/* ------------------------------------------------------------------ */
function formatValue(v, isMoney) {
  if (v == null || Number.isNaN(Number(v))) return '-';
  const n = Number(v);
  if (isMoney) {
    const sign = n < 0 ? '-' : '+';
    return `${sign}$${Math.abs(n).toFixed(2)}`;
  }
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}R`;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
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
    isMoney,
  } = useOptimization();

  /* ---------------- Single-key dropdown controller ---------------- */
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    if (!openKey) return undefined;

    const onPointerDown = (e) => {
      if (e.target.closest(POPPER_CONTENT_SELECTOR)) return;
      if (e.target.closest(TRIGGER_SELECTOR)) return;
      setOpenKey(null);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpenKey(null);
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [openKey]);

  /* ---------------- Reset on open ---------------- */
  useEffect(() => {
    if (isOpen) {
      resetOptimization();
      setOpenKey(null);
    }
  }, [isOpen, resetOptimization]);

  /* ---------------- Eligible filter columns ---------------- */
  const filterColumns = useMemo(() => {
    const counts = {};
    (state.dynamicFilterKeys || []).forEach(key => {
      counts[key] = new Set(
        (state.trades || []).map(t => t.dynamic?.[key])
      ).size;
    });
    return (state.dynamicFilterKeys || []).filter(key =>
      key.toLowerCase() !== 'session' &&
      counts[key] > 1 &&
      counts[key] < 10
    );
  }, [state.dynamicFilterKeys, state.trades]);

  const getColumnOptions = (key) => {
    return [...new Set((state.trades || []).map(t => t.dynamic?.[key]))]
      .filter(v => v && v !== '-')
      .sort();
  };

  const bestResult = results.length > 0 ? results[0] : null;

  if (!isOpen) return null;

  /* ---------------- Handlers ---------------- */
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

  const valueHeader = isMoney ? 'Net P&L' : 'Total R';

  /* ---------------- Render ---------------- */
  return (
    <Portal>
      <style>{optimalizeModalStyles}</style>
      <div
        className={`opt-modal-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={handleClose}
      >
        <div
          className="opt-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ============== Header ============== */}
          <div className="opt-modal-header">
            <div className="opt-header-title">
              <span className="opt-header-icon" aria-hidden>
                <SearchIcon />
              </span>
              <div>
                <h2>Optimize Filter Combinations</h2>
                <p className="opt-subtitle">
                  {isMoney
                    ? 'Compute net P&L for every combination of your selected filter values.'
                    : 'Compute multi-variable trade results across your current session parameters.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="opt-close-btn"
              onClick={handleClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>

          {/* ============== Body ============== */}
          <div className="opt-modal-body">

            {/* ---------- Filter configuration ---------- */}
            <div className="opt-section">
              <label className="opt-section-label">
                Select Active Filter Columns
              </label>
              <div className="opt-grid">
                {filterColumns.length === 0 ? (
                  <p className="opt-empty-text">
                    No eligible filter columns found (requires 2-9 unique values).
                  </p>
                ) : (
                  filterColumns.map(key => {
                    const options = getColumnOptions(key);
                    const enabled = columnEnabled[key] || false;
                    const selected = columnValues[key] || [];
                    const isOpenHere = openKey === key;

                    return (
                      <div
                        key={key}
                        className={`opt-card ${enabled ? 'active' : ''}`}
                      >
                        <label className="opt-checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => toggleColumn(key, e.target.checked)}
                          />
                          <span className="opt-card-title" title={key}>
                            {key}
                          </span>
                        </label>

                        <div className="opt-dropdown-container">
                          <Popover
                            open={isOpenHere}
                            onOpenChange={(next) =>
                              setOpenKey(
                                next
                                  ? key
                                  : (prev) => (prev === key ? null : prev)
                              )
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="opt-dropdown-btn"
                                data-opt-pop-trigger=""
                                disabled={!enabled}
                              >
                                <span>{getButtonLabel(key)}</span>
                                <ChevronDown />
                              </button>
                            </PopoverTrigger>

                            <PopoverContent
                              align="end"
                              sideOffset={4}
                              collisionPadding={8}
                              className="opt-radix-pop"
                            >
                              <label className="opt-dropdown-item font-bold">
                                <input
                                  type="checkbox"
                                  checked={
                                    selected.length === options.length &&
                                    options.length > 0
                                  }
                                  onChange={(e) =>
                                    handleSelectAll(key, e.target.checked)
                                  }
                                />
                                <span>Select All ({options.length})</span>
                              </label>
                              <div className="opt-dropdown-divider" />
                              {options.map(val => (
                                <label
                                  key={val}
                                  className="opt-dropdown-item"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(val)}
                                    onChange={(e) =>
                                      handleValueChange(
                                        key,
                                        val,
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <span>{val}</span>
                                </label>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ---------- Controls bar ---------- */}
            <div className="opt-controls-bar">
              {!isMoney && (
                <div className="opt-rr-wrapper">
                  <span className="opt-control-label">Target R:R</span>
                  <div className="opt-dropdown-container">
                    <Popover
                      open={openKey === 'rr'}
                      onOpenChange={(next) =>
                        setOpenKey(
                          next
                            ? 'rr'
                            : (prev) => (prev === 'rr' ? null : prev)
                        )
                      }
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="opt-dropdown-btn"
                          data-opt-pop-trigger=""
                        >
                          <span>{getRRButtonLabel()}</span>
                          <ChevronDown />
                        </button>
                      </PopoverTrigger>

                      <PopoverContent
                        align="start"
                        sideOffset={4}
                        collisionPadding={8}
                        className="opt-radix-pop"
                      >
                        <label className="opt-dropdown-item font-bold">
                          <input
                            type="checkbox"
                            checked={rrSelected.length === RR_LEVELS.length}
                            onChange={(e) =>
                              setRRSelection(
                                e.target.checked ? [...RR_LEVELS] : []
                              )
                            }
                          />
                          <span>All Target R:R</span>
                        </label>
                        <div className="opt-dropdown-divider" />
                        {RR_LEVELS.map(r => (
                          <label key={r} className="opt-dropdown-item">
                            <input
                              type="checkbox"
                              checked={rrSelected.includes(r)}
                              onChange={(e) =>
                                handleRRToggle(r, e.target.checked)
                              }
                            />
                            <span>1:{r}</span>
                          </label>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <div className="opt-actions">
                <button
                  type="button"
                  className="opt-btn opt-btn-primary"
                  onClick={handleRun}
                  disabled={
                    isRunning ||
                    !hasEnabledColumns ||
                    (!isMoney && rrSelected.length === 0)
                  }
                >
                  {isRunning ? (
                    'Optimizing...'
                  ) : (
                    <>
                      <PlayIcon />
                      <span>Run Optimization</span>
                    </>
                  )}
                </button>
              </div>

              {status && <div className="opt-status-badge">{status}</div>}
            </div>

            {/* ---------- Progress ---------- */}
            {isRunning && (
              <div className="opt-progress-container">
                <div className="opt-progress-header">
                  <span>Processing Combinations</span>
                  <span>{progress}%</span>
                </div>
                <div className="opt-progress-track">
                  <div
                    className="opt-progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ---------- Results ---------- */}
            {results.length > 0 && (
              <div className="opt-results-section">

                {/* Summary bar */}
                <div className="opt-results-summary">
                  <span>
                    <strong>{results.length}</strong> combinations
                  </span>
                  {bestResult && (
                    <>
                      <span className="opt-results-summary-sep">|</span>
                      <span>
                        Best:{' '}
                        <strong
                          className={
                            bestResult.totalR >= 0 ? 'pos' : 'neg'
                          }
                        >
                          {formatValue(bestResult.totalR, isMoney)}
                        </strong>
                      </span>
                      <span className="opt-results-summary-sep">|</span>
                      <span
                        title={bestResult.comboDisplay}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '50%',
                        }}
                      >
                        {bestResult.comboDisplay}
                      </span>
                    </>
                  )}
                </div>

                {/* Table */}
                <div className="opt-table-wrapper">
                  <table className="opt-table">
                    <colgroup>
                      <col style={{ width: '64px' }} />
                      <col />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '86px' }} />
                      <col style={{ width: '86px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '96px' }} />
                      <col style={{ width: '72px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="text-center">Rank</th>
                        <th>Combination</th>
                        <th className="text-right">{valueHeader}</th>
                        <th className="text-right">Win %</th>
                        <th className="text-right">PF</th>
                        <th className="text-right">Expectancy</th>
                        <th className="text-right">Max Loss</th>
                        <th className="text-right">Trades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageResults.map((r, idx) => {
                        const globalIndex =
                          (currentPage - 1) * OPTIMIZE_PAGE_SIZE + idx + 1;
                        const val = r.totalR;
                        const isWin = val >= 0;
                        const valueText = formatValue(val, isMoney);
                        const expText = formatValue(r.expectancy, isMoney);

                        const rankCls =
                          globalIndex === 1 ? 'opt-rank-1'
                          : globalIndex === 2 ? 'opt-rank-2'
                          : globalIndex === 3 ? 'opt-rank-3'
                          : 'opt-rank-n';

                        return (
                          <tr key={globalIndex}>
                            <td className="text-center">
                              <span className={`opt-rank ${rankCls}`}>
                                #{globalIndex}
                              </span>
                            </td>
                            <td>
                              <div
                                className="opt-combo"
                                title={r.comboDisplay}
                              >
                                {r.comboDisplay}
                              </div>
                            </td>
                            <td
                              className={`opt-num ${isWin ? 'pos' : 'neg'}`}
                            >
                              {valueText}
                            </td>
                            <td className="opt-num dim">
                              {r.winRate.toFixed(1)}%
                            </td>
                            <td className="opt-num dim">
                              {Number.isFinite(r.profitFactor)
                                ? r.profitFactor.toFixed(2)
                                : 'inf'}
                            </td>
                            <td
                              className={`opt-num ${
                                r.expectancy >= 0 ? 'pos' : 'neg'
                              }`}
                            >
                              {expText}
                            </td>
                            <td className="opt-num dim">{r.lossStreak}</td>
                            <td className="opt-num dim">{r.trades}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="opt-pagination">
                  <button
                    type="button"
                    className="opt-btn opt-btn-secondary"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft />
                    <span>Prev</span>
                  </button>
                  <span>
                    Page <b>{currentPage}</b> of <b>{totalPages}</b>
                  </span>
                  <button
                    type="button"
                    className="opt-btn opt-btn-secondary"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    <span>Next</span>
                    <ChevronRight />
                  </button>
                </div>
              </div>
            )}

            {/* ---------- Empty state (post-run, no matches) ---------- */}
            {!isRunning && results.length === 0 && status.startsWith('Done') && (
              <div className="opt-empty">
                <div className="opt-empty-title">No combinations found</div>
                <div>
                  Try enabling more columns, adding more values, or
                  loosening your session / limits filters.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}