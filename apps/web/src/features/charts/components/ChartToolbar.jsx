import { useMemo, useState } from 'react';
import {
  Activity, BarChart3, Calendar as CalendarIcon, Camera, Check, ChevronDown, Keyboard, Maximize2, Minimize2,
  PanelRightClose, PanelRightOpen, RefreshCw, Search, Undo2,
} from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import RangeCalendar from './RangeCalendar';
import { CHART_TYPES, TypeIcon } from './ChartIcons';
import { INDICATORS, INDICATOR_GROUPS } from '../lib/indicators';

const INTERVALS = [
  { id: '1m', label: '1m' }, { id: '5m', label: '5m' }, { id: '15m', label: '15m' },
  { id: '1h', label: '1h' }, { id: '4h', label: '4h' }, { id: '1d', label: '1D' },
];

export default function ChartToolbar({
  interval, onIntervalChange,
  chartType, onChartType,
  enabledIndicators, onToggleIndicator, onClearIndicators,
  showVolume, onToggleVolume, logScale, onToggleLog,
  from, to, presets = [], activePreset, onPreset, onRangeChange,
  canUndo, onUndo, onScreenshot,
  onRefresh, isRefreshing, onToggleFullscreen, isFullscreen, onHelp,
  panelOpen, onTogglePanel,
  indicatorsOpen, onIndicatorsOpenChange,
}) {
  const [rangeOpen, setRangeOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const indOpen = !!indicatorsOpen;
  const setIndOpen = (v) => onIndicatorsOpenChange?.(v);
  const [indQuery, setIndQuery] = useState('');

  const short = (v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const rangeLabel = from && to ? `${short(from)} – ${short(to)}` : 'Custom range';
  const currentType = CHART_TYPES.find((t) => t.id === chartType) || CHART_TYPES[0];

  const filteredGroups = useMemo(() => {
    const q = indQuery.trim().toLowerCase();
    return INDICATOR_GROUPS
      .map((g) => [g, INDICATORS.filter((i) => i.group === g && (!q || i.label.toLowerCase().includes(q)))])
      .filter(([, items]) => items.length > 0);
  }, [indQuery]);

  return (
    <div className="mk-toolbar" role="toolbar" aria-label="Chart controls">
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

      <Popover open={indOpen} onOpenChange={setIndOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={`mk-btn${enabledIndicators.length ? ' is-on' : ''}`} title="Indicators (I)">
            <Activity size={13} />Indicators{enabledIndicators.length ? <span className="mk-n">{enabledIndicators.length}</span> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="mk-pop mk-pop-md">
          <div className="mk-pop-search">
            <Search size={12} />
            <input value={indQuery} onChange={(e) => setIndQuery(e.target.value)} placeholder="Search indicators…" spellCheck={false} autoComplete="off" />
          </div>
          <div className="mk-pop-list">
            {filteredGroups.length === 0 && <div className="mk-pop-empty">No indicators match “{indQuery}”.</div>}
            {filteredGroups.map(([g, items]) => (
              <div key={g}>
                <div className="mk-menu-head">{g}</div>
                {items.map((ind) => {
                  const off = ind.intradayOnly && interval === '1d';
                  const on = enabledIndicators.includes(ind.id);
                  return (
                    <button key={ind.id} type="button" className="mk-menu-item" disabled={off} onClick={() => onToggleIndicator?.(ind.id)} title={off ? 'Intraday timeframes only' : undefined}>
                      <i className="mk-dot" style={{ background: ind.lines.find((l) => l.k === ind.primary)?.color || ind.lines[0].color }} />{ind.label}
                      {ind.overlay ? null : <span className="mk-tag">pane</span>}
                      {on && !off && <Check size={12} className="mk-check" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {enabledIndicators.length > 0 && (
            <button type="button" className="mk-pop-foot" onClick={onClearIndicators}>Remove all indicators</button>
          )}
        </PopoverContent>
      </Popover>

      <button type="button" className={`mk-btn${showVolume ? ' is-on' : ''}`} onClick={onToggleVolume} aria-pressed={showVolume}><BarChart3 size={13} />Vol</button>
      <button type="button" className={`mk-btn${logScale ? ' is-on' : ''}`} onClick={onToggleLog} aria-pressed={logScale} title="Logarithmic price scale">Log</button>

      <span className="mk-vsep" />

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
