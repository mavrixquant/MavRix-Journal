// Styles for the drawing / indicator settings dialogs. Prefixed `cs-` (chart settings).
export const SETTINGS_CSS = `
  .cs-overlay { position: fixed; inset: 0; z-index: 3200; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(5,7,11,.55); backdrop-filter: blur(3px); }
  .cs-dialog { --cs-ink: #E7E9EE; --cs-ink-2: #8892A3; --cs-ink-3: #545E6E; --cs-line: rgba(255,255,255,.08); --cs-line-2: rgba(255,255,255,.14);
    width: min(440px, 100%); max-height: min(640px, 92dvh); display: flex; flex-direction: column; border-radius: 16px; background: #0F131C; border: 1px solid var(--cs-line-2); box-shadow: 0 40px 90px -30px rgba(0,0,0,.95); color: var(--cs-ink); font-family: Inter, system-ui, sans-serif; overflow: hidden; }
  .cs-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px 10px; }
  .cs-head h2 { margin: 0; font: 700 15px 'Space Grotesk', Inter, sans-serif; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cs-head .cs-dot { width: 9px; height: 9px; border-radius: 3px; flex: 0 0 auto; }
  .cs-x { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--cs-line); background: transparent; color: var(--cs-ink-2); cursor: pointer; }
  .cs-x:hover { color: var(--cs-ink); border-color: var(--cs-line-2); }
  .cs-tabs { display: flex; gap: 2px; padding: 0 12px; border-bottom: 1px solid var(--cs-line); }
  .cs-tabs button { position: relative; height: 34px; padding: 0 12px; border: 0; background: transparent; color: var(--cs-ink-2); font: 600 12px 'IBM Plex Mono', monospace; cursor: pointer; }
  .cs-tabs button:hover { color: var(--cs-ink); }
  .cs-tabs button.is-on { color: var(--accent); }
  .cs-tabs button.is-on::after { content: ''; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px; border-radius: 2px; background: var(--accent); }
  .cs-body { padding: 14px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }
  .cs-foot { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--cs-line); background: rgba(0,0,0,.14); flex-wrap: wrap; }
  .cs-grow { flex: 1; }
  .cs-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 9px; border: 1px solid var(--cs-line-2); background: transparent; color: var(--cs-ink-2); font: 600 11.5px 'IBM Plex Mono', monospace; cursor: pointer; white-space: nowrap; transition: all .15s; }
  .cs-btn:hover:not(:disabled) { color: var(--cs-ink); border-color: rgba(255,255,255,.3); }
  .cs-btn:disabled { opacity: .4; cursor: not-allowed; }
  .cs-btn.is-primary { background: var(--accent); border-color: var(--accent); color: #0A0D14; font-weight: 700; }
  .cs-btn.is-primary:hover:not(:disabled) { filter: brightness(1.1); color: #0A0D14; }
  .cs-btn.is-danger:hover:not(:disabled) { color: #FF8080; border-color: rgba(255,92,92,.5); }
  .cs-btn:focus-visible, .cs-x:focus-visible, .cs-tabs button:focus-visible, .cs-sw:focus-visible, .cs-seg button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  .cs-row { display: grid; grid-template-columns: 132px minmax(0, 1fr); gap: 10px; align-items: center; min-height: 30px; }
  .cs-row > label, .cs-row > .cs-lbl { font: 500 12px Inter, system-ui, sans-serif; color: var(--cs-ink-2); }
  .cs-row.is-check { grid-template-columns: 1fr; }
  .cs-sect { margin: 6px 0 -2px; font: 700 10px 'IBM Plex Mono', monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--cs-ink-3); }
  .cs-note { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--cs-ink-3); }
  .cs-input { width: 100%; box-sizing: border-box; height: 30px; padding: 0 9px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); background: rgba(10,13,19,.6); color: var(--cs-ink); font: 500 12px 'IBM Plex Mono', monospace; outline: none; color-scheme: dark; }
  .cs-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent); }
  .cs-check { display: inline-flex; align-items: center; gap: 9px; font: 500 12px Inter, system-ui, sans-serif; color: var(--cs-ink); cursor: pointer; }
  .cs-check input { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
  .cs-range { display: flex; align-items: center; gap: 10px; }
  .cs-range input[type=range] { flex: 1; accent-color: var(--accent); }
  .cs-range output { min-width: 40px; text-align: right; font: 600 11.5px 'IBM Plex Mono', monospace; color: var(--cs-ink); }

  .cs-colors { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
  .cs-sw { width: 20px; height: 20px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; padding: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); }
  .cs-sw.is-on { border-color: #fff; }
  .cs-custom { position: relative; width: 26px; height: 20px; border-radius: 6px; overflow: hidden; border: 1px dashed rgba(255,255,255,.35); display: inline-grid; place-items: center; font-size: 12px; color: var(--cs-ink-2); }
  .cs-custom input { position: absolute; inset: -6px; width: 44px; height: 36px; opacity: 0; cursor: pointer; }
  .cs-seg { display: inline-flex; padding: 2px; gap: 2px; border-radius: 9px; background: rgba(255,255,255,.04); border: 1px solid var(--cs-line); }
  .cs-seg button { min-width: 34px; height: 24px; padding: 0 9px; border: 0; border-radius: 7px; background: transparent; color: var(--cs-ink-2); font: 600 11px 'IBM Plex Mono', monospace; cursor: pointer; display: inline-grid; place-items: center; }
  .cs-seg button:hover { color: var(--cs-ink); }
  .cs-seg button.is-on { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent); }
  .cs-seg svg { display: block; }

  .cs-lines { display: flex; flex-direction: column; gap: 10px; }
  .cs-line { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border-radius: 11px; background: rgba(255,255,255,.028); border: 1px solid var(--cs-line); }
  .cs-line-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .cs-line.is-off { opacity: .55; }

  .cs-levels { display: flex; flex-direction: column; gap: 4px; }
  .cs-level { display: grid; grid-template-columns: 20px 62px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 4px 2px; }
  .cs-level.is-off { opacity: .5; }
  .cs-level b { font: 600 12px 'IBM Plex Mono', monospace; }
  .cs-level input[type=checkbox] { accent-color: var(--accent); width: 15px; height: 15px; }

  @media (max-width: 480px) { .cs-row { grid-template-columns: 1fr; gap: 4px; } }
  @media (prefers-reduced-motion: reduce) { .cs-btn { transition: none; } }
`;
