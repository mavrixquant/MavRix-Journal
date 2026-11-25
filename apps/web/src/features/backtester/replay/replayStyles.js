/* Replay page styles — injected next to the shared chart CSS (same pattern as
   MarketChartPage). Everything is prefixed `rp-` so nothing leaks globally. */
export const REPLAY_CSS = `
  .rp-root { --rp-line: rgba(255,255,255,.08); --rp-line-2: rgba(255,255,255,.05); --rp-ink: #E7E9EE; --rp-ink-2: #8892A3; --rp-ink-3: #545E6E; --rp-win: #35C4A1; --rp-loss: #FF5C5C; --rp-amber: #F5B544; }
  .rp-root .pos, .rp-ticket .pos { color: var(--rp-win); } .rp-root .neg, .rp-ticket .neg { color: var(--rp-loss); }
  .rp-root button { font-family: inherit; }

  /* ---------- header ---------- */
  .rp-head { display: flex; align-items: center; gap: 12px 18px; padding: 8px 14px; border-bottom: 1px solid var(--rp-line-2); flex-wrap: wrap; min-width: 0; }
  .rp-back { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--rp-line); color: var(--rp-ink-2); font: 600 11.5px 'IBM Plex Mono', monospace; text-decoration: none; transition: all .15s; }
  .rp-back:hover { color: var(--rp-ink); border-color: rgba(255,255,255,.2); }
  .rp-title { display: flex; flex-direction: column; gap: 3px; min-width: 0; max-width: 240px; }
  .rp-title > b { font: 700 14px 'Space Grotesk', Inter, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rp-chips { display: flex; gap: 6px; }
  .rp-chip { font: 600 9.5px 'IBM Plex Mono', monospace; font-style: normal; letter-spacing: .08em; text-transform: uppercase; padding: 2px 8px; border-radius: 99px; border: 1px solid var(--rp-line); color: var(--rp-ink-2); background: rgba(255,255,255,.03); }
  .rp-chip.is-prop { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .rp-chip.is-closed { color: var(--rp-amber); border-color: rgba(245,181,68,.35); }
  .rp-syms { display: inline-flex; gap: 3px; padding: 3px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid var(--rp-line); }
  .rp-syms button { border: 0; background: transparent; color: var(--rp-ink-2); font: 700 12px 'IBM Plex Mono', monospace; padding: 5px 11px; border-radius: 7px; cursor: pointer; }
  .rp-syms button:hover { color: var(--rp-ink); }
  .rp-syms button.is-on { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent); }
  .rp-price { display: flex; flex-direction: column; gap: 2px; padding-left: 16px; border-left: 1px solid var(--rp-line-2); }
  .rp-price b { font: 800 22px/1 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
  .rp-price em { font: 500 10.5px 'IBM Plex Mono', monospace; font-style: normal; color: var(--rp-ink-3); }
  .rp-acct { display: flex; gap: 8px; margin-left: auto; }
  .rp-acct > div { display: flex; flex-direction: column; gap: 1px; padding: 5px 11px; border-radius: 9px; background: rgba(255,255,255,.035); border: 1px solid var(--rp-line-2); min-width: 92px; }
  .rp-acct span { font: 600 9px 'IBM Plex Mono', monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--rp-ink-3); }
  .rp-acct b { font: 700 13px 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
  .rp-head-actions { display: flex; align-items: center; gap: 8px; }

  /* ---------- buttons ---------- */
  .rp-btn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--rp-line); background: rgba(255,255,255,.03); color: var(--rp-ink-2); font: 600 11.5px 'IBM Plex Mono', monospace; cursor: pointer; text-decoration: none; transition: all .15s; white-space: nowrap; }
  .rp-btn:hover:not(:disabled) { color: var(--rp-ink); border-color: rgba(255,255,255,.22); background: rgba(255,255,255,.06); }
  .rp-btn:disabled { opacity: .4; cursor: not-allowed; }
  .rp-btn.is-danger { color: #FF8080; border-color: rgba(255,92,92,.3); }
  .rp-btn.is-danger:hover:not(:disabled) { background: rgba(255,92,92,.1); border-color: var(--rp-loss); color: #FF8080; }
  .rp-icon { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--rp-line); background: rgba(255,255,255,.03); color: var(--rp-ink-2); cursor: pointer; transition: all .15s; }
  .rp-icon:hover:not(:disabled) { color: var(--rp-ink); border-color: rgba(255,255,255,.22); }
  .rp-icon:disabled { opacity: .3; cursor: not-allowed; }
  .rp-icon.is-on { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 40%, transparent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .rp-btn:focus-visible, .rp-icon:focus-visible, .rp-play:focus-visible, .rp-seg button:focus-visible, .rp-buy:focus-visible, .rp-sell:focus-visible, .rp-syms button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  /* ---------- transport bar ---------- */
  .rp-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; padding: 7px 14px; border-bottom: 1px solid var(--rp-line-2); background: rgba(0,0,0,.12); }
  .rp-group { display: inline-flex; align-items: center; gap: 5px; }
  .rp-play { display: inline-grid; place-items: center; width: 38px; height: 30px; border-radius: 8px; border: 1px solid var(--accent); background: var(--accent); color: #0A0D14; cursor: pointer; transition: filter .15s, box-shadow .15s; }
  .rp-play:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 0 18px -4px var(--accent); }
  .rp-play.is-on { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }
  .rp-play:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; }
  .rp-seg { display: inline-flex; padding: 2px; gap: 2px; border-radius: 9px; background: rgba(255,255,255,.04); border: 1px solid var(--rp-line); }
  .rp-seg button { border: 0; background: transparent; color: var(--rp-ink-2); font: 600 10.5px 'IBM Plex Mono', monospace; padding: 5px 8px; border-radius: 7px; cursor: pointer; }
  .rp-seg button:hover { color: var(--rp-ink); }
  .rp-seg button.is-on { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }
  .rp-slider { position: relative; flex: 1 1 160px; min-width: 120px; height: 22px; display: flex; align-items: center; }
  .rp-slider input[type=range] { width: 100%; margin: 0; appearance: none; -webkit-appearance: none; height: 4px; border-radius: 99px; outline: none; cursor: pointer; background: linear-gradient(90deg, var(--accent) var(--p), rgba(255,255,255,.1) var(--p)); }
  .rp-slider input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: #E7E9EE; border: 2px solid #0A0D13; box-shadow: 0 0 0 1px rgba(255,255,255,.4); }
  .rp-slider input[type=range]::-moz-range-thumb { width: 11px; height: 11px; border-radius: 50%; background: #E7E9EE; border: 2px solid #0A0D13; }
  .rp-slider input:disabled { opacity: .4; cursor: not-allowed; }
  .rp-slider-lock { position: absolute; left: 0; width: var(--m); top: 50%; height: 2px; margin-top: -1px; background: rgba(245,181,68,.7); border-radius: 2px; pointer-events: none; }
  .rp-jump { display: inline-flex; align-items: center; gap: 5px; }
  .rp-jump input { height: 30px; padding: 0 8px; border-radius: 8px; border: 1px solid var(--rp-line); background: rgba(10,13,19,.6); color: var(--rp-ink); font: 500 11.5px 'IBM Plex Mono', monospace; color-scheme: dark; }
  .rp-order-btns { margin-left: auto; }
  .rp-buy, .rp-sell { height: 30px; padding: 0 16px; border-radius: 8px; font: 700 12px 'IBM Plex Mono', monospace; cursor: pointer; transition: all .15s; border: 1px solid; background: transparent; }
  .rp-buy { color: var(--rp-win); border-color: rgba(53,196,161,.4); } .rp-buy:hover:not(:disabled), .rp-buy.is-on { background: rgba(53,196,161,.16); }
  .rp-sell { color: var(--rp-loss); border-color: rgba(255,92,92,.4); } .rp-sell:hover:not(:disabled), .rp-sell.is-on { background: rgba(255,92,92,.16); }
  .rp-buy:disabled, .rp-sell:disabled { opacity: .35; cursor: not-allowed; }

  /* ---------- status ---------- */
  .rp-status { display: flex; align-items: center; gap: 6px 18px; flex-wrap: wrap; padding: 6px 14px; border-top: 1px solid var(--rp-line-2); font: 500 10.5px 'IBM Plex Mono', monospace; color: var(--rp-ink-3); }
  .rp-status b { color: var(--rp-ink-2); } .rp-grow { flex: 1; }
  .rp-status .is-open { color: var(--rp-amber); } .rp-status .is-warn { color: var(--rp-amber); }
  .rp-status .is-up { color: #35C4A1; } .rp-status .is-down { color: #FF5C5C; }
  .rp-st-ohlc { display: inline-flex; align-items: center; gap: 5px; }
  .rp-st-ohlc em { font-style: normal; color: var(--rp-ink-3); font-weight: 700; font-size: 9.5px; }
  .rp-st-ohlc b { color: var(--rp-ink-2); font-weight: 700; font-variant-numeric: tabular-nums; }

  /* ---------- side panel ---------- */
  .rp-panel { overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }
  .rp-ticket { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
  .rp-card { display: flex; flex-direction: column; gap: 9px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,.028); border: 1px solid var(--rp-line); }
  .rp-card-head { display: flex; align-items: baseline; justify-content: space-between; }
  .rp-card-head b { font: 700 13px 'Space Grotesk', Inter, sans-serif; } .rp-card-head em { font: 500 10.5px 'IBM Plex Mono', monospace; font-style: normal; color: var(--rp-ink-3); }
  .rp-pos { border-color: color-mix(in srgb, var(--rp-amber) 35%, transparent); background: rgba(245,181,68,.05); }
  .rp-pos header { display: flex; align-items: center; gap: 8px; }
  .rp-pos header strong { margin-left: auto; font: 700 14px 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
  .rp-pos header em { font: 500 11px 'IBM Plex Mono', monospace; font-style: normal; color: var(--rp-ink-2); }
  .rp-side { font: 800 9.5px 'IBM Plex Mono', monospace; letter-spacing: .08em; padding: 2px 7px; border-radius: 5px; }
  .rp-side.is-long { color: var(--rp-win); background: rgba(53,196,161,.14); } .rp-side.is-short { color: var(--rp-loss); background: rgba(255,92,92,.14); }
  .rp-kv { display: flex; justify-content: space-between; font: 500 11.5px 'IBM Plex Mono', monospace; color: var(--rp-ink-2); }
  .rp-kv b { color: var(--rp-ink); font-weight: 600; font-variant-numeric: tabular-nums; }
  .rp-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .rp-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .rp-field > span { font: 600 10px 'IBM Plex Mono', monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--rp-ink-3); }
  .rp-field > span i { font-style: normal; text-transform: none; letter-spacing: 0; color: var(--rp-ink-3); margin-left: 4px; }
  .rp-check { display: flex; align-items: center; gap: 8px; cursor: pointer; font: 500 11.5px 'IBM Plex Mono', monospace; color: var(--rp-ink-2); }
  .rp-check input { accent-color: var(--accent); cursor: pointer; }
  .rp-check span { user-select: none; }
  .rp-input { width: 100%; box-sizing: border-box; padding: 7px 9px; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: rgba(10,13,19,.6); color: var(--rp-ink); font: 500 12.5px 'IBM Plex Mono', monospace; outline: none; transition: border-color .15s, box-shadow .15s; resize: vertical; }
  .rp-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent); }
  .rp-input:disabled { opacity: .5; }
  .rp-sidepick { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .rp-sidepick button { height: 34px; border-radius: 9px; border: 1px solid var(--rp-line); background: transparent; color: var(--rp-ink-2); font: 700 11.5px 'IBM Plex Mono', monospace; cursor: pointer; transition: all .15s; }
  .rp-sidepick .is-buy.is-on { color: var(--rp-win); border-color: var(--rp-win); background: rgba(53,196,161,.14); }
  .rp-sidepick .is-sell.is-on { color: var(--rp-loss); border-color: var(--rp-loss); background: rgba(255,92,92,.14); }
  .rp-modes { display: inline-flex; padding: 2px; gap: 2px; border-radius: 8px; background: rgba(255,255,255,.04); border: 1px solid var(--rp-line); }
  .rp-modes button { border: 0; background: transparent; color: var(--rp-ink-2); font: 600 10.5px 'IBM Plex Mono', monospace; padding: 5px 10px; border-radius: 6px; cursor: pointer; transition: all .15s; }
  .rp-modes button:hover { color: var(--rp-ink); background: rgba(255,255,255,.06); }
  .rp-modes button.is-on { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }
  .rp-rr { display: flex; justify-content: space-between; gap: 8px; font: 500 10.5px 'IBM Plex Mono', monospace; color: var(--rp-ink-3); padding: 7px 9px; border-radius: 8px; background: rgba(255,255,255,.03); }
  .rp-rr b { font-weight: 700; color: var(--rp-ink); margin-left: 3px; }
  .rp-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .rp-actions .rp-btn { justify-content: center; }
  .rp-error { padding: 8px 10px; border-radius: 8px; background: rgba(255,92,92,.1); border: 1px solid rgba(255,92,92,.3); color: #FF8F8F; font-size: 12px; }
  .rp-hint { padding: 8px 10px; border-radius: 8px; background: rgba(245,181,68,.08); border: 1px solid rgba(245,181,68,.25); color: var(--rp-amber); font-size: 11.5px; }
  .rp-submit { height: 40px; border-radius: 10px; border: 1px solid; font: 800 12.5px 'IBM Plex Mono', monospace; cursor: pointer; color: #0A0D14; transition: filter .15s, box-shadow .15s; }
  .rp-submit.is-buy { background: var(--rp-win); border-color: var(--rp-win); } .rp-submit.is-sell { background: var(--rp-loss); border-color: var(--rp-loss); }
  .rp-submit:hover:not(:disabled) { filter: brightness(1.1); } .rp-submit:disabled { opacity: .4; cursor: not-allowed; }
  .rp-empty { font-size: 12px; color: var(--rp-ink-3); padding: 6px 0; }
  .rp-recent { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .rp-recent li { display: flex; align-items: center; gap: 8px; font: 500 12px 'IBM Plex Mono', monospace; }
  .rp-recent li em { font-style: normal; color: var(--rp-ink-3); } .rp-recent li strong { margin-left: auto; font-variant-numeric: tabular-nums; }

  /* ---------- prop HUD ---------- */
  .rp-hud { position: absolute; top: 10px; right: 64px; z-index: 12; width: 218px; border-radius: 12px; background: rgba(10,13,20,.92); border: 1px solid var(--rp-line); backdrop-filter: blur(8px); box-shadow: 0 14px 34px -14px rgba(0,0,0,.8); }
  .rp-hud.is-failed { border-color: rgba(255,92,92,.5); } .rp-hud.is-passed { border-color: rgba(53,196,161,.5); }
  .rp-hud-head { width: 100%; display: flex; align-items: center; gap: 7px; padding: 8px 10px; border: 0; background: transparent; color: var(--rp-ink); font: 700 11.5px 'IBM Plex Mono', monospace; cursor: pointer; }
  .rp-hud-head em { margin-left: auto; font-style: normal; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--rp-ink-2); }
  .rp-hud.is-failed .rp-hud-head em { color: var(--rp-loss); } .rp-hud.is-passed .rp-hud-head em { color: var(--rp-win); }
  .rp-hud-body { display: flex; flex-direction: column; gap: 9px; padding: 2px 10px 10px; }
  .rp-hud-top { display: flex; justify-content: space-between; font: 600 10.5px 'IBM Plex Mono', monospace; color: var(--rp-ink-2); }
  .rp-hud-top b { color: var(--rp-ink); }
  .rp-hud-bar { height: 5px; border-radius: 99px; background: rgba(255,255,255,.07); overflow: hidden; margin-top: 4px; }
  .rp-hud-bar i { display: block; height: 100%; border-radius: 99px; background: var(--accent); transition: width .3s; }
  .rp-hud-row.is-pass .rp-hud-bar i { background: var(--rp-win); } .rp-hud-row.is-warn .rp-hud-bar i { background: var(--rp-amber); } .rp-hud-row.is-fail .rp-hud-bar i { background: var(--rp-loss); }
  .rp-hud-row em { display: block; margin-top: 3px; font: 500 10px 'IBM Plex Mono', monospace; font-style: normal; color: var(--rp-ink-3); }

  /* ---------- loader / splash ---------- */
  .rp-loader { position: absolute; inset: 0; z-index: 15; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(10,13,19,.78); backdrop-filter: blur(3px); font-size: 12.5px; color: var(--rp-ink-2); text-align: center; }
  .rp-loader b { color: var(--rp-ink); font-size: 14px; }
  .rp-splash { position: absolute; inset: 0; z-index: 16; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; text-align: center; padding: 24px; color: var(--rp-ink-2); font-size: 13px; }
  .rp-splash b { color: var(--rp-ink); font-size: 15px; } .rp-splash p { max-width: 380px; margin: 0 0 6px; }
  .rp-page-state { position: relative; min-height: 60vh; }
  .rp-spinner { width: 26px; height: 26px; border-radius: 50%; border: 2px solid rgba(255,255,255,.12); border-top-color: var(--accent); animation: rpSpin .8s linear infinite; }
  @keyframes rpSpin { to { transform: rotate(360deg); } }

  /* ---------- full screen ---------- */
  .rp-root.is-fs { position: fixed; inset: 0; z-index: 2500; width: 100vw; height: 100dvh !important; max-height: none !important; margin: 0; border-radius: 0; background: #0A0D13; }
  .rp-root.is-fs .mk-shell { height: 100%; }

  .rp-guide { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; color: var(--rp-ink-2); font-size: 12px; line-height: 1.55; }
  .rp-guide svg { color: var(--accent); } .rp-guide p { margin: 0; } .rp-guide b { color: var(--rp-ink); }
  .rp-guide .rp-two { width: 100%; }
  .rp-guide .rp-buy, .rp-guide .rp-sell { height: 36px; }
  .rp-planhead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .rp-planhead b { font: 700 13px 'Space Grotesk', Inter, sans-serif; } .rp-planhead em { font: 500 10.5px 'IBM Plex Mono', monospace; font-style: normal; color: var(--rp-ink-3); }
  .rp-kv b i { font-style: normal; font-weight: 500; color: var(--rp-ink-3); margin-left: 4px; font-size: 10.5px; }
  .rp-wide { width: 100%; justify-content: center; }
  .rp-pend { border-color: color-mix(in srgb, var(--accent) 35%, transparent); background: color-mix(in srgb, var(--accent) 6%, transparent); }
  .rp-pend header { display: flex; align-items: center; gap: 8px; } .rp-pend header em { font: 500 11px 'IBM Plex Mono', monospace; font-style: normal; color: var(--rp-ink-2); }
  .rp-card.is-selected { box-shadow: 0 0 0 1px var(--accent); }
  .rp-field-row { display: grid; grid-template-columns: 1fr auto 70px; align-items: center; gap: 10px; margin-bottom: 8px; }
  .rp-field-row > span { font: 600 10px 'IBM Plex Mono', monospace; text-transform: uppercase; color: var(--rp-ink-2); }
  .rp-toggle { display: inline-flex; padding: 2px; gap: 2px; border-radius: 6px; background: rgba(255,255,255,.04); border: 1px solid var(--rp-line); }
  .rp-toggle button { border: 0; background: transparent; color: var(--rp-ink-2); font: 600 9px 'IBM Plex Mono', monospace; padding: 3px 7px; border-radius: 4px; cursor: pointer; transition: all .1s; }
  .rp-toggle button:hover { color: var(--rp-ink); }
  .rp-toggle button.is-on { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent); }
  .rp-check { display: flex; align-items: center; gap: 8px; font: 600 10px 'IBM Plex Mono', monospace; text-transform: uppercase; color: var(--rp-ink-2); cursor: pointer; margin-bottom: 4px; }
  .rp-check input { accent-color: var(--accent); }

  @media (max-width: 1100px) { .rp-acct { display: none; } .rp-order-btns { margin-left: 0; } }
  @media (max-width: 768px) {
    .rp-hud { right: 10px; top: 8px; width: 190px; }
    .rp-title { max-width: 150px; } .rp-price { border-left: 0; padding-left: 0; }
    .rp-jump input[type=date] { width: 120px; }
    .rp-back span { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { .rp-spinner { animation: none; } .rp-hud-bar i { transition: none; } }
`;
