// apps/web/src/features/utilities/gex/GexPage.jsx
//
// /utilities/gex — user-facing GEX level viewer.
//
// Title + dynamic subtitle (days uploaded / total levels) are published to
// the GLOBAL header bar via usePageHeader().
//
// Layout:
//   ┌──────────────┬──────────────────────────────────────┐
//   │              │  Converted string (TOP)              │
//   │  Date list   │  ─────────────────────────────       │
//   │  (sticky,    │  Price ladder chart (BELOW)          │
//   │   scrollable)│                                      │
//   └──────────────┴──────────────────────────────────────┘

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Layers, Clipboard, ClipboardCheck, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

import { useGexDays, useGexDay } from '@/shared/api/gex';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import GexLevelChart from './components/GexLevelChart';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .gxp-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
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
    position: sticky;
    top: 12px;
    max-height: calc(100vh - 100px);
    display: flex;
    flex-direction: column;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  @media (max-width: 1000px) {
    .gxp-sidebar { position: static; max-height: 320px; }
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
    background: linear-gradient(90deg, rgba(245,158,11,.16), rgba(245,158,11,.05) 75%, transparent);
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
    box-shadow: 0 0 12px rgba(245,158,11,.75);
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
  .gxp-date.is-active .gxp-date-meta { color: rgba(245,158,11,.75); }
  .gxp-date-meta-sep { opacity: .5; }
  .gxp-date-meta-bl  { color: #F59E0B; }
  .gxp-date-meta-gex { color: #378ADD; }

  /* ---------- Main column ---------- */
  .gxp-main {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
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
    background: rgba(245,158,11,.06);
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

  .gxp-empty-state {
    padding: 60px 24px;
    text-align: center;
    border: 1px dashed rgba(255,255,255,.10);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.005));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .gxp-empty-icon {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(245,158,11,.14), rgba(245,158,11,.04));
    border: 1px solid var(--accent-soft2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    color: var(--accent);
    box-shadow: 0 0 30px -10px rgba(245,158,11,.55);
  }
  .gxp-empty-state h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
  }
  .gxp-empty-state p {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-2);
    line-height: 1.65;
    max-width: 420px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }

  @media (prefers-reduced-motion: reduce) {
    .gxp-date, .gxp-copy-btn { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GexPage() {
  const { data: days = [], isLoading: daysLoading } = useGexDays();
  const [selectedDate, setSelectedDate] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-select the newest day; recover if the current one is deleted.
  useEffect(() => {
    if (days.length === 0) {
      if (selectedDate !== null) setSelectedDate(null);
      return;
    }
    const stillValid = selectedDate && days.some((d) => d.date === selectedDate);
    if (!stillValid) setSelectedDate(days[0].date);
  }, [days, selectedDate]);

  const { data: day, isLoading: dayLoading } = useGexDay(selectedDate);

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

  // Publish title + dynamic subtitle to the global header bar.
  const subText = days.length === 0
    ? 'No GEX data uploaded yet'
    : `${days.length} ${days.length === 1 ? 'day' : 'days'} uploaded · ${totalLevels} levels total`;

  usePageHeader({
    title: 'GEX Levels',
    subtitle: subText,
  });

  /* ----------------------------- Render ----------------------------- */

  if (daysLoading) return <PageSkeleton />;

  return (
    <>
      <style>{CSS}</style>
      <div className="gxp-root">

        {/* ---------- Empty state ---------- */}
        {days.length === 0 && (
          <div className="gxp-empty-state">
            <div className="gxp-empty-icon">
              <CalendarDays size={26} />
            </div>
            <h3>No GEX levels available</h3>
            <p>
              Daily gamma-exposure and buy/sell levels will appear here once
              an admin uploads them. Check back soon.
            </p>
          </div>
        )}

        {/* ---------- Two-column body ---------- */}
        {days.length > 0 && (
          <div className="gxp-body">

            {/* -------- Sidebar: date list -------- */}
            <aside className="gxp-sidebar">
              <div className="gxp-sidebar-head">
                <span className="gxp-sidebar-title">Uploaded Days</span>
                <span className="gxp-sidebar-count">{days.length}</span>
              </div>
              <div className="gxp-sidebar-list">
                {days.map((d) => {
                  const isActive = d.date === selectedDate;
                  return (
                    <button
                      key={d.date}
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

            {/* -------- Main column -------- */}
            <main className="gxp-main">
              {dayLoading || !day ? (
                <div className="gxp-loading">Loading day…</div>
              ) : (
                <>
                  {/* ───────── 1. Converted string (TOP) ───────── */}
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

                  {/* ───────── 2. Price ladder (BELOW) ───────── */}
                  <div className="gxp-card">
                    <div className="gxp-card-head">
                      <Layers size={14} style={{ color: '#F59E0B' }} />
                      <span className="gxp-card-title">
                        {formatDateLong(day.date)}
                      </span>
                      <span className="gxp-card-sub">
                        <span>{day.levelCount} {day.levelCount === 1 ? 'level' : 'levels'}</span>
                        {day.blCount > 0 && (
                          <>
                            <span className="gxp-card-sub-sep">·</span>
                            <span style={{ color: '#F59E0B' }}>{day.blCount} BL</span>
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