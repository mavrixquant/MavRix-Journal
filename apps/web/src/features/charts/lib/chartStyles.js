// All styles for the Chart page. Colors are the existing MavRix palette; the accent comes from --accent.
// Class names are global (popovers render in portals), so everything is prefixed "mk-".
export const CSS = `
  .mk-root { --mk-line: rgba(255,255,255,.08); --mk-line-2: rgba(255,255,255,.05); --mk-ink-1: #E7E9EE; --mk-ink-2: #8892A3; --mk-ink-3: #545E6E; --mk-glass: rgba(12,16,23,.82); --mk-panel-w: 316px; width: 100%; height: max(600px, calc(100dvh - 150px)); color: var(--mk-ink-1); font-family: Inter, sans-serif; }
  .mk-root.is-full { position: fixed; inset: 0; z-index: 2000; height: 100dvh; padding: 12px; background: #0A0D13; }
  .mk-shell { height: 100%; display: grid; grid-template-rows: auto auto minmax(0,1fr) auto; border-radius: 16px; border: 1px solid var(--mk-line); background: linear-gradient(180deg, rgba(17,21,31,.86), rgba(10,13,19,.78)); box-shadow: 0 30px 70px -40px rgba(0,0,0,.9); overflow: hidden; }
  .is-up { color: #35C4A1; } .is-down { color: #FF5C5C; } .is-empty { color: var(--mk-ink-3); }
  .mk-grow { flex: 1; min-width: 0; }
  .mk-spin { animation: mkSpin .8s linear infinite; }
  @keyframes mkSpin { to { transform: rotate(360deg); } }
  .mk-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  /* ---------- quote header ---------- */
  .mk-quote { display: flex; align-items: center; gap: 14px 22px; padding: 10px 14px; border-bottom: 1px solid var(--mk-line-2); min-width: 0; }
  .mk-menu { display: none; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: var(--mk-ink-2); cursor: pointer; }
  .mk-sym { display: flex; align-items: center; gap: 11px; padding: 5px 12px 5px 8px; border-radius: 11px; border: 1px solid transparent; background: transparent; color: inherit; cursor: pointer; text-align: left; transition: background-color .15s, border-color .15s; min-width: 0; }
  .mk-sym:hover { background: rgba(255,255,255,.04); border-color: var(--mk-line); }
  .mk-sym:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .mk-sym-names { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .mk-sym-code { display: inline-flex; align-items: center; gap: 5px; font: 800 17px/1 'IBM Plex Mono', monospace; color: #fff; letter-spacing: .01em; }
  .mk-sym-code svg { color: var(--mk-ink-3); }
  .mk-sym-sub { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--mk-ink-2); min-width: 0; }
  .mk-sym-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px; }
  .mk-price { display: flex; align-items: baseline; gap: 12px; padding-left: 22px; border-left: 1px solid var(--mk-line-2); }
  .mk-px { font: 800 28px/1 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; letter-spacing: -.02em; border-radius: 6px; padding: 0 2px; transition: background-color .7s ease; }
  .mk-px.flash-up { background: rgba(53,196,161,.18); transition: none; }
  .mk-px.flash-down { background: rgba(255,92,92,.18); transition: none; }
  .mk-chg { display: inline-flex; align-items: center; font: 700 12px 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
  .mk-chg-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,.04); }
  .mk-chg.is-up .mk-chg-pill { background: rgba(53,196,161,.12); }
  .mk-chg.is-down .mk-chg-pill { background: rgba(255,92,92,.12); }
  .mk-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 99px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); font: 600 10px 'IBM Plex Mono', monospace; color: var(--mk-ink-2); text-transform: capitalize; }
  .mk-badge i { width: 5px; height: 5px; border-radius: 50%; background: var(--mk-ink-3); }
  .mk-badge.is-open { color: #35C4A1; border-color: rgba(53,196,161,.28); }
  .mk-badge.is-open i { background: #35C4A1; }
  .mk-gauge { flex: 0 1 220px; min-width: 120px; display: flex; flex-direction: column; gap: 6px; margin-left: auto; }
  .mk-gauge-lbl { display: flex; justify-content: space-between; font: 600 10px 'IBM Plex Mono', monospace; color: var(--mk-ink-3); }
  .mk-gauge-lbl b { color: var(--mk-ink-2); font-weight: 600; font-variant-numeric: tabular-nums; }
  .mk-track { position: relative; height: 4px; border-radius: 99px; background: linear-gradient(90deg, rgba(255,92,92,.45), rgba(255,255,255,.1) 50%, rgba(53,196,161,.45)); }
  .mk-track i { position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--mk-ink-1); border: 2px solid #0A0D13; box-shadow: 0 0 0 1px rgba(255,255,255,.35); transition: left .5s cubic-bezier(.2,.8,.25,1); }
  .mk-stats { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
  .mk-stat { display: flex; flex-direction: column; gap: 3px; }
  .mk-stat em { font: normal 600 10px 'IBM Plex Mono', monospace; color: var(--mk-ink-3); }
  .mk-stat b { font: 600 12px 'IBM Plex Mono', monospace; color: #C9CFDA; font-variant-numeric: tabular-nums; }

  /* ---------- toolbar ---------- */
  .mk-toolbar { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-bottom: 1px solid var(--mk-line-2); background: rgba(0,0,0,.14); overflow-x: auto; scrollbar-width: none; }
  .mk-toolbar::-webkit-scrollbar { display: none; }
  .mk-toolbar > * { flex-shrink: 0; }
  .mk-vsep { width: 1px; height: 20px; background: var(--mk-line); margin: 0 2px; }
  .mk-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 9px; background: rgba(0,0,0,.32); border: 1px solid rgba(255,255,255,.06); }
  .mk-seg button { min-width: 32px; padding: 5px 9px; border: none; border-radius: 6px; background: transparent; color: var(--mk-ink-2); font: 700 11px 'IBM Plex Mono', monospace; cursor: pointer; transition: color .15s, background-color .15s; }
  .mk-seg button:hover:not(.is-active) { color: var(--mk-ink-1); background: rgba(255,255,255,.05); }
  .mk-seg button.is-active { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0D1117; box-shadow: 0 4px 10px -6px var(--accent); }
  .mk-seg.soft button.is-active { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); box-shadow: none; }
  .mk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 30px; padding: 0 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.03); color: var(--mk-ink-2); font: 600 11px 'IBM Plex Mono', monospace; cursor: pointer; white-space: nowrap; transition: color .15s, border-color .15s, background-color .15s; }
  .mk-btn.sq { width: 30px; padding: 0; }
  .mk-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .mk-btn.is-on { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 38%, transparent); background: color-mix(in srgb, var(--accent) 9%, transparent); }
  .mk-btn:disabled { opacity: .4; cursor: not-allowed; }
  .mk-btn:focus-visible, .mk-seg button:focus-visible, .mk-tool:focus-visible, .mk-menu:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .mk-n { padding: 0 6px; border-radius: 4px; background: rgba(255,255,255,.08); font-size: 10px; line-height: 16px; }

  /* popovers (rendered in a portal) */
  .mk-pop { padding: 6px !important; background: #11151F !important; border: 1px solid #212836 !important; border-radius: 12px !important; box-shadow: 0 24px 60px -20px rgba(0,0,0,.95) !important; z-index: 3000 !important; color: var(--mk-ink-1); font-family: Inter, sans-serif; }
  .mk-pop-sm { width: 200px !important; }
  .mk-pop-md { width: 270px !important; padding: 0 !important; overflow: hidden; }
  .mk-pop-range { width: 430px !important; max-width: calc(100vw - 32px) !important; padding: 14px !important; }
  .mk-pop-colors { width: auto !important; display: flex; gap: 6px; padding: 8px !important; }
  .mk-pop-search { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #1A2029; color: var(--mk-ink-3); }
  .mk-pop-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--mk-ink-1); font: 12px 'IBM Plex Mono', monospace; }
  .mk-pop-list { max-height: 340px; overflow-y: auto; padding: 5px; }
  .mk-pop-empty { padding: 20px 10px; text-align: center; color: var(--mk-ink-3); font: 11.5px 'IBM Plex Mono', monospace; }
  .mk-pop-foot { width: 100%; padding: 9px; border: 0; border-top: 1px solid #1A2029; background: transparent; color: #FF5C5C; font: 600 11px 'IBM Plex Mono', monospace; cursor: pointer; }
  .mk-pop-foot:hover { background: rgba(255,92,92,.08); }
  .mk-menu-head { padding: 7px 9px 3px; font: 700 9px 'IBM Plex Mono', monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--mk-ink-3); }
  .mk-menu-item { width: 100%; display: flex; align-items: center; gap: 9px; padding: 7px 9px; border: 0; border-radius: 7px; background: transparent; color: #C9CFDA; font: 600 11.5px 'IBM Plex Mono', monospace; text-align: left; cursor: pointer; }
  .mk-menu-item:hover:not(:disabled) { background: rgba(255,255,255,.05); }
  .mk-menu-item:disabled { opacity: .35; cursor: not-allowed; }
  .mk-menu-item:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .mk-check { margin-left: auto; color: var(--accent); }
  .mk-tag { padding: 0 5px; border-radius: 3px; background: rgba(255,255,255,.06); font-size: 9px; color: var(--mk-ink-3); }

  /* ---------- body ---------- */
  .mk-body { position: relative; display: grid; grid-template-columns: 46px minmax(0,1fr) var(--mk-panel-w); min-height: 0; }
  .mk-root.is-panel-closed .mk-body { grid-template-columns: 46px minmax(0,1fr) 0; }
  .mk-root.is-panel-closed .mk-panel { visibility: hidden; border-left-width: 0; }
  .mk-rail { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 0; border-right: 1px solid var(--mk-line-2); background: rgba(0,0,0,.14); overflow-y: auto; scrollbar-width: none; }
  .mk-tool { width: 32px; height: 32px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--mk-ink-2); cursor: pointer; transition: color .15s, background-color .15s, border-color .15s; }
  .mk-tool:hover:not(:disabled) { color: var(--mk-ink-1); background: rgba(255,255,255,.06); }
  .mk-tool.is-on { color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); }
  .mk-tool:disabled { opacity: .3; cursor: not-allowed; }
  .mk-rail-sep { width: 20px; height: 1px; background: var(--mk-line); margin: 5px 0; }
  .mk-rail-grow { flex: 1; }
  .mk-color-dot { width: 14px; height: 14px; border-radius: 50%; box-shadow: 0 0 0 2px rgba(255,255,255,.14); }
  .mk-swatch { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
  .mk-swatch.is-on { border-color: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.5); }

  .mk-stage { position: relative; min-width: 0; min-height: 0; background: linear-gradient(180deg, rgba(15,18,25,.5), rgba(10,13,19,.3)); }
  .mk-bar { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 20; overflow: hidden; }
  .mk-bar i { display: block; height: 100%; width: 30%; background: linear-gradient(90deg, transparent, var(--accent), transparent); animation: mkSlide 1.3s ease infinite; }
  @keyframes mkSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
  .mk-skel { position: absolute; inset: 0; z-index: 7; pointer-events: none; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.045) 50%, transparent 70%) 0 0 / 250% 100%, repeating-linear-gradient(90deg, rgba(255,255,255,.025) 0 10px, transparent 10px 22px); animation: mkShimmer 1.4s linear infinite; }
  @keyframes mkShimmer { from { background-position: 150% 0, 0 0; } to { background-position: -100% 0, 0 0; } }
  .mk-state { position: absolute; inset: 0; z-index: 8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 24px; background: rgba(10,13,19,.85); color: #C9CFDA; font-size: 13px; }
  .mk-state b { font: 700 14px Inter, sans-serif; color: var(--mk-ink-1); }
  .mk-state p { margin: 0; max-width: 360px; color: var(--mk-ink-2); line-height: 1.5; }
  .mk-retry { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 14px; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent); font: 700 11px 'IBM Plex Mono', monospace; cursor: pointer; }

  /* ---------- chart canvas overlays ---------- */
  .mk-cv { position: relative; width: 100%; height: 100%; }
  .mk-cv-canvas { width: 100%; height: 100%; }
  .mk-cv-canvas.is-tool { cursor: crosshair; }
  .mk-cv-canvas[data-cur="move"], .mk-cv-canvas[data-cur="move"] * { cursor: move !important; }
  .mk-cv-canvas[data-cur="grab"], .mk-cv-canvas[data-cur="grab"] * { cursor: grab !important; }
  .mk-cv-canvas[data-cur="grabbing"], .mk-cv-canvas[data-cur="grabbing"] * { cursor: grabbing !important; }
  .mk-cv-top { position: absolute; top: 10px; left: 12px; z-index: 3; display: flex; flex-direction: column; gap: 6px; max-width: calc(100% - 90px); pointer-events: none; }
  .mk-ohlc { display: inline-flex; flex-wrap: wrap; align-items: center; align-self: flex-start; gap: 5px 14px; padding: 6px 12px; border-radius: 8px; background: rgba(12,16,23,.72); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.06); font: 11px 'IBM Plex Mono', monospace; letter-spacing: .02em; }
  .mk-ohlc-sym { font-weight: 800; color: #fff; }
  .mk-ohlc-tf { padding: 1px 7px; border-radius: 4px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); color: var(--mk-ink-2); font-size: 10px; font-weight: 700; }
  .mk-ohlc-item { display: inline-flex; gap: 5px; align-items: center; }
  .mk-ohlc-item em { font-style: normal; color: var(--mk-ink-3); font-weight: 700; font-size: 10px; }
  .mk-ohlc-item b { font-weight: 700; font-variant-numeric: tabular-nums; color: #C9CFDA; }
  .mk-ohlc b.is-up, .mk-ohlc-chg.is-up { color: #35C4A1; } .mk-ohlc b.is-down, .mk-ohlc-chg.is-down { color: #FF5C5C; }
  .mk-ohlc-chg { font-weight: 700; font-variant-numeric: tabular-nums; }
  .mk-inds { display: flex; flex-wrap: wrap; gap: 4px 6px; pointer-events: auto; }
  .mk-ind { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 4px 0 8px; border-radius: 6px; background: rgba(12,16,23,.66); border: 1px solid rgba(255,255,255,.05); font: 600 10.5px 'IBM Plex Mono', monospace; color: var(--mk-ink-2); }
  .mk-ind b { color: #C9CFDA; font-weight: 700; font-variant-numeric: tabular-nums; }
  .mk-ind button { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: var(--mk-ink-3); cursor: pointer; }
  .mk-ind button:hover { color: var(--mk-ink-1); background: rgba(255,255,255,.08); }
  .mk-cv-hint { position: absolute; top: 52px; left: 50%; transform: translateX(-50%); z-index: 6; padding: 6px 12px; border-radius: 8px; background: rgba(12,16,23,.92); border: 1px solid rgba(255,255,255,.1); font: 600 11px 'IBM Plex Mono', monospace; color: var(--mk-ink-2); pointer-events: none; white-space: nowrap; max-width: calc(100% - 24px); overflow: hidden; text-overflow: ellipsis; }
  .mk-cv-hint span { color: var(--mk-ink-3); margin-left: 8px; }
  .mk-sel { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 7; display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 10px; background: var(--mk-glass); border: 1px solid var(--mk-line); backdrop-filter: blur(10px); box-shadow: 0 12px 30px -12px rgba(0,0,0,.8); }
  .mk-sel .mk-swatch { width: 16px; height: 16px; }
  .mk-sel-sep { width: 1px; height: 16px; background: var(--mk-line); margin: 0 2px; }
  .mk-sel-del { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 24px; border: 0; border-radius: 6px; background: transparent; color: #FF5C5C; cursor: pointer; }
  .mk-sel-del:hover { background: rgba(255,92,92,.12); }
  .mk-zoom { position: absolute; bottom: 34px; right: 76px; z-index: 5; display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--mk-glass); border: 1px solid var(--mk-line); backdrop-filter: blur(10px); }
  .mk-zoom button { min-width: 26px; height: 26px; padding: 0 7px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; background: transparent; color: var(--mk-ink-2); font: 700 10.5px 'IBM Plex Mono', monospace; cursor: pointer; }
  .mk-zoom button:hover { color: var(--mk-ink-1); background: rgba(255,255,255,.07); }
  .mk-zoom .go { color: var(--accent); }
  .mk-cv-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }

  /* ---------- side panel ---------- */
  .mk-panel { min-width: 0; min-height: 0; display: flex; flex-direction: column; border-left: 1px solid var(--mk-line-2); background: rgba(10,13,19,.5); overflow: hidden; }
  .mk-tabs { display: flex; align-items: stretch; flex-shrink: 0; border-bottom: 1px solid var(--mk-line-2); padding: 0 6px; }
  .mk-tabs button { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 11px 9px; border: 0; background: transparent; color: var(--mk-ink-3); font: 700 10.5px 'IBM Plex Mono', monospace; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: color .15s; }
  .mk-tabs button:hover { color: var(--mk-ink-2); }
  .mk-tabs button.is-active { color: var(--accent); }
  .mk-tabs button.is-active::after { content: ''; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px; border-radius: 2px; background: var(--accent); }
  .mk-tabs em { font-style: normal; padding: 0 5px; border-radius: 4px; background: rgba(255,255,255,.06); font-size: 9.5px; line-height: 15px; letter-spacing: 0; }
  .mk-tabs .mk-panel-x { display: none; margin-left: auto; padding: 0 8px; }
  .mk-search { position: relative; display: flex; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--mk-line-2); color: var(--mk-ink-3); flex-shrink: 0; }
  .mk-search > svg { position: absolute; left: 19px; pointer-events: none; }
  .mk-wl-search { width: 100%; padding: 7px 30px; background: rgba(10,13,19,.6); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; color: var(--mk-ink-1); font: 11.5px 'IBM Plex Mono', monospace; outline: none; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
  .mk-wl-search::placeholder { color: var(--mk-ink-3); }
  .mk-wl-search:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
  .mk-search-x { position: absolute; right: 16px; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--mk-ink-3); cursor: pointer; }
  .mk-search-x:hover { color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
  .mk-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 4px; }
  .mk-scroll::-webkit-scrollbar { width: 6px; } .mk-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }
  .mk-pad { padding: 12px 8px; }
  .mk-group-head { display: flex; align-items: center; gap: 6px; width: 100%; padding: 8px 10px 6px; border: 0; border-radius: 6px; background: transparent; cursor: pointer; text-align: left; font: 700 9px 'IBM Plex Mono', monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--mk-ink-3); transition: color .15s, background-color .15s; }
  .mk-group-head:hover { color: var(--mk-ink-2); background: rgba(255,255,255,.03); }
  .mk-group-head span { flex: 1; }
  .mk-group-head em { font-style: normal; padding: 1px 5px; border-radius: 3px; background: rgba(255,255,255,.04); letter-spacing: 0; }
  .mk-group-chev { transition: transform .2s cubic-bezier(.2,.8,.25,1); }
  .mk-group.is-collapsed .mk-group-chev { transform: rotate(-90deg); }
  .mk-group-title { display: flex; align-items: center; gap: 8px; padding: 10px 10px 6px; font: 700 9px 'IBM Plex Mono', monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--mk-ink-3); }
  .mk-group-title em { font-style: normal; color: var(--accent); }
  .mk-group-title button { margin-left: auto; border: 0; background: transparent; color: var(--mk-ink-3); font: 600 10px 'IBM Plex Mono', monospace; text-transform: none; letter-spacing: 0; cursor: pointer; }
  .mk-group-title button:hover { color: #FF5C5C; }
  .mk-row { display: flex; align-items: center; border-radius: 8px; border: 1px solid transparent; transition: background-color .14s, border-color .14s; }
  .mk-row:hover { background: rgba(255,255,255,.04); }
  .mk-row.is-active { background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: color-mix(in srgb, var(--accent) 28%, transparent); }
  .mk-row-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 9px; padding: 7px 4px 7px 9px; border: 0; background: transparent; color: inherit; cursor: pointer; text-align: left; font-family: inherit; }
  .mk-row-names { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .mk-row-code { font: 700 12px 'IBM Plex Mono', monospace; color: var(--mk-ink-1); letter-spacing: .02em; }
  .mk-row.is-active .mk-row-code { color: var(--accent); }
  .mk-row-code em { font: normal 600 8.5px 'IBM Plex Mono', monospace; color: var(--mk-ink-3); margin-left: 6px; letter-spacing: .06em; }
  .mk-row-label { font-size: 10px; color: var(--mk-ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mk-row-quote { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; flex-shrink: 0; }
  .mk-row-px { font: 600 11px 'IBM Plex Mono', monospace; color: var(--mk-ink-2); font-variant-numeric: tabular-nums; }
  .mk-row-chg { font: 600 10px 'IBM Plex Mono', monospace; color: var(--mk-ink-3); font-variant-numeric: tabular-nums; }
  .mk-star { width: 24px; height: 24px; margin-right: 4px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 5px; background: transparent; color: var(--mk-ink-3); cursor: pointer; opacity: 0; transition: opacity .15s, color .15s; }
  .mk-row:hover .mk-star, .mk-star:focus-visible, .mk-star.is-on { opacity: 1; }
  .mk-star.is-on { color: var(--accent); } .mk-star:hover { color: var(--accent); }
  .mk-switches { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-bottom: 1px solid var(--mk-line-2); flex-shrink: 0; }
  .mk-switch-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; font-size: 11.5px; color: var(--mk-ink-1); cursor: pointer; }
  .mk-switch-row.is-disabled { opacity: .4; cursor: not-allowed; }
  .mk-switch-row input { display: none; }
  .mk-switch { position: relative; width: 28px; height: 16px; border-radius: 99px; background: rgba(255,255,255,.1); transition: background-color .2s; }
  .mk-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--mk-ink-1); transition: transform .2s; }
  .mk-switch-row input:checked + .mk-switch { background: var(--accent); }
  .mk-switch-row input:checked + .mk-switch::after { transform: translateX(12px); background: #0D1117; }
  .mk-trade { display: flex; flex-direction: column; gap: 3px; width: 100%; padding: 9px 10px; border-radius: 8px; border: 1px solid transparent; background: transparent; text-align: left; cursor: pointer; color: inherit; font-family: inherit; transition: background-color .16s, border-color .16s; }
  .mk-trade:hover { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.06); }
  .mk-trade.is-active { background: color-mix(in srgb, var(--accent) 9%, transparent); border-color: var(--accent-soft2); }
  .mk-trade-top, .mk-trade-bot { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .mk-trade-top b { font: 700 11.5px 'IBM Plex Mono', monospace; }
  .mk-trade-top em { font: normal 700 9px 'IBM Plex Mono', monospace; letter-spacing: .06em; text-transform: uppercase; padding: 1px 6px; border-radius: 3px; }
  .mk-trade-top em.is-long { color: #35C4A1; background: rgba(53,196,161,.1); border: 1px solid rgba(53,196,161,.3); }
  .mk-trade-top em.is-short { color: #FF5C5C; background: rgba(255,92,92,.1); border: 1px solid rgba(255,92,92,.3); }
  .mk-trade-bot span { font: 10.5px 'IBM Plex Mono', monospace; color: var(--mk-ink-2); }
  .mk-trade-bot b { font: 700 11px 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; color: var(--mk-ink-2); }
  .mk-note { padding: 4px 10px 8px; font-size: 11px; line-height: 1.55; color: var(--mk-ink-3); }
  .mk-obj { display: flex; align-items: center; border-radius: 8px; border: 1px solid transparent; }
  .mk-obj:hover { background: rgba(255,255,255,.04); }
  .mk-obj.is-active { background: color-mix(in srgb, var(--accent) 9%, transparent); border-color: var(--accent-soft2); }
  .mk-obj-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 9px; padding: 8px 6px 8px 10px; border: 0; background: transparent; color: #C9CFDA; font: 600 11.5px 'IBM Plex Mono', monospace; text-align: left; cursor: pointer; }
  .mk-obj-main.static { cursor: default; }
  .mk-obj-main em { margin-left: auto; font-style: normal; color: var(--mk-ink-3); font-size: 10.5px; }
  .mk-obj-x { width: 26px; height: 26px; margin-right: 4px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; background: transparent; color: var(--mk-ink-3); cursor: pointer; }
  .mk-obj-x:hover { color: #FF5C5C; background: rgba(255,92,92,.1); }

  /* ---------- status bar ---------- */
  .mk-status { display: flex; align-items: center; gap: 18px; padding: 0 12px; height: 28px; border-top: 1px solid var(--mk-line-2); background: rgba(0,0,0,.2); font: 600 10.5px 'IBM Plex Mono', monospace; color: var(--mk-ink-3); overflow: hidden; white-space: nowrap; }
  .mk-st { display: inline-flex; align-items: center; gap: 6px; }
  .mk-st b { color: #C9CFDA; font-weight: 600; font-variant-numeric: tabular-nums; }
  .mk-st b.is-up { color: #35C4A1; } .mk-st b.is-down { color: #FF5C5C; }
  .mk-live { width: 6px; height: 6px; border-radius: 50%; background: #35C4A1; box-shadow: 0 0 0 3px rgba(53,196,161,.18); }
  .mk-live.is-hist { background: var(--mk-ink-3); box-shadow: none; }

  /* ---------- symbol palette + help ---------- */
  .mk-pal-scrim { position: fixed; inset: 0; z-index: 3600; display: flex; align-items: flex-start; justify-content: center; padding: 12vh 16px 16px; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); }
  .mk-pal { width: min(540px, 100%); border-radius: 14px; background: #11151F; border: 1px solid #212836; box-shadow: 0 30px 80px -20px rgba(0,0,0,.95); overflow: hidden; }
  .mk-pal-input { display: flex; align-items: center; gap: 10px; padding: 13px 16px; border-bottom: 1px solid #1A2029; color: var(--mk-ink-3); }
  .mk-pal-input input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--mk-ink-1); font: 13.5px 'IBM Plex Mono', monospace; }
  .mk-pal-input kbd { padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(255,255,255,.12); font: 600 10px 'IBM Plex Mono', monospace; color: var(--mk-ink-2); }
  .mk-pal-list { max-height: 52vh; overflow-y: auto; padding: 6px; }
  .mk-pal-empty { padding: 26px 12px; text-align: center; color: var(--mk-ink-3); font: 12px 'IBM Plex Mono', monospace; }
  .mk-pal-group [cmdk-group-heading] { padding: 9px 10px 4px; font: 700 9px 'IBM Plex Mono', monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--mk-ink-3); }
  .mk-pal-item { display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 8px; cursor: pointer; color: var(--mk-ink-2); font: 12.5px 'IBM Plex Mono', monospace; }
  .mk-pal-item b { min-width: 56px; color: var(--mk-ink-1); letter-spacing: .02em; }
  .mk-pal-item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--mk-ink-3); font-size: 11.5px; }
  .mk-pal-item em { font-style: normal; font-size: 10px; color: var(--mk-ink-3); }
  .mk-pal-item u { text-decoration: none; font-size: 9.5px; padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,.05); color: var(--mk-ink-3); }
  .mk-pal-item[data-selected="true"] { background: color-mix(in srgb, var(--accent) 9%, transparent); }
  .mk-pal-item[data-selected="true"] b { color: var(--accent); }
  .mk-help-scrim { position: fixed; inset: 0; z-index: 3500; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); }
  .mk-help { width: min(440px, 100%); max-height: 86vh; overflow-y: auto; padding: 18px 20px; border-radius: 14px; background: #11151F; border: 1px solid #212836; box-shadow: 0 24px 60px -20px rgba(0,0,0,.95); color: #C9CFDA; }
  .mk-help-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-weight: 700; font-size: 14px; color: var(--mk-ink-1); }
  .mk-help-head button { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid rgba(255,255,255,.1); background: transparent; color: var(--mk-ink-2); cursor: pointer; }
  .mk-help ul { list-style: none; margin: 0; padding: 0; }
  .mk-help li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 0; border-top: 1px solid rgba(255,255,255,.05); font-size: 12.5px; }
  .mk-help li:first-child { border-top: 0; }
  .mk-kbd { padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: var(--mk-ink-1); font: 600 11px 'IBM Plex Mono', monospace; white-space: nowrap; }
  .mk-scrim { display: none; }

  /* ---------- responsive ---------- */
  @media (max-width: 1400px) { .mk-gauge { display: none; } .mk-stats { margin-left: auto; } }
  @media (max-width: 1250px) { .mk-stats { display: none; } .mk-st-opt { display: none; } }
  @media (max-width: 1100px) {
    .mk-body, .mk-root.is-panel-closed .mk-body { grid-template-columns: 46px minmax(0,1fr); }
    .mk-menu { display: inline-flex; }
    .mk-desk { display: none; }
    .mk-panel, .mk-root.is-panel-closed .mk-panel { position: fixed; inset: 0 0 0 auto; z-index: 2500; width: min(340px, 90vw); visibility: visible; border-left: 1px solid var(--mk-line); background: #0A0D13; transform: translateX(102%); transition: transform .25s cubic-bezier(.2,.8,.25,1); }
    .mk-root.is-drawer .mk-panel { transform: none; }
    .mk-scrim { display: block; position: fixed; inset: 0; z-index: 2400; background: rgba(0,0,0,.55); }
    .mk-tabs .mk-panel-x { display: inline-flex; }
  }
  @media (max-width: 860px) { .mk-price { padding-left: 0; border-left: 0; } .mk-badge, .mk-sym-label { display: none; } .mk-px { font-size: 24px; } }
  @media (max-width: 640px) {
    .mk-root { height: max(540px, calc(100dvh - 130px)); }
    .mk-quote { padding: 8px 10px; gap: 10px 14px; flex-wrap: wrap; }
    .mk-body, .mk-root.is-panel-closed .mk-body { grid-template-columns: 40px minmax(0,1fr); }
    .mk-tool { width: 30px; height: 30px; }
    .mk-cv-top { max-width: calc(100% - 20px); }
    .mk-zoom { right: 8px; bottom: 34px; }
    .mk-pop-range { width: calc(100vw - 16px) !important; max-width: 340px !important; }
  }
  @media (prefers-reduced-motion: reduce) { .mk-bar i, .mk-skel, .mk-spin, .mk-panel, .mk-px, .mk-track i, .mk-group-chev { animation: none; transition: none; } }
`;
