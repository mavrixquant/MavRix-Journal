/* Backtester styles (session list, creation modal, dashboard extras).
   Injected via <style> like the rest of the app's feature CSS; every class is
   prefixed `bt-` so nothing leaks. The dashboard additionally reuses the
   existing `dash-*` / `pc-*` / `rb-*` / `cx-*` classes from dashboardShell.css. */
export const BT_CSS = `
  .bt-root, .bt-dash, .bt-overlay {
    --bt-win: #35C4A1; --bt-loss: #FF5C5C; --bt-amber: #F5B544;
    --bt-ink: #E7E9EE; --bt-ink-2: #8892A3; --bt-ink-3: #545E6E;
    --bt-line: rgba(255,255,255,.07); --bt-line-2: rgba(255,255,255,.12);
    --bt-panel: linear-gradient(180deg, rgba(255,255,255,.028), rgba(255,255,255,.008)), #0F131C;
    --bt-inset: rgba(255,255,255,.035);
    font-family: Inter, system-ui, sans-serif; color: var(--bt-ink);
  }
  .bt-root { width: 100%; max-width: 1480px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; padding-bottom: 40px; }
  .bt-root .pos, .bt-dash .pos, .bt-overlay .pos { color: var(--bt-win); } .bt-root .neg, .bt-dash .neg, .bt-overlay .neg { color: var(--bt-loss); }

  /* ---------- buttons ---------- */
  .bt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 34px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--bt-line-2); background: rgba(255,255,255,.03); color: var(--bt-ink-2); font: 600 12px 'IBM Plex Mono', monospace; cursor: pointer; text-decoration: none; white-space: nowrap; transition: all .15s; }
  .bt-btn:hover:not(:disabled) { color: var(--bt-ink); border-color: rgba(255,255,255,.28); background: rgba(255,255,255,.06); }
  .bt-btn:disabled { opacity: .4; cursor: not-allowed; }
  .bt-btn.is-primary { background: var(--accent); border-color: var(--accent); color: #0A0D14; font-weight: 700; }
  .bt-btn.is-primary:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 0 22px -4px var(--accent); color: #0A0D14; background: var(--accent); }
  .bt-btn.is-danger { background: rgba(255,92,92,.12); border-color: rgba(255,92,92,.4); color: #FF8080; }
  .bt-btn.is-danger:hover:not(:disabled) { background: rgba(255,92,92,.22); border-color: var(--bt-loss); color: #FF8080; }
  .bt-btn.is-lg { height: 40px; padding: 0 18px; font-size: 12.5px; }
  .bt-icon-btn { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--bt-line); background: var(--bt-inset); color: var(--bt-ink-2); cursor: pointer; transition: all .15s; }
  .bt-icon-btn:hover:not(:disabled) { color: var(--bt-ink); border-color: var(--bt-line-2); }
  .bt-icon-btn.is-danger:hover:not(:disabled) { color: #FF8080; border-color: rgba(255,92,92,.45); background: rgba(255,92,92,.08); }
  .bt-icon-btn:disabled { opacity: .4; cursor: not-allowed; }
  .bt-btn:focus-visible, .bt-icon-btn:focus-visible, .bt-tabs button:focus-visible, .bt-filters button:focus-visible, .bt-seg button:focus-visible, .bt-pills button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .bt-link { background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; font: inherit; text-decoration: underline; }

  /* ---------- list page ---------- */
  .bt-pagehead { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .bt-pagehead h1 { margin: 0; font: 700 24px 'Space Grotesk', Inter, sans-serif; letter-spacing: -.01em; }
  .bt-pagehead p { margin: 4px 0 0; color: var(--bt-ink-2); font-size: 13px; }
  .bt-filters { display: flex; gap: 6px; flex-wrap: wrap; }
  .bt-filters button { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 12px; border-radius: 99px; border: 1px solid var(--bt-line); background: transparent; color: var(--bt-ink-2); font: 600 11.5px 'IBM Plex Mono', monospace; cursor: pointer; }
  .bt-filters button em { font-style: normal; font-size: 10px; color: var(--bt-ink-3); }
  .bt-filters button.is-on { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .bt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  .bt-skel { height: 200px; border-radius: 16px; border: 1px solid var(--bt-line); background: linear-gradient(100deg, rgba(255,255,255,.03) 30%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.03) 70%) #0F131C; background-size: 200% 100%; animation: btShimmer 1.4s linear infinite; }
  @keyframes btShimmer { to { background-position: -200% 0; } }
  .bt-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 64px 24px; border-radius: 16px; border: 1px dashed var(--bt-line-2); color: var(--bt-ink-2); }
  .bt-empty.is-inline { padding: 36px 20px; }
  .bt-empty b { color: var(--bt-ink); font: 700 16px 'Space Grotesk', Inter, sans-serif; }
  .bt-empty p { margin: 0; max-width: 440px; font-size: 13px; line-height: 1.55; }
  .bt-empty svg { color: var(--accent); }

  .bt-card { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 16px; background: var(--bt-panel); border: 1px solid var(--bt-line); box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 10px 30px -18px rgba(0,0,0,.7); transition: border-color .2s, transform .2s; }
  .bt-card:hover { border-color: var(--bt-line-2); transform: translateY(-1px); }
  .bt-card.is-archived { opacity: .7; }
  .bt-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .bt-card-title { font: 700 15px 'Space Grotesk', Inter, sans-serif; color: var(--bt-ink); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bt-card-title:hover { color: var(--accent); }
  .bt-badge { font: 600 9.5px 'IBM Plex Mono', monospace; font-style: normal; letter-spacing: .08em; text-transform: uppercase; padding: 3px 9px; border-radius: 99px; border: 1px solid var(--bt-line); color: var(--bt-ink-2); background: rgba(255,255,255,.03); white-space: nowrap; }
  .bt-badge.is-prop { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .bt-card-sub { display: flex; flex-wrap: wrap; gap: 4px 12px; font: 500 11px 'IBM Plex Mono', monospace; color: var(--bt-ink-3); }
  .bt-card-bal { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; padding: 11px 12px; border-radius: 12px; background: var(--bt-inset); border: 1px solid var(--bt-line); }
  .bt-card-bal span { display: block; font: 600 9.5px 'IBM Plex Mono', monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--bt-ink-3); margin-bottom: 3px; }
  .bt-card-bal b { font: 700 14px 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; } .bt-card-bal b i { font-style: normal; color: var(--bt-ink-3); margin: 0 3px; }
  .bt-card-bal strong { font: 800 20px 'Space Grotesk', Inter, sans-serif; font-variant-numeric: tabular-nums; }
  .bt-card-meta { display: flex; align-items: center; gap: 12px; font: 500 11.5px 'IBM Plex Mono', monospace; color: var(--bt-ink-2); }
  .bt-card-meta b { color: var(--bt-ink); } .bt-card-date { margin-left: auto; color: var(--bt-ink-3); }
  .bt-status { font: 600 9.5px 'IBM Plex Mono', monospace; font-style: normal; letter-spacing: .08em; text-transform: uppercase; padding: 2px 8px; border-radius: 99px; background: rgba(255,255,255,.04); color: var(--bt-ink-2); }
  .bt-status.is-active { color: var(--bt-win); background: rgba(53,196,161,.1); } .bt-status.is-completed { color: var(--bt-amber); background: rgba(245,181,68,.1); }
  .bt-card-actions { display: flex; align-items: center; gap: 8px; margin-top: auto; }
  .bt-card-actions .bt-btn { flex: 1; height: 32px; }
  .bt-card-actions .bt-icon-btn { flex: 0 0 auto; }

  /* ---------- modal ---------- */
  .bt-overlay { position: fixed; inset: 0; z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(5,7,11,.72); backdrop-filter: blur(6px); }
  .bt-modal { width: min(560px, 100%); max-height: min(780px, 94dvh); display: flex; flex-direction: column; border-radius: 18px; background: #0F131C; border: 1px solid var(--bt-line-2); box-shadow: 0 40px 90px -30px rgba(0,0,0,.95); overflow: hidden; }
  .bt-modal.is-sm { width: min(440px, 100%); }
  .bt-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 20px 12px; }
  .bt-modal-titles h2 { margin: 0; font: 700 18px 'Space Grotesk', Inter, sans-serif; } .bt-modal-titles p { margin: 3px 0 0; font-size: 12px; color: var(--bt-ink-3); }
  .bt-steps { list-style: none; margin: 0; padding: 0 20px 12px; display: flex; gap: 6px; border-bottom: 1px solid var(--bt-line); }
  .bt-steps li { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px 5px 6px; border-radius: 99px; font: 600 11px 'IBM Plex Mono', monospace; color: var(--bt-ink-3); }
  .bt-steps li span { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,.06); font-size: 10px; }
  .bt-steps li.is-on { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); } .bt-steps li.is-on span { background: var(--accent); color: #0A0D14; }
  .bt-steps li.is-done { color: var(--bt-win); } .bt-steps li.is-done span { background: rgba(53,196,161,.2); color: var(--bt-win); }
  .bt-modal-body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }
  .bt-modal-foot { display: flex; justify-content: space-between; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--bt-line); background: rgba(0,0,0,.14); }
  .bt-modal-foot .bt-btn.is-primary { margin-left: auto; }
  .bt-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .bt-field > span { font: 600 10.5px 'IBM Plex Mono', monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--bt-ink-2); }
  .bt-field > span b { color: var(--bt-loss); } .bt-field > span i { font-style: normal; text-transform: none; letter-spacing: 0; color: var(--bt-ink-3); margin-left: 6px; }
  .bt-field small, .bt-hint { font-size: 11.5px; color: var(--bt-ink-3); line-height: 1.5; } .bt-hint.is-bad { color: var(--bt-loss); }
  .bt-input { width: 100%; box-sizing: border-box; height: 38px; padding: 0 11px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(10,13,19,.6); color: var(--bt-ink); font: 500 13px 'IBM Plex Mono', monospace; outline: none; transition: border-color .15s, box-shadow .15s; color-scheme: dark; }
  textarea.bt-input { height: auto; padding: 9px 11px; resize: vertical; font-family: inherit; }
  .bt-input.is-sm { height: 32px; width: auto; font-size: 12px; }
  .bt-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent); }
  .bt-input:disabled { opacity: .5; }
  .bt-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .bt-seg { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; gap: 3px; border-radius: 11px; background: rgba(255,255,255,.04); border: 1px solid var(--bt-line); }
  .bt-seg button { height: 34px; border: 0; border-radius: 8px; background: transparent; color: var(--bt-ink-2); font: 700 12px 'IBM Plex Mono', monospace; cursor: pointer; transition: all .15s; }
  .bt-seg button.is-on { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent); }
  .bt-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .bt-pills button { height: 30px; padding: 0 13px; border-radius: 99px; border: 1px solid var(--bt-line-2); background: transparent; color: var(--bt-ink-2); font: 600 11.5px 'IBM Plex Mono', monospace; cursor: pointer; }
  .bt-pills button.is-on { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .bt-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .bt-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 6px 5px 11px; border-radius: 99px; background: color-mix(in srgb, var(--accent) 10%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); color: var(--accent); font: 700 11.5px 'IBM Plex Mono', monospace; }
  .bt-chip button { display: inline-grid; place-items: center; width: 17px; height: 17px; border: 0; border-radius: 50%; background: rgba(255,255,255,.08); color: inherit; cursor: pointer; }
  .bt-chip button:disabled { opacity: .3; cursor: not-allowed; }
  .bt-error { padding: 10px 12px; border-radius: 10px; background: rgba(255,92,92,.1); border: 1px solid rgba(255,92,92,.3); color: #FF8F8F; font-size: 12.5px; line-height: 1.5; }
  .bt-note { margin: 0; font-size: 12.5px; color: var(--bt-ink-2); line-height: 1.6; } .bt-note b { color: var(--bt-ink); }
  .bt-review { margin: 0; display: flex; flex-direction: column; border-radius: 12px; border: 1px solid var(--bt-line); overflow: hidden; }
  .bt-review > div { display: flex; justify-content: space-between; gap: 16px; padding: 10px 14px; font-size: 12.5px; border-bottom: 1px solid var(--bt-line); }
  .bt-review > div:last-child { border-bottom: 0; } .bt-review dt { color: var(--bt-ink-3); font: 600 11px 'IBM Plex Mono', monospace; } .bt-review dd { margin: 0; text-align: right; font: 600 12.5px 'IBM Plex Mono', monospace; color: var(--bt-ink); }

  /* ---------- dashboard ---------- */
  .bt-dash { padding-bottom: 40px; }
  .bt-dash-title { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .bt-dash-title > b { font: 700 16px 'Space Grotesk', Inter, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px; }
  .bt-dash-title > span { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .bt-dash-title em { font: 500 11px 'IBM Plex Mono', monospace; font-style: normal; color: var(--bt-ink-3); }
  .bt-dash-bal { gap: 20px; }
  .bt-dash-bal > div { display: flex; flex-direction: column; gap: 2px; }
  .bt-dash-bal b { font: 700 15px 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
  .bt-prop-passed { color: var(--bt-win); } .bt-prop-failed { color: var(--bt-loss); } .bt-prop-in_progress { color: var(--bt-amber); }
  .bt-tabs { display: flex; gap: 4px; margin: 0 0 16px; padding: 4px; border-radius: 12px; background: rgba(255,255,255,.03); border: 1px solid var(--bt-line); width: fit-content; max-width: 100%; overflow-x: auto; }
  .bt-tabs button { position: relative; display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 16px; border: 0; border-radius: 9px; background: transparent; color: var(--bt-ink-2); font: 600 12px 'IBM Plex Mono', monospace; cursor: pointer; white-space: nowrap; transition: all .15s; }
  .bt-tabs button:hover { color: var(--bt-ink); }
  .bt-tabs button.is-on { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }
  .bt-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--bt-amber); } .bt-dot.is-passed { background: var(--bt-win); } .bt-dot.is-failed { background: var(--bt-loss); }

  .bt-dgrid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
  .bt-panel { grid-column: span var(--span, 12); height: var(--h, 300px); }
  @media (max-width: 1180px) { .bt-panel { grid-column: span 12; } .bt-panel[data-panel="kpiGrid"] { --h: 220px; } }
  @media (max-width: 640px) { .bt-panel[data-panel="hero"] { --h: 400px; } }

  .bt-kv { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--bt-line); font: 500 12px 'IBM Plex Mono', monospace; color: var(--bt-ink-2); }
  .bt-kv:last-child { border-bottom: 0; } .bt-kv b { color: var(--bt-ink); font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
  .bt-kv b.pos { color: var(--bt-win); } .bt-kv b.neg { color: var(--bt-loss); }
  .bt-kvlist { display: flex; flex-direction: column; }
  .bt-split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; } .bt-split h4 { margin: 0 0 6px; font: 700 12px 'Space Grotesk', Inter, sans-serif; letter-spacing: .04em; text-transform: uppercase; }
  .bt-split h4.pos { color: var(--bt-win); } .bt-split h4.neg { color: var(--bt-loss); }
  @media (max-width: 560px) { .bt-split { grid-template-columns: 1fr; } }

  .bt-card-plain { padding: 16px 18px; border-radius: 16px; background: var(--bt-panel); border: 1px solid var(--bt-line); }
  .bt-card-plain h4 { margin: 0 0 8px; font: 700 13px 'Space Grotesk', Inter, sans-serif; }

  /* prop rules */
  .bt-prop { display: flex; flex-direction: column; gap: 16px; }
  .bt-prop-hero { display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 16px; background: var(--bt-panel); border: 1px solid var(--bt-line); }
  .bt-prop-hero > svg { color: var(--bt-amber); flex: 0 0 auto; } .bt-prop-hero.is-passed { border-color: rgba(53,196,161,.45); } .bt-prop-hero.is-passed > svg { color: var(--bt-win); }
  .bt-prop-hero.is-failed { border-color: rgba(255,92,92,.45); } .bt-prop-hero.is-failed > svg { color: var(--bt-loss); }
  .bt-prop-hero b { font: 700 16px 'Space Grotesk', Inter, sans-serif; } .bt-prop-hero p { margin: 3px 0 0; font-size: 12.5px; color: var(--bt-ink-2); }
  .bt-prop-hero .bt-pill { margin-left: auto; }
  .bt-pill { font: 800 10px 'IBM Plex Mono', monospace; font-style: normal; letter-spacing: .1em; text-transform: uppercase; padding: 4px 10px; border-radius: 99px; background: rgba(255,255,255,.06); color: var(--bt-ink-2); white-space: nowrap; }
  .bt-pill.is-pass, .bt-pill.is-passed { background: rgba(53,196,161,.16); color: var(--bt-win); }
  .bt-pill.is-fail, .bt-pill.is-failed { background: rgba(255,92,92,.16); color: var(--bt-loss); }
  .bt-pill.is-warn, .bt-pill.is-in_progress { background: rgba(245,181,68,.16); color: var(--bt-amber); }
  .bt-rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
  .bt-rule { display: flex; flex-direction: column; gap: 10px; padding: 16px 18px; border-radius: 16px; background: var(--bt-panel); border: 1px solid var(--bt-line); }
  .bt-rule.is-fail { border-color: rgba(255,92,92,.5); } .bt-rule.is-pass { border-color: rgba(53,196,161,.4); } .bt-rule.is-warn { border-color: rgba(245,181,68,.4); }
  .bt-rule header { display: flex; align-items: center; justify-content: space-between; } .bt-rule header b { font: 700 13px 'Space Grotesk', Inter, sans-serif; }
  .bt-rule-num { display: flex; align-items: baseline; gap: 8px; } .bt-rule-num strong { font: 800 22px 'Space Grotesk', Inter, sans-serif; font-variant-numeric: tabular-nums; } .bt-rule-num span { font: 500 12px 'IBM Plex Mono', monospace; color: var(--bt-ink-3); }
  .bt-rule-bar { height: 8px; border-radius: 99px; background: rgba(255,255,255,.06); overflow: hidden; } .bt-rule-bar i { display: block; height: 100%; border-radius: 99px; background: var(--accent); transition: width .4s; }
  .bt-rule.is-pass .bt-rule-bar i { background: var(--bt-win); } .bt-rule.is-warn .bt-rule-bar i { background: var(--bt-amber); } .bt-rule.is-fail .bt-rule-bar i { background: var(--bt-loss); }
  .bt-rule footer { display: flex; justify-content: space-between; gap: 10px; font: 500 11px 'IBM Plex Mono', monospace; color: var(--bt-ink-3); }

  /* trades table */
  .bt-trades { display: flex; flex-direction: column; gap: 12px; }
  .bt-toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  .bt-grow { flex: 1; } .bt-count { font: 500 11.5px 'IBM Plex Mono', monospace; color: var(--bt-ink-3); }
  .bt-tablewrap { overflow-x: auto; border-radius: 16px; border: 1px solid var(--bt-line); background: var(--bt-panel); }
  .bt-table { width: 100%; border-collapse: collapse; min-width: 980px; font: 500 12px 'IBM Plex Mono', monospace; }
  .bt-table th { text-align: left; padding: 0; border-bottom: 1px solid var(--bt-line-2); background: rgba(255,255,255,.02); position: sticky; top: 0; }
  .bt-table th button { width: 100%; padding: 11px 12px; border: 0; background: transparent; color: var(--bt-ink-3); font: 600 9.5px 'IBM Plex Mono', monospace; letter-spacing: .12em; text-transform: uppercase; text-align: inherit; cursor: pointer; white-space: nowrap; }
  .bt-table th button:hover { color: var(--bt-ink); }
  .bt-table th.num, .bt-table td.num { text-align: right; } .bt-table th:not(.num) button { text-align: left; }
  .bt-table td { padding: 10px 12px; border-bottom: 1px solid var(--bt-line); color: var(--bt-ink-2); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .bt-table td b { color: var(--bt-ink); } .bt-table td em { font-style: normal; color: var(--bt-ink-3); margin-left: 4px; }
  .bt-table td.pos { color: var(--bt-win); } .bt-table td.neg { color: var(--bt-loss); } .bt-table td.pos b { color: var(--bt-win); } .bt-table td.neg b { color: var(--bt-loss); }
  .bt-table tbody tr:hover td { background: rgba(255,255,255,.025); } .bt-table tbody tr:last-child td { border-bottom: 0; }
  .rp-side-tag { font: 800 9.5px 'IBM Plex Mono', monospace; letter-spacing: .08em; padding: 2px 7px; border-radius: 5px; }
  .rp-side-tag.is-long { color: var(--bt-win); background: rgba(53,196,161,.14); } .rp-side-tag.is-short { color: var(--bt-loss); background: rgba(255,92,92,.14); }
  .bt-open { color: var(--bt-amber); } .bt-strat { display: inline-flex; align-items: center; gap: 7px; } .bt-strat i { width: 8px; height: 8px; border-radius: 3px; }

  @media (max-width: 768px) {
    .bt-row { grid-template-columns: 1fr; } .bt-pagehead .bt-btn { width: 100%; }
    .bt-dash-bal { width: 100%; } .bt-dash-title > b { max-width: 220px; }
    .bt-modal-head { padding: 14px 16px 10px; } .bt-modal-body { padding: 14px 16px; } .bt-modal-foot { padding: 12px 16px; }
  }
  @media (prefers-reduced-motion: reduce) { .bt-skel, .bt-card, .bt-rule-bar i { animation: none; transition: none; } }
`;
