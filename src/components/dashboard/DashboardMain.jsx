// src/components/dashboard/DashboardMain.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import DashboardHeader from './DashboardHeader';
import DashboardFooter from './DashboardFooter';
import {
  GRID_COLS, GRID_ROW_HEIGHT,
  DEFAULT_LAYOUT, PANEL_META,
  loadLayout, saveLayout, resetLayout,
} from './dashboardLayout';
import { FaEye, FaEyeSlash, FaUndo, FaTimes, FaCheck, FaGripVertical } from 'react-icons/fa';

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
  subscribeToDashboardLayout,
  saveDashboardLayout,
} from '../../firebase/accountsService';

const ResponsiveGridLayout = WidthProvider(Responsive);

const CSS = `
  .dash-grid .react-grid-item {
    transition: all 180ms ease;
    transition-property: left, top;
  }

  .dash-panel {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    background: #12161f;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .dash-panel .panel-head { flex-shrink: 0; }

  .dash-panel-body {
    flex: 1;
    min-height: 0;
    padding: 14px 16px;
    overflow: hidden;
  }

  .dash-panel.dash-editing {
    border-color: rgba(255, 176, 32, 0.4);
    box-shadow: 0 0 0 1px rgba(255, 176, 32, 0.15), 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .dash-panel.dash-editing::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 176, 32, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 176, 32, 0.06) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .dash-editor-overlay {
    position: absolute;
    top: 8px;
    right: 8px;
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
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(10, 13, 19, 0.9);
    border: 1px solid #212836;
    color: #8892A3;
    font-size: 10.5px;
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 600;
    user-select: none;
    cursor: grab;
  }
  .dash-editor-badge:active { cursor: grabbing; }

  .dash-editor-toggle {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: rgba(10, 13, 19, 0.9);
    border: 1px solid #212836;
    color: #8892A3;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .dash-editor-toggle:hover { border-color: #FFB020; color: #FFB020; }
  .dash-editor-toggle.on { color: #35C4A1; border-color: rgba(53, 196, 161, 0.4); }
  .dash-editor-toggle.off { color: #545E6E; }

  .dash-panel.dash-hidden {
    opacity: 0.35;
    filter: grayscale(0.7);
  }

  .dash-grid .react-grid-item > .react-resizable-handle {
    width: 22px;
    height: 22px;
    background-image: none !important;
    padding: 0;
    z-index: 5;
    bottom: 0;
    right: 0;
  }
  .dash-grid .react-grid-item > .react-resizable-handle::after {
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
  .dash-grid .react-grid-item > .react-resizable-handle:hover::after {
    border-color: #FFB020;
    width: 14px;
    height: 14px;
  }
  .dash-grid:not(.dash-editing) .react-grid-item > .react-resizable-handle {
    display: none !important;
  }

  .dash-grid .react-grid-item.react-grid-placeholder {
    background: rgba(255, 176, 32, 0.15) !important;
    border: 1px dashed #FFB020;
    border-radius: 12px;
    opacity: 1;
  }
  .dash-grid .react-grid-item.resizing,
  .dash-grid .react-grid-item.react-draggable-dragging {
    z-index: 20;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }

  .dash-edit-toolbar {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(20, 22, 30, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 176, 32, 0.3);
    border-radius: 12px;
    margin-bottom: 16px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  }
`;

export default function DashboardMain({ sessionData, dowData, dirData, setupData, factorData, maxAbs, onNavigate }) {
  const { state } = useAppContext();
  const { user } = useAuth();
  const { stats, metric } = useStats();

  const [layout, setLayout] = useState(() => loadLayout());
  const [draft, setDraft] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const hydratedRef = useRef(false);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 900);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ---- Cloud sync: subscribe to user's saved layout ----
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToDashboardLayout(user.uid, (remoteLayout) => {
      if (!hydratedRef.current) {
        hydratedRef.current = true;

        if (Array.isArray(remoteLayout) && remoteLayout.length > 0) {
          // Firestore has a layout → use it, mirror to localStorage
          setLayout(remoteLayout);
          saveLayout(remoteLayout);
        } else {
          // Firestore empty → push the local (or default) layout up once
          const local = loadLayout();
          saveDashboardLayout(user.uid, local).catch((err) =>
            console.error('[layout] initial push failed:', err)
          );
        }
        return;
      }

      // Post-hydration updates (from another tab or device)
      if (Array.isArray(remoteLayout) && remoteLayout.length > 0) {
        setLayout(remoteLayout);
        saveLayout(remoteLayout);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  const hasData = stats && stats.n > 0;
  const isMoney = metric === '$';
  const unitLabel = isMoney ? 'Net P&L' : 'Total R';

  const activeLayout = editMode ? (draft || layout) : layout;
  const displayItems = useMemo(() => {
    if (editMode) return activeLayout;
    return activeLayout
      .filter(it => it.visible !== false)
      .slice()
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));
  }, [activeLayout, editMode]);

  const enterEdit = () => {
    setDraft(layout.map(it => ({ ...it })));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditMode(false);
  };

  const saveEdit = () => {
    if (!draft) return;
    setLayout(draft);
    saveLayout(draft);                       // local fallback / offline
    if (user?.uid) {
      saveDashboardLayout(user.uid, draft).catch((err) =>
        console.error('[layout] save failed:', err)
      );
    }
    setDraft(null);
    setEditMode(false);
  };

  const handleReset = () => {
    const fresh = DEFAULT_LAYOUT.map(it => ({ ...it }));
    setDraft(fresh);
  };

  const handleHardReset = () => {
    const fresh = DEFAULT_LAYOUT.map(it => ({ ...it }));
    resetLayout();
    setLayout(fresh);
    setDraft(fresh);
    if (user?.uid) {
      saveDashboardLayout(user.uid, fresh).catch((err) =>
        console.error('[layout] reset push failed:', err)
      );
    }
  };

  const handleLayoutChange = (newLayout) => {
    if (!editMode) return;
    const byId = new Map(newLayout.map(it => [it.i, it]));
    setDraft(prev => (prev || []).map(item => {
      const updated = byId.get(item.i);
      if (!updated) return item;
      return { ...item, x: updated.x, y: updated.y, w: updated.w, h: updated.h };
    }));
  };

  const toggleVisible = (id) => {
    setDraft(prev => (prev || []).map(item =>
      item.i === id ? { ...item, visible: !item.visible } : item
    ));
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <style>{CSS}</style>

      {!editMode && <DashboardHeader onCustomize={enterEdit} />}

      {!hasData ? (
        <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
          <div style={{ backgroundColor: '#11151F', border: '1px solid #212836', borderRadius: '16px', padding: '48px 32px', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontFamily: "'Inter', sans-serif", boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#161B26', border: '1px solid #212836', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFB020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#E7E9EE' }}>No Trading Data Available</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#8892A3', lineHeight: '1.6' }}>
              Log trades in your journal or adjust your active account filters to populate performance statistics and analytics.
            </p>
            <button type="button" style={{ backgroundColor: '#FFB020', color: '#0D1117', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Add Your First Trade</button>
          </div>
        </div>
      ) : (
        <>
          {editMode && (
            <div className="dash-edit-toolbar">
              <FaGripVertical style={{ color: '#FFB020', flexShrink: 0 }} size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#E7E9EE' }}>Edit Dashboard</div>
                <div style={{ fontSize: '11px', color: '#8892A3', marginTop: '2px' }}>
                  Drag panels by their badge · resize from bottom-right corner · toggle visibility with the eye icon
                </div>
              </div>
              <button onClick={handleReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#8892A3', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                <FaUndo size={11} /> Reset
              </button>
              <button onClick={cancelEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#8892A3', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                <FaTimes size={11} /> Cancel
              </button>
              <button onClick={saveEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#FFB020', border: 'none', borderRadius: '8px', color: '#0D1117', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,176,32,0.25)' }}>
                <FaCheck size={11} /> Save Layout
              </button>
            </div>
          )}

          {!editMode && displayItems.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'var(--mono, monospace)', fontSize: '12px', color: 'var(--text-faint, #545E6E)' }}>
              All panels are hidden. Click <b style={{ color: '#FFB020' }}>Customize</b> above to show some.
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
                {displayItems.map(item => {
                  const hidden = editMode && item.visible === false;
                  return (
                    <div key={item.i}>
                      <div className={`dash-panel ${editMode ? 'dash-editing' : ''} ${hidden ? 'dash-hidden' : ''}`}>
                        {editMode && (
                          <div className="dash-editor-overlay">
                            <div className="dash-editor-badge dash-editor-drag-area">⠿ {PANEL_META[item.i]?.label || item.i}</div>
                            <button
                              className={`dash-editor-toggle ${item.visible !== false ? 'on' : 'off'}`}
                              onClick={(e) => { e.stopPropagation(); toggleVisible(item.i); }}
                              title={item.visible !== false ? 'Hide this panel' : 'Show this panel'}
                            >
                              {item.visible !== false ? <FaEye size={11} /> : <FaEyeSlash size={11} />}
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

          <div className="section-title" style={{ marginTop: '32px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: '600', color: 'var(--text, #f0f2f5)' }}>
            <span className="idx" style={{ width: '4px', height: '16px', background: 'var(--amber, #ffb020)', borderRadius: '2px', display: 'inline-block' }}></span>
            Trade Log
            <div className="line" style={{ flex: 1, height: '1px', background: 'var(--border-soft, rgba(255, 255, 255, 0.08))' }}></div>
          </div>

          <div className="panel" style={{ background: 'var(--panel-bg, #12161f)', border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))', borderRadius: '12px', padding: '14px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)', marginBottom: '24px', overflowX: 'auto' }}>
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
    <div className="dash-panel" style={{ border: 'none', boxShadow: 'none', background: 'transparent', borderRadius: 0, height: '100%' }}>
      {title && (
        <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <span className="panel-title" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text, #f0f2f5)' }}>{title}</span>
          {note && <span className="panel-note" style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', color: 'var(--text-dim, #8f9bba)' }}>{note}</span>}
        </div>
      )}
      <div className="dash-panel-body" style={padding ? { padding } : undefined}>{children}</div>
    </div>
  );

  switch (id) {
    case 'calendar':
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', flexShrink: 0 }}>
            <span className="panel-title" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text, #f0f2f5)' }}>Monthly Calendar</span>
            <span className="panel-note" style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', color: 'var(--text-dim, #8f9bba)' }}>{isMoney ? 'Net P&L & Weekly' : 'Target R & Weekly'}</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, padding: '14px 16px', overflow: 'auto' }}>
            <Calendar />
            <div style={{ height: '20px' }}></div>
            <WeeklyChart />
          </div>
        </div>
      );

    case 'hero':
      return <Panel padding={0}><Hero onNavigate={onNavigate} /></Panel>;

    case 'monthly':
      return <Panel title={isMoney ? 'Monthly Net P&L' : 'Monthly R'} note={isMoney ? '$ per month' : 'R per month'}><MonthlyChart /></Panel>;

    case 'underwater':
      return <Panel title="Underwater Curve" note="Drawdown from peak"><UnderwaterChart /></Panel>;

    case 'kpiGrid':
      return <Panel><KPIGrid /></Panel>;
    case 'advancedKpiGrid':
      return <Panel><AdvancedKPIGrid /></Panel>;
    case 'timeChart':
      return <Panel><TimeChart /></Panel>;
    case 'durationWidget':
      return <Panel><DurationWidget /></Panel>;

    case 'rollingExpectancy':
      return <Panel title="Rolling 20-Trade Expectancy" note={isMoney ? '$ per trade' : 'R per trade'}><RollingExpectancyChart /></Panel>;

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', height: '100%' }}>
            {[
              { title: 'Session', note: unitLabel, data: sessionData, horizontal: true },
              { title: 'Day of Week', note: unitLabel, data: dowData, horizontal: false },
              { title: 'Direction', note: 'Long/Short', data: dirData, horizontal: false },
            ].map((p) => (
              <div key={p.title} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text, #f0f2f5)' }}>{p.title}</span>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--mono, monospace)', color: 'var(--text-dim, #8f9bba)' }}>{p.note}</span>
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