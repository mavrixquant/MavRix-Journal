// src/features/dashboard/DashboardMain.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import {
  GRID_COLS, GRID_ROW_HEIGHT,
  MAX_LAYOUTS, DEFAULT_LAYOUT, PANEL_META,
  buildFreshLayout, buildDefaultLayouts, makeLayoutId, makeLayoutName,
} from './dashboardLayout';
import {
  FaEye, FaEyeSlash, FaUndo, FaTimes, FaCheck, FaGripVertical, FaPlus,
} from 'react-icons/fa';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import Hero from './sections/Hero';
import KPIGrid from './sections/KPIGrid';
import AdvancedKPIGrid from './sections/AdvancedKPIGrid';
import DurationWidget from './sections/DurationWidget';
import SymbolBreakdownTable from './sections/SymbolBreakdownTable';
import Calendar from './sections/Calendar';
import WeeklyChart from './sections/WeeklyCards';
import TradeTable from './sections/TradeTable';
import RRCompareChart from './charts/RRCompareChart';
import UnderwaterChart from './charts/UnderwaterChart';
import TimeChart from './charts/TimeChart';
import MonthlyChart from './charts/MonthlyChart';
import RollingExpectancyChart from './charts/RollingExpectancyChart';
import CategoryBarChart from './charts/CategoryBarChart';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useStats } from '../../hooks/useStats';
import {
  subscribeToUserLayouts,
  saveUserLayouts,
} from '../../../src/firebase/accountsService';

const ResponsiveGridLayout = WidthProvider(Responsive);

const MAX_NAME_LEN = 24;
const DEFAULT_NAME_PATTERN = /^Layout \d+$/;

/* ------------------------------------------------------------------ */
/*  Dashboard CSS — matches landing page language                      */
/* ------------------------------------------------------------------ */
const CSS = `
  /* ---------- Root / ambient background ---------- */
  .dash-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --ink-1: #F3F4F6;
    --ink-2: rgba(255,255,255,.62);
    --ink-3: rgba(255,255,255,.42);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --glass-1: rgba(255,255,255,.045);
    --glass-2: rgba(255,255,255,.012);
    --bg-0: #07090D;
    --bg-1: #0A0D14;

    position: relative;
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
    min-height: 100vh;
    padding: 0 0 40px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    background:
      radial-gradient(900px 520px at 12% -8%, var(--accent-soft), transparent 60%),
      radial-gradient(800px 500px at 90% 4%, rgba(34,211,238,.06), transparent 60%),
      linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 45%, var(--bg-0) 100%);
  }
  .dash-root::before {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
    background-size: 72px 72px;
    -webkit-mask-image: radial-gradient(ellipse 85% 60% at 50% 0%, black 30%, transparent 78%);
    mask-image: radial-gradient(ellipse 85% 60% at 50% 0%, black 30%, transparent 78%);
  }
  .dash-root::after {
    content: '';
    position: absolute;
    top: -180px; left: -10%;
    width: 480px; height: 480px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--accent-soft), transparent 68%);
    animation: dashFloat 9s ease-in-out infinite;
    pointer-events: none;
  }
  .dash-root > * { position: relative; z-index: 1; }

  /* ---------- Scroll progress ---------- */
  .dash-progress {
    position: fixed; top: 0; left: 0; height: 2px; z-index: 200;
    background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent));
    background-size: 200% 100%;
    animation: dashGrad 3s linear infinite;
    box-shadow: 0 0 14px var(--accent);
    transition: width .08s linear;
  }

  /* ---------- Grid ---------- */
  .dash-grid .react-grid-item {
    transition: all 200ms cubic-bezier(.2,.8,.25,1);
    transition-property: left, top;
  }

  /* ---------- Panel (glassy card) ---------- */
  .dash-panel {
    width: 100%;
    height: 100%;
    border-radius: 18px;
    background: linear-gradient(180deg, var(--glass-1), var(--glass-2));
    border: 1px solid var(--line);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    backdrop-filter: blur(10px) saturate(140%);
    transition: border-color .35s ease, box-shadow .35s ease, background .35s ease, transform .35s ease;
  }
  .dash-panel:hover {
    border-color: var(--accent-soft2);
    box-shadow:
      0 24px 60px -30px rgba(0,0,0,.95),
      0 0 40px -18px var(--accent-soft2),
      inset 0 1px 0 rgba(255,255,255,.04);
  }
  .dash-panel .panel-head { flex-shrink: 0; }

  /* ---------- Mouse-tracked glow (outer panels only) ---------- */
  .dash-panel-outer {
    --mx: 50%;
    --my: 0%;
  }
  .dash-panel-outer::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    background: radial-gradient(
      480px 340px at var(--mx, 50%) var(--my, 0%),
      var(--accent-soft),
      transparent 62%
    );
    opacity: 0;
    transition: opacity .35s ease;
    z-index: 0;
  }
  .dash-panel-outer:hover::before { opacity: 0.6; }
  .dash-panel-outer > * { position: relative; z-index: 1; }

  .dash-panel-body {
    flex: 1;
    min-height: 0;
    padding: 14px 16px;
    overflow: hidden;
  }

  /* ---------- Editing state ---------- */
  .dash-panel.dash-editing {
    border-color: var(--accent-soft2);
    box-shadow:
      0 24px 60px -30px rgba(0,0,0,.95),
      0 0 0 1px rgba(245,158,11,.15),
      0 0 50px -20px rgba(245,158,11,.35);
  }
  .dash-panel.dash-editing::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(245,158,11,.055) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,158,11,.055) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  /* ---------- Editor overlay ---------- */
  .dash-editor-overlay {
    position: absolute;
    top: 10px; right: 10px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 6px;
    pointer-events: none;
  }

  .dash-editor-badge {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border-radius: 8px;
    background: rgba(15,18,25,.9);
    backdrop-filter: blur(10px);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-size: 10.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 600;
    letter-spacing: .04em;
    user-select: none;
    cursor: grab;
    box-shadow: 0 8px 24px -12px rgba(0,0,0,.8);
    transition: transform .2s ease, border-color .2s ease;
  }
  .dash-editor-badge:hover { transform: translateY(-1px); border-color: rgba(245,158,11,.55); }
  .dash-editor-badge:active { cursor: grabbing; transform: translateY(0) scale(.98); }

  .dash-editor-toggle {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px; height: 28px;
    border-radius: 8px;
    background: rgba(15,18,25,.9);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,.1);
    color: #8892A3;
    cursor: pointer;
    box-shadow: 0 8px 24px -12px rgba(0,0,0,.8);
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .dash-editor-toggle:hover {
    border-color: rgba(245,158,11,.5);
    color: var(--accent);
    transform: translateY(-1px);
  }
  .dash-editor-toggle.on {
    color: #10B981;
    border-color: rgba(16,185,129,.45);
    background: rgba(16,185,129,.08);
    box-shadow: 0 0 0 1px rgba(16,185,129,.12), 0 8px 24px -12px rgba(16,185,129,.35);
  }
  .dash-editor-toggle.off { color: #545E6E; }

  .dash-panel.dash-hidden {
    opacity: .32;
    filter: grayscale(.7);
  }

  /* ---------- Resize handle ---------- */
  .dash-grid .react-grid-item > .react-resizable-handle {
    width: 22px; height: 22px;
    background-image: none !important;
    padding: 0;
    z-index: 5;
    bottom: 0; right: 0;
  }
  .dash-grid .react-grid-item > .react-resizable-handle::after {
    content: '';
    position: absolute;
    right: 6px; bottom: 6px;
    width: 12px; height: 12px;
    border-right: 2px solid rgba(245,158,11,.4);
    border-bottom: 2px solid rgba(245,158,11,.4);
    border-radius: 0 0 3px 0;
    transition: all .2s ease;
  }
  .dash-grid .react-grid-item > .react-resizable-handle:hover::after {
    border-color: var(--accent);
    width: 15px; height: 15px;
    filter: drop-shadow(0 0 6px rgba(245,158,11,.7));
  }
  .dash-grid:not(.dash-editing) .react-grid-item > .react-resizable-handle {
    display: none !important;
  }

  /* ---------- Drag placeholder ---------- */
  .dash-grid .react-grid-item.react-grid-placeholder {
    background: linear-gradient(180deg, rgba(245,158,11,.18), rgba(245,158,11,.06)) !important;
    border: 1px dashed rgba(245,158,11,.55);
    border-radius: 18px;
    opacity: 1;
    box-shadow: 0 0 40px -10px rgba(245,158,11,.4);
  }
  .dash-grid .react-grid-item.resizing,
  .dash-grid .react-grid-item.react-draggable-dragging {
    z-index: 20;
    box-shadow: 0 24px 60px -20px rgba(0,0,0,.9), 0 0 40px -10px rgba(245,158,11,.35);
  }

  /* ---------- Edit toolbar ---------- */
  .dash-edit-toolbar {
    position: sticky;
    top: 12px;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background: rgba(15,18,25,.82);
    backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--accent-soft2);
    border-radius: 18px;
    margin-bottom: 20px;
    box-shadow:
      0 24px 60px -30px rgba(0,0,0,.95),
      0 0 40px -18px var(--accent-soft2);
    flex-wrap: wrap;
  }
  .dash-edit-toolbar::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    border-radius: 18px 18px 0 0;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: dashGrad 4s linear infinite;
  }

  /* ---------- Layout tabs ---------- */
  .dash-layout-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    background: rgba(0,0,0,.32);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.06);
    backdrop-filter: blur(8px);
  }

  .dash-layout-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    font-size: 11.5px;
    font-weight: 600;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .02em;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: #8892A3;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .dash-layout-tab:hover {
    color: #E7E9EE;
    background: rgba(255,255,255,.04);
  }
  .dash-layout-tab.active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    box-shadow: 0 8px 20px -10px rgba(245,158,11,.6), inset 0 1px 0 rgba(255,255,255,.4);
  }

  .dash-layout-tab-del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 15px; height: 15px;
    border-radius: 4px;
    background: rgba(0,0,0,.2);
    color: inherit;
    font-size: 9px;
    font-weight: 700;
    margin-left: 2px;
    cursor: pointer;
    transition: background-color .15s ease;
  }
  .dash-layout-tab-del:hover { background: rgba(0,0,0,.4); }

  .dash-layout-tab-input {
    padding: 7px 11px;
    font-size: 11.5px;
    font-weight: 600;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    border-radius: 8px;
    background: #0D1117;
    border: 1px solid var(--accent);
    color: #E7E9EE;
    outline: none;
    width: 130px;
    box-shadow: 0 0 0 3px rgba(245,158,11,.15), 0 0 20px -6px rgba(245,158,11,.5);
  }

  .dash-layout-add {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px; height: 28px;
    border-radius: 8px;
    background: transparent;
    border: 1px dashed rgba(255,255,255,.15);
    color: #8892A3;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .dash-layout-add:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(245,158,11,.08);
    transform: translateY(-1px) scale(1.04);
    box-shadow: 0 0 20px -6px rgba(245,158,11,.5);
  }
  .dash-layout-add:disabled {
    opacity: .35;
    cursor: not-allowed;
    border-color: rgba(255,255,255,.08);
    color: #545E6E;
    transform: none;
    box-shadow: none;
  }

  .dash-layout-counter {
    font-size: 10.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    color: #545E6E;
    font-weight: 600;
    padding: 0 6px;
    letter-spacing: .05em;
  }

  /* ---------- Toolbar buttons ---------- */
  .dash-tb-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 15px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.035);
    color: #8892A3;
    backdrop-filter: blur(8px);
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .dash-tb-btn:hover {
    color: #E7E9EE;
    background: rgba(255,255,255,.07);
    border-color: rgba(255,255,255,.24);
    transform: translateY(-1px);
  }
  .dash-tb-btn:active { transform: translateY(0) scale(.98); }

  .dash-tb-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 12.5px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    border: none;
    overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
  }
  .dash-tb-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: dashShine 4.2s ease-in-out infinite;
  }
  .dash-tb-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .dash-tb-primary:active { transform: translateY(0) scale(.98); }

  /* ---------- Section title ---------- */
  .dash-section-title {
    margin-top: 36px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 600;
    color: #E7E9EE;
    letter-spacing: -.01em;
  }
  .dash-section-title .bar {
    width: 4px; height: 18px;
    border-radius: 3px;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 14px rgba(245,158,11,.6);
    flex-shrink: 0;
  }
  .dash-section-title .line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, rgba(245,158,11,.35), rgba(255,255,255,.06) 40%, transparent);
  }

  /* ---------- Trade log panel ---------- */
  .dash-tradelog {
    position: relative;
    background: linear-gradient(180deg, var(--glass-1), var(--glass-2));
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 24px 60px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.03);
    margin-bottom: 24px;
    overflow-x: auto;
    backdrop-filter: blur(10px);
    transition: border-color .35s ease, box-shadow .35s ease;
  }
  .dash-tradelog:hover {
    border-color: var(--accent-soft2);
    box-shadow: 0 24px 60px -30px rgba(0,0,0,.95), 0 0 40px -18px var(--accent-soft2);
  }

  /* ---------- Empty state ---------- */
  .dash-empty-wrap {
    min-height: calc(100vh - 120px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
  }
  .dash-empty {
    position: relative;
    max-width: 520px;
    width: 100%;
    padding: 56px 40px 48px;
    border-radius: 26px;
    background:
      radial-gradient(400px 220px at 50% 0%, rgba(245,158,11,.12), transparent 70%),
      linear-gradient(180deg, var(--glass-1), var(--glass-2));
    border: 1px solid rgba(255,255,255,.1);
    box-shadow:
      0 40px 90px -50px rgba(245,158,11,.5),
      inset 0 1px 0 rgba(255,255,255,.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    overflow: hidden;
  }
  .dash-empty::before {
    content: '';
    position: absolute;
    left: -40%; top: -40%;
    width: 180%; height: 180%;
    background: radial-gradient(circle at 50% 50%, rgba(245,158,11,.08), transparent 45%);
    animation: dashFloat 8s ease-in-out infinite;
    pointer-events: none;
  }
  .dash-empty > * { position: relative; z-index: 1; }

  .dash-empty-icon {
    width: 64px; height: 64px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22px;
    box-shadow: 0 0 40px -8px rgba(245,158,11,.5);
  }

  .dash-empty h3 {
    margin: 0 0 10px;
    font-size: 20px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.02em;
  }
  .dash-empty p {
    margin: 0 0 26px;
    font-size: 13.5px;
    color: rgba(255,255,255,.58);
    line-height: 1.65;
    max-width: 380px;
  }

  /* ---------- "All hidden" state ---------- */
  .dash-allhidden {
    padding: 70px 20px;
    text-align: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    color: #545E6E;
    border: 1px dashed rgba(255,255,255,.08);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.005));
  }
  .dash-allhidden b { color: var(--accent); }

  /* ---------- Keyframes ---------- */
  @keyframes dashGrad {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes dashShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55% { transform: translateX(230%) skewX(-18deg); }
  }
  @keyframes dashFloat {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .dash-edit-toolbar::before,
    .dash-tb-primary::after,
    .dash-empty::before,
    .dash-root::after,
    .dash-progress { animation: none !important; }
    .dash-panel, .dash-tb-btn, .dash-tb-primary, .dash-layout-tab { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Scroll Progress (small, matches landing)                           */
/* ------------------------------------------------------------------ */
function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return <div className="dash-progress" style={{ width: `${p}%` }} aria-hidden />;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function DashboardMain({
  sessionData, dowData, dirData, setupData, factorData, maxAbs, onNavigate,
}) {
  const { state } = useAppContext();
  const { user } = useAuth();
  const { stats, metric } = useStats();

  // Committed (from Firestore)
  const [layouts, setLayouts] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // Draft (only during edit mode)
  const [draftLayouts, setDraftLayouts] = useState(null);
  const [draftActiveId, setDraftActiveId] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const hydratedRef = useRef(false);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 900
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ---- Mouse-tracked panel glow ----
  useEffect(() => {
    if (isMobile) return;
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;

    let raf = 0;
    let pending = null;

    const apply = () => {
      raf = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      pending = null;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
    };

    const onMove = (e) => {
      const el = e.target?.closest?.('.dash-panel-outer');
      if (!el) return;
      const r = el.getBoundingClientRect();
      pending = { el, x: e.clientX - r.left, y: e.clientY - r.top };
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile]);

  // ---- Cloud sync ----
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUserLayouts(user.uid, (remote) => {
      if (!hydratedRef.current) {
        hydratedRef.current = true;

        if (remote && Array.isArray(remote.layouts) && remote.layouts.length > 0) {
          setLayouts(remote.layouts);
          setActiveId(remote.activeId);

          if (remote.migratedFromLegacy) {
            saveUserLayouts(user.uid, remote.layouts, remote.activeId).catch((err) =>
              console.error('[layouts] legacy migration push failed:', err)
            );
          }
          return;
        }

        const seed = buildDefaultLayouts();
        setLayouts(seed);
        setActiveId(seed[0].id);
        saveUserLayouts(user.uid, seed, seed[0].id).catch((err) =>
          console.error('[layouts] initial push failed:', err)
        );
        return;
      }

      if (remote && Array.isArray(remote.layouts) && remote.layouts.length > 0) {
        if (!editMode) {
          setLayouts(remote.layouts);
          setActiveId(remote.activeId);
        }
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const hasData = stats && stats.n > 0;
  const isMoney = metric === '$';
  const unitLabel = isMoney ? 'Net P&L' : 'Total R';

  const committedActive = useMemo(
    () => layouts.find((l) => l.id === activeId) || null,
    [layouts, activeId]
  );
  const committedItems = useMemo(() => {
    if (!committedActive) return [];
    return committedActive.layout
      .filter((it) => it.visible !== false)
      .slice()
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));
  }, [committedActive]);

  const draftActive = useMemo(
    () => draftLayouts?.find((l) => l.id === draftActiveId) || null,
    [draftLayouts, draftActiveId]
  );
  const editItems = draftActive?.layout || [];

  const displayItems = editMode ? editItems : committedItems;

  // ---- Edit lifecycle ----
  const enterEdit = () => {
    if (!layouts.length) return;
    const clone = layouts.map((l) => ({
      ...l,
      layout: l.layout.map((it) => ({ ...it })),
    }));
    setDraftLayouts(clone);
    setDraftActiveId(activeId || clone[0].id);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setDraftLayouts(null);
    setDraftActiveId(null);
    setRenamingId(null);
    setRenameValue('');
    setEditMode(false);
  };

  const saveEdit = () => {
    if (!draftLayouts || !draftActiveId) return;
    setLayouts(draftLayouts);
    setActiveId(draftActiveId);
    if (user?.uid) {
      saveUserLayouts(user.uid, draftLayouts, draftActiveId).catch((err) =>
        console.error('[layouts] save failed:', err)
      );
    }
    setDraftLayouts(null);
    setDraftActiveId(null);
    setRenamingId(null);
    setRenameValue('');
    setEditMode(false);
  };

  // ---- Layout tab actions ----
  const switchDraftLayout = (id) => {
    if (renamingId) commitRename();
    if (id === draftActiveId) return;
    setDraftActiveId(id);
  };

  const addDraftLayout = () => {
    if (!draftLayouts) return;
    if (draftLayouts.length >= MAX_LAYOUTS) return;
    const newLayout = {
      id: makeLayoutId(),
      name: makeLayoutName(draftLayouts.length),
      layout: buildFreshLayout(),
    };
    setDraftLayouts([...draftLayouts, newLayout]);
    setDraftActiveId(newLayout.id);
  };

  const deleteDraftLayout = (id) => {
    if (!draftLayouts || draftLayouts.length <= 1) return;
    const remaining = draftLayouts.filter((l) => l.id !== id);
    const renumbered = remaining.map((l, idx) =>
      DEFAULT_NAME_PATTERN.test(l.name) ? { ...l, name: makeLayoutName(idx) } : l
    );
    setDraftLayouts(renumbered);
    if (draftActiveId === id) {
      setDraftActiveId(renumbered[0].id);
    }
  };

  // ---- Rename handlers ----
  const startRename = (id, currentName) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim().slice(0, MAX_NAME_LEN);
    if (trimmed) {
      setDraftLayouts((prev) =>
        (prev || []).map((l) =>
          l.id === renamingId ? { ...l, name: trimmed } : l
        )
      );
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  // ---- Grid handlers ----
  const handleLayoutChange = (newLayout) => {
    if (!editMode || !draftActiveId) return;
    const byId = new Map(newLayout.map((it) => [it.i, it]));
    setDraftLayouts((prev) =>
      (prev || []).map((l) => {
        if (l.id !== draftActiveId) return l;
        return {
          ...l,
          layout: l.layout.map((item) => {
            const updated = byId.get(item.i);
            if (!updated) return item;
            return { ...item, x: updated.x, y: updated.y, w: updated.w, h: updated.h };
          }),
        };
      })
    );
  };

  const toggleVisible = (id) => {
    setDraftLayouts((prev) =>
      (prev || []).map((l) => {
        if (l.id !== draftActiveId) return l;
        return {
          ...l,
          layout: l.layout.map((item) =>
            item.i === id ? { ...item, visible: !item.visible } : item
          ),
        };
      })
    );
  };

  const handleReset = () => {
    setDraftLayouts((prev) =>
      (prev || []).map((l) => {
        if (l.id !== draftActiveId) return l;
        return { ...l, layout: DEFAULT_LAYOUT.map((it) => ({ ...it })) };
      })
    );
  };

  return (
    <div className="dash-root">
      <style>{CSS}</style>
      <ScrollProgress />

      {!editMode && <DashboardHeader onCustomize={enterEdit} />}

      {!hasData ? (
        <div className="dash-empty-wrap">
          <div className="dash-empty">
            <div className="dash-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <h3>No Trading Data Available</h3>
            <p>
              Log trades in your journal or adjust your active account filters to populate
              performance statistics and analytics.
            </p>
            <button type="button" className="dash-tb-primary">
              Add Your First Trade →
            </button>
          </div>
        </div>
      ) : (
        <>
          {editMode && draftLayouts && (
            <div className="dash-edit-toolbar">
              <FaGripVertical style={{ color: '#F59E0B', flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(245,158,11,.6))' }} size={16} />

              <div style={{ flex: '0 0 auto', minWidth: '200px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#E7E9EE', letterSpacing: '-.01em' }}>
                  Edit Dashboard
                </div>
                <div style={{ fontSize: '11px', color: '#8892A3', marginTop: '3px' }}>
                  Drag · resize · toggle ·{' '}
                  <b style={{ color: '#F59E0B' }}>double-click a tab to rename</b>
                </div>
              </div>

              <div className="dash-layout-tabs">
                {draftLayouts.map((l) => {
                  const isActive = l.id === draftActiveId;
                  const isRenaming = l.id === renamingId;
                  const canDelete = draftLayouts.length > 1;

                  if (isRenaming) {
                    return (
                      <input
                        key={l.id}
                        autoFocus
                        className="dash-layout-tab-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                          else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        maxLength={MAX_NAME_LEN}
                      />
                    );
                  }

                  return (
                    <button
                      key={l.id}
                      type="button"
                      className={`dash-layout-tab ${isActive ? 'active' : ''}`}
                      onClick={() => switchDraftLayout(l.id)}
                      onDoubleClick={() => startRename(l.id, l.name)}
                      title="Double-click to rename"
                    >
                      {l.name}
                      {canDelete && isActive && (
                        <span
                          className="dash-layout-tab-del"
                          role="button"
                          title="Delete this layout"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDraftLayout(l.id);
                          }}
                        >
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className="dash-layout-add"
                  onClick={addDraftLayout}
                  disabled={draftLayouts.length >= MAX_LAYOUTS}
                  title={
                    draftLayouts.length >= MAX_LAYOUTS
                      ? `Maximum ${MAX_LAYOUTS} layouts`
                      : 'Add new layout'
                  }
                >
                  <FaPlus size={10} />
                </button>

                <span className="dash-layout-counter">
                  {draftLayouts.length}/{MAX_LAYOUTS}
                </span>
              </div>

              <div style={{ flex: 1 }} />

              <button onClick={handleReset} className="dash-tb-btn">
                <FaUndo size={11} /> Reset
              </button>
              <button onClick={cancelEdit} className="dash-tb-btn">
                <FaTimes size={11} /> Cancel
              </button>
              <button onClick={saveEdit} className="dash-tb-primary">
                <FaCheck size={11} /> Save Layout
              </button>
            </div>
          )}

          {!editMode && displayItems.length === 0 ? (
            <div className="dash-allhidden">
              All panels are hidden. Click <b>Customize</b> above to show some.
            </div>
          ) : (
            <div className={`dash-grid ${editMode ? 'dash-editing' : ''}`}>
              <ResponsiveGridLayout
                breakpoints={{ lg: 0 }}
                cols={{ lg: GRID_COLS }}
                rowHeight={GRID_ROW_HEIGHT}
                layouts={{ lg: displayItems }}
                onLayoutChange={handleLayoutChange}
                isDraggable={editMode && !isMobile}
                isResizable={editMode && !isMobile}
                compactType="vertical"
                preventCollision={false}
                margin={[16, 16]}
                containerPadding={[0, 0]}
                draggableHandle=".dash-editor-drag-area"
                resizeHandles={['se']}
              >
                {displayItems.map((item) => {
                  const hidden = editMode && item.visible === false;
                  return (
                    <div key={item.i}>
                      <div className={`dash-panel dash-panel-outer ${editMode ? 'dash-editing' : ''} ${hidden ? 'dash-hidden' : ''}`}>
                        {editMode && (
                          <div className="dash-editor-overlay">
                            <div className="dash-editor-badge dash-editor-drag-area">
                              ⠿ {PANEL_META[item.i]?.label || item.i}
                            </div>
                            <button
                              className={`dash-editor-toggle ${item.visible !== false ? 'on' : 'off'}`}
                              onClick={(e) => { e.stopPropagation(); toggleVisible(item.i); }}
                              title={item.visible !== false ? 'Hide this panel' : 'Show this panel'}
                            >
                              {item.visible !== false ? <FaEye size={12} /> : <FaEyeSlash size={12} />}
                            </button>
                          </div>
                        )}
                        <PanelContent
                          id={item.i}
                          isMoney={isMoney}
                          unitLabel={unitLabel}
                          sessionData={sessionData}
                          dowData={dowData}
                          dirData={dirData}
                          onNavigate={onNavigate}
                        />
                      </div>
                    </div>
                  );
                })}
              </ResponsiveGridLayout>
            </div>
          )}

          <div className="dash-section-title">
            <span className="bar" />
            Trade Log
            <div className="line" />
          </div>

          <div className="dash-tradelog">
            <TradeTable />
          </div>

          {!editMode && <DashboardFooter />}
        </>
      )}
    </div>
  );
}

// ---------- Panel shell ----------
function PanelContent({ id, isMoney, unitLabel, sessionData, dowData, dirData, onNavigate }) {
  const Panel = ({ title, note, children, padding }) => (
    <div
      className="dash-panel-inner"
      style={{
        border: 'none',
        boxShadow: 'none',
        background: 'transparent',
        borderRadius: 0,
        height: '100%',
        backdropFilter: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {title && (
        <div
          className="panel-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px 10px',
            borderBottom: '1px solid rgba(255,255,255,.05)',
            flexShrink: 0,
          }}
        >
          <span
            className="panel-title"
            style={{
              fontSize: '13.5px',
              fontWeight: 700,
              color: '#E7E9EE',
              letterSpacing: '-.01em',
            }}
          >
            {title}
          </span>
          {note && (
            <span
              className="panel-note"
              style={{
                fontSize: '10px',
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                letterSpacing: '.06em',
                color: '#F59E0B',
                opacity: .8,
              }}
            >
              {note}
            </span>
          )}
        </div>
      )}
      <div className="dash-panel-body" style={padding ? { padding } : undefined}>
        {children}
      </div>
    </div>
  );

  switch (id) {
    case 'calendar':
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            className="panel-head"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px 10px',
              borderBottom: '1px solid rgba(255,255,255,.05)',
              flexShrink: 0,
            }}
          >
            <span
              className="panel-title"
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#E7E9EE',
                letterSpacing: '-.01em',
              }}
            >
              Monthly Calendar
            </span>
            <span
              className="panel-note"
              style={{
                fontSize: '10px',
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                letterSpacing: '.06em',
                color: '#F59E0B',
                opacity: .8,
              }}
            >
              {isMoney ? 'Net P&L & Weekly' : 'Target R & Weekly'}
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0, padding: '14px 18px', overflow: 'auto' }}>
            <Calendar />
            <div style={{ height: '20px' }} />
            <WeeklyChart />
          </div>
        </div>
      );

    case 'hero':
      return (
        <Panel padding={0}>
          <Hero onNavigate={onNavigate} />
        </Panel>
      );

    case 'monthly':
      return (
        <Panel
          title={isMoney ? 'Monthly Net P&L' : 'Monthly R'}
          note={isMoney ? '$ per month' : 'R per month'}
        >
          <MonthlyChart />
        </Panel>
      );

    case 'underwater':
      return (
        <Panel title="Underwater Curve" note="Drawdown from peak">
          <UnderwaterChart />
        </Panel>
      );

    case 'kpiGrid':
      return <Panel><KPIGrid /></Panel>;
    case 'advancedKpiGrid':
      return <Panel><AdvancedKPIGrid /></Panel>;
    case 'timeChart':
      return <Panel><TimeChart /></Panel>;
    case 'durationWidget':
      return <Panel><DurationWidget /></Panel>;

    case 'rollingExpectancy':
      return (
        <Panel
          title="Rolling 20-Trade Expectancy"
          note={isMoney ? '$ per trade' : 'R per trade'}
        >
          <RollingExpectancyChart />
        </Panel>
      );

    case 'rrCompare':
      return (
        <Panel
          title={isMoney ? 'Symbol Performance' : 'Target R:R Comparison'}
          note={isMoney ? 'Net $ per symbol' : 'Sweep 1:1 → 1:8'}
        >
          {isMoney ? <SymbolBreakdownTable /> : <RRCompareChart />}
        </Panel>
      );

    case 'categoryCharts':
      return (
        <Panel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              height: '100%',
            }}
          >
            {[
              { title: 'Session', note: unitLabel, data: sessionData, horizontal: true },
              { title: 'Day of Week', note: unitLabel, data: dowData, horizontal: false },
              { title: 'Direction', note: 'Long/Short', data: dirData, horizontal: false },
            ].map((p) => (
              <div key={p.title} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    paddingBottom: '6px',
                    borderBottom: '1px solid rgba(255,255,255,.05)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#E7E9EE' }}>{p.title}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      letterSpacing: '.06em',
                      color: '#F59E0B',
                      opacity: .8,
                    }}
                  >
                    {p.note}
                  </span>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <CategoryBarChart data={p.data} horizontal={p.horizontal} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      );

    default:
      return <Panel>Unknown panel: {id}</Panel>;
  }
}