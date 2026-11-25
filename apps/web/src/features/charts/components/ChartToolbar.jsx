import { useState } from 'react';
import {
  Calendar as CalendarIcon, Camera, Check, ChevronDown, Keyboard, LayoutGrid, Maximize2, Minimize2,
  PanelRightClose, PanelRightOpen, RefreshCw, Undo2, Link2,
} from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import RangeCalendar from './RangeCalendar';
import { CHART_TYPES, TypeIcon } from './ChartIcons';
import IndicatorMenu from './IndicatorMenu';

const INTERVALS = [
  { id: '1m', label: '1m' }, { id: '5m', label: '5m' }, { id: '15m', label: '15m' },
  { id: '1h', label: '1h' }, { id: '4h', label: '4h' }, { id: '1d', label: '1D' },
];

export default function ChartToolbar({
  interval, onIntervalChange,
  chartType, onChartType,
  enabledIndicators, onToggleIndicator, onClearIndicators,
  from, to, presets = [], activePreset, onPreset, onRangeChange,
  canUndo, onUndo, onScreenshot,
  onRefresh, isRefreshing, onToggleFullscreen, isFullscreen, onHelp,
  panelOpen, onTogglePanel,
  indicatorsOpen, onIndicatorsOpenChange,
  gridMode = '1x1', onGridModeChange,
  syncCrosshair = true, onSyncCrosshair,
  syncSymbol = false, onSyncSymbol,
  syncInterval = false, onSyncInterval,
}) {
  const [rangeOpen, setRangeOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const indOpen = !!indicatorsOpen;
  const setIndOpen = (v) => onIndicatorsOpenChange?.(v);
  const isMultigrid = gridMode !== '1x1';

  const short = (v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const rangeLabel = from && to ? `${short(from)} – ${short(to)}` : 'Custom range';
  const currentType = CHART_TYPES.find((t) => t.id === chartType) || CHART_TYPES[0];

  return (
    <div className="mk-toolbar" role="toolbar" aria-label="Chart controls">
      {/* Timeframe / chart type / indicators are per-pane in multi-chart mode, so they only appear in 1x1. */}
      {!isMultigrid && (
        <>
          <div className="mk-seg" role="group" aria-label="Timeframe">
            {INTERVALS.map((tf) => (
              <button key={tf.id} type="button" className={tf.id === interval ? 'is-active' : ''} aria-pressed={tf.id === interval} onClick={() => onIntervalChange?.(tf.id)}>{tf.label}</button>
            ))}
          </div>

          <span className="mk-vsep" />

          <Popover open={typeOpen} onOpenChange={setTypeOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="mk-btn" title="Chart type"><TypeIcon id={currentType.id} />{currentType.label}<ChevronDown size={11} /></button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="mk-pop mk-pop-sm">
              {CHART_TYPES.map((t) => (
                <button key={t.id} type="button" className="mk-menu-item" onClick={() => { onChartType?.(t.id); setTypeOpen(false); }}>
                  <TypeIcon id={t.id} />{t.label}
                  {t.id === chartType && <Check size={12} className="mk-check" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <IndicatorMenu
            enabledIndicators={enabledIndicators} onToggleIndicator={onToggleIndicator} onClearIndicators={onClearIndicators}
            interval={interval} open={indOpen} onOpenChange={setIndOpen}
          />

          <span className="mk-vsep" />
        </>
      )}

      <Popover open={gridOpen} onOpenChange={setGridOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={`mk-btn${gridMode !== '1x1' ? ' is-on' : ''}`} title="Multi-chart grid layout"><LayoutGrid size={13} />{gridMode === '1x1' ? '1x1' : gridMode.toUpperCase()}<ChevronDown size={11} /></button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="mk-pop mk-pop-sm">
          {[
            { id: '1x1', label: 'Single (1x1)' },
            { id: '1x2', label: 'Split Horizontal (1x2)' },
            { id: '2x1', label: 'Split Vertical (2x1)' },
            { id: '2x2', label: 'Grid 4-Pane (2x2)' },
          ].map((m) => (
            <button key={m.id} type="button" className="mk-menu-item" onClick={() => { onGridModeChange?.(m.id); setGridOpen(false); }}>
              {m.label}
              {m.id === gridMode && <Check size={12} className="mk-check" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {gridMode !== '1x1' && (
        <>
          <Popover open={syncOpen} onOpenChange={setSyncOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={`mk-btn${[syncCrosshair !== false, syncSymbol, syncInterval].some(Boolean) ? ' is-on' : ''}`} title="Sync panes"><Link2 size={13} />Sync<ChevronDown size={11} /></button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="mk-pop mk-pop-sm">
              {[
                { id: 'crosshair', label: 'Crosshair', value: syncCrosshair !== false, onChange: onSyncCrosshair },
                { id: 'symbol', label: 'Symbol', value: syncSymbol, onChange: onSyncSymbol },
                { id: 'interval', label: 'Timeframe', value: syncInterval, onChange: onSyncInterval },
              ].map((s) => (
                <button key={s.id} type="button" className="mk-menu-item" onClick={() => s.onChange?.(!s.value)}>
                  {s.label}
                  {s.value ? <Check size={12} className="mk-check" /> : null}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <span className="mk-vsep" />
        </>
      )}

      {presets.length > 0 && (
        <div className="mk-seg soft" role="group" aria-label="Date range">
          {presets.map((p) => (
            <button key={p.id} type="button" className={activePreset === p.id ? 'is-active' : ''} aria-pressed={activePreset === p.id} onClick={() => onPreset?.(p)}>{p.label}</button>
          ))}
        </div>
      )}

      <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={`mk-btn${activePreset === 'custom' ? ' is-on' : ''}`}><CalendarIcon size={12} />{rangeLabel}</button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="mk-pop mk-pop-range">
          <RangeCalendar
            initialFrom={from}
            initialTo={to}
            onApply={(f, t) => {
              // Full-day boundaries so single-day picks aren't dropped by `time <= to`.
              const a = new Date(f); a.setHours(0, 0, 0, 0);
              const b = new Date(t); b.setHours(23, 59, 59, 999);
              onRangeChange?.(a, b);
              setRangeOpen(false);
            }}
            onClear={() => { onRangeChange?.(null, null); setRangeOpen(false); }}
          />
        </PopoverContent>
      </Popover>

      <span className="mk-grow" />

      <button type="button" className="mk-btn sq" onClick={onUndo} disabled={!canUndo} aria-label="Undo drawing change (Ctrl+Z)" title="Undo (Ctrl+Z)"><Undo2 size={13} /></button>
      <button type="button" className="mk-btn sq" onClick={onScreenshot} aria-label="Save as image" title="Save as image"><Camera size={13} /></button>
      <button type="button" className="mk-btn sq" onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh (R)" title="Refresh (R)"><RefreshCw size={13} className={isRefreshing ? 'mk-spin' : ''} /></button>
      <button type="button" className="mk-btn sq" onClick={onHelp} aria-label="Keyboard shortcuts (?)" title="Keyboard shortcuts (?)"><Keyboard size={13} /></button>
      <button type="button" className="mk-btn sq" onClick={onToggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} title="Fullscreen (F)">{isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}</button>
      <button type="button" className={`mk-btn sq mk-desk${panelOpen ? ' is-on' : ''}`} onClick={onTogglePanel} aria-pressed={panelOpen} aria-label="Toggle side panel ([)" title="Side panel ([)">{panelOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}</button>
    </div>
  );
}


