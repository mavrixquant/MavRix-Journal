import { useEffect, useState, useCallback, useMemo } from 'react';
import { Layers, Clipboard, ClipboardCheck, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

import { useGexDays, useGexDay } from '@/shared/api/gex';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import EmptyState from '@/shared/components/EmptyState';
import GexLevelChart from './components/GexLevelChart';
import {
  GEX_SYMBOLS,
  GEX_SYMBOL_META,
  DEFAULT_GEX_SYMBOL,
} from '@mavrix/shared';


function formatDateLong(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


const CSS = `
  .gxp-root {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    width: 100%;
    max-width: 1560px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Symbol switcher ---------- */
  .gxp-symbar {
    display: flex;
    gap: 10px;
    padding: 6px;
    border-radius: 14px;
    background: rgba(0,0,0,.32);
    border: 1px solid var(--line-soft);
  }
  .gxp-sym {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    text-align: left;
  }
  .gxp-sym:hover:not(.is-active) {
    color: var(--ink-1);
    background: rgba(255,255,255,.04);
  }
  .gxp-sym.is-active {
    background: color-mix(in srgb, var(--sym-color) 12%, transparent);
    border-color: color-mix(in srgb, var(--sym-color) 45%, transparent);
    color: #FFFFFF;
    box-shadow: 0 0 26px -10px color-mix(in srgb, var(--sym-color) 60%, transparent);
  }
  .gxp-sym-dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--sym-color);
    box-shadow: 0 0 10px var(--sym-color);
    flex-shrink: 0;
  }
  .gxp-sym-code {
    font-weight: 700;
    font-size: 14px;
    letter-spacing: .04em;
  }
  .gxp-sym-name {
    font-size: 11px;
    color: var(--ink-3);
    font-weight: 500;
    letter-spacing: .02em;
  }
  .gxp-sym.is-active .gxp-sym-name {
    color: rgba(255,255,255,.6);
  }

  /* ---------- Two-column body ---------- */
  .gxp-body {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 18px;
    align-items: start;
  }
  @media (max-width: 1000px) {
    .gxp-body { grid-template-columns: 1fr; }
  }

  /* ---------- Sidebar (date list) ---------- */
  .gxp-sidebar {
    max-height: calc(100vh - 240px);
    display: flex;
    flex-direction: column;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  @media (max-width: 1000px) {
    .gxp-sidebar { position: static; max-height: 340px; }
  }

  .gxp-sidebar-head {
    padding: 14px 16px 12px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .gxp-sidebar-title {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.005em;
  }
  .gxp-sidebar-sym {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    border: 1px solid;
    flex-shrink: 0;
  }
  .gxp-sidebar-count {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--accent);
    opacity: .85;
  }

  .gxp-sidebar-list {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .gxp-sidebar-list::-webkit-scrollbar { width: 6px; }
  .gxp-sidebar-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  /* ---------- Date row ---------- */
  .gxp-date {
    position: relative;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border-radius: 9px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all .16s cubic-bezier(.2,.8,.25,1);
    font-family: inherit;
  }
  .gxp-date:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.04);
    border-color: rgba(255,255,255,.06);
  }
  .gxp-date.is-active {
    background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent) 5%, transparent) 75%, transparent);
    border-color: var(--accent-soft2);
    color: var(--accent);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
  }
  .gxp-date.is-active::before {
    content: '';
    position: absolute;
    left: -1px;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 75%, transparent);
  }

  .gxp-date-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: -.005em;
  }
  .gxp-date-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .02em;
    color: var(--ink-3);
  }
  .gxp-date.is-active .gxp-date-meta { color: color-mix(in srgb, var(--accent) 75%, transparent); }
  .gxp-date-meta-sep { opacity: .5; }
  .gxp-date-meta-bl  { color: var(--accent); }
  .gxp-date-meta-gex { color: #378ADD; }

  /* ---------- Main column ---------- */
  .gxp-main {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
    padding: 0;
  }

  /* ---------- Card shell ---------- */
  .gxp-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .gxp-card-head {
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--line-soft);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .gxp-card-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.005em;
  }
  .gxp-card-sym {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 9px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    border: 1px solid;
  }
  .gxp-card-sub {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .05em;
    text-transform: uppercase;
    color: var(--accent);
    opacity: .9;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .gxp-card-sub-sep { opacity: .4; font-weight: 400; }

  .gxp-card-body {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .gxp-card-body.is-chart {
    padding: 12px 14px 16px;
  }

  /* ---------- Converted-string card ---------- */
  .gxp-output-wrap {
    border-radius: 10px;
    border: 1px solid var(--line-soft);
    background: rgba(10,13,19,.6);
    overflow: hidden;
  }
  .gxp-output-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(0,0,0,.22);
    border-bottom: 1px solid var(--line-soft);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .gxp-copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all .18s;
  }
  .gxp-copy-btn:hover {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .gxp-copy-btn.is-copied {
    color: #4ade80;
    border-color: rgba(34,197,94,.35);
    background: rgba(34,197,94,.06);
  }

  .gxp-output-body {
    margin: 0;
    padding: 12px 14px;
    max-height: 180px;
    overflow-y: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.7;
    color: var(--ink-1);
    word-break: break-all;
    white-space: pre-wrap;
  }
  .gxp-output-body::-webkit-scrollbar { width: 8px; }
  .gxp-output-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  /* ---------- States ---------- */
  .gxp-loading {
    padding: 60px 24px;
    text-align: center;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
  }

  @media (prefers-reduced-motion: reduce) {
    .gxp-sym, .gxp-date, .gxp-copy-btn { transition: none !important; }
  }
`;


export default function GexPage() {
  const [symbol, setSymbol] = useState(DEFAULT_GEX_SYMBOL);
  const [selectedDate, setSelectedDate] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: days = [], isLoading: daysLoading } = useGexDays(symbol);
  const { data: day, isLoading: dayLoading } = useGexDay(selectedDate, symbol);

  const meta = useMemo(
    () => GEX_SYMBOL_META[symbol] || GEX_SYMBOL_META.NQ,
    [symbol]
  );

  // Whenever the day list changes (symbol switch, refetch), keep a valid
  // selected date — auto-pick the newest day for the active symbol.
  useEffect(() => {
    if (days.length === 0) {
      if (selectedDate !== null) setSelectedDate(null);
      return;
    }
    const stillValid =
      selectedDate && days.some((d) => d.date === selectedDate);
    if (!stillValid) setSelectedDate(days[0].date);
  }, [days, selectedDate]);

  const handleSymbolChange = useCallback((next) => {
    if (next === symbol) return;
    setSymbol(next);
    setSelectedDate(null);
    setCopied(false);
  }, [symbol]);

  const handleCopy = useCallback(async () => {
    if (!day?.converted) return;
    try {
      await navigator.clipboard.writeText(day.converted);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [day]);

  const totalLevels = useMemo(
    () => days.reduce((sum, d) => sum + d.levelCount, 0),
    [days]
  );

  const subText = days.length === 0
    ? `No ${symbol} GEX data uploaded yet`
    : `${days.length} ${days.length === 1 ? 'day' : 'days'} · ${totalLevels} levels · ${meta.fullName}`;

  usePageHeader({
    title: 'GEX Levels',
    subtitle: subText,
  });

  if (daysLoading) return <PageSkeleton />;

  return (
    <>
      <style>{CSS}</style>
      <div className="gxp-root">

        {/* Symbol switcher */}
        <div className="gxp-symbar" role="tablist" aria-label="Select symbol">
          {GEX_SYMBOLS.map((sym) => {
            const m = GEX_SYMBOL_META[sym];
            const active = symbol === sym;
            return (
              <button
                key={sym}
                type="button"
                role="tab"
                aria-selected={active}
                className={`gxp-sym${active ? ' is-active' : ''}`}
                style={{ '--sym-color': m.color }}
                onClick={() => handleSymbolChange(sym)}
              >
                <span className="gxp-sym-dot" aria-hidden />
                <span className="gxp-sym-code">{m.label}</span>
                <span className="gxp-sym-name">{m.fullName}</span>
              </button>
            );
          })}
        </div>

        {/* Empty state for the active symbol */}
        {days.length === 0 && (
          <EmptyState
            size="lg"
            icon={CalendarDays}
            eyebrow={`No ${symbol} data`}
            title={`No ${meta.fullName} GEX levels available`}
            description={`Daily ${symbol} gamma-exposure levels will appear here once an admin uploads them. Try switching to the other symbol, or check back later.`}
          />
        )}

        {/* Day rail + main content */}
        {days.length > 0 && (
          <div className="gxp-body">

            <aside className="gxp-sidebar">
              <div className="gxp-sidebar-head">
                <span className="gxp-sidebar-title">Uploaded Days</span>
                <span
                  className="gxp-sidebar-sym"
                  style={{
                    color: meta.color,
                    borderColor: `${meta.color}55`,
                    background: `${meta.color}15`,
                  }}
                >
                  {meta.label}
                </span>
                <span className="gxp-sidebar-count">{days.length}</span>
              </div>
              <div className="gxp-sidebar-list">
                {days.map((d) => {
                  const isActive = d.date === selectedDate;
                  return (
                    <button
                      key={`${d.symbol}:${d.date}`}
                      type="button"
                      className={`gxp-date ${isActive ? 'is-active' : ''}`}
                      onClick={() => setSelectedDate(d.date)}
                    >
                      <span className="gxp-date-label">
                        {formatDateShort(d.date)}
                      </span>
                      <span className="gxp-date-meta">
                        <span>{d.levelCount} levels</span>
                        <span className="gxp-date-meta-sep">·</span>
                        <span className="gxp-date-meta-bl">{d.blCount} BL</span>
                        <span className="gxp-date-meta-sep">·</span>
                        <span className="gxp-date-meta-gex">{d.gexCount} GEX</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="gxp-main">
              {dayLoading || !day ? (
                <div className="gxp-loading">Loading {symbol} day…</div>
              ) : (
                <>
                  {/* TradingView string */}
                  <div className="gxp-card">
                    <div className="gxp-card-head">
                      <span className="gxp-card-title">TradingView String</span>
                      <span className="gxp-card-sub">paste into Pine</span>
                    </div>
                    <div className="gxp-card-body">
                      <div className="gxp-output-wrap">
                        <div className="gxp-output-head">
                          <span>
                            TYPE|PRICE|LABEL;{day.levelCount > 1 ? '…' : ''}
                          </span>
                          <button
                            type="button"
                            className={`gxp-copy-btn ${copied ? 'is-copied' : ''}`}
                            onClick={handleCopy}
                          >
                            {copied
                              ? <><ClipboardCheck size={10} /> Copied</>
                              : <><Clipboard size={10} /> Copy</>
                            }
                          </button>
                        </div>
                        <pre className="gxp-output-body">{day.converted}</pre>
                      </div>
                    </div>
                  </div>

                  {/* Level chart */}
                  <div className="gxp-card">
                    <div className="gxp-card-head">
                      <Layers size={14} style={{ color: 'var(--accent)' }} />
                      <span className="gxp-card-title">
                        {formatDateLong(day.date)}
                      </span>
                      <span
                        className="gxp-card-sym"
                        style={{
                          color: meta.color,
                          borderColor: `${meta.color}55`,
                          background: `${meta.color}15`,
                        }}
                      >
                        {meta.label}
                      </span>
                      <span className="gxp-card-sub">
                        <span>{day.levelCount} {day.levelCount === 1 ? 'level' : 'levels'}</span>
                        {day.blCount > 0 && (
                          <>
                            <span className="gxp-card-sub-sep">·</span>
                            <span style={{ color: 'var(--accent)' }}>{day.blCount} BL</span>
                          </>
                        )}
                        {day.gexCount > 0 && (
                          <>
                            <span className="gxp-card-sub-sep">·</span>
                            <span style={{ color: '#378ADD' }}>{day.gexCount} GEX</span>
                          </>
                        )}
                        {day.otherCount > 0 && (
                          <>
                            <span className="gxp-card-sub-sep">·</span>
                            <span>{day.otherCount} other</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="gxp-card-body is-chart">
                      <GexLevelChart levels={day.levels} />
                    </div>
                  </div>
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </>
  );
}