// apps/web/src/features/journal/dashboard/DashboardPage.jsx
//
// Journal dashboard — Live & Demo accounts only.
//
// PHASE B CHANGES
// ---------------
//   • Single boot gate. One <PageSkeleton /> covers the entire bootstrap
//     chain (auth → accounts list → account auto-select → trades fetch →
//     AppProvider sync → layout hydration). The grid first mounts with
//     real data already in place — no intermediate empty-state flash, no
//     "all panels hidden" flash.
//
//   • Layout hydration + persistence extracted into useUserLayouts().
//     This is the same hook the backtester dashboard uses.
//
//   • Trades sync state pulled from useEnrichedTrades().isSynced so the
//     gate can wait for AppProvider to actually contain the enriched
//     trades — closing the one-render gap between React Query resolving
//     and the reducer committing.
//
// PHASE E CHANGE
// --------------
//   • Uses <MeasuredGrid> (local wrapper) instead of RGL's WidthProvider.
//     WidthProvider initializes its width to 1280 and measures the real
//     container only in componentDidMount, producing two renders on cold
//     mount. With the CSS transition on .react-grid-item, the second
//     render animates every panel into place — most visibly the calendar
//     snapping from its lg-columns size to its md-columns size. MeasuredGrid
//     measures synchronously in useLayoutEffect (pre-paint), so RGL only
//     ever sees the correct width. No reflow, no transition replay.
//
// PHASE F CHANGE
// --------------
//   • Boot gate is now TYPE-AWARE. The gate only blocks on "account not
//     selected" when there is at least one account of the type this
//     dashboard renders (Live/Demo for Journal, Backtest for Backtester).
//     Without this, a user with only Live accounts would see the Backtester
//     dashboard stuck on its loading skeleton forever, because the account
//     selector would never auto-select a Live account for a Backtest-only
//     dashboard.

import { useState, useEffect, useMemo } from 'react';

import MeasuredGrid from '@/features/dashboard/components/MeasuredGrid';
import DashboardFooter from '@/features/dashboard/components/DashboardFooter';
import DashboardFab from '@/features/dashboard/components/DashboardFab';
import {
  GRID_COLS,
  GRID_COLS_BY_BP,
  GRID_BREAKPOINTS,
  GRID_ROW_HEIGHT,
  MAX_LAYOUTS,
  DEFAULT_LAYOUT,
  buildFreshLayout,
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
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { useAccounts } from '@/shared/api/accounts';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { useEnrichedTrades } from '@/features/dashboard/hooks/useEnrichedTrades';
import { useUserLayouts } from '@/features/dashboard/hooks/useUserLayouts';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { saveUserLayouts } from '@/features/dashboard/api/layouts';

import { PANEL_REGISTRY, panelLabel } from '@/features/dashboard/components/panels/panelRegistry';
import { PanelSkeleton } from '@/shared/ui/panel-skeleton';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import TradeTable from '@/features/dashboard/components/panels/TradeTable';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import '@/features/dashboard/dashboardShell.css';

const MAX_NAME_LEN = 24;
const DEFAULT_NAME_PATTERN = /^Layout \d+$/;

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const { user } = useAuth();
  const { accountId, allowedTypes } = useDashboardAccount();

  // ---- Accounts list (drives the auto-select gate) ----
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const accounts = useMemo(() => accountsData ?? [], [accountsData]);

  // Accounts matching the current dashboard's allowed types.
  // Journal: Live + Demo. Backtester: Backtest only.
  const compatibleAccounts = useMemo(
    () =>
      !allowedTypes
        ? accounts
        : accounts.filter((a) => allowedTypes.includes(a.type || 'Backtest')),
    [accounts, allowedTypes]
  );

  // ---- Trades pipeline (enriched + AppProvider sync) ----
  const enriched = useEnrichedTrades(accountId);

  const { stats } = useStats();

  // ---- Edit-mode state (drives useUserLayouts.suppressRemotePush) ----
  const [editMode, setEditMode] = useState(false);
  const [draftLayouts, setDraftLayouts] = useState(null);
  const [draftActiveId, setDraftActiveId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // ---- Layouts (hydration tracked via layoutsReady) ----
  const {
    layouts,
    setLayouts,
    activeId,
    setActiveId,
    layoutsReady,
  } = useUserLayouts({
    userId: user?.uid,
    suppressRemotePush: editMode,
  });

  // ---- Breakpoint tracking ----
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

  const hasData = stats && stats.n > 0;

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) || null,
    [accounts, accountId]
  );
  const badgeVariant = selectedAccount?.type === 'Demo' ? 'is-demo' : 'is-live';

  // Publish title + account badge to the global header bar.
  usePageHeader({
    title: 'Dashboard',
    badge: selectedAccount?.type,
    badgeVariant,
  });

  // ---- Layout selectors (hooks — must run unconditionally) ----
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

  const responsiveLayouts = useMemo(
    () => ({
      lg: displayItems,
      md: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.md),
      sm: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.sm),
      xs: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.xs),
      xxs: buildMobileLayout(),
    }),
    [displayItems]
  );

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
            return item;
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

  /* ---------------------------------------------------------------- */
  /*  Boot gate — wait for the full bootstrap sequence to complete.    */
  /*                                                                   */
  /*  Conditions (any true means stay on skeleton):                    */
  /*    • user is null (defensive; guards prevent this)                */
  /*    • accounts list not yet resolved                               */
  /*    • there ARE compatible accounts, but the header's auto-select  */
  /*      hasn't landed yet (accountIdValid === false)                 */
  /*    • a valid account is selected and trades are in flight or      */
  /*      haven't yet propagated into AppProvider                      */
  /*    • layout hydration has not resolved                            */
  /*                                                                   */
  /*  Crucial: "compatible" means matching THIS dashboard's allowed    */
  /*  types. A user with only a Live account, viewing /backtester,     */
  /*  has zero compatible accounts — the gate releases so the "No      */
  /*  Backtest Data Available" empty state can render. Without this,   */
  /*  the page would be stuck on the skeleton forever, because         */
  /*  state.backtesterAccountId is never set.                          */
  /* ---------------------------------------------------------------- */
  const accountIdValid =
    accountId != null && compatibleAccounts.some((a) => a.id === accountId);

  const bootstrapping =
    !user ||
    accountsLoading ||
    (compatibleAccounts.length > 0 && !accountIdValid) ||
    (accountIdValid && (enriched.isLoading || !enriched.isSynced)) ||
    !layoutsReady;

  if (bootstrapping) {
    return <PageSkeleton />;
  }

  return (
    <div className="dash-root is-ready">
      {!hasData ? (
        <div className="dash-empty-wrap">
          <div className="dash-empty">
            <div className="dash-empty-icon">
              <svg
                width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <h3>No Trading Data Available</h3>
            <p>
              Upload trades to a Live or Demo account to populate performance
              statistics and analytics.
            </p>
          </div>
        </div>
      ) : (
        <>
          {editMode && draftLayouts && (
            <div className="dash-edit-toolbar">
              <FaGripVertical
                style={{ color: 'var(--accent)', flexShrink: 0 }}
                size={16}
              />

              <div style={{ flex: '0 0 auto', minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#E7E9EE' }}>
                  Edit Dashboard
                </div>
                <div style={{ fontSize: 11, color: '#8892A3', marginTop: 3 }}>
                  Drag · resize · toggle ·{' '}
                  <b style={{ color: 'var(--accent)' }}>double-click a tab to rename</b>
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
              <MeasuredGrid
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
              </MeasuredGrid>
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

      {!editMode && (
        <DashboardFab
          onCustomize={enterEdit}
          addTradePath="/journal/logs"
          hasData={hasData}
        />
      )}
    </div>
  );
}