/** Shared styles for every calculator surface. Mirrors the GexPage visual language. */
const CALC_CSS = `
  .cx-root {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --good: var(--win, #35C4A1);
    --bad: var(--loss, #FF5C5C);
    --panel: linear-gradient(180deg, rgba(15,18,26,.74), rgba(15,18,26,.55));
    --mono: 'IBM Plex Mono', ui-monospace, monospace;
    --cat: var(--accent);

    width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;
    color: var(--ink-1); font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased; color-scheme: dark;
  }
  .cx-root *, .cx-root *::before, .cx-root *::after { box-sizing: border-box; }
  .cx-root a { color: inherit; text-decoration: none; }

  .cx-panel {
    border-radius: 14px; background: var(--panel); border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9); overflow: hidden;
  }
  .cx-phead {
    padding: 13px 18px 11px; border-bottom: 1px solid var(--line-soft);
    display: flex; align-items: center; gap: 10px;
  }
  .cx-ptitle { font-size: 13px; font-weight: 700; letter-spacing: -.005em; }
  .cx-pactions { margin-left: auto; display: flex; gap: 6px; }
  .cx-pbody { padding: 16px 18px 18px; }

  /* ---------- header + crumbs ---------- */
  .cx-crumbs {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    font-family: var(--mono); font-size: 10.5px; font-weight: 600; letter-spacing: .08em;
    text-transform: uppercase; color: var(--ink-3);
  }
  .cx-crumbs a { color: var(--ink-2); display: inline-flex; align-items: center; gap: 5px; transition: color .16s; }
  .cx-crumbs a:hover { color: var(--accent); }
  .cx-crumbs .cx-sep { opacity: .5; }
  .cx-crumbs b { color: var(--ink-1); font-weight: 700; }
  .cx-head { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
  .cx-head-icon {
    width: 52px; height: 52px; border-radius: 15px; flex-shrink: 0;
    display: inline-flex; align-items: center; justify-content: center; color: var(--cat);
    background: linear-gradient(135deg, color-mix(in srgb, var(--cat) 20%, transparent), color-mix(in srgb, var(--cat) 5%, transparent));
    border: 1px solid color-mix(in srgb, var(--cat) 45%, transparent);
    box-shadow: 0 0 34px -10px color-mix(in srgb, var(--cat) 60%, transparent);
  }
  .cx-head-text { flex: 1 1 320px; min-width: 0; }
  .cx-eyebrow { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--cat); opacity: .9; }
  .cx-title { margin: 3px 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -.02em; line-height: 1.2; }
  .cx-desc { margin: 0; max-width: 720px; font-size: 13px; line-height: 1.65; color: var(--ink-2); }

  .cx-btn {
    display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: var(--ink-2);
    cursor: pointer; font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: .04em;
    text-transform: uppercase; transition: all .18s; white-space: nowrap;
  }
  .cx-btn:hover { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 7%, transparent); }
  .cx-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent); }
  .cx-btn.is-copied { color: #4ade80; border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.06); }

  /* ---------- hub ---------- */
  .cx-search {
    display: flex; align-items: center; gap: 10px; padding: 0 14px; height: 48px; border-radius: 14px;
    border: 1px solid var(--line); background: rgba(0,0,0,.32); color: var(--ink-3);
    transition: border-color .16s, box-shadow .16s;
  }
  .cx-search:focus-within { border-color: var(--accent); color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
  .cx-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--ink-1); font-family: var(--mono); font-size: 13.5px; }
  .cx-search input::placeholder { color: var(--ink-3); }
  .cx-kbd {
    display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px;
    border-radius: 5px; border: 1px solid var(--line); background: rgba(255,255,255,.04);
    font-family: var(--mono); font-size: 10px; color: var(--ink-2);
  }
  .cx-section-label { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); display: flex; align-items: center; gap: 8px; }
  .cx-section-label i { font-style: normal; color: var(--ink-2); }

  .cx-cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px; }
  .cx-cat {
    position: relative; display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 16px;
    border: 1px solid var(--line); background: var(--panel); overflow: hidden;
    transition: transform .22s cubic-bezier(.2,.8,.25,1), border-color .22s, box-shadow .22s;
  }
  .cx-cat::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px; background: var(--cat); opacity: .65; box-shadow: 0 0 14px var(--cat); }
  .cx-cat:hover, .cx-cat:focus-visible {
    outline: none; transform: translateY(-2px); border-color: color-mix(in srgb, var(--cat) 50%, transparent);
    box-shadow: 0 22px 44px -26px color-mix(in srgb, var(--cat) 55%, transparent);
  }
  .cx-cat-top { display: flex; align-items: center; gap: 12px; }
  .cx-cat-name { font-size: 15px; font-weight: 700; letter-spacing: -.01em; }
  .cx-cat-count { margin-left: auto; font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--cat); padding: 2px 9px; border-radius: 99px; border: 1px solid color-mix(in srgb, var(--cat) 40%, transparent); background: color-mix(in srgb, var(--cat) 10%, transparent); }
  .cx-cat-blurb { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--ink-2); }
  .cx-cat-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
  .cx-chip-s { font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--ink-3); padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,.03); border: 1px solid var(--line-soft); }
  .cx-ico {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--cat);
    background: linear-gradient(135deg, color-mix(in srgb, var(--cat) 18%, transparent), color-mix(in srgb, var(--cat) 4%, transparent));
    border: 1px solid color-mix(in srgb, var(--cat) 38%, transparent);
  }

  .cx-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 10px; }
  .cx-card {
    display: flex; gap: 12px; align-items: flex-start; padding: 14px; border-radius: 13px;
    border: 1px solid var(--line); background: var(--panel); transition: all .18s;
  }
  .cx-card:hover, .cx-card:focus-visible { outline: none; transform: translateY(-1px); border-color: color-mix(in srgb, var(--cat) 50%, transparent); background: color-mix(in srgb, var(--cat) 5%, rgba(15,18,26,.6)); }
  .cx-card-body { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .cx-card-title { font-size: 13.5px; font-weight: 700; letter-spacing: -.005em; }
  .cx-card-desc { font-size: 12px; line-height: 1.55; color: var(--ink-2); }
  .cx-card-cat { font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--cat); }

  /* ---------- sibling chips ---------- */
  .cx-strip { display: flex; gap: 8px; padding: 10px; overflow-x: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.1) transparent; }
  .cx-strip::-webkit-scrollbar { height: 6px; }
  .cx-strip::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }
  .cx-chip {
    flex: 0 0 auto; padding: 8px 13px; border-radius: 99px; border: 1px solid var(--line-soft); background: rgba(255,255,255,.02);
    color: var(--ink-2); font-size: 12px; font-weight: 600; transition: all .16s; white-space: nowrap;
  }
  .cx-chip:hover { color: var(--ink-1); background: rgba(255,255,255,.05); }
  .cx-chip.is-active { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 10%, transparent); box-shadow: 0 0 20px -10px color-mix(in srgb, var(--accent) 55%, transparent); }
  .cx-chip:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent); }

  /* ---------- calculator layout ---------- */
  .cx-layout { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 16px; align-items: start; }
  .cx-out { position: sticky; top: 16px; }
  .cx-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; }
  .cx-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .cx-field.is-full { grid-column: 1 / -1; }
  .cx-label { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); display: flex; gap: 6px; align-items: baseline; }
  .cx-label em { font-style: normal; font-weight: 500; letter-spacing: .04em; text-transform: none; opacity: .7; }
  .cx-hint { font-size: 11px; line-height: 1.5; color: var(--ink-3); }

  .cx-wrap {
    display: flex; align-items: center; height: 42px; padding: 0 12px; gap: 8px; border-radius: 10px;
    border: 1px solid var(--line); background: rgba(0,0,0,.28); transition: border-color .16s, box-shadow .16s;
  }
  .cx-wrap:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
  .cx-wrap.is-bad { border-color: rgba(255,92,92,.6); }
  .cx-affix { font-family: var(--mono); font-size: 12px; font-weight: 600; color: var(--ink-3); flex-shrink: 0; }
  .cx-input {
    flex: 1; min-width: 0; width: 100%; height: 100%; background: transparent; border: 0; outline: 0;
    color: var(--ink-1); font-family: var(--mono); font-size: 14px; font-weight: 600;
  }
  .cx-input::placeholder { color: var(--ink-3); font-weight: 400; }
  .cx-select {
    appearance: none; -webkit-appearance: none; padding-right: 30px; cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238892A3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 2px center;
  }
  .cx-select option { background: #11151F; color: #E7E9EE; }
  .cx-textarea { height: auto; padding: 11px 0; resize: vertical; line-height: 1.7; font-size: 12.5px; }
  .cx-wrap.is-area { height: auto; align-items: stretch; }

  .cx-seg { display: flex; gap: 4px; padding: 4px; border-radius: 11px; background: rgba(0,0,0,.32); border: 1px solid var(--line-soft); }
  .cx-seg button {
    flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--ink-2);
    font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: .03em; cursor: pointer; transition: all .16s;
  }
  .cx-seg button:hover:not(.is-active) { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .cx-seg button.is-active { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 12%, transparent); }
  .cx-seg button:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent); }

  /* ---------- results ---------- */
  .cx-results { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .cx-result {
    --t: var(--ink-3); position: relative; text-align: left; font: inherit; color: inherit; cursor: copy;
    padding: 13px 14px 14px 17px; border-radius: 12px; border: 1px solid var(--line-soft); background: rgba(255,255,255,.025);
    display: flex; flex-direction: column; gap: 6px; min-width: 0; overflow: hidden; transition: all .16s;
  }
  .cx-result::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--t); box-shadow: 0 0 12px var(--t); opacity: .85; }
  .cx-result:hover, .cx-result:focus-visible { outline: none; background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.12); }
  .cx-result:focus-visible { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent); }
  .cx-result.t-good { --t: var(--good); } .cx-result.t-bad { --t: var(--bad); }
  .cx-result.t-accent, .cx-result.t-warn { --t: var(--accent); }
  .cx-r-label { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); padding-right: 22px; }
  .cx-r-val { font-family: var(--mono); font-size: 21px; font-weight: 700; letter-spacing: -.02em; line-height: 1.15; overflow-wrap: anywhere; }
  .cx-result.t-good .cx-r-val { color: var(--good); } .cx-result.t-bad .cx-r-val { color: var(--bad); }
  .cx-result.t-accent .cx-r-val, .cx-result.t-warn .cx-r-val { color: var(--accent); }
  .cx-r-sub { font-family: var(--mono); font-size: 10.5px; font-weight: 600; color: var(--ink-3); line-height: 1.45; }
  .cx-r-copy { position: absolute; top: 11px; right: 11px; color: var(--ink-3); opacity: 0; transition: opacity .14s; }
  .cx-result:hover .cx-r-copy, .cx-result:focus-visible .cx-r-copy, .cx-result.is-copied .cx-r-copy { opacity: 1; }
  .cx-result.is-copied .cx-r-copy { color: #4ade80; }
  .cx-result.is-primary {
    grid-column: 1 / -1; padding: 18px 18px 18px 21px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--t) 11%, transparent), color-mix(in srgb, var(--t) 2%, transparent));
    border-color: color-mix(in srgb, var(--t) 28%, transparent);
  }
  .cx-result.is-primary { --t: var(--accent); }
  .cx-result.is-primary.t-good { --t: var(--good); } .cx-result.is-primary.t-bad { --t: var(--bad); }
  .cx-result.is-primary .cx-r-val { font-size: 34px; }

  .cx-table-wrap { margin-top: 14px; border-radius: 11px; border: 1px solid var(--line-soft); overflow: hidden; }
  .cx-table-head { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-bottom: 1px solid var(--line-soft); background: rgba(0,0,0,.2); }
  .cx-table-scroll { overflow-x: auto; max-height: 360px; overflow-y: auto; }
  .cx-table { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 12px; }
  .cx-table th { position: sticky; top: 0; background: #0F131C; padding: 8px 12px; text-align: right; font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); white-space: nowrap; }
  .cx-table td { padding: 8px 12px; text-align: right; border-top: 1px solid var(--line-soft); white-space: nowrap; font-weight: 600; }
  .cx-table th:first-child, .cx-table td:first-child { text-align: left; }
  .cx-table tbody tr:hover { background: rgba(255,255,255,.03); }
  .cx-table tr.is-hl td { background: color-mix(in srgb, var(--accent) 9%, transparent); color: var(--accent); }
  .cx-pos { color: var(--good); } .cx-neg { color: var(--bad); }

  .cx-alert { display: flex; gap: 10px; align-items: flex-start; padding: 11px 13px; border-radius: 10px; font-size: 12.5px; line-height: 1.55; margin-bottom: 12px; }
  .cx-alert svg { flex-shrink: 0; margin-top: 2px; }
  .cx-alert.is-warn { color: #fcd34d; background: color-mix(in srgb, var(--accent) 9%, transparent); border: 1px solid var(--accent-soft2); }
  .cx-alert.is-error { color: #fca5a5; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.35); }
  .cx-notes { margin: 14px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .cx-notes li { display: flex; gap: 8px; font-size: 11.5px; line-height: 1.55; color: var(--ink-3); }
  .cx-notes svg { flex-shrink: 0; margin-top: 2px; }
  .cx-idle { padding: 52px 20px; text-align: center; color: var(--ink-3); font-family: var(--mono); font-size: 12px; line-height: 1.7; }
  .cx-idle svg { display: block; margin: 0 auto 12px; color: var(--accent); opacity: .8; }

  .cx-pn { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .cx-pn a { display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line-soft); background: rgba(255,255,255,.02); transition: all .16s; }
  .cx-pn a:hover { border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 6%, transparent); }
  .cx-pn a.is-next { text-align: right; grid-column: 2; }
  .cx-pn small { font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); }
  .cx-pn span { font-size: 13px; font-weight: 600; }
  .cx-foot { text-align: center; color: var(--ink-3); font-family: var(--mono); font-size: 10.5px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

  @media (max-width: 1100px) { .cx-layout { grid-template-columns: 1fr; } .cx-out { position: static; } }
  @media (max-width: 560px) {
    .cx-fields { grid-template-columns: 1fr; }
    .cx-results { grid-template-columns: 1fr; }
    .cx-r-val { font-size: 19px; } .cx-result.is-primary .cx-r-val { font-size: 28px; }
    .cx-title { font-size: 19px; }
    .cx-wrap { height: 46px; }
  }
  @media (prefers-reduced-motion: reduce) { .cx-root * { transition: none !important; } }
`;

export default function CalcStyles() {
  return <style>{CALC_CSS}</style>;
}
