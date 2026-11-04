import { Component, useEffect, useMemo, useState } from 'react';
import { FaEye, FaEyeSlash, FaUndo, FaTimes, FaCheck, FaGripVertical, FaPlus } from 'react-icons/fa';

import MeasuredGrid from '@/features/dashboard/components/MeasuredGrid';
import { PANEL_REGISTRY, panelLabel } from '@/features/dashboard/components/panels/panelRegistry';
import { MAX_NAME_LEN } from '@/features/dashboard/hooks/useDashboardEditor';
import {
  GRID_COLS,
  GRID_COLS_BY_BP,
  GRID_BREAKPOINTS,
  MAX_LAYOUTS,
  scaleLayoutToBreakpoint,
} from '@/features/dashboard/layout/dashboardLayout';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

/** One broken panel must never take the whole dashboard down. */
class PanelBoundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <div className="pc-empty" style={{ margin: 16 }}>
          <b>This panel hit an error</b>
          <span>{String(this.state.err?.message || this.state.err)}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

const sortByPosition = (a, b) => a.y - b.y || a.x - b.x;

/**
 * Renders the edit toolbar + responsive grid for whichever dashboard calls it.
 * - lg/md: proportional 48/32-col layout (editable)
 * - sm/xs/xxs: reflowed 2-col / 1-col layout (view only)
 */
export default function DashboardGrid({ editor, layouts, activeId, gridMetrics }) {
  const [breakpoint, setBreakpoint] = useState('lg');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { editMode, draftLayouts, draftActiveId } = editor;

  const committedItems = useMemo(() => {
    const active = layouts.find((l) => l.id === activeId) || layouts[0];
    if (!active) return [];
    return active.layout.filter((it) => it.visible !== false).sort(sortByPosition);
  }, [layouts, activeId]);

  const draftItems = useMemo(
    () => draftLayouts?.find((l) => l.id === draftActiveId)?.layout || [],
    [draftLayouts, draftActiveId]
  );

  const displayItems = editMode ? draftItems : committedItems;

  const responsiveLayouts = useMemo(
    () => ({
      lg: displayItems,
      md: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.md),
      sm: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.sm),
      xs: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.xs),
      xxs: scaleLayoutToBreakpoint(displayItems, GRID_COLS_BY_BP.xxs),
    }),
    [displayItems]
  );

  const canArrange = editMode && !isMobile && (breakpoint === 'lg' || breakpoint === 'md');

  const handleGeometry = (current) => {
    if (!canArrange) return;
    editor.applyGeometry(current, GRID_COLS_BY_BP[breakpoint] ?? GRID_COLS);
  };

  return (
    <>
      {editMode && draftLayouts && (
        <div className="dash-edit-toolbar">
          <FaGripVertical style={{ color: 'var(--accent)', flexShrink: 0 }} size={16} />

          <div style={{ flex: '0 0 auto', minWidth: 190 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#E7E9EE' }}>Edit dashboard</div>
            <div style={{ fontSize: 11, color: '#8892A3', marginTop: 3 }}>
              {canArrange ? (
                <>
                  Drag · resize · hide ·{' '}
                  <b style={{ color: 'var(--accent)' }}>double-click a tab to rename</b>
                </>
              ) : (
                <b style={{ color: 'var(--accent)' }}>Widen the window to rearrange panels</b>
              )}
            </div>
          </div>

          <div className="dash-layout-tabs">
            {draftLayouts.map((l) => {
              const isActive = l.id === draftActiveId;
              if (l.id === editor.renamingId) {
                return (
                  <input
                    key={l.id}
                    autoFocus
                    className="dash-layout-tab-input"
                    value={editor.renameValue}
                    maxLength={MAX_NAME_LEN}
                    onChange={(e) => editor.setRenameValue(e.target.value)}
                    onBlur={editor.commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        editor.commitRename();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        editor.cancelRename();
                      }
                    }}
                  />
                );
              }
              return (
                <button
                  key={l.id}
                  type="button"
                  className={`dash-layout-tab ${isActive ? 'active' : ''}`}
                  onClick={() => editor.switchDraftLayout(l.id)}
                  onDoubleClick={() => editor.startRename(l.id, l.name)}
                >
                  {l.name}
                  {draftLayouts.length > 1 && isActive && (
                    <span
                      className="dash-layout-tab-del"
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.deleteDraftLayout(l.id);
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
              onClick={editor.addDraftLayout}
              disabled={draftLayouts.length >= MAX_LAYOUTS}
              title={draftLayouts.length >= MAX_LAYOUTS ? `Maximum ${MAX_LAYOUTS} layouts` : 'Add new layout'}
            >
              <FaPlus size={10} />
            </button>
            <span className="dash-layout-counter">
              {draftLayouts.length}/{MAX_LAYOUTS}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <button type="button" onClick={editor.handleReset} className="dash-tb-btn">
            <FaUndo size={11} /> Reset
          </button>
          <button type="button" onClick={editor.cancelEdit} className="dash-tb-btn">
            <FaTimes size={11} /> Cancel
          </button>
          <button type="button" onClick={editor.saveEdit} className="dash-tb-primary">
            <FaCheck size={11} /> Save layout
          </button>
        </div>
      )}

      {!editMode && displayItems.length === 0 ? (
        <div className="dash-allhidden">
          All panels are hidden. Click <b>Customize</b> to show some.
        </div>
      ) : (
        <div className={`dash-grid ${editMode ? 'dash-editing' : ''}`}>
          <MeasuredGrid
            breakpoints={GRID_BREAKPOINTS}
            cols={GRID_COLS_BY_BP}
            rowHeight={gridMetrics.rowHeight}
            layouts={responsiveLayouts}
            onBreakpointChange={setBreakpoint}
            onDragStop={handleGeometry}
            onResizeStop={handleGeometry}
            isDraggable={canArrange}
            isResizable={canArrange}
            compactType="vertical"
            preventCollision={false}
            margin={[gridMetrics.margin, gridMetrics.margin]}
            containerPadding={[0, 0]}
            draggableHandle=".dash-editor-drag-area"
            resizeHandles={['se']}
          >
            {displayItems.map((item) => {
              const meta = PANEL_REGISTRY[item.i];
              const hidden = editMode && item.visible === false;
              const Panel = meta?.Component;

              return (
                <div key={item.i}>
                  <div
                    className={`dash-panel ${editMode ? 'dash-editing' : ''} ${hidden ? 'dash-hidden' : ''}`}
                    data-panel={item.i}
                  >
                    {editMode && (
                      <div className="dash-editor-overlay">
                        <div className="dash-editor-badge dash-editor-drag-area">⠿ {panelLabel(item.i)}</div>
                        <button
                          type="button"
                          className={`dash-editor-toggle ${item.visible !== false ? 'on' : 'off'}`}
                          title={item.visible !== false ? 'Hide panel' : 'Show panel'}
                          onClick={(e) => {
                            e.stopPropagation();
                            editor.toggleVisible(item.i);
                          }}
                        >
                          {item.visible !== false ? <FaEye size={12} /> : <FaEyeSlash size={12} />}
                        </button>
                      </div>
                    )}
                    {Panel ? (
                      <PanelBoundary>
                        <Panel />
                      </PanelBoundary>
                    ) : (
                      <div className="pc-empty" style={{ margin: 16 }}>
                        <b>Unknown panel</b>
                        <span>{item.i}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </MeasuredGrid>
        </div>
      )}
    </>
  );
}
