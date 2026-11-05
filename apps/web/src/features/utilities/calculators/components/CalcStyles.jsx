/** Shared styles for every calculator surface (hub, calculator page, ⌘K switcher). Mirrors the GexPage visual language. */
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

  /* ---------- top bar (single calculator page) ---------- */
  .cx-topbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .cx-back {
    display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px 6px 8px; border-radius: 99px;
    border: 1px solid var(--line); background: rgba(255,255,255,.03); color: var(--ink-2);
    font-size: 12px; font-weight: 600; transition: all .16s;
  }
  .cx-back:hover { color: var(--ink-1); border-color: color-mix(in srgb, var(--cat) 50%, transparent); background: color-mix(in srgb, var(--cat) 8%, transparent); }
  .cx-catpill {
    display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px; border-radius: 99px;
    font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: var(--cat); border: 1px solid color-mix(in srgb, var(--cat) 38%, transparent);
    background: color-mix(in srgb, var(--cat) 9%, transparent); transition: all .16s;
  }
  .cx-catpill i { width: 6px; height: 6px; border-radius: 50%; background: var(--cat); box-shadow: 0 0 8px var(--cat); }
  .cx-catpill:hover { background: color-mix(in srgb, var(--cat) 16%, transparent); }
  .cx-topbar-actions { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
  .cx-btn.is-pinned { color: #F5C04A; border-color: rgba(245,192,74,.4); background: rgba(245,192,74,.08); }
  .cx-switch-btn .cx-kbd { height: 17px; min-width: 0; font-size: 9px; letter-spacing: 0; }

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

  /* ---------- hub: hero ---------- */
  .cx-hero {
    position: relative; display: flex; flex-direction: column; gap: 18px; padding: 28px 28px 24px;
    border-radius: 20px; border: 1px solid var(--line); overflow: hidden; isolation: isolate;
    background:
      radial-gradient(700px 260px at 92% -30%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 65%),
      radial-gradient(520px 240px at -5% 130%, rgba(55,138,221,.16), transparent 62%),
      var(--panel);
    box-shadow: 0 30px 60px -38px rgba(0,0,0,.95);
  }
  .cx-hero::before {
    content: ''; position: absolute; inset: 0; z-index: -1; opacity: .55;
    background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
    background-size: 34px 34px;
    -webkit-mask-image: radial-gradient(ellipse 80% 90% at 80% 0%, #000 10%, transparent 70%);
            mask-image: radial-gradient(ellipse 80% 90% at 80% 0%, #000 10%, transparent 70%);
  }
  .cx-hero-title { margin: 6px 0 8px; font-size: 30px; font-weight: 800; letter-spacing: -.03em; line-height: 1.12; }
  .cx-hero .cx-eyebrow { color: var(--accent); }

  .cx-search {
    display: flex; align-items: center; gap: 10px; padding: 0 14px; height: 48px; border-radius: 14px;
    border: 1px solid var(--line); background: rgba(0,0,0,.32); color: var(--ink-3);
    transition: border-color .16s, box-shadow .16s;
  }
  .cx-search.is-hero { height: 56px; border-radius: 16px; padding: 0 18px; background: rgba(5,7,12,.62); max-width: 760px; width: 100%; }
  .cx-search:focus-within { border-color: var(--accent); color: var(--accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent); }
  .cx-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--ink-1); font-family: var(--mono); font-size: 14px; }
  .cx-search.is-hero input { font-size: 15px; }
  .cx-search input::placeholder { color: var(--ink-3); }
  .cx-search-hint { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 10px; color: var(--ink-3); white-space: nowrap; }
  .cx-kbd {
    display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px;
    border-radius: 5px; border: 1px solid var(--line); background: rgba(255,255,255,.04);
    font-family: var(--mono); font-size: 10px; color: var(--ink-2);
  }

  .cx-popular { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  .cx-popular > span { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-3); margin-right: 2px; }
  .cx-pop {
    display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: 600;
    color: var(--ink-2); border: 1px solid var(--line); background: rgba(255,255,255,.03); transition: all .16s;
  }
  .cx-pop i { width: 6px; height: 6px; border-radius: 50%; background: var(--cat); box-shadow: 0 0 8px var(--cat); }
  .cx-pop:hover, .cx-pop:focus-visible { outline: none; color: var(--ink-1); transform: translateY(-1px); border-color: color-mix(in srgb, var(--cat) 55%, transparent); background: color-mix(in srgb, var(--cat) 10%, transparent); }

  /* ---------- hub: filter pills ---------- */
  .cx-filters { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 6px; scrollbar-width: none; }
  .cx-filters::-webkit-scrollbar { display: none; }
  .cx-pill {
    --cat: var(--accent);
    flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 99px; cursor: pointer;
    border: 1px solid var(--line); background: rgba(255,255,255,.025); color: var(--ink-2);
    font: 600 12px Inter, ui-sans-serif, system-ui, sans-serif; white-space: nowrap; transition: all .16s;
  }
  .cx-pill svg { color: var(--cat); }
  .cx-pill em { font-style: normal; font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--ink-3); }
  .cx-pill:hover { color: var(--ink-1); border-color: color-mix(in srgb, var(--cat) 45%, transparent); background: color-mix(in srgb, var(--cat) 7%, transparent); }
  .cx-pill:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--cat) 25%, transparent); }
  .cx-pill.is-active {
    color: var(--ink-1); border-color: color-mix(in srgb, var(--cat) 65%, transparent);
    background: color-mix(in srgb, var(--cat) 15%, transparent); box-shadow: 0 0 24px -10px var(--cat);
  }
  .cx-pill.is-active em { color: var(--cat); }

  .cx-section-label { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .cx-section-label i { font-style: normal; color: var(--ink-2); }

  /* ---------- hub: category sections ---------- */
  .cx-sec { display: flex; flex-direction: column; gap: 14px; padding-top: 6px; }
  .cx-sec-head { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line-soft); position: relative; }
  .cx-sec-ico {
    width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--cat);
    background: color-mix(in srgb, var(--cat) 13%, transparent); border: 1px solid color-mix(in srgb, var(--cat) 36%, transparent);
  }
  .cx-sec-title { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: -.015em; }
  .cx-sec-blurb { margin: 2px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--ink-2); max-width: 640px; }
  .cx-cat-count { margin-left: auto; font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--cat); padding: 3px 10px; border-radius: 99px; border: 1px solid color-mix(in srgb, var(--cat) 40%, transparent); background: color-mix(in srgb, var(--cat) 10%, transparent); }
  .cx-ico {
    width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--cat);
    background: linear-gradient(135deg, color-mix(in srgb, var(--cat) 18%, transparent), color-mix(in srgb, var(--cat) 4%, transparent));
    border: 1px solid color-mix(in srgb, var(--cat) 38%, transparent);
  }

  /* ---------- calculator cards ---------- */
  .cx-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 10px; }
  .cx-card-wrap { position: relative; display: flex; }
  .cx-card {
    position: relative; flex: 1; display: flex; gap: 13px; align-items: flex-start; padding: 15px 44px 15px 14px; border-radius: 14px; min-width: 0;
    border: 1px solid var(--line); background: var(--panel); overflow: hidden;
    transition: transform .2s cubic-bezier(.2,.8,.25,1), border-color .2s, background .2s, box-shadow .2s;
  }
  .cx-card::after {
    content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .2s;
    background: radial-gradient(260px 120px at 0% 0%, color-mix(in srgb, var(--cat) 16%, transparent), transparent 70%);
  }
  .cx-card:hover, .cx-card:focus-visible {
    outline: none; transform: translateY(-2px); border-color: color-mix(in srgb, var(--cat) 55%, transparent);
    box-shadow: 0 18px 38px -24px color-mix(in srgb, var(--cat) 70%, transparent);
  }
  .cx-card:hover::after, .cx-card:focus-visible::after { opacity: 1; }
  .cx-card:focus-visible { box-shadow: 0 0 0 3px color-mix(in srgb, var(--cat) 28%, transparent); }
  .cx-card-body { position: relative; z-index: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .cx-card .cx-ico { position: relative; z-index: 1; transition: transform .2s; }
  .cx-card:hover .cx-ico { transform: scale(1.06); }
  .cx-card-title { font-size: 13.5px; font-weight: 700; letter-spacing: -.005em; }
  .cx-card-desc { font-size: 12px; line-height: 1.55; color: var(--ink-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .cx-card-cat { font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--cat); }
  .cx-card-go { position: absolute; right: 14px; bottom: 14px; z-index: 1; color: var(--cat); opacity: 0; transform: translate(-4px, 4px); transition: all .2s; }
  .cx-card:hover .cx-card-go, .cx-card:focus-visible .cx-card-go { opacity: 1; transform: none; }
  .cx-star {
    position: absolute; top: 9px; right: 9px; z-index: 2; width: 28px; height: 28px; border-radius: 8px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    color: var(--ink-3); background: transparent; border: 1px solid transparent; opacity: 0; transition: all .16s;
  }
  .cx-card-wrap:hover .cx-star, .cx-star:focus-visible, .cx-star.is-on { opacity: 1; }
  .cx-star:hover { color: #F5C04A; background: rgba(245,192,74,.1); border-color: rgba(245,192,74,.3); }
  .cx-star.is-on { color: #F5C04A; }
  .cx-star:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(245,192,74,.28); }
  @media (hover: none) { .cx-star { opacity: 1; } .cx-card-go { display: none; } }

  .cx-related { display: flex; flex-direction: column; margin-top: 4px; }

  /* ---------- ctrl/⌘ + K switcher ---------- */
  .cx-layer {
    position: fixed; inset: 0; z-index: 1000; width: auto; margin: 0; gap: 0; flex-direction: row;
    align-items: flex-start; justify-content: center; padding: 11vh 16px 0;
    background: rgba(4,6,10,.62); -webkit-backdrop-filter: blur(7px); backdrop-filter: blur(7px);
    animation: cx-fade .14s ease-out;
  }
  .cx-pal {
    width: min(660px, 100%); max-height: 72vh; display: flex; flex-direction: column; border-radius: 18px; overflow: hidden;
    border: 1px solid rgba(255,255,255,.12); background: #0E121B;
    box-shadow: 0 40px 90px -20px rgba(0,0,0,.95), 0 0 0 1px rgba(0,0,0,.4); animation: cx-pop .16s cubic-bezier(.2,.8,.25,1);
  }
  .cx-pal-search { display: flex; align-items: center; gap: 11px; padding: 0 16px; height: 56px; border-bottom: 1px solid var(--line); color: var(--accent); }
  .cx-pal-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--ink-1); font-family: var(--mono); font-size: 14.5px; }
  .cx-pal-search input::placeholder { color: var(--ink-3); }
  .cx-pal-list { overflow-y: auto; padding: 6px 8px 10px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.1) transparent; }
  .cx-pal-label { display: flex; align-items: center; gap: 7px; padding: 12px 10px 6px; font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3); }
  .cx-pal-label i { width: 6px; height: 6px; border-radius: 50%; }
  .cx-pal-item {
    --cat: var(--accent); width: 100%; display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 11px; cursor: pointer;
    text-align: left; font: inherit; color: inherit; background: transparent; border: 1px solid transparent; transition: background .1s;
  }
  .cx-pal-item.is-active { background: color-mix(in srgb, var(--cat) 12%, transparent); border-color: color-mix(in srgb, var(--cat) 32%, transparent); }
  .cx-pal-item.is-current .cx-pal-text b::after { content: ' · current'; color: var(--ink-3); font-weight: 500; }
  .cx-pal-ico { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; color: var(--cat); background: color-mix(in srgb, var(--cat) 12%, transparent); border: 1px solid color-mix(in srgb, var(--cat) 30%, transparent); }
  .cx-pal-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .cx-pal-text b { font-size: 13px; font-weight: 600; }
  .cx-pal-text small { font-size: 11.5px; color: var(--ink-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cx-pal-cat { font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--cat); white-space: nowrap; }
  .cx-pal-enter { color: var(--ink-3); flex-shrink: 0; }
  .cx-pal-empty { padding: 40px 16px; text-align: center; color: var(--ink-3); font-family: var(--mono); font-size: 12px; }
  .cx-pal-foot { display: flex; gap: 16px; padding: 9px 16px; border-top: 1px solid var(--line); font-family: var(--mono); font-size: 10px; color: var(--ink-3); background: rgba(0,0,0,.25); }
  @keyframes cx-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cx-pop { from { opacity: 0; transform: translateY(-8px) scale(.985); } to { opacity: 1; transform: none; } }

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

  .cx-foot { text-align: center; color: var(--ink-3); font-family: var(--mono); font-size: 10.5px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

  @media (max-width: 1100px) { .cx-layout { grid-template-columns: 1fr; } .cx-out { position: static; } }
  @media (max-width: 560px) {
    .cx-fields { grid-template-columns: 1fr; }
    .cx-results { grid-template-columns: 1fr; }
    .cx-r-val { font-size: 19px; } .cx-result.is-primary .cx-r-val { font-size: 28px; }
    .cx-title { font-size: 19px; }
    .cx-hero { padding: 20px 16px 18px; border-radius: 16px; } .cx-hero-title { font-size: 23px; }
    .cx-search.is-hero { height: 50px; }
    .cx-sec-blurb { display: none; }
    .cx-pal-foot { display: none; } .cx-layer { padding-top: 6vh; }
    .cx-switch-btn .cx-kbd { display: none; }
    .cx-wrap { height: 46px; }
  }
  @media (prefers-reduced-motion: reduce) { .cx-root *, .cx-layer, .cx-pal { transition: none !important; animation: none !important; } }
`;

export default function CalcStyles() {
  return <style>{CALC_CSS}</style>;
}
