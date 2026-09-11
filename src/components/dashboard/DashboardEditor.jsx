// src/components/dashboard/DashboardEditor.jsx
import { useState, useEffect, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import Portal from '../common/Portal';
import {
  GRID_COLS, GRID_ROW_HEIGHT,
  DEFAULT_LAYOUT, PANEL_META,
  layoutForEditor,
} from './dashboardLayout';
import { FaEye, FaEyeSlash, FaUndo, FaTimes, FaCheck } from 'react-icons/fa';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import Hero from './sections/Hero';
import KPIGrid from './sections/KPIGrid';
import AdvancedKPIGrid from './sections/AdvancedKPIGrid';
import DurationWidget from './sections/DurationWidget';
import SymbolBreakdownTable from './sections/SymbolBreakdownTable';
import Calendar from './sections/Calendar';
import WeeklyChart from './sections/WeeklyCards';
import RRCompareChart from './charts/RRCompareChart';
import UnderwaterChart from './charts/UnderwaterChart';
import TimeChart from './charts/TimeChart';
import MonthlyChart from './charts/MonthlyChart';
import RollingExpectancyChart from './charts/RollingExpectancyChart';
import CategoryBarChart from './charts/CategoryBarChart';

const ResponsiveGridLayout = WidthProvider(Responsive);

const COLORS = {
  bg: '#0A0D13',
  panel: '#11151F',
  panelHead: '#151A26',
  border: '#212836',
  text: '#E7E9EE',
  textDim: '#8892A3',
  textFaint: '#545E6E',
  amber: '#FFB020',
  win: '#35C4A1',
  loss: '#FF5C5C',
};

// Editor chrome — the CSS for grid items and resize handles
const EDITOR_CSS = `
  .dash-editor-grid {
    background: ${COLORS.bg};
    padding: 20px;
    min-height: 100%;
  }

  .dash-editor-grid .react-grid-item {
    transition: all 200ms ease;
    transition-property: left, top;
  }

  /* Panel wrapper — this is what react-grid-layout resizes */
  .dash-editor-panel {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    background: ${COLORS.panel};
    border: 1px solid ${COLORS.border};
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* The panel's own inner content must fill the wrapper */
  .dash-editor-panel > * {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  /* Top overlay: label + visibility toggle */
  .dash-editor-overlay {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 4;
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
    padding: 4px 9px;
    border-radius: 6px;
    background: rgba(10, 13, 19, 0.85);
    border: 1px solid ${COLORS.border};
    color: ${COLORS.textDim};
    font-size: 10.5px;
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 600;
    user-select: none;
    backdrop-filter: blur(4px);
  }

  .dash-editor-toggle {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: rgba(10, 13, 19, 0.85);
    border: 1px solid ${COLORS.border};
    color: ${COLORS.textDim};
    cursor: pointer;
    transition: all 0.15s ease;
    backdrop-filter: blur(4px);
  }
  .dash-editor-toggle:hover {
    border-color: ${COLORS.amber};
    color: ${COLORS.amber};
  }
  .dash-editor-toggle.on {
    color: ${COLORS.win};
    border-color: rgba(53, 196, 161, 0.4);
  }
  .dash-editor-toggle.off {
    color: ${COLORS.textFaint};
  }

  /* Hidden panels get dimmed but stay in the editor */
  .dash-editor-panel.is-hidden {
    opacity: 0.4;
    filter: grayscale(0.6);
  }

  /* Custom resize handle — bottom-right */
  .dash-editor-grid .react-grid-item > .react-resizable-handle {
    width: 22px;
    height: 22px;
    background-image: none !important;
    padding: 0;
    z-index: 5;
    bottom: 0;
    right: 0;
  }
  .dash-editor-grid .react-grid-item > .react-resizable-handle::after {
    content: '';
    position: absolute;
    right: 6px;
    bottom: 6px;
    width: 12px;
    height: 12px;
    border-right: 2px solid rgba(255, 255, 255, 0.28);
    border-bottom: 2px solid rgba(255, 255, 255, 0.28);
    border-radius: 0 0 2px 0;
    transition: all 0.15s ease;
  }
  .dash-editor-grid .react-grid-item > .react-resizable-handle:hover::after {
    border-color: ${COLORS.amber};
    width: 14px;
    height: 14px;
  }

  /* During drag/resize */
  .dash-editor-grid .react-grid-item.react-grid-placeholder {
    background: rgba(255, 176, 32, 0.15) !important;
    border: 1px dashed ${COLORS.amber};
    border-radius: 12px;
    opacity: 1;
  }
  .dash-editor-grid .react-grid-item.resizing {
    z-index: 20;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }
  .dash-editor-grid .react-grid-item.react-draggable-dragging {
    z-index: 20;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }
`;

export default function DashboardEditor({
  isOpen, onClose, layout, onSave,
  sessionData, dowData, dirData, onNavigate,
}) {
  const [draft, setDraft] = useState(layout);
  const [savedSnapshot, setSavedSnapshot] = useState(layout);

  // Reset draft whenever we open
  useEffect(() => {
    if (isOpen) {
      setDraft(layout);
      setSavedSnapshot(layout);
    }
  }, [isOpen, layout]);

  // Escape to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const editorLayout = useMemo(() => layoutForEditor(draft), [draft]);

  const dirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(savedSnapshot);
  }, [draft, savedSnapshot]);

  const handleLayoutChange = (newLayout) => {
    // Merge the grid engine's x/y/w/h into our draft, keep visible flags
    const byId = new Map(newLayout.map(it => [it.i, it]));
    setDraft(prev => prev.map(item => {
      const updated = byId.get(item.i);
      if (!updated) return item;
      return { ...item, x: updated.x, y: updated.y, w: updated.w, h: updated.h };
    }));
  };

  const toggleVisible = (id) => {
    setDraft(prev => prev.map(item =>
      item.i === id ? { ...item, visible: !item.visible } : item
    ));
  };

  const handleReset = () => {
    const fresh = DEFAULT_LAYOUT.map(it => ({ ...it }));
    setDraft(fresh);
  };

  const handleSave = () => {
    onSave(draft);
    setSavedSnapshot(draft);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <style>{EDITOR_CSS}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: COLORS.bg,
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Inter', sans-serif", color: COLORS.text,
        }}
      >
        {/* Top bar */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '14px 24px',
          borderBottom: `1px solid ${COLORS.border}`,
          background: 'rgba(10, 13, 19, 0.95)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: 0, fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '16px', fontWeight: 600, color: '#FFF',
            }}>
              Customize Dashboard
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: COLORS.textDim }}>
              Drag panels to reposition · resize from the bottom-right corner · toggle visibility
            </p>
          </div>

          <span style={{
            fontSize: '11px', color: dirty ? COLORS.amber : COLORS.textFaint,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {dirty ? '● Unsaved changes' : 'All changes saved'}
          </span>

          <button
            onClick={handleReset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px',
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              color: COLORS.textDim,
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.loss; e.currentTarget.style.borderColor = 'rgba(255,92,92,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textDim; e.currentTarget.style.borderColor = COLORS.border; }}
          >
            <FaUndo size={11} /> Reset
          </button>

          <button
            onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px',
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              color: COLORS.textDim,
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <FaTimes size={11} /> Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!dirty}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 20px',
              background: dirty ? COLORS.amber : 'rgba(255,176,32,0.3)',
              border: 'none',
              borderRadius: '8px',
              color: dirty ? '#0D1117' : 'rgba(10,13,19,0.5)',
              fontSize: '12.5px', fontWeight: 700,
              cursor: dirty ? 'pointer' : 'not-allowed',
              boxShadow: dirty ? '0 4px 14px rgba(255,176,32,0.25)' : 'none',
            }}
          >
            <FaCheck size={11} /> Save Layout
          </button>
        </div>

        {/* Editor canvas */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div className="dash-editor-grid">
            <ResponsiveGridLayout
              breakpoints={{ lg: 0 }}
              cols={{ lg: GRID_COLS }}
              rowHeight={GRID_ROW_HEIGHT}
              layouts={{ lg: editorLayout }}
              onLayoutChange={handleLayoutChange}
              isDraggable
              isResizable
              compactType="vertical"
              preventCollision={false}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              draggableHandle=".dash-editor-drag-area"
              resizeHandles={['se']}
            >
              {draft.map((item) => (
                <div key={item.i}>
                  <div className={`dash-editor-panel ${item.visible === false ? 'is-hidden' : ''}`}>
                    {/* Top overlay: drag area (label) + visibility toggle */}
                    <div className="dash-editor-overlay">
                      <div className="dash-editor-badge dash-editor-drag-area" style={{ cursor: 'grab' }}>
                        ⠿ {PANEL_META[item.i]?.label || item.i}
                      </div>
                      <button
                        className={`dash-editor-toggle ${item.visible !== false ? 'on' : 'off'}`}
                        onClick={(e) => { e.stopPropagation(); toggleVisible(item.i); }}
                        title={item.visible !== false ? 'Hide this panel' : 'Show this panel'}
                      >
                        {item.visible !== false ? <FaEye size={11} /> : <FaEyeSlash size={11} />}
                      </button>
                    </div>

                    <PanelContent id={item.i} sessionData={sessionData} dowData={dowData} dirData={dirData} onNavigate={onNavigate} />
                  </div>
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ---------- Panel router ----------
function PanelContent({ id, sessionData, dowData, dirData, onNavigate }) {
  switch (id) {
    case 'calendar':
      return (
        <div style={{ padding: '16px', height: '100%', overflow: 'auto', background: '#12161f' }}>
          <Calendar />
          <div style={{ height: '20px' }} />
          <WeeklyChart />
        </div>
      );
    case 'hero':
      return <div style={{ padding: '12px', height: '100%', overflow: 'auto' }}><Hero onNavigate={onNavigate} /></div>;
    case 'monthly':
      return <div style={{ padding: '12px', height: '100%', overflow: 'auto', background: '#12161f' }}><MonthlyChart /></div>;
    case 'underwater':
      return <div style={{ padding: '12px', height: '100%', overflow: 'auto', background: '#12161f' }}><UnderwaterChart /></div>;
    case 'kpiGrid':
      return <div style={{ padding: '12px', height: '100%', overflow: 'auto' }}><KPIGrid /></div>;
    case 'advancedKpiGrid':
      return <div style={{ padding: '12px', height: '100%', overflow: 'auto' }}><AdvancedKPIGrid /></div>;
    case 'timeChart':
      return <div style={{ padding: '12px', height: '100%', overflow: 'auto', background: '#12161f' }}><TimeChart /></div>;
    case 'durationWidget':
      return <div style={{ padding: '12px', height: '100%', overflow: 'auto', background: '#12161f' }}><DurationWidget /></div>;
    case 'rollingExpectancy':
      return <div style={{ padding: '12px', height: '100%', overflow: 'auto', background: '#12161f' }}><RollingExpectancyChart /></div>;
    case 'rrCompare':
      return <div style={{ padding: '12px', height: '100%', overflow: 'auto', background: '#12161f' }}><RRCompareChart /></div>;
    case 'categoryCharts':
      return (
        <div style={{ padding: '12px', height: '100%', overflow: 'auto', background: '#12161f', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <CategoryBarChart data={sessionData} horizontal={true} />
          <CategoryBarChart data={dowData} horizontal={false} />
          <CategoryBarChart data={dirData} horizontal={false} />
        </div>
      );
    default:
      return <div style={{ padding: '12px', color: COLORS.textFaint, fontSize: '12px' }}>Unknown panel: {id}</div>;
  }
}