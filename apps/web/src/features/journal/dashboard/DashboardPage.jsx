// apps/web/src/features/journal/dashboard/DashboardPage.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import DashboardHeader from './components/DashboardHeader';
import DashboardFooter from '@/features/dashboard/components/DashboardFooter';
import {
  GRID_COLS,
  GRID_COLS_BY_BP,
  GRID_BREAKPOINTS,
  GRID_ROW_HEIGHT,
  MAX_LAYOUTS,
  DEFAULT_LAYOUT,
  buildFreshLayout,
  buildDefaultLayouts,
  buildMobileLayout,
  makeLayoutId,
  makeLayoutName,
  scaleLayoutToBreakpoint,
  upscaleToLg,
} from '@/features/dashboard/layout/dashboardLayout';
import {
  FaEye,
  FaEyeSlash,
  FaUndo,
  FaTimes,
  FaCheck,
  FaGripVertical,
  FaPlus,
} from 'react-icons/fa';
import { useAuth } from '@/app/providers/AuthProvider';
import { useStats } from '@/features/dashboard/hooks/useStats';
import {
  subscribeToUserLayouts,
  saveUserLayouts,
} from '@/features/dashboard/api/layouts';

import { PANEL_REGISTRY, panelLabel } from '@/features/dashboard/components/panels/panelRegistry';
import { PanelSkeleton } from '@/shared/ui/panel-skeleton';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import TradeTable from '@/features/dashboard/components/panels/TradeTable';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const MAX_NAME_LEN = 24;
const DEFAULT_NAME_PATTERN = /^Layout \d+$/;

/* ------------------------------------------------------------------ */
/*  Dashboard CSS                                                      */
/* ------------------------------------------------------------------ */
const CSS = `
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
  }
  .dash-grid .react-grid-item {
    transition: all 200ms cubic-bezier(.2,.8,.25,1);
    transition-property: left, top;
  }
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
    transition: border-color .35s ease, box-shadow .35s ease, background .35s ease;
  }
  .dash-panel:hover {
    border-color: var(--accent-soft2);
    box-shadow:
      0 24px 60px -30px rgba(0,0,0,.95),
      0 0 40px -18px var(--accent-soft2),
      inset 0 1px 0 rgba(255,255,255,.04);
  }
  .dash-panel.dash-editing {
    border-color: var(--accent-soft2);
    box-shadow:
      0 24px 60px -30px rgba(0,0,0,.95),
      0 0 0 1px rgba(245,158,11,.15),
      0 0 50px -20px rgba(245,158,11,.35);
  }
  .dash-panel.dash-hidden {
    opacity: .32;
    filter: grayscale(.7);
  }
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
  }
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
  }
  .dash-editor-toggle.on {
    color: #10B981;
    border-color: rgba(16,185,129,.45);
    background: rgba(16,185,129,.08);
  }
  .dash-editor-toggle.off { color: #545E6E; }

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
  }
  .dash-grid .react-grid-item > .react-resizable-handle:hover::after {
    border-color: var(--accent);
    width: 15px; height: 15px;
  }
  .dash-grid:not(.dash-editing) .react-grid-item > .react-resizable-handle {
    display: none !important;
  }
  .dash-grid .react-grid-item.react-grid-placeholder {
    background: linear-gradient(180deg, rgba(245,158,11,.18), rgba(245,158,11,.06)) !important;
    border: 1px dashed rgba(245,158,11,.55);
    border-radius: 18px;
    opacity: 1;
  }

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
  .dash-layout-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    background: rgba(0,0,0,.32);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.06);
  }
  .dash-layout-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 13px;
    font-size: 11.5px;
    font-weight: 600;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: #8892A3;
    cursor: pointer;
    white-space: nowrap;
  }
  .dash-layout-tab:hover {
    color: #E7E9EE;
    background: rgba(255,255,255,.04);
  }
  .dash-layout-tab.active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
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
  }
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
  }
  .dash-layout-add:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(245,158,11,.08);
  }
  .dash-layout-add:disabled {
    opacity: .35;
    cursor: not-allowed;
  }
  .dash-layout-counter {
    font-size: 10.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    color: #545E6E;
    font-weight: 600;
    padding: 0 6px;
  }
  .dash-tb-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 15px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.035);
    color: #8892A3;
  }
  .dash-tb-btn:hover {
    color: #E7E9EE;
    background: rgba(255,255,255,.07);
  }
  .dash-tb-primary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .dash-tb-primary:hover {
    transform: translateY(-2px);
  }
  .dash-section-title {
    margin-top: 36px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    font-weight: 600;
    color: #E7E9EE;
  }
  .dash-section-title .bar {
    width: 4px; height: 18px;
    border-radius: 3px;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
  }
  .dash-section-title .line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, rgba(245,158,11,.35), rgba(255,255,255,.06) 40%, transparent);
  }
  .dash-tradelog {
    background: linear-gradient(180deg, var(--glass-1), var(--glass-2));
    border: 1px solid var(--line);
    border-radius: 18px;
    padding: 16px;
    margin-bottom: 24px;
    overflow-x: auto;
  }
  .dash-empty-wrap {
    min-height: calc(100vh - 120px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
  }
  .dash-empty {
    max-width: 520px;
    width: 100%;
    padding: 56px 40px 48px;
    border-radius: 26px;
    background:
      radial-gradient(400px 220px at 50% 0%, rgba(245,158,11,.12), transparent 70%),
      linear-gradient(180deg, var(--glass-1), var(--glass-2));
    border: 1px solid rgba(255,255,255,.1);
    box-shadow: 0 40px 90px -50px rgba(245,158,11,.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .dash-empty-icon {
    width: 64px; height: 64px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22px;
  }
  .dash-empty h3 {
    margin: 0 0 10px;
    font-size: 20px;
    font-weight: 700;
    color: #E7E9EE;
  }
  .dash-empty p {
    margin: 0 0 26px;
    font-size: 13.5px;
    color: rgba(255,255,255,.58);
    line-height: 1.65;
    max-width: 380px;
  }
  .dash-allhidden {
    padding: 70px 20px;
    text-align: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    color: #545E6E;
    border: 1px dashed rgba(255,255,255,.08);
    border-radius: 18px;
  }
  .dash-allhidden b { color: var(--accent); }

  @keyframes dashGrad {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dash-edit-toolbar::before { animation: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stats } = useStats();


  // Committed state (from server)
  const [layouts, setLayouts] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // Draft state (only during edit mode)
  const [draftLayouts, setDraftLayouts] = useState(null);
  const [draftActiveId, setDraftActiveId] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const hydratedRef = useRef(false);

  // Breakpoint tracking
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Which responsive breakpoint RGL is currently rendering.
  // Needed so drag/resize writes get converted back to lg before they
  // hit the source-of-truth draft layout.
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

  // ---- Cloud sync ----
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToUserLayouts(user.uid, (remote) => {
      if (!hydratedRef.current) {
        hydratedRef.current = true;

        if (remote && Array.isArray(remote.layouts) && remote.layouts.length > 0) {
          setLayouts(remote.layouts);
          setActiveId(remote.activeId);
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

  const committedActive = useMemo(
    () => layouts.find((l) => l.id === activeId) || null,
    [layouts, activeId]
  );
  const committedItems = useMemo(() => {
    if (!committedActive) return [];
    return committedActive.layout
      .filter((it) => it.visible !== false)
      .slice()
      .sort((a, b) => a.y - b.y || a.x - b.x);
  }, [committedActive]);

  const draftActive = useMemo(
    () => draftLayouts?.find((l) => l.id === draftActiveId) || null,
    [draftLayouts, draftActiveId]
  );
  const editItems = draftActive?.layout || [];

  const displayItems = editMode ? editItems : committedItems;

  // ---- Build responsive layouts object ----
  const responsiveLayouts = useMemo(() => {
    return {
      lg: displayItems,
      md: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.md),
      sm: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.sm),
      xs: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.xs),
      xxs: buildMobileLayout(),
    };
  }, [displayItems]);

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
  //
  // We intentionally do NOT use onLayoutChange here. RGL fires that callback
  // on every render (including mount), and the responsive grid hands us back
  // the *current breakpoint's* layout — which, if written straight back into
  // the 24-col source, corrupts it and causes an infinite shrink loop.
  //
  // Instead we listen to onDragStop / onResizeStop (user-initiated only) and
  // convert the incoming values back up to the lg source-of-truth grid.
  const handleDragOrResizeStop = (currentLayout) => {
    if (!editMode || !draftActiveId) return;

    const sourceCols = GRID_COLS_BY_BP[currentBreakpoint] ?? GRID_COLS;
    const upscaled = upscaleToLg(currentLayout, sourceCols);
    const byId = new Map(upscaled.map((it) => [it.i, it]));

    setDraftLayouts((prev) =>
      (prev || []).map((l) => {
        if (l.id !== draftActiveId) return l;

        let changed = false;
        const nextLayout = l.layout.map((item) => {
          const updated = byId.get(item.i);
          if (!updated) return item;
          if (
            item.x === updated.x &&
            item.y === updated.y &&
            item.w === updated.w &&
            item.h === updated.h
          ) {
            return item; // no-op; keep reference for cheap diffing
          }
          changed = true;
          return {
            ...item,
            x: updated.x,
            y: updated.y,
            w: updated.w,
            h: updated.h,
          };
        });

        return changed ? { ...l, layout: nextLayout } : l;
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

  // ---- Loading skeleton ----
  if (!user) return <PageSkeleton />;

  return (
    <div className="dash-root">
      <style>{CSS}</style>

      {!editMode && <DashboardHeader onCustomize={enterEdit} />}

      {!hasData ? (
        <div className="dash-empty-wrap">
          <div className="dash-empty">
            <div className="dash-empty-icon">
              <svg
                width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <h3>No Trading Data Available</h3>
            <p>
              Log trades in your journal or adjust your active account filters to
              populate performance statistics and analytics.
            </p>
            <button
              type="button"
              className="dash-tb-primary"
              onClick={() => navigate('/journal/logs')}
            >
              Add Your First Trade →
            </button>
          </div>
        </div>
      ) : (
        <>
          {editMode && draftLayouts && (
            <div className="dash-edit-toolbar">
              <FaGripVertical
                style={{ color: '#F59E0B', flexShrink: 0 }}
                size={16}
              />

              <div style={{ flex: '0 0 auto', minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E7E9EE' }}>
                  Edit Dashboard
                </div>
                <div style={{ fontSize: 11, color: '#8892A3', marginTop: 3 }}>
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
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitRename();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
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
                    >
                      {l.name}
                      {canDelete && isActive && (
                        <span
                          className="dash-layout-tab-del"
                          role="button"
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
                breakpoints={GRID_BREAKPOINTS}
                cols={GRID_COLS_BY_BP}
                rowHeight={GRID_ROW_HEIGHT}
                layouts={responsiveLayouts}
                onBreakpointChange={setCurrentBreakpoint}
                onDragStop={handleDragOrResizeStop}
                onResizeStop={handleDragOrResizeStop}
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
                  const meta = PANEL_REGISTRY[item.i];
                  if (!meta) {
                    return (
                      <div key={item.i}>
                        <div className="dash-panel">
                          <div
                            style={{
                              padding: 16,
                              color: '#8892A3',
                              fontSize: 12,
                              fontFamily: "'IBM Plex Mono', monospace",
                            }}
                          >
                            Unknown panel: {item.i}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const PanelComp = meta.Component;

                  return (
                    <div key={item.i}>
                      <div
                        className={`dash-panel ${editMode ? 'dash-editing' : ''} ${hidden ? 'dash-hidden' : ''}`}
                      >
                        {editMode && (
                          <div className="dash-editor-overlay">
                            <div className="dash-editor-badge dash-editor-drag-area">
                              ⠿ {panelLabel(item.i)}
                            </div>
                            <button
                              className={`dash-editor-toggle ${item.visible !== false ? 'on' : 'off'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleVisible(item.i);
                              }}
                              title={item.visible !== false ? 'Hide panel' : 'Show panel'}
                            >
                              {item.visible !== false ? (
                                <FaEye size={12} />
                              ) : (
                                <FaEyeSlash size={12} />
                              )}
                            </button>
                          </div>
                        )}

                        {!hasData ? <PanelSkeleton /> : <PanelComp />}
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