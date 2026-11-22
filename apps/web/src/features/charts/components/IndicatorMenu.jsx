import { useMemo, useState, useSyncExternalStore } from 'react';
import { Activity, Eye, EyeOff, Plus, Search, Settings2, X } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { FAMILIES, FAMILY_BY_ID, FAMILY_GROUPS, indicatorStore } from '../lib/indicators';

const MENU_CSS = `
  .im-pop { padding: 0 !important; overflow: hidden; }
  .im-section { padding: 10px 10px 4px; }
  .im-head { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px 6px; font: 700 9.5px 'IBM Plex Mono', monospace; letter-spacing: .14em; text-transform: uppercase; color: #545E6E; }
  .im-head em { font-style: normal; color: #8892A3; letter-spacing: 0; }
  .im-inst { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 9px; font: 600 12px 'IBM Plex Mono', monospace; color: #E7E9EE; }
  .im-inst:hover { background: rgba(255,255,255,.045); }
  .im-inst.is-off .im-label { opacity: .5; text-decoration: line-through; text-decoration-color: rgba(255,255,255,.25); }
  .im-dot { width: 9px; height: 9px; border-radius: 3px; flex: 0 0 auto; box-shadow: 0 0 8px -1px currentColor; }
  .im-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-act { display: inline-grid; place-items: center; width: 24px; height: 24px; border: 0; border-radius: 7px; background: transparent; color: #8892A3; cursor: pointer; opacity: .55; transition: all .12s; }
  .im-inst:hover .im-act, .im-act:focus-visible { opacity: 1; }
  .im-act:hover { background: rgba(255,255,255,.08); color: #E7E9EE; }
  .im-act.is-danger:hover { background: rgba(255,92,92,.14); color: #FF8080; }
  .im-act:focus-visible { outline: 2px solid var(--accent); outline-offset: 0; }

  .im-row { position: relative; display: flex; align-items: center; gap: 6px; margin: 1px 6px; border-radius: 10px; transition: background .12s; }
  .im-row:hover, .im-row:focus-within { background: rgba(255,255,255,.05); }
  .im-row.is-disabled { opacity: .45; }
  .im-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 8px 8px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; border-radius: 10px; font: inherit; }
  .im-main:disabled { cursor: not-allowed; }
  .im-main:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .im-badge { flex: 0 0 auto; min-width: 38px; height: 24px; padding: 0 7px; display: inline-grid; place-items: center; border-radius: 7px; font: 800 9.5px 'IBM Plex Mono', monospace; letter-spacing: .04em; color: #0A0D14; }
  .im-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .im-text b { font: 600 12.5px Inter, system-ui, sans-serif; color: #E7E9EE; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-text em { font: 500 10.5px Inter, system-ui, sans-serif; font-style: normal; color: #6B7587; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .im-count { flex: 0 0 auto; padding: 1px 7px; border-radius: 99px; font: 700 10px 'IBM Plex Mono', monospace; color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); }
  .im-add { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px; height: 26px; margin-right: 6px; padding: 0 10px 0 7px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent); background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); font: 700 11px 'IBM Plex Mono', monospace; cursor: pointer; opacity: 0; transform: translateX(4px); transition: opacity .12s, transform .12s, background .12s; }
  .im-row:hover .im-add, .im-row:focus-within .im-add, .im-add:focus-visible { opacity: 1; transform: none; }
  .im-add:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 24%, transparent); }
  .im-add:disabled { cursor: not-allowed; }
  .im-add:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .im-sep { height: 1px; margin: 6px 10px; background: rgba(255,255,255,.07); }
  @media (hover: none) { .im-add { opacity: 1; transform: none; } .im-act { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .im-add, .im-row, .im-act { transition: none; } }
`;

/**
 * Indicator picker. Families (EMA, RSI, …) are listed once; hover a row to "Add" another instance
 * of it. Every instance on the chart is listed under "On chart" with hide / settings / remove.
 *
 * `enabledIndicators` is the host's list of instance ids; the host only needs to toggle ids.
 */
export default function IndicatorMenu({
  enabledIndicators, onToggleIndicator, onClearIndicators, interval, open, onOpenChange,
}) {
  useSyncExternalStore(indicatorStore.subscribe, indicatorStore.getVersion);
  const [query, setQuery] = useState('');

  const onChart = enabledIndicators.map((id) => indicatorStore.resolve(id)).filter(Boolean);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAMILY_GROUPS
      .map((g) => [g, FAMILIES.filter((f) => f.group === g && (!q || `${f.name} ${f.short} ${f.desc} ${f.group}`.toLowerCase().includes(q)))])
      .filter(([, items]) => items.length > 0);
  }, [query]);

  const add = (family) => {
    const id = indicatorStore.create(family.id);
    if (id) onToggleIndicator?.(id);
  };
  const remove = (id) => {
    onToggleIndicator?.(id);
    indicatorStore.remove(id);
  };
  const openSettings = (id) => {
    onOpenChange?.(false);
    // the chart that owns the dialog picks this up on its next render
    setTimeout(() => indicatorStore.requestSettings(id), 0);
  };

  const dotOf = (ind) => ind.lines.find((l) => l.k === ind.primary)?.color || ind.lines[0].color;

  return (
    <>
      <style>{MENU_CSS}</style>
      <Popover open={!!open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button type="button" className={`mk-btn${enabledIndicators.length ? ' is-on' : ''}`} title="Indicators (I)">
            <Activity size={13} />Indicators{enabledIndicators.length ? <span className="mk-n">{enabledIndicators.length}</span> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="mk-pop mk-pop-md im-pop">
          <div className="mk-pop-search">
            <Search size={12} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search indicators…" spellCheck={false} autoComplete="off" />
          </div>

          {onChart.length > 0 && !query && (
            <>
              <div className="im-section">
                <div className="im-head">On chart <em>{onChart.length}</em></div>
                {onChart.map((ind) => (
                  <div key={ind.id} className={`im-inst${ind.hidden ? ' is-off' : ''}`}>
                    <i className="im-dot" style={{ background: dotOf(ind), color: dotOf(ind) }} />
                    <span className="im-label" title={ind.name}>{ind.label}</span>
                    <button type="button" className="im-act" onClick={() => indicatorStore.patch(ind.id, (o) => ({ ...o, hidden: !o.hidden }))} aria-label={ind.hidden ? `Show ${ind.label}` : `Hide ${ind.label}`} title={ind.hidden ? 'Show' : 'Hide'}>
                      {ind.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button type="button" className="im-act" onClick={() => openSettings(ind.id)} aria-label={`${ind.label} settings`} title="Settings"><Settings2 size={13} /></button>
                    <button type="button" className="im-act is-danger" onClick={() => remove(ind.id)} aria-label={`Remove ${ind.label}`} title="Remove"><X size={13} /></button>
                  </div>
                ))}
              </div>
              <div className="im-sep" />
            </>
          )}

          <div className="mk-pop-list">
            {groups.length === 0 && <div className="mk-pop-empty">No indicators match “{query}”.</div>}
            {groups.map(([g, items]) => (
              <div key={g}>
                <div className="mk-menu-head">{g}</div>
                {items.map((fam) => {
                  const off = fam.intradayOnly && interval === '1d';
                  const n = indicatorStore.countOf(fam.id, enabledIndicators);
                  const preview = indicatorStore.resolve(onChart.find((i) => i.family === fam.id)?.id);
                  const color = preview ? dotOf(preview) : FAMILY_BY_ID[fam.id].lines.find((l) => l.k === fam.primary)?.color;
                  return (
                    <div key={fam.id} className={`im-row${off ? ' is-disabled' : ''}`}>
                      <button type="button" className="im-main" disabled={off} onClick={() => add(fam)} title={off ? 'Intraday timeframes only' : `Add ${fam.name}`}>
                        <span className="im-badge" style={{ background: color }}>{fam.short}</span>
                        <span className="im-text"><b>{fam.name}</b><em>{fam.desc}</em></span>
                        {fam.overlay ? null : <span className="mk-tag">pane</span>}
                        {n > 0 && <span className="im-count">×{n}</span>}
                      </button>
                      <button type="button" className="im-add" disabled={off} onClick={() => add(fam)} aria-label={`Add ${fam.name}`}><Plus size={12} />Add</button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {enabledIndicators.length > 0 && (
            <button
              type="button" className="mk-pop-foot"
              onClick={() => { enabledIndicators.forEach((id) => indicatorStore.remove(id)); onClearIndicators?.(); }}
            >Remove all indicators</button>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
