import {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import navLogo from '@/assets/navLOGO.png';

/* ============================================================================
   MavRix Journal — Landing Page (rebuilt)
   - Zero API calls. All demo data is a deterministic, clearly-labelled SAMPLE.
   - All CSS lives in the `LD` template literal below (no landing.css).
   - Accent is driven by --accent / --accent-2 / --accent-soft / --accent-soft2.
   ============================================================================ */

/* ---------- helpers ---------- */
const hexToRgba = (hex, a = 1) => {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};

const lighten = (hex, amt = 60) => {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => Math.min(255, parseInt(h.slice(i, i + 2), 16) + amt).toString(16).padStart(2, '0'));
  return `#${c.join('')}`;
};

const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const fmtR = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}R`;
const fmtUsd = (v) => `${v >= 0 ? '+' : '−'}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;

const PALETTE = [
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Cyan', hex: '#22D3EE' },
  { name: 'Violet', hex: '#A78BFA' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Lime', hex: '#A3E635' },
];

const WIN = '#35C4A1';
const LOSS = '#FF5C5C';

/* ---------- sample dataset (deterministic) ---------- */
const SESSIONS = ['Asia', 'London', 'NY Open', 'NY Lunch', 'NY PM'];
const SESS_P = { Asia: 0.38, London: 0.5, 'NY Open': 0.6, 'NY Lunch': 0.32, 'NY PM': 0.45 };
const SESS_W = [0.14, 0.2, 0.3, 0.16, 0.2];
const SESS_STRAT = { Asia: 1, London: 1, 'NY Open': 0, 'NY Lunch': 2, 'NY PM': 0 };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_ADJ = [-0.03, 0.02, 0, 0.03, -0.06];
const STRATS = [
  { name: 'Opening Drive Pullback', color: '#F59E0B' },
  { name: 'VWAP Reclaim', color: '#22D3EE' },
  { name: 'Lunch Fade', color: '#A78BFA' },
];
const RISK_USD = 150;

function buildSample() {
  const r = rng(20261107);
  const out = [];
  for (let i = 0; i < 300; i++) {
    let x = r(), si = 0, acc = 0;
    for (let k = 0; k < SESS_W.length; k++) { acc += SESS_W[k]; if (x <= acc) { si = k; break; } }
    const session = SESSIONS[si];
    const di = Math.floor(r() * 5);
    const dir = r() < 0.52 ? 'Long' : 'Short';
    const p = SESS_P[session] + DAY_ADJ[di] + (dir === 'Long' ? 0.02 : -0.02);
    const win = r() < p;
    const R = win ? 1 + r() * 1.2 : -1;
    const strat = r() < 0.25 ? Math.floor(r() * 3) : SESS_STRAT[session];
    const hold = win ? 4 + r() * 14 : 3 + r() * 22;
    out.push({ session, day: DAYS[di], dir, r: R, strat, hold });
  }
  return out;
}
const SAMPLE = buildSample();

function computeStats(trades) {
  const n = trades.length;
  const curve = [0];
  const dd = [0];
  let eq = 0, peak = 0, maxDD = 0, gw = 0, gl = 0, wins = 0;
  for (const t of trades) {
    eq += t.r;
    curve.push(eq);
    if (eq > peak) peak = eq;
    const d = eq - peak;
    dd.push(d);
    if (d < maxDD) maxDD = d;
    if (t.r > 0) { wins++; gw += t.r; } else gl += -t.r;
  }
  const losses = n - wins;
  return {
    n, wins, curve, dd, maxDD, net: eq,
    wr: n ? wins / n : 0,
    avgW: wins ? gw / wins : 0,
    avgL: losses ? gl / losses : 1,
    pf: gl ? gw / gl : gw,
    exp: n ? eq / n : 0,
  };
}
const SAMPLE_STATS = computeStats(SAMPLE);

function groupBy(trades, key) {
  const m = new Map();
  for (const t of trades) {
    const k = t[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(t);
  }
  return [...m.entries()].map(([k, arr]) => {
    const s = computeStats(arr);
    return { key: k, n: s.n, wr: s.wr, net: s.net, exp: s.exp };
  });
}

/* ---------- CSS ---------- */
const LD = `
  .ld-root, .ld-root * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  .ld-root h1, .ld-root h2, .ld-root h3, .ld-root p { margin: 0; }
  .ld-root button { font-family: inherit; }
  .ld-root {
    --f-disp: 'Space Grotesk', Inter, ui-sans-serif, system-ui, sans-serif;
    --f-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
    --accent: #F59E0B; --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10); --accent-soft2: rgba(245,158,11,.30);
    --win: ${WIN}; --loss: ${LOSS};
    --line: rgba(255,255,255,.085); --line-soft: rgba(255,255,255,.05);
    --dim: rgba(255,255,255,.62); --faint: rgba(255,255,255,.4);
    position: relative; min-height: 100vh; color: #EEF0F4; overflow-x: clip;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    background:
      radial-gradient(1000px 560px at 12% -6%, var(--accent-soft), transparent 60%),
      radial-gradient(800px 500px at 90% 6%, rgba(34,211,238,.06), transparent 60%),
      linear-gradient(180deg, #07090D 0%, #0A0D14 40%, #07090D 100%);
  }
  .ld-root::before {
    content: ''; position: absolute; inset: 0 0 auto 0; height: 900px; pointer-events: none;
    background-image: linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 72px 72px;
    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, #000 25%, transparent 75%);
    mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, #000 25%, transparent 75%);
  }
  @media (pointer: fine) {
    .ld-root, .ld-root a, .ld-root button, .ld-root input[type="range"], .ld-root select { cursor: none; }
    .ld-root input[type="number"] { cursor: text; }
  }

  /* cursor + progress */
  .ld-cur-dot, .ld-cur-ring { position: fixed; top: 0; left: 0; pointer-events: none; z-index: 9999; border-radius: 50%; will-change: transform; }
  .ld-cur-dot { width: 6px; height: 6px; background: #fff; margin: -3px 0 0 -3px; }
  .ld-cur-ring { width: 36px; height: 36px; margin: -18px 0 0 -18px; border: 1.5px solid rgba(255,255,255,.4);
    transition: width .28s cubic-bezier(.2,.8,.25,1), height .28s cubic-bezier(.2,.8,.25,1), margin .28s cubic-bezier(.2,.8,.25,1), border-color .28s, background .28s; }
  .ld-cur-ring.is-hot { width: 64px; height: 64px; margin: -32px 0 0 -32px; background: var(--accent-soft); border-color: var(--accent); }
  @media (pointer: coarse) { .ld-cur-dot, .ld-cur-ring { display: none !important; } }
  .ld-progress { position: fixed; top: 0; left: 0; height: 2px; z-index: 200; background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent));
    background-size: 200% 100%; animation: ldGrad 3s linear infinite; box-shadow: 0 0 14px var(--accent); }

  /* layout */
  .ld-wrap { position: relative; max-width: 1240px; margin: 0 auto; padding: 0 clamp(18px, 4vw, 40px); }
  .ld-sec { padding: 96px 0; scroll-margin-top: 70px; position: relative; }
  .ld-head { text-align: center; max-width: 780px; margin: 0 auto 52px; }
  .ld-eyebrow { font-family: var(--f-mono); font-size: 12px; letter-spacing: .22em; color: var(--accent); text-transform: uppercase; margin-bottom: 14px; }
  .ld-h2 { font-family: var(--f-disp); font-size: clamp(1.9rem, 3.6vw, 3rem); font-weight: 700; letter-spacing: -.03em; line-height: 1.08; }
  .ld-sub { color: var(--dim); font-size: 1.08rem; line-height: 1.6; margin-top: 16px; }
  .ld-gradtext { background: linear-gradient(90deg, var(--accent), var(--accent-2), #22d3ee, var(--accent)); background-size: 300% 100%;
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: ldGrad 7s linear infinite; }
  .ld-split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: stretch; }
  .ld-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent); max-width: 1100px; margin: 0 auto; }
  .ld-mono { font-family: var(--f-mono); }
  .ld-label { font-family: var(--f-mono); font-size: 10.5px; letter-spacing: .1em; color: var(--faint); text-transform: uppercase; }

  /* reveal */
  .ld-reveal { opacity: 0; transform: translateY(30px); transition: opacity .85s cubic-bezier(.2,.8,.25,1), transform .85s cubic-bezier(.2,.8,.25,1); }
  .ld-visible { opacity: 1; transform: none; }

  /* nav */
  .ld-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; border-bottom: 1px solid transparent; transition: background .4s, box-shadow .4s, border-color .4s; }
  .ld-nav-in { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 13px clamp(18px, 4vw, 40px); max-width: 1500px; margin: 0 auto; }
  .ld-scrolled { background: rgba(7,9,13,.72); backdrop-filter: blur(20px) saturate(140%); border-bottom-color: var(--line); box-shadow: 0 16px 44px -22px rgba(0,0,0,.9); }
  .ld-navlinks { display: flex; gap: 26px; align-items: center; }
  .ld-navlink { position: relative; color: rgba(255,255,255,.68); text-decoration: none; font-size: 14px; font-weight: 500; padding: 6px 2px; transition: color .2s; background: none; border: none; }
  .ld-navlink::after { content: ''; position: absolute; left: 0; right: 100%; bottom: 0; height: 1.5px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); transition: right .32s cubic-bezier(.2,.8,.25,1); }
  .ld-navlink:hover { color: #fff; } .ld-navlink:hover::after { right: 0; }
  .ld-kbd { display: inline-flex; align-items: center; gap: 6px; font-family: var(--f-mono); font-size: 11px; color: rgba(255,255,255,.5); padding: 5px 10px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.035); transition: all .2s; }
  .ld-kbd:hover { color: #fff; border-color: var(--accent); background: var(--accent-soft); }
  .ld-kbd b { font-weight: 600; background: rgba(255,255,255,.09); padding: 1px 5px; border-radius: 4px; color: rgba(255,255,255,.85); }
  @media (max-width: 1080px) { .ld-navlinks { display: none; } }
  @media (max-width: 720px) { .ld-hide-sm { display: none !important; } }

  /* buttons */
  .ld-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 9px; text-decoration: none; padding: 14px 28px; border-radius: 14px;
    font-weight: 700; overflow: hidden; border: none; letter-spacing: .01em; white-space: nowrap; font-size: 15px;
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s, background .3s, border-color .3s; }
  .ld-btn:hover { transform: translateY(-2px); } .ld-btn:active { transform: translateY(1px) scale(.98); }
  .ld-btn::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%); animation: ldShine 4.2s ease-in-out infinite; }
  .ld-primary { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0A0D13; box-shadow: 0 10px 30px -8px var(--accent-soft2), inset 0 1px 0 rgba(255,255,255,.4); }
  .ld-primary:hover { box-shadow: 0 16px 42px -10px var(--accent-soft2), inset 0 1px 0 rgba(255,255,255,.5); }
  .ld-secondary { background: rgba(255,255,255,.035); color: #fff; border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(8px); }
  .ld-secondary:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.26); }
  .ld-secondary::after { display: none; }
  .ld-btn-sm { padding: 10px 18px; font-size: 13.5px; border-radius: 11px; }

  /* panels */
  .ld-panel { position: relative; border-radius: 22px; border: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012)); overflow: hidden; }
  .ld-pad { padding: 28px; }
  .ld-panel-title { font-family: var(--f-disp); font-size: 1.25rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: 8px; }
  .ld-panel-copy { color: var(--dim); font-size: 14.5px; line-height: 1.6; }
  .ld-hover:hover { border-color: var(--accent-soft2); background: linear-gradient(180deg, var(--accent-soft), rgba(255,255,255,.012)); }
  .ld-hover { transition: border-color .4s, background .4s, transform .5s cubic-bezier(.2,.8,.25,1); }
  .ld-tilt { transition: transform .5s cubic-bezier(.2,.8,.25,1); will-change: transform; }
  .ld-ico { width: 46px; height: 46px; border-radius: 13px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 18px;
    background: linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,.03)); border: 1px solid var(--accent-soft2); color: var(--accent); }

  /* tags + chips */
  .ld-pro { font-family: var(--f-mono); font-size: 10px; letter-spacing: .12em; padding: 2px 7px; border-radius: 99px; color: var(--accent); border: 1px solid var(--accent-soft2); background: var(--accent-soft); vertical-align: middle; }
  .ld-free { font-family: var(--f-mono); font-size: 10px; letter-spacing: .12em; padding: 2px 7px; border-radius: 99px; color: var(--win); border: 1px solid rgba(53,196,161,.35); background: rgba(53,196,161,.08); }
  .ld-sample { font-family: var(--f-mono); font-size: 10px; letter-spacing: .14em; color: var(--faint); text-transform: uppercase; }
  .ld-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .ld-chip { font-family: var(--f-mono); font-size: 12px; padding: 7px 13px; border-radius: 9px; color: rgba(255,255,255,.62); background: rgba(255,255,255,.03); border: 1px solid var(--line); transition: all .2s; }
  .ld-chip:hover { color: #fff; border-color: rgba(255,255,255,.25); }
  .ld-chip.on { color: #0A0D13; background: var(--accent); border-color: var(--accent); font-weight: 600; }

  /* metrics */
  .ld-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 10px; }
  .ld-metric { padding: 11px 13px; border-radius: 12px; border: 1px solid var(--line-soft); background: rgba(255,255,255,.03); transition: all .45s cubic-bezier(.2,.8,.25,1); }
  .ld-metric.on { border-color: var(--accent-soft2); background: var(--accent-soft); }
  .ld-metric .v { font-family: var(--f-mono); font-size: 1.15rem; font-weight: 700; margin-top: 4px; }
  .ld-metric .s { font-family: var(--f-mono); font-size: 10.5px; color: var(--faint); margin-top: 3px; }
  .ld-big { font-family: var(--f-mono); font-size: 1.9rem; font-weight: 700; letter-spacing: -.02em; line-height: 1; }

  /* sliders */
  input[type="range"].ld-range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 99px; background: rgba(255,255,255,.09); outline: none; }
  input[type="range"].ld-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--accent);
    box-shadow: 0 0 16px var(--accent), 0 0 0 4px var(--accent-soft); border: 2px solid #0A0D13; transition: transform .2s; }
  input[type="range"].ld-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
  input[type="range"].ld-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 16px var(--accent); border: 2px solid #0A0D13; }
  .ld-slide { margin-bottom: 22px; }
  .ld-slide-top { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: var(--dim); }
  .ld-slide-top b { font-family: var(--f-mono); font-size: 13.5px; color: var(--accent); }
  .ld-input { width: 100%; background: rgba(255,255,255,.04); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; color: #fff; font-family: var(--f-mono); font-size: 14px; outline: none; transition: border-color .2s; }
  .ld-input:focus { border-color: var(--accent); }

  /* hero */
  .ld-hero { position: relative; padding: 150px 0 70px; }
  .ld-hero-grid { display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr); gap: 56px; align-items: center; }
  .ld-badge { display: inline-flex; align-items: center; gap: 8px; font-family: var(--f-mono); font-size: 12px; letter-spacing: .16em; color: var(--accent);
    padding: 7px 15px; border-radius: 99px; border: 1px solid var(--accent-soft2); background: var(--accent-soft); }
  .ld-badge i { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: ldBlink 1.6s infinite; }
  .ld-h1 { font-family: var(--f-disp); font-size: clamp(2.8rem, 6.2vw, 5.4rem); line-height: .98; font-weight: 700; letter-spacing: -.045em; margin: 24px 0 22px; }
  .ld-hero-p { max-width: 540px; font-size: 1.14rem; color: var(--dim); line-height: 1.65; margin-bottom: 30px; }
  .ld-hero-canvas { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: .8; }
  .ld-orb { position: absolute; border-radius: 50%; pointer-events: none; animation: ldFloat 9s ease-in-out infinite; }
  @media (max-width: 980px) { .ld-hero-grid { grid-template-columns: 1fr; } .ld-split { grid-template-columns: 1fr; } }

  /* mock window */
  .ld-win { border-radius: 22px; border: 1px solid rgba(255,255,255,.09); background: linear-gradient(180deg, #10141D, #0B0E15); overflow: hidden; }
  .ld-win-bar { display: flex; gap: 8px; padding: 13px 18px; align-items: center; border-bottom: 1px solid var(--line-soft); }
  .ld-win-bar i { width: 10px; height: 10px; border-radius: 50%; opacity: .85; }
  .ld-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: ldDraw 2.4s .3s cubic-bezier(.4,0,.2,1) forwards; }

  /* marquee */
  .ld-marquee { overflow: hidden; border-block: 1px solid var(--line-soft); background: rgba(255,255,255,.015); -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
  .ld-marquee-track { display: flex; gap: 46px; width: max-content; padding: 17px 0; animation: ldMarquee 38s linear infinite; }
  .ld-marquee-track span { font-family: var(--f-mono); font-size: 13px; color: rgba(255,255,255,.42); letter-spacing: .1em; white-space: nowrap; }
  .ld-marquee-track span b { color: var(--accent); font-weight: 500; margin-right: 10px; }

  /* stats */
  .ld-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
  .ld-stat { padding: 34px 24px; border-left: 1px solid var(--line-soft); }
  .ld-stat:first-child { border-left: none; }
  .ld-stat .n { font-family: var(--f-mono); font-size: clamp(2rem, 3.4vw, 2.8rem); font-weight: 700; letter-spacing: -.03em; color: var(--accent); }
  .ld-stat .l { color: var(--dim); font-size: 14px; margin-top: 6px; }

  /* import demo */
  .ld-drop { border: 1.5px dashed rgba(255,255,255,.18); border-radius: 18px; padding: 34px 20px; text-align: center; background: rgba(255,255,255,.02); transition: all .3s; }
  .ld-drop:hover { border-color: var(--accent); background: var(--accent-soft); }
  .ld-file { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,.03); font-family: var(--f-mono); font-size: 12.5px; }
  .ld-bar { height: 5px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden; }
  .ld-bar > i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); box-shadow: 0 0 12px var(--accent); }
  .ld-rows { font-family: var(--f-mono); font-size: 10.5px; color: var(--faint); line-height: 1.75; height: 88px; overflow: hidden; }
  .ld-insight { display: flex; gap: 12px; padding: 14px 16px; border-radius: 14px; border: 1px solid var(--line); background: rgba(255,255,255,.03); animation: ldFadeUp .6s cubic-bezier(.2,.8,.25,1) both; }
  .ld-insight .dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
  .ld-insight b { display: block; font-size: 13px; margin-bottom: 3px; }
  .ld-insight p { color: var(--dim); font-size: 13px; line-height: 1.5; }

  /* edge explorer bars */
  .ld-eb { display: grid; grid-template-columns: 82px 1fr 96px; align-items: center; gap: 12px; padding: 9px 0; font-size: 13px; position: relative; }
  .ld-eb-track { position: relative; height: 22px; }
  .ld-eb-track::before { content: ''; position: absolute; left: 50%; top: -4px; bottom: -4px; width: 1px; background: rgba(255,255,255,.14); }
  .ld-eb-fill { position: absolute; top: 3px; bottom: 3px; border-radius: 5px; transition: width .7s cubic-bezier(.2,.8,.25,1), background .3s; }
  .ld-eb-val { font-family: var(--f-mono); font-size: 12.5px; text-align: right; font-weight: 600; }
  .ld-eb-tip { position: absolute; right: 0; top: -2px; transform: translateY(-100%); padding: 8px 12px; border-radius: 9px; background: rgba(15,18,25,.96); border: 1px solid var(--accent-soft2);
    font-family: var(--f-mono); font-size: 11px; white-space: nowrap; z-index: 5; pointer-events: none; box-shadow: 0 10px 30px -10px #000; }

  /* dashboard panel grid */
  .ld-pgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; grid-auto-flow: dense; }
  .ld-pcell { border-radius: 14px; border: 1px solid var(--line-soft); background: rgba(255,255,255,.025); padding: 13px 14px; min-height: 118px; animation: ldPop .45s cubic-bezier(.2,.8,.25,1) both; display: flex; flex-direction: column; }
  .ld-pcell .t { font-family: var(--f-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); margin-bottom: 9px; display: flex; justify-content: space-between; }
  .ld-pcell .t::after { content: '⋮⋮'; letter-spacing: -2px; opacity: .6; }
  .s2 { grid-column: span 2; } .s4 { grid-column: span 4; }
  @media (max-width: 860px) { .ld-pgrid { grid-template-columns: repeat(2, 1fr); } .s4 { grid-column: span 2; } }

  /* calendar mini */
  .ld-cal7 { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; flex: 1; }
  .ld-cal7 i { border-radius: 4px; min-height: 12px; }
  .ld-bars { display: flex; align-items: flex-end; gap: 4px; flex: 1; min-height: 50px; }
  .ld-bars i { flex: 1; border-radius: 3px 3px 0 0; }

  /* bento */
  .ld-bento { display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; }
  .b2 { grid-column: span 2; } .b3 { grid-column: span 3; } .b4 { grid-column: span 4; } .b6 { grid-column: span 6; }
  @media (max-width: 1000px) { .b2, .b3, .b4 { grid-column: span 6; } }

  .ld-ev { display: grid; grid-template-columns: 58px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 11px; border: 1px solid var(--line-soft); background: rgba(255,255,255,.025); font-size: 13px; }
  .ld-imp { display: inline-flex; gap: 2px; } .ld-imp i { width: 5px; height: 11px; border-radius: 2px; background: rgba(255,255,255,.14); } .ld-imp i.on { background: var(--loss); }
  .ld-imp.med i.on { background: var(--accent); }

  .ld-lvl { display: flex; align-items: center; gap: 10px; font-family: var(--f-mono); font-size: 11.5px; padding: 3px 0; }
  .ld-lvl i { flex: 1; height: 0; border-top: 1.5px dashed; opacity: .75; }

  /* mave */
  .ld-msg { max-width: 88%; padding: 11px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.55; animation: ldFadeUp .5s cubic-bezier(.2,.8,.25,1) both; }
  .ld-msg.u { align-self: flex-end; background: var(--accent-soft); border: 1px solid var(--accent-soft2); border-bottom-right-radius: 4px; }
  .ld-msg.a { align-self: flex-start; background: rgba(255,255,255,.05); border: 1px solid var(--line); border-bottom-left-radius: 4px; color: rgba(255,255,255,.85); }
  .ld-prov { font-family: var(--f-mono); font-size: 11.5px; padding: 6px 11px; border-radius: 8px; border: 1px solid var(--line); color: rgba(255,255,255,.5); background: rgba(255,255,255,.025); transition: all .3s; display: inline-flex; gap: 6px; align-items: center; }
  .ld-prov.on { color: #fff; border-color: var(--accent); background: var(--accent-soft); box-shadow: 0 0 18px -4px var(--accent); }
  .ld-prov.dead { color: var(--loss); border-color: rgba(255,92,92,.35); text-decoration: line-through; opacity: .75; }

  /* security + pricing + faq */
  .ld-sec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
  .ld-plan { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; max-width: 980px; margin: 0 auto; }
  @media (max-width: 800px) { .ld-plan { grid-template-columns: 1fr; } }
  .ld-li { display: flex; gap: 11px; align-items: flex-start; font-size: 14.5px; color: rgba(255,255,255,.78); padding: 7px 0; line-height: 1.45; }
  .ld-li svg { flex-shrink: 0; margin-top: 3px; }
  .ld-faq { border: 1px solid var(--line); border-radius: 16px; background: rgba(255,255,255,.022); padding: 6px 22px; margin-bottom: 12px; transition: all .35s cubic-bezier(.2,.8,.25,1); }
  .ld-faq.open { border-color: var(--accent-soft2); background: linear-gradient(180deg, var(--accent-soft), rgba(255,255,255,.012)); }
  .ld-faq button { display: flex; justify-content: space-between; align-items: center; width: 100%; text-align: left; background: none; border: none; color: rgba(255,255,255,.92); font-size: 15.5px; font-weight: 600; padding: 15px 0; gap: 16px; }
  .ld-faq .pm { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--accent-soft2); color: var(--accent); display: inline-flex; align-items: center; justify-content: center; font-family: var(--f-mono); font-size: 16px; transition: transform .35s; }
  .ld-faq.open .pm { transform: rotate(45deg); }
  .ld-faq .a { color: var(--dim); font-size: 14.5px; line-height: 1.7; padding: 0 0 18px; animation: ldFadeUp .4s cubic-bezier(.2,.8,.25,1); }

  /* cta + footer */
  .ld-cta { text-align: center; padding: 76px 30px; border-radius: 30px; position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,.1); }
  .ld-foot { border-top: 1px solid var(--line-soft); padding: 38px 0; color: rgba(255,255,255,.45); font-family: var(--f-mono); font-size: 12.5px; background: rgba(255,255,255,.012); }
  .ld-foot a { color: rgba(255,255,255,.55); text-decoration: none; transition: color .2s; } .ld-foot a:hover { color: #fff; }

  /* command palette + accent picker */
  .ld-cmd-overlay { position: fixed; inset: 0; z-index: 300; background: rgba(4,6,9,.7); backdrop-filter: blur(12px); display: flex; align-items: flex-start; justify-content: center; padding-top: 14vh; animation: ldFadeIn .18s ease; }
  .ld-cmd { width: 560px; max-width: 92vw; background: linear-gradient(180deg, #12161F, #0C1017); border: 1px solid rgba(255,255,255,.1); border-radius: 18px; overflow: hidden; box-shadow: 0 40px 100px -30px rgba(0,0,0,.9), 0 0 0 1px var(--accent-soft); animation: ldCmdIn .28s cubic-bezier(.2,.8,.25,1); }
  .ld-cmd-input { width: 100%; padding: 20px 22px; background: transparent; border: none; outline: none; color: #fff; font-size: 16px; font-family: inherit; border-bottom: 1px solid rgba(255,255,255,.06); }
  .ld-cmd-input::placeholder { color: rgba(255,255,255,.35); }
  .ld-cmd-list { max-height: 340px; overflow-y: auto; padding: 8px; }
  .ld-cmd-item { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 12px; transition: background .15s; color: rgba(255,255,255,.8); }
  .ld-cmd-item.is-active { background: var(--accent-soft); color: #fff; }
  .ld-cmd-item svg { color: var(--accent); flex-shrink: 0; }
  .ld-cmd-hint { margin-left: auto; font-family: var(--f-mono); font-size: 11px; color: rgba(255,255,255,.4); }
  .ld-accent-wrap { position: fixed; bottom: 24px; right: 24px; z-index: 90; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
  .ld-accent-toggle { width: 46px; height: 46px; border-radius: 50%; border: 1px solid rgba(255,255,255,.15); background: rgba(15,18,25,.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; color: var(--accent); box-shadow: 0 12px 30px -10px rgba(0,0,0,.8), 0 0 0 1px var(--accent-soft); transition: transform .3s; }
  .ld-accent-toggle:hover { transform: rotate(90deg) scale(1.06); }
  .ld-accent-panel { background: rgba(15,18,25,.92); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,.12); border-radius: 16px; padding: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; animation: ldCmdIn .22s cubic-bezier(.2,.8,.25,1); }
  .ld-swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; transition: transform .25s, border-color .2s; }
  .ld-swatch:hover { transform: scale(1.15); } .ld-swatch.on { border-color: #fff; }

  /* globe */
  .ld-mer { transform-box: fill-box; transform-origin: center; animation: ldMer 7s linear infinite; }

  /* keyframes */
  @keyframes ldFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
  @keyframes ldPulse { 0%,100% { transform: scale(1); opacity: .85 } 50% { transform: scale(1.5); opacity: 1 } }
  @keyframes ldBlink { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
  @keyframes ldShine { 0%,100% { transform: translateX(-130%) skewX(-18deg) } 55% { transform: translateX(230%) skewX(-18deg) } }
  @keyframes ldDraw { to { stroke-dashoffset: 0 } }
  @keyframes ldGrad { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
  @keyframes ldFadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
  @keyframes ldFadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes ldPop { from { opacity: 0; transform: scale(.92) } to { opacity: 1; transform: none } }
  @keyframes ldCmdIn { from { opacity: 0; transform: translateY(-12px) scale(.97) } to { opacity: 1; transform: none } }
  @keyframes ldSpin { to { transform: rotate(360deg) } }
  @keyframes ldMarquee { to { transform: translateX(-50%) } }
  @keyframes ldMer { 0%,100% { transform: scaleX(1) } 50% { transform: scaleX(.04) } }

  @media (prefers-reduced-motion: reduce) {
    .ld-reveal { opacity: 1 !important; transform: none !important; }
    .ld-root *, .ld-root *::after, .ld-root *::before { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition: none !important; }
    .ld-draw { stroke-dashoffset: 0; }
  }
`;

/* ---------- icons ---------- */
const ICONS = {
  chart: <path d="M3 17 C8 14 11 8 16 9 20 5 21 4 22 3" />,
  bolt: <path d="M13 2 L6 12 h5 l-1 8 7 -10 h-5 z" />,
  book: <><path d="M5 4 h6 v14 H5 z" /><path d="M14 5 c-.5 4-1 8-1 12" /></>,
  gear: <g><circle cx="11" cy="11" r="4" /><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.6 4.6l1.4 1.4M16 16l1.4 1.4M17.4 4.6L16 6M6 16l-1.4 1.4" /></g>,
  pulse: <path d="M1 11 h5 l2 -6 l3 12 l2.5 -6 h6.5" />,
  shield: <path d="M11 2 L4 5 v6 c0 5 3.5 8.2 7 9.5 3.5 -1.3 7 -4.5 7 -9.5 V5 z" />,
  lock: <g><rect x="4" y="9" width="14" height="10" rx="2" /><path d="M7 9V6a4 4 0 0 1 8 0v3" /></g>,
  key: <g><circle cx="7" cy="14" r="3.5" /><path d="M10 12l9-9M15 7l2 2M13 9l2 2" /></g>,
  mail: <g><rect x="3" y="5" width="16" height="12" rx="2" /><path d="M3 7l8 6 8-6" /></g>,
  user: <g><circle cx="11" cy="8" r="3.5" /><path d="M4 19c1-4 4-5.5 7-5.5s6 1.5 7 5.5" /></g>,
  ban: <g><circle cx="11" cy="11" r="8" /><path d="M5.5 5.5l11 11" /></g>,
  check: <path d="M4 11.5l4.5 4.5L18 6" />,
  chat: <path d="M4 5h14v9H9l-4 3.5V14H4z" />,
  grid: <g><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="12" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="12" width="7" height="7" rx="1.5" /><rect x="12" y="12" width="7" height="7" rx="1.5" /></g>,
  arrow: <path d="M4 11h13M12 5l6 6-6 6" />,
  top: <path d="M11 18V5M5 11l6-6 6 6" />,
};

function Icon({ name, size = 22, sw = 1.9, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      {ICONS[name]}
    </svg>
  );
}

/* ---------- global-effect components ---------- */
function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my, raf = 0;
    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      const hot = e.target.closest?.('a, button, input, select, .ld-hover, [role="button"]');
      ringRef.current?.classList.toggle('is-hot', !!hot);
    };
    const loop = () => {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      if (dotRef.current) dotRef.current.style.transform = `translate(${mx}px, ${my}px)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);
  return (<><div ref={ringRef} className="ld-cur-ring" aria-hidden /><div ref={dotRef} className="ld-cur-dot" aria-hidden /></>);
}

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);
  return <div className="ld-progress" style={{ width: `${p}%` }} aria-hidden />;
}

function Magnetic({ children, strength = 0.25 }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${(e.clientY - (r.top + r.height / 2)) * strength}px)`;
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={() => { if (ref.current) ref.current.style.transform = ''; }}
      style={{ display: 'inline-block', transition: 'transform .45s cubic-bezier(.2,.8,.25,1)' }}>
      {children}
    </div>
  );
}

function CommandPalette({ open, onClose, items }) {
  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((it) => it.label.toLowerCase().includes(q)) : items;
  }, [query, items]);

  useEffect(() => {
    if (open) { setQuery(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 40); }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((v) => Math.min(v + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((v) => Math.max(v - 1, 0)); }
      if (e.key === 'Enter' && filtered[idx]) { filtered[idx].run(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, idx, filtered, onClose]);

  if (!open) return null;
  return (
    <div className="ld-cmd-overlay" onClick={onClose}>
      <div className="ld-cmd" onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="ld-cmd-input" placeholder="Jump to a section or action…" value={query}
          onChange={(e) => { setQuery(e.target.value); setIdx(0); }} />
        <div className="ld-cmd-list">
          {filtered.length === 0 && <div style={{ padding: '22px 14px', color: 'rgba(255,255,255,.4)', fontSize: 14 }}>No results for “{query}”</div>}
          {filtered.map((it, i) => (
            <div key={it.label} className={`ld-cmd-item ${i === idx ? 'is-active' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => { it.run(); onClose(); }}>
              <Icon name={it.icon} size={16} />
              <span style={{ fontSize: 14.5 }}>{it.label}</span>
              <span className="ld-cmd-hint">{it.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccentPicker({ accent, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ld-accent-wrap">
      {open && (
        <div className="ld-accent-panel">
          {PALETTE.map((p) => (
            <button key={p.name} title={p.name} aria-label={p.name} onClick={() => onChange(p.hex)}
              className={`ld-swatch ${accent === p.hex ? 'on' : ''}`} style={{ background: p.hex, boxShadow: `0 0 14px ${p.hex}` }} />
          ))}
        </div>
      )}
      <button className="ld-accent-toggle" onClick={() => setOpen((v) => !v)} title="Change accent" aria-label="Change accent color">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
    </div>
  );
}

function ParticleCanvas({ accent }) {
  const ref = useRef(null);
  const accentRef = useRef(accent);
  useEffect(() => { accentRef.current = accent; }, [accent]);
  useEffect(() => {
    const canvas = ref.current;
    const wrap = canvas.parentElement;
    let w = 0, h = 0, ctx = null, parts = [], raf = 0;
    const mouse = { x: -9999, y: -9999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = wrap.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(20, Math.min(56, Math.floor(w / 34)));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.4 + 0.8,
      }));
    };
    const onMove = (e) => { const r = wrap.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const tick = () => {
      if (!ctx) { raf = requestAnimationFrame(tick); return; }
      const ac = accentRef.current;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.fillStyle = hexToRgba(ac, 0.6);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      for (let i = 0; i < parts.length; i++) {
        const a = parts[i];
        for (let j = i + 1; j < parts.length; j++) {
          const b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 14400) {
            ctx.strokeStyle = `rgba(125,140,255,${(1 - Math.sqrt(d2) / 120) * 0.16})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const dx = a.x - mouse.x, dy = a.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 28900) {
          ctx.strokeStyle = hexToRgba(ac, (1 - Math.sqrt(d2) / 170) * 0.45);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    resize(); tick();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMove); };
  }, []);
  return <canvas ref={ref} className="ld-hero-canvas" style={{ width: '100%', height: '100%' }} />;
}

function Counter({ end, suffix = '', decimals = 0, duration = 1500 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0, started = false;
    const run = () => {
      if (started) return; started = true;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        el.textContent = (end * (1 - Math.pow(1 - p, 4))).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { run(); io.unobserve(en.target); } }), { threshold: 0.4 });
    io.observe(el);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [end, decimals, duration, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

function RotatingWord({ words = ['Journal', 'Analyse', 'Backtest', 'Simulate'] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % words.length), 2200);
    return () => clearInterval(id);
  }, [words.length]);
  return (
    <span key={i} style={{ display: 'inline-block', animation: 'ldFadeUp .55s cubic-bezier(.2,.8,.25,1)' }}>
      <span className="ld-gradtext">{words[i]}</span>
    </span>
  );
}

function initReveal() {
  const els = Array.from(document.querySelectorAll('.ld-reveal:not(.ld-inited)'));
  els.forEach((el) => el.classList.add('ld-inited'));
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('ld-visible')); return; }
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('ld-visible'); io.unobserve(en.target); } }), { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  els.forEach((el) => io.observe(el));
}

function onTilt(e) {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
  el.style.transform = `perspective(1100px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-4px)`;
}
const offTilt = (e) => { e.currentTarget.style.transform = ''; };

function SessionClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const h = et.getHours(), m = et.getMinutes(), day = et.getDay();
  const isOpen = day !== 0 && day !== 6 && ((h === 9 && m >= 30) || (h > 9 && h < 16));
  return (
    <span className="ld-mono ld-hide-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'rgba(255,255,255,.55)', padding: '5px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(255,255,255,.025)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: isOpen ? '#22c55e' : 'rgba(255,255,255,.25)', boxShadow: isOpen ? '0 0 10px #22c55e' : 'none', animation: isOpen ? 'ldPulse 1.4s infinite' : 'none' }} />
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')} ET · {isOpen ? 'OPEN' : 'CLOSED'}
    </span>
  );
}

/* ---------- reusable chart ---------- */
function EquityChart({ curve, dd, height = 200, accent, draw = false, strokeW = 2.6 }) {
  const W = 800;
  const geo = useMemo(() => {
    if (!curve || curve.length < 2) return null;
    const mn = Math.min(...curve, 0), mx = Math.max(...curve, 1), rg = mx - mn || 1, pad = 14;
    const X = (i) => (i / (curve.length - 1)) * W;
    const Y = (v) => height - pad - ((v - mn) / rg) * (height - pad * 2);
    const line = curve.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    const ddMin = dd ? Math.min(...dd, -0.5) : -1;
    const ddPath = dd ? dd.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${(v / ddMin * 38).toFixed(1)}`).join(' ') : '';
    return { line, area: `${line} L${W} ${height} L0 ${height} Z`, zero: Y(0), last: { x: X(curve.length - 1), y: Y(curve[curve.length - 1]) }, ddPath };
  }, [curve, dd, height]);
  const gid = useMemo(() => `eg${Math.random().toString(36).slice(2, 8)}`, []);
  if (!geo) return <div style={{ height }} />;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={accent} stopOpacity=".3" /><stop offset="1" stopColor={accent} stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={height * f} y2={height * f} stroke="rgba(255,255,255,.05)" />)}
        <line x1="0" x2={W} y1={geo.zero} y2={geo.zero} stroke="rgba(255,255,255,.14)" strokeDasharray="4 5" />
        <path d={geo.area} fill={`url(#${gid})`} />
        <path d={geo.line} fill="none" stroke={accent} strokeWidth={strokeW} strokeLinejoin="round" strokeLinecap="round" pathLength={draw ? 1 : undefined}
          className={draw ? 'ld-draw' : undefined} style={{ filter: `drop-shadow(0 0 10px ${hexToRgba(accent, 0.5)})` }} vectorEffect="non-scaling-stroke" />
        <circle cx={geo.last.x} cy={geo.last.y} r="5" fill={accent} style={{ animation: 'ldPulse 1.4s infinite', transformBox: 'fill-box', transformOrigin: 'center' }} />
      </svg>
      {dd && (
        <svg viewBox="0 0 800 40" width="100%" height="34" preserveAspectRatio="none" style={{ display: 'block', marginTop: 4 }}>
          <path d={`${geo.ddPath} L800 0 L0 0 Z`} fill="rgba(255,92,92,.28)" />
          <path d={geo.ddPath} fill="none" stroke={LOSS} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}

/* ---------- hero dashboard ---------- */
function HeroDashboard({ accent }) {
  const [m, setM] = useState(0);
  const [hover, setHover] = useState(null);
  useEffect(() => { const id = setInterval(() => setM((v) => (v + 1) % 6), 1800); return () => clearInterval(id); }, []);
  const S = SAMPLE_STATS;
  const metrics = [
    ['Net P&L', fmtUsd(S.net * RISK_USD), WIN, 'Sum of closed trades at a flat $150 risk per R.'],
    ['Win rate', `${(S.wr * 100).toFixed(1)}%`, WIN, `${S.wins} winners out of ${S.n} trades.`],
    ['Profit factor', S.pf.toFixed(2), '#fff', 'Gross profit divided by gross loss.'],
    ['Expectancy', fmtR(S.exp, 2), accent, 'Average R per trade. The number that decides everything.'],
    ['Max DD', fmtR(S.maxDD), LOSS, 'Deepest peak-to-trough drop in R.'],
    ['Payoff', (S.avgW / S.avgL).toFixed(2), '#22d3ee', 'Average winner divided by average loser.'],
  ];
  return (
    <div className="ld-win ld-tilt" onMouseMove={onTilt} onMouseLeave={offTilt}
      style={{ boxShadow: `0 50px 100px -40px rgba(0,0,0,.95), 0 0 70px -24px ${hexToRgba(accent, 0.35)}`, animation: 'ldFloat 8s ease-in-out infinite' }}>
      <div className="ld-win-bar">
        {['#EF4444', '#F59E0B', '#10B981'].map((c) => <i key={c} style={{ background: c }} />)}
        <span className="ld-mono" style={{ marginLeft: 10, fontSize: 11, color: 'var(--faint)' }}>/journal</span>
        <span style={{ flex: 1 }} />
        <span className="ld-sample">Sample data</span>
      </div>
      <div className="ld-metrics" style={{ padding: '16px 16px 6px' }}>
        {metrics.map(([label, val, color, tip], i) => (
          <div key={label} className={`ld-metric ${i === m ? 'on' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ position: 'relative' }}>
            <div className="ld-label">{label}</div>
            <div className="v" style={{ color }}>{val}</div>
            {hover === i && <div className="ld-eb-tip" style={{ left: 0, right: 'auto', whiteSpace: 'normal', width: 190 }}>{tip}</div>}
          </div>
        ))}
      </div>
      <div style={{ padding: '10px 16px 18px' }}>
        <div className="ld-label" style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>Equity &amp; drawdown · 300 trades</span><span style={{ color: WIN }}>{fmtR(S.net)}</span>
        </div>
        <EquityChart curve={S.curve} dd={S.dd} height={210} accent={accent} draw />
      </div>
    </div>
  );
}

/* ---------- Import → edge demo ---------- */
function ImportDemo({ accent }) {
  const [phase, setPhase] = useState('idle');
  const [rows, setRows] = useState(0);
  useEffect(() => {
    if (phase !== 'parsing') return undefined;
    let raf = 0;
    const t0 = performance.now(), dur = 1900;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      setRows(Math.floor(SAMPLE.length * (1 - Math.pow(1 - p, 2))));
      if (p < 1) raf = requestAnimationFrame(step); else { setRows(SAMPLE.length); setPhase('done'); }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const slice = useMemo(() => SAMPLE.slice(0, rows), [rows]);
  const st = useMemo(() => computeStats(slice), [slice]);
  const sessions = useMemo(() => groupBy(SAMPLE, 'session'), []);
  const leak = useMemo(() => sessions.reduce((a, b) => (b.net < a.net ? b : a)), [sessions]);
  const best = useMemo(() => sessions.reduce((a, b) => (b.exp > a.exp ? b : a)), [sessions]);
  const lastRows = slice.slice(-5).map((t, i) => `${String(rows - 4 + i).padStart(3, '0')} · ${t.day} · ${t.session.padEnd(8)} · ${t.dir.padEnd(5)} · ${fmtR(t.r, 2)}`);

  return (
    <div className="ld-panel ld-reveal">
      <div className="ld-split" style={{ gap: 0 }}>
        <div className="ld-pad" style={{ borderRight: '1px solid var(--line-soft)' }}>
          <div className="ld-eyebrow">Step 1 · Import</div>
          <h3 className="ld-panel-title" style={{ fontSize: '1.6rem' }}>Upload your broker sheet.</h3>
          <p className="ld-panel-copy" style={{ marginBottom: 22 }}>CSV or XLSX, drag and drop. Unknown columns are detected and can be added as custom columns with dropdowns.</p>

          {phase === 'idle' ? (
            <div className="ld-drop">
              <div style={{ color: 'var(--accent)', marginBottom: 12 }}><Icon name="top" size={30} /></div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Drop a broker export here</div>
              <div className="ld-mono" style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 18 }}>.csv · .xlsx</div>
              <button className="ld-btn ld-primary ld-btn-sm" onClick={() => { setRows(0); setPhase('parsing'); }}>Load sample sheet</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="ld-file">
                <span style={{ color: 'var(--accent)' }}><Icon name="book" size={18} /></span>
                <span style={{ flex: 1 }}>nq_broker_export.csv</span>
                <span style={{ color: 'var(--faint)' }}>{rows}/{SAMPLE.length} rows</span>
              </div>
              <div className="ld-bar"><i style={{ width: `${(rows / SAMPLE.length) * 100}%` }} /></div>
              <div className="ld-rows">{lastRows.map((l, i) => <div key={`${rows}-${i}`} style={{ opacity: 0.4 + i * 0.15, whiteSpace: 'pre' }}>{l}</div>)}</div>
              {phase === 'done' && <button className="ld-btn ld-secondary ld-btn-sm" onClick={() => setPhase('idle')}>Reset demo</button>}
            </div>
          )}
          <div className="ld-mono" style={{ marginTop: 18, fontSize: 11, color: 'var(--faint)' }}>Sample data · 300 generated NQ trades</div>
        </div>

        <div className="ld-pad">
          <div className="ld-eyebrow">Step 2 · Your edge</div>
          <div className="ld-metrics" style={{ marginBottom: 14 }}>
            <div className="ld-metric"><div className="ld-label">Net</div><div className="v" style={{ color: st.net >= 0 ? WIN : LOSS }}>{fmtR(st.net)}</div></div>
            <div className="ld-metric"><div className="ld-label">Win rate</div><div className="v">{(st.wr * 100).toFixed(1)}%</div></div>
            <div className="ld-metric"><div className="ld-label">Expectancy</div><div className="v" style={{ color: accent }}>{fmtR(st.exp, 2)}</div></div>
          </div>
          {rows > 1 ? <EquityChart curve={st.curve} height={150} accent={accent} strokeW={2.2} /> : (
            <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--faint)', fontFamily: 'var(--f-mono)', fontSize: 12, border: '1px dashed var(--line)', borderRadius: 14 }}>Equity curve appears here</div>
          )}
          {phase === 'done' && (
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              <div className="ld-insight"><span className="dot" style={{ background: WIN }} />
                <div><b>Strongest edge: {best.key}</b><p>{fmtR(best.exp, 2)} per trade across {best.n} trades, {(best.wr * 100).toFixed(0)}% win rate.</p></div></div>
              <div className="ld-insight" style={{ animationDelay: '.12s' }}><span className="dot" style={{ background: LOSS }} />
                <div><b>Biggest leak: {leak.key}</b><p>{fmtR(leak.net)} ({fmtUsd(leak.net * RISK_USD)}) across {leak.n} trades.</p></div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Edge explorer ---------- */
function EdgeExplorer() {
  const dims = [['session', 'Session'], ['day', 'Weekday'], ['dir', 'Direction'], ['strat', 'Strategy']];
  const [dim, setDim] = useState('session');
  const [hover, setHover] = useState(null);
  const data = useMemo(() => {
    let g;
    if (dim === 'strat') g = groupBy(SAMPLE.map((t) => ({ ...t, strat: STRATS[t.strat].name })), 'strat');
    else g = groupBy(SAMPLE, dim);
    const order = dim === 'session' ? SESSIONS : dim === 'day' ? DAYS : null;
    if (order) g.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    return g;
  }, [dim]);
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.exp)), 0.1);

  const insights = useMemo(() => {
    const sess = groupBy(SAMPLE, 'session');
    const best = sess.filter((s) => s.n >= 15).reduce((a, b) => (b.exp > a.exp ? b : a));
    const leak = sess.reduce((a, b) => (b.net < a.net ? b : a));
    const S = SAMPLE_STATS;
    const wins = SAMPLE.filter((t) => t.r > 0).map((t) => t.r).sort((a, b) => b - a);
    const gw = wins.reduce((a, b) => a + b, 0);
    const top = wins.slice(0, Math.ceil(SAMPLE.length * 0.1)).reduce((a, b) => a + b, 0);
    const holdW = SAMPLE.filter((t) => t.r > 0), holdL = SAMPLE.filter((t) => t.r <= 0);
    const hw = holdW.reduce((a, t) => a + t.hold, 0) / holdW.length;
    const hl = holdL.reduce((a, t) => a + t.hold, 0) / holdL.length;
    return [
      { c: WIN, t: `Strongest edge: ${best.key}`, d: `${fmtR(best.exp, 2)} per trade over ${best.n} trades.` },
      { c: LOSS, t: `Biggest leak: ${leak.key}`, d: `${fmtR(leak.net)} (${fmtUsd(leak.net * RISK_USD)}) across ${leak.n} trades.` },
      { c: '#22D3EE', t: 'Payoff vs win rate', d: `${(S.wr * 100).toFixed(0)}% win rate with a ${(S.avgW / S.avgL).toFixed(2)} payoff ratio.` },
      { c: '#A78BFA', t: 'Holding losers', d: `Losers are held ${(hl / hw).toFixed(1)}× as long as winners (${hl.toFixed(0)}m vs ${hw.toFixed(0)}m).` },
      { c: '#F59E0B', t: 'Concentrated profit', d: `Top 10% of trades produce ${(top / gw * 100).toFixed(0)}% of gross profit.` },
    ];
  }, []);

  return (
    <div className="ld-split" style={{ gridTemplateColumns: '1.15fr 1fr' }}>
      <div className="ld-panel ld-pad ld-reveal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div className="ld-panel-title" style={{ marginBottom: 2 }}>Edge Explorer</div>
            <div className="ld-label">Expectancy per trade · slice by</div>
          </div>
          <span className="ld-sample">Sample data</span>
        </div>
        <div className="ld-chips" style={{ marginBottom: 14 }}>
          {dims.map(([k, l]) => <button key={k} className={`ld-chip ${dim === k ? 'on' : ''}`} onClick={() => setDim(k)}>{l}</button>)}
        </div>
        {data.map((d) => {
          const w = (Math.abs(d.exp) / maxAbs) * 50;
          const pos = d.exp >= 0;
          return (
            <div key={d.key} className="ld-eb" onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)}>
              <span style={{ color: 'rgba(255,255,255,.78)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={d.key}>{d.key}</span>
              <div className="ld-eb-track">
                <div className="ld-eb-fill" style={{ width: `${w}%`, [pos ? 'left' : 'right']: '50%', background: pos ? WIN : LOSS, boxShadow: `0 0 14px -2px ${pos ? WIN : LOSS}` }} />
              </div>
              <span className="ld-eb-val" style={{ color: pos ? WIN : LOSS }}>{fmtR(d.exp, 2)}</span>
              {hover === d.key && <div className="ld-eb-tip">{d.n} trades · {(d.wr * 100).toFixed(0)}% win · net {fmtR(d.net)}</div>}
            </div>
          );
        })}
        <p className="ld-mono" style={{ marginTop: 14, fontSize: 11, color: 'var(--faint)' }}>Also slice by hour, symbol, or any custom column you add.</p>
      </div>
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        {insights.map((it, i) => (
          <div key={it.t} className="ld-insight ld-reveal ld-hover" style={{ transitionDelay: `${i * 70}ms`, animation: 'none' }}>
            <span className="dot" style={{ background: it.c, boxShadow: `0 0 10px ${it.c}` }} />
            <div><b>{it.t}</b><p>{it.d}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- dashboard grid showcase ---------- */
function MiniViz({ kind }) {
  const S = SAMPLE_STATS;
  const r = useMemo(() => rng(kind.length * 977 + kind.charCodeAt(0)), [kind]);
  const vals = useMemo(() => Array.from({ length: 35 }, () => r()), [r]);
  const sp = (arr, h = 44, w = 200) => {
    const mn = Math.min(...arr), mx = Math.max(...arr), rg = mx - mn || 1;
    return arr.map((v, i) => `${i ? 'L' : 'M'}${(i / (arr.length - 1)) * w} ${h - ((v - mn) / rg) * (h - 6) - 3}`).join(' ');
  };
  switch (kind) {
    case 'ribbon':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {[['Net', fmtR(S.net, 0)], ['Win', `${(S.wr * 100).toFixed(0)}%`], ['PF', S.pf.toFixed(2)], ['Exp', fmtR(S.exp, 2)], ['Max DD', fmtR(S.maxDD, 0)], ['Streak', 'W4']].map(([l, v]) => (
            <div key={l}><div className="ld-label" style={{ fontSize: 9 }}>{l}</div><div className="ld-mono" style={{ fontWeight: 700, fontSize: 14 }}>{v}</div></div>
          ))}
        </div>
      );
    case 'equity': {
      const c = S.curve.filter((_, i) => i % 6 === 0);
      return <svg viewBox="0 0 200 44" width="100%" height="64" preserveAspectRatio="none"><path d={sp(c)} fill="none" stroke="var(--accent)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg>;
    }
    case 'calendar':
      return <div className="ld-cal7">{vals.map((v, i) => <i key={i} style={{ background: v < 0.12 ? 'rgba(255,255,255,.05)' : v < 0.5 ? hexToRgba(LOSS, 0.2 + v * 0.5) : hexToRgba(WIN, 0.2 + v * 0.55) }} />)}</div>;
    case 'monthly':
      return <div className="ld-bars">{vals.slice(0, 9).map((v, i) => <i key={i} style={{ height: `${25 + v * 70}%`, background: v > 0.3 ? WIN : LOSS, opacity: 0.85 }} />)}</div>;
    case 'rolling':
      return <svg viewBox="0 0 200 44" width="100%" height="52" preserveAspectRatio="none"><path d={sp(vals.slice(0, 20).map((v, i) => v + i * 0.02))} fill="none" stroke="#22D3EE" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg>;
    case 'hist':
      return <div className="ld-bars">{[2, 4, 8, 14, 22, 30, 26, 18, 12, 8, 5, 3].map((h, i) => <i key={i} style={{ height: `${h * 3}%`, background: i < 4 ? LOSS : WIN, opacity: 0.8 }} />)}</div>;
    case 'heat':
      return <div className="ld-cal7" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>{vals.slice(0, 30).map((v, i) => <i key={i} style={{ background: hexToRgba(v > 0.45 ? WIN : LOSS, 0.15 + Math.abs(v - 0.45) * 1.1) }} />)}</div>;
    case 'cats':
      return <div style={{ display: 'grid', gap: 7 }}>{['Session', 'Weekday', 'Side'].map((l, i) => <div key={l} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="ld-label" style={{ width: 50, fontSize: 9 }}>{l}</span><div className="ld-bar" style={{ flex: 1 }}><i style={{ width: `${40 + vals[i] * 55}%` }} /></div></div>)}</div>;
    case 'rr':
      return <div className="ld-bars">{['1:1', '1:2', '1:3', '1:4'].map((l, i) => <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}><i style={{ width: '100%', height: `${30 + [0.3, 0.75, 1, 0.6][i] * 60}%`, background: 'var(--accent)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} /><span className="ld-mono" style={{ fontSize: 9, color: 'var(--faint)' }}>{l}</span></div>)}</div>;
    case 'ratios':
      return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{[['Sharpe', '2.1'], ['Sortino', '3.4'], ['Calmar', '4.2'], ['Kelly', '14%']].map(([l, v]) => <div key={l}><div className="ld-label" style={{ fontSize: 9 }}>{l}</div><div className="ld-mono" style={{ fontWeight: 700, fontSize: 15, color: '#22D3EE' }}>{v}</div></div>)}</div>;
    case 'habits': {
      const w = SAMPLE.filter((t) => t.r > 0), l = SAMPLE.filter((t) => t.r <= 0);
      return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{[['Avg hold W', `${(w.reduce((a, t) => a + t.hold, 0) / w.length).toFixed(0)}m`], ['Avg hold L', `${(l.reduce((a, t) => a + t.hold, 0) / l.length).toFixed(0)}m`], ['Payoff', (S.avgW / S.avgL).toFixed(2)], ['Best', fmtR(Math.max(...SAMPLE.map((t) => t.r)), 1)]].map(([k, v]) => <div key={k}><div className="ld-label" style={{ fontSize: 9 }}>{k}</div><div className="ld-mono" style={{ fontWeight: 700, fontSize: 14 }}>{v}</div></div>)}</div>;
    }
    default:
      return <div style={{ display: 'grid', gap: 6 }}>{STRATS.map((s, i) => <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} /><span style={{ flex: 1, color: 'rgba(255,255,255,.7)' }}>{s.name}</span><span className="ld-mono" style={{ color: i === 2 ? LOSS : WIN }}>{i === 2 ? '−' : '+'}{(8 + vals[i] * 20).toFixed(0)}R</span></div>)}</div>;
  }
}

const PANELS = [
  { id: 'kpi', label: 'Key metrics ribbon', kind: 'ribbon', span: 's4' },
  { id: 'hero', label: 'Equity & drawdown', kind: 'equity', span: 's2' },
  { id: 'cal', label: 'P&L calendar', kind: 'calendar', span: 's2' },
  { id: 'monthly', label: 'Monthly performance', kind: 'monthly' },
  { id: 'rolling', label: 'Rolling expectancy', kind: 'rolling' },
  { id: 'dist', label: 'Trade distribution', kind: 'hist' },
  { id: 'time', label: 'Edge by time', kind: 'heat' },
  { id: 'cats', label: 'Session / weekday / side', kind: 'cats' },
  { id: 'rr', label: 'R:R sweep', kind: 'rr' },
  { id: 'adv', label: 'Risk-adjusted ratios', kind: 'ratios' },
  { id: 'habits', label: 'Habits & payoff', kind: 'habits' },
  { id: 'strat', label: 'Strategies', kind: 'strat' },
];
const PRESETS = [
  ['Daily', ['kpi', 'hero', 'cal', 'habits', 'strat', 'cats']],
  ['Review', ['kpi', 'hero', 'monthly', 'rolling', 'dist', 'time', 'adv', 'rr']],
  ['Everything', PANELS.map((p) => p.id)],
];

function DashboardShowcase() {
  const [on, setOn] = useState(() => new Set(PRESETS[0][1]));
  const [preset, setPreset] = useState(0);
  const toggle = (id) => { setPreset(-1); setOn((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  return (
    <div className="ld-panel ld-reveal">
      <div className="ld-pad" style={{ paddingBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div className="ld-chips">
            {PRESETS.map(([n, ids], i) => <button key={n} className={`ld-chip ${preset === i ? 'on' : ''}`} onClick={() => { setPreset(i); setOn(new Set(ids)); }}>Layout {i + 1} · {n}</button>)}
          </div>
          <span className="ld-sample">Sample data · tap panels to hide or show</span>
        </div>
        <div className="ld-chips" style={{ marginBottom: 20 }}>
          {PANELS.map((p) => <button key={p.id} className={`ld-chip ${on.has(p.id) ? 'on' : ''}`} style={{ fontSize: 11 }} onClick={() => toggle(p.id)}>{p.label}</button>)}
        </div>
        <div className="ld-pgrid">
          {PANELS.filter((p) => on.has(p.id)).map((p) => (
            <div key={p.id} className={`ld-pcell ${p.span || ''}`}>
              <div className="t">{p.label}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><MiniViz kind={p.kind} /></div>
            </div>
          ))}
        </div>
        {on.size === 0 && <div style={{ textAlign: 'center', padding: 36, color: 'var(--faint)', fontFamily: 'var(--f-mono)', fontSize: 12 }}>Every panel hidden. Pick one above.</div>}
      </div>
    </div>
  );
}

/* ---------- R:R simulator ---------- */
function genEquity(winRate, rr, n, seed) {
  const r = rng(seed * 7919 + 13);
  const pts = [0];
  let eq = 0;
  for (let i = 0; i < n; i++) { eq += r() < winRate ? rr : -1; pts.push(eq); }
  return pts;
}

function RrSimulator({ accent }) {
  const [wr, setWr] = useState(55);
  const [rr, setRr] = useState(1.8);
  const [n, setN] = useState(200);
  const [seed, setSeed] = useState(7);
  const stats = useMemo(() => {
    const p = wr / 100;
    return { exp: p * rr - (1 - p), pf: (p * rr) / Math.max(1e-4, 1 - p), kelly: p - (1 - p) / Math.max(1e-4, rr) };
  }, [wr, rr]);
  const curve = useMemo(() => genEquity(wr / 100, rr, n, seed), [wr, rr, n, seed]);
  const st = useMemo(() => computeStats(curve.slice(1).map((_, i) => ({ r: curve[i + 1] - curve[i] }))), [curve]);
  const col = stats.exp >= 0 ? WIN : LOSS;
  return (
    <div className="ld-panel ld-reveal" style={{ boxShadow: `0 50px 100px -70px ${hexToRgba(accent, 0.6)}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr' }} className="ld-split-sim">
        <div className="ld-pad" style={{ borderRight: '1px solid var(--line-soft)' }}>
          <div className="ld-eyebrow">Live simulator</div>
          <h3 className="ld-panel-title" style={{ fontSize: '1.45rem', marginBottom: 24 }}>Test the math of your edge</h3>
          <div className="ld-slide"><div className="ld-slide-top"><span>Win rate</span><b>{wr}%</b></div><input className="ld-range" type="range" min="20" max="85" value={wr} onChange={(e) => setWr(+e.target.value)} /></div>
          <div className="ld-slide"><div className="ld-slide-top"><span>Risk : Reward</span><b>{rr.toFixed(1)}R</b></div><input className="ld-range" type="range" min="0.5" max="5" step="0.1" value={rr} onChange={(e) => setRr(+e.target.value)} /></div>
          <div className="ld-slide"><div className="ld-slide-top"><span>Sample size</span><b>{n} trades</b></div><input className="ld-range" type="range" min="50" max="500" step="10" value={n} onChange={(e) => setN(+e.target.value)} /></div>
          <button className="ld-btn ld-secondary ld-btn-sm" style={{ width: '100%' }} onClick={() => setSeed((s) => s + 1)}>
            <Icon name="gear" size={14} /> Reroll sequence
          </button>
        </div>
        <div className="ld-pad">
          <div className="ld-metrics" style={{ marginBottom: 22 }}>
            <div><div className="ld-label">Expectancy</div><div className="ld-big" style={{ color: col, marginTop: 6 }}>{fmtR(stats.exp, 2)}</div><div className="ld-mono" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 6 }}>{fmtUsd(stats.exp * 100)} per $100 risked</div></div>
            <div><div className="ld-label">Profit factor</div><div className="ld-big" style={{ marginTop: 6 }}>{stats.pf.toFixed(2)}</div><div className="ld-mono" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 6 }}>{stats.pf >= 2 ? 'Elite' : stats.pf >= 1.5 ? 'Solid' : stats.pf >= 1 ? 'Marginal' : 'Negative'}</div></div>
            <div><div className="ld-label">Kelly</div><div className="ld-big" style={{ color: stats.kelly >= 0 ? '#22d3ee' : LOSS, marginTop: 6 }}>{(stats.kelly * 100).toFixed(1)}%</div><div className="ld-mono" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 6 }}>{stats.kelly >= 0 ? 'of bankroll per trade' : 'do not trade this'}</div></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }} className="ld-mono">
            <span className="ld-label">Simulated equity</span>
            <span style={{ fontSize: 12.5 }}><span style={{ color: 'var(--faint)' }}>End </span><b style={{ color: col }}>{fmtR(st.net)}</b><span style={{ color: 'var(--faint)', marginLeft: 14 }}>Max DD </span><b style={{ color: LOSS }}>{fmtR(st.maxDD)}</b></span>
          </div>
          <EquityChart curve={curve} height={210} accent={accent} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Monte Carlo ---------- */
const MC_METHODS = [
  ['perm', 'Permutation', 'Same trades, shuffled order. Total R never changes, so this isolates drawdown risk.'],
  ['boot', 'Bootstrap', 'Trades drawn with replacement. Final R varies, so you see the range of outcomes.'],
  ['block', 'Block bootstrap', 'Blocks of 5 consecutive trades. Keeps streaks and clustering in the sample.'],
];

function runMC(method, runs, seed) {
  const r = rng(seed);
  const src = SAMPLE.map((t) => t.r);
  const n = src.length;
  const finals = new Float32Array(runs);
  const dds = new Float32Array(runs);
  const keep = 300;
  const paths = [];
  const buf = new Float32Array(n);
  for (let k = 0; k < runs; k++) {
    if (method === 'perm') {
      for (let i = 0; i < n; i++) buf[i] = src[i];
      for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = buf[i]; buf[i] = buf[j]; buf[j] = t; }
    } else if (method === 'boot') {
      for (let i = 0; i < n; i++) buf[i] = src[Math.floor(r() * n)];
    } else {
      let i = 0;
      while (i < n) { const s = Math.floor(r() * n); for (let b = 0; b < 5 && i < n; b++, i++) buf[i] = src[(s + b) % n]; }
    }
    let eq = 0, peak = 0, dd = 0;
    const path = k < keep ? new Float32Array(n + 1) : null;
    for (let i = 0; i < n; i++) {
      eq += buf[i];
      if (eq > peak) peak = eq;
      if (eq - peak < dd) dd = eq - peak;
      if (path) path[i + 1] = eq;
    }
    finals[k] = eq; dds[k] = -dd;
    if (path) paths.push(path);
  }
  const sf = Float32Array.from(finals).sort();
  const sd = Float32Array.from(dds).sort();
  const q = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
  const p5 = [], p95 = [];
  for (let i = 0; i <= n; i++) {
    const col = paths.map((p) => p[i]).sort((a, b) => a - b);
    p5.push(col[Math.floor(col.length * 0.05)]); p95.push(col[Math.floor(col.length * 0.95)]);
  }
  const maxDDv = sd[sd.length - 1] || 1;
  const bins = Array(20).fill(0);
  for (const v of dds) bins[Math.min(19, Math.floor((v / (maxDDv + 1e-6)) * 20))]++;
  return { paths, p5, p95, dds: sd, finals: sf, med: q(sf, 0.5), lo: q(sf, 0.05), hi: q(sf, 0.95), medDD: q(sd, 0.5), bins, maxDDv, n };
}

function MonteCarlo({ accent }) {
  const [method, setMethod] = useState('boot');
  const [runs, setRuns] = useState(5000);
  const [seed, setSeed] = useState(4217);
  const [limit, setLimit] = useState(12);
  const res = useMemo(() => runMC(method, runs, seed), [method, runs, seed]);
  const W = 800, H = 250;
  const geo = useMemo(() => {
    const all = [...res.p5, ...res.p95, ...res.paths.slice(0, 50).flatMap((p) => Array.from(p))];
    const mn = Math.min(...all, 0), mx = Math.max(...all, 1), rg = mx - mn || 1;
    const Y = (v) => H - ((v - mn) / rg) * (H - 24) - 12;
    const X = (i) => (i / res.n) * W;
    const mk = (arr) => Array.from(arr).map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
    return { lines: res.paths.slice(0, 50).map(mk), p5: mk(res.p5), p95: mk(res.p95), zero: Y(0) };
  }, [res]);
  const probDD = useMemo(() => { let c = 0; for (const v of res.dds) if (v >= limit) c++; return c / res.dds.length; }, [res, limit]);
  const probProfit = useMemo(() => { let c = 0; for (const v of res.finals) if (v > 0) c++; return c / res.finals.length; }, [res]);
  const bm = Math.max(...res.bins, 1);
  const limitX = Math.min(100, (limit / (res.maxDDv + 1e-6)) * 100);

  return (
    <div className="ld-panel ld-pad ld-reveal">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 22 }}>
        <div>
          <div className="ld-eyebrow">Monte Carlo · Pro</div>
          <h3 className="ld-panel-title" style={{ fontSize: '1.6rem' }}>{runs.toLocaleString('en-US')} possible futures. Pick your method.</h3>
          <p className="ld-panel-copy" style={{ maxWidth: 560 }}>{MC_METHODS.find((m) => m[0] === method)[2]}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="ld-mono" style={{ fontSize: 11.5, color: 'var(--faint)' }}>seed {seed}</span>
          <button className="ld-btn ld-primary ld-btn-sm" onClick={() => setSeed((s) => s + 1)}>Re-run</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="ld-chips">{MC_METHODS.map(([k, l]) => <button key={k} className={`ld-chip ${method === k ? 'on' : ''}`} onClick={() => setMethod(k)}>{l}</button>)}</div>
        <div className="ld-chips">{[1000, 5000, 10000].map((v) => <button key={v} className={`ld-chip ${runs === v ? 'on' : ''}`} onClick={() => setRuns(v)}>{v.toLocaleString('en-US')} runs</button>)}</div>
      </div>
      <div className="ld-metrics" style={{ marginBottom: 20 }}>
        {[['Median final', fmtR(res.med), res.med >= 0 ? WIN : LOSS], ['5th percentile', fmtR(res.lo), LOSS], ['95th percentile', fmtR(res.hi), WIN],
          ['P(profit)', `${(probProfit * 100).toFixed(1)}%`, '#fff'], [`P(DD ≥ ${limit}R)`, `${(probDD * 100).toFixed(1)}%`, probDD > 0.25 ? LOSS : accent], ['Median max DD', `−${res.medDD.toFixed(1)}R`, LOSS]].map(([l, v, c]) => (
          <div key={l} className="ld-metric"><div className="ld-label">{l}</div><div className="v" style={{ color: c }}>{v}</div></div>
        ))}
      </div>
      <div className="ld-split" style={{ gridTemplateColumns: '1.7fr 1fr', gap: 20 }}>
        <div>
          <div className="ld-label" style={{ marginBottom: 6 }}>Equity paths · 5th–95th percentile cone</div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="240" preserveAspectRatio="none" style={{ display: 'block' }}>
            {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(255,255,255,.05)" />)}
            <line x1="0" x2={W} y1={geo.zero} y2={geo.zero} stroke="rgba(255,255,255,.16)" strokeDasharray="4 5" />
            {geo.lines.map((d, i) => <path key={`${method}-${seed}-${i}`} d={d} fill="none" stroke={hexToRgba(accent, 0.15)} strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            <path d={geo.p95} fill="none" stroke={hexToRgba(accent, 0.85)} strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
            <path d={geo.p5} fill="none" stroke="rgba(255,92,92,.85)" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <div>
          <div className="ld-label" style={{ marginBottom: 6 }}>Max drawdown distribution</div>
          <div style={{ position: 'relative', height: 240, display: 'flex', alignItems: 'flex-end', gap: 3, paddingBottom: 18 }}>
            {res.bins.map((b, i) => <i key={i} style={{ flex: 1, height: `${(b / bm) * 100}%`, minHeight: 2, background: ((i + 0.5) / 20) * 100 >= limitX ? LOSS : hexToRgba(accent, 0.7), borderRadius: '3px 3px 0 0', transition: 'height .5s' }} />)}
            <div style={{ position: 'absolute', left: `${limitX}%`, top: 0, bottom: 18, width: 1.5, background: '#fff', opacity: 0.6 }} />
            <span className="ld-mono" style={{ position: 'absolute', bottom: 0, left: 0, fontSize: 10, color: 'var(--faint)' }}>0R</span>
            <span className="ld-mono" style={{ position: 'absolute', bottom: 0, right: 0, fontSize: 10, color: 'var(--faint)' }}>−{res.maxDDv.toFixed(0)}R</span>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 360, marginTop: 14 }}>
        <div className="ld-slide-top"><span>Drawdown limit</span><b>{limit}R</b></div>
        <input className="ld-range" type="range" min="4" max="30" value={limit} onChange={(e) => setLimit(+e.target.value)} />
      </div>
      <p className="ld-mono" style={{ marginTop: 18, fontSize: 11, color: 'var(--faint)' }}>Sample data. In the app: 1k–100k runs, seed pinning, profit targets, streaks, recovery time, percentile tables, CSV export.</p>
    </div>
  );
}

/* ---------- utilities bento pieces ---------- */
const INSTR = [
  { s: 'NQ', pv: 20 }, { s: 'MNQ', pv: 2 }, { s: 'ES', pv: 50 }, { s: 'MES', pv: 5 }, { s: 'GC', pv: 100 }, { s: 'CL', pv: 1000 },
];

function PositionCalc() {
  const [ins, setIns] = useState(1);
  const [bal, setBal] = useState(25000);
  const [risk, setRisk] = useState(1);
  const [stop, setStop] = useState(20);
  const [tr, setTr] = useState(2);
  const pv = INSTR[ins].pv;
  const riskUsd = (bal * risk) / 100;
  const per = Math.max(0.0001, stop * pv);
  const contracts = Math.floor(riskUsd / per);
  const real = contracts * per;
  return (
    <div>
      <div className="ld-chips" style={{ marginBottom: 14 }}>{INSTR.map((x, i) => <button key={x.s} className={`ld-chip ${ins === i ? 'on' : ''}`} onClick={() => setIns(i)}>{x.s}</button>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
        {[['Balance $', bal, setBal, 100], ['Risk %', risk, setRisk, 0.25], ['Stop (points)', stop, setStop, 1], ['Target (R)', tr, setTr, 0.5]].map(([l, v, f, st]) => (
          <label key={l}><div className="ld-label" style={{ marginBottom: 5 }}>{l}</div>
            <input className="ld-input" type="number" min="0" step={st} value={v} onChange={(e) => f(Math.max(0, +e.target.value))} /></label>
        ))}
      </div>
      <div className="ld-metrics">
        <div className="ld-metric on"><div className="ld-label">Contracts</div><div className="v" style={{ fontSize: '1.7rem', color: 'var(--accent)' }}>{contracts}</div></div>
        <div className="ld-metric"><div className="ld-label">Real risk</div><div className="v">${Math.round(real).toLocaleString('en-US')}</div></div>
        <div className="ld-metric"><div className="ld-label">Target</div><div className="v" style={{ color: WIN }}>+${Math.round(real * tr).toLocaleString('en-US')}</div></div>
      </div>
    </div>
  );
}

function EconCalendar() {
  const base = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const evs = [
    { t: 'US', n: 'CPI y/y', off: 47 * 60, imp: 3 },
    { t: 'US', n: 'Non-Farm Payrolls', off: 3 * 3600 + 12 * 60, imp: 3 },
    { t: 'EU', n: 'ECB Rate Decision', off: 5 * 3600 + 30 * 60, imp: 3 },
    { t: 'UK', n: 'GDP m/m', off: 8 * 3600, imp: 2 },
    { t: 'US', n: 'FOMC Minutes', off: 26 * 3600, imp: 2 },
  ];
  const fmt = (s) => { const v = Math.max(0, s); return `${String(Math.floor(v / 3600)).padStart(2, '0')}:${String(Math.floor((v % 3600) / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };
  const el = Math.floor((now - base.current) / 1000);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {evs.map((e) => (
        <div key={e.n} className="ld-ev">
          <span className="ld-mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{e.t}</span>
          <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className={`ld-imp ${e.imp === 2 ? 'med' : ''}`}>{[0, 1, 2].map((k) => <i key={k} className={k < e.imp ? 'on' : ''} />)}</span>{e.n}
          </span>
          <span className="ld-mono" style={{ fontSize: 12, color: 'var(--dim)' }}>{fmt(e.off - el)}</span>
        </div>
      ))}
    </div>
  );
}

function Globe({ accent }) {
  const dots = [[96, 74], [118, 66], [150, 82], [70, 104], [130, 112], [104, 134]];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="190" aria-hidden>
      <defs>
        <radialGradient id="gl" cx="35%" cy="30%"><stop offset="0" stopColor={accent} stopOpacity=".28" /><stop offset="1" stopColor="#07090D" stopOpacity=".2" /></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="82" fill="url(#gl)" stroke="rgba(255,255,255,.18)" />
      {[0, -1.75, -3.5, -5.25].map((d, i) => <ellipse key={i} className="ld-mer" cx="100" cy="100" rx="82" ry="82" fill="none" stroke="rgba(255,255,255,.12)" style={{ animationDelay: `${d}s` }} />)}
      {[60, 100, 140].map((y) => <ellipse key={y} cx="100" cy={y} rx={Math.sqrt(Math.max(0, 82 * 82 - (y - 100) * (y - 100)))} ry="7" fill="none" stroke="rgba(255,255,255,.1)" />)}
      {dots.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.2" fill={accent} />
          <circle cx={x} cy={y} r="3.2" fill="none" stroke={accent} style={{ animation: 'ldPulse 2s infinite', animationDelay: `${i * 0.3}s`, transformBox: 'fill-box', transformOrigin: 'center' }} />
        </g>
      ))}
    </svg>
  );
}

function GexLevels() {
  const lv = [
    ['Call Resistance', 21640, LOSS], ['Gamma Wall', 21580, '#F59E0B'], ['0DTE high', 21540, '#A78BFA'], ['HVL', 21490, '#22D3EE'], ['0DTE low', 21440, '#A78BFA'], ['Put Support', 21360, WIN],
  ];
  return (
    <div>
      {lv.map(([l, p, c]) => (
        <div key={l} className="ld-lvl"><span style={{ width: 118, color: 'rgba(255,255,255,.72)' }}>{l}</span><i style={{ borderColor: c }} /><b style={{ color: c }}>{p.toLocaleString('en-US')}</b></div>
      ))}
      <div className="ld-mono" style={{ marginTop: 10, fontSize: 11, color: 'var(--faint)' }}>Plus GEX 1–10 · NQ and ES · illustrative levels</div>
    </div>
  );
}

function MiniChart({ accent }) {
  const c = useMemo(() => {
    const r = rng(404);
    let p = 100;
    return Array.from({ length: 44 }, () => { const o = p; p += (r() - 0.46) * 4; const cl = p; return { o, c: cl, h: Math.max(o, cl) + r() * 1.8, l: Math.min(o, cl) - r() * 1.8 }; });
  }, []);
  const mn = Math.min(...c.map((k) => k.l)), mx = Math.max(...c.map((k) => k.h)), rg = mx - mn;
  const Y = (v) => 150 - ((v - mn) / rg) * 140 - 5;
  const bw = 800 / c.length;
  const e = c[16].c;
  return (
    <svg viewBox="0 0 800 150" width="100%" height="190" preserveAspectRatio="none" aria-hidden>
      {c.map((k, i) => (
        <g key={i}>
          <line x1={i * bw + bw / 2} x2={i * bw + bw / 2} y1={Y(k.h)} y2={Y(k.l)} stroke={k.c >= k.o ? WIN : LOSS} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
          <rect x={i * bw + 2} width={bw - 4} y={Y(Math.max(k.o, k.c))} height={Math.max(1.5, Math.abs(Y(k.o) - Y(k.c)))} fill={k.c >= k.o ? WIN : LOSS} />
        </g>
      ))}
      <rect x={16 * bw} width={9 * bw} y={Y(e + 3.2)} height={Y(e - 1.6) - Y(e + 3.2)} fill={hexToRgba(accent, 0.12)} stroke={hexToRgba(accent, 0.6)} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      <line x1={16 * bw} x2={25 * bw} y1={Y(e)} y2={Y(e)} stroke={accent} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function SessionRing({ accent }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(id); }, []);
  const hr = now.getUTCHours() + now.getUTCMinutes() / 60;
  const pol = (h, r) => { const a = (h / 24) * 2 * Math.PI - Math.PI / 2; return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]; };
  const arc = (a, b, r) => { const [x1, y1] = pol(a, r), [x2, y2] = pol(b, r); return `M${x1} ${y1} A${r} ${r} 0 ${b - a > 12 ? 1 : 0} 1 ${x2} ${y2}`; };
  const S = [['Asia', 0, 9, 78, '#A78BFA'], ['London', 7, 16, 64, '#22D3EE'], ['New York', 12, 21, 50, accent]];
  const live = S.filter(([, a, b]) => hr >= a && hr < b).map((s) => s[0]);
  const [hx, hy] = pol(hr, 84);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 200 200" width="170" height="170" aria-hidden>
        <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,.07)" />
        {S.map(([n, a, b, r, c]) => <path key={n} d={arc(a, b, r)} fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" opacity={live.includes(n) ? 1 : 0.35} />)}
        <line x1="100" y1="100" x2={hx} y2={hy} stroke="#fff" strokeWidth="1.6" />
        <circle cx="100" cy="100" r="4" fill="#fff" />
      </svg>
      <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
        {S.map(([n, , , , c]) => (
          <div key={n} style={{ display: 'flex', gap: 8, alignItems: 'center', color: live.includes(n) ? '#fff' : 'var(--faint)' }}>
            <i style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{n}{live.includes(n) && <span className="ld-free">LIVE</span>}
          </div>
        ))}
        <span className="ld-mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>approx. UTC windows</span>
      </div>
    </div>
  );
}

/* ---------- Strategies ---------- */
function StrategyCards() {
  const rows = useMemo(() => STRATS.map((s, i) => {
    const st = computeStats(SAMPLE.filter((t) => t.strat === i));
    return { ...s, st };
  }), []);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
      {rows.map((s, i) => (
        <div key={s.name} className="ld-panel ld-pad ld-hover ld-reveal" style={{ transitionDelay: `${i * 80}ms` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, boxShadow: `0 0 12px ${s.color}` }} />
            <b style={{ fontFamily: 'var(--f-disp)', fontSize: '1.05rem' }}>{s.name}</b>
          </div>
          <div className="ld-chips" style={{ marginBottom: 16 }}>
            {[i === 2 ? 'Short' : 'Long', i === 1 ? '5m' : '1m', 'NQ'].map((t) => <span key={t} className="ld-chip" style={{ padding: '3px 9px', fontSize: 11 }}>{t}</span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div><div className="ld-label">Trades</div><div className="ld-mono" style={{ fontWeight: 700, marginTop: 4 }}>{s.st.n}</div></div>
            <div><div className="ld-label">Win rate</div><div className="ld-mono" style={{ fontWeight: 700, marginTop: 4 }}>{(s.st.wr * 100).toFixed(0)}%</div></div>
            <div><div className="ld-label">Net</div><div className="ld-mono" style={{ fontWeight: 700, marginTop: 4, color: s.st.net >= 0 ? WIN : LOSS }}>{fmtR(s.st.net, 0)}</div></div>
          </div>
          <div style={{ marginTop: 16, height: 46 }}>
            <EquityChart curve={s.st.curve} height={46} accent={s.color} strokeW={1.8} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Mave AI ---------- */
const PERSONAS = {
  Guide: { blurb: 'App help', msgs: [['u', 'Where do I see which session is bleeding money?'], ['a', 'Analyse → Edge Explorer → slice by Session. Sort by net and the biggest leak sits at the top.']] },
  Trainer: { blurb: 'Trading coach', msgs: [['u', 'I keep taking trades right after two losses.'], ['a', 'Open Analyse → Risk & Behavior. The revenge-trading detector compares trades taken soon after a loss. If expectancy drops there, a two-loss stop is a rule backed by your own data.']] },
  Chat: { blurb: 'General', msgs: [['u', 'Explain Kelly in one line.'], ['a', 'It is the bet fraction that maximizes long-run growth. Win probability minus loss probability divided by payoff ratio. Most traders size at a fraction of it.']] },
};
const PROVIDERS = ['OpenRouter', 'Groq', 'Gemini', 'DeepSeek', 'OpenAI', 'Anthropic'];

function MaveAI() {
  const [persona, setPersona] = useState('Trainer');
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % PROVIDERS.length), 1500);
    return () => clearInterval(id);
  }, []);
  const dead = 2;
  const cur = active === dead ? (active + 1) % PROVIDERS.length : active;
  return (
    <div className="ld-split" style={{ gridTemplateColumns: '1.1fr 1fr' }}>
      <div className="ld-panel ld-pad ld-reveal" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="ld-chips" style={{ marginBottom: 18 }}>
          {Object.keys(PERSONAS).map((p) => <button key={p} className={`ld-chip ${persona === p ? 'on' : ''}`} onClick={() => setPersona(p)}>{p}</button>)}
          <span className="ld-label" style={{ alignSelf: 'center', marginLeft: 6 }}>{PERSONAS[persona].blurb}</span>
        </div>
        <div key={persona} style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 190 }}>
          {PERSONAS[persona].msgs.map(([w, t], i) => <div key={i} className={`ld-msg ${w}`} style={{ animationDelay: `${i * 0.5}s` }}>{t}</div>)}
        </div>
        <div className="ld-mono" style={{ marginTop: 14, fontSize: 11, color: 'var(--faint)' }}>Example conversation</div>
      </div>
      <div className="ld-panel ld-pad ld-reveal">
        <div className="ld-ico"><Icon name="key" /></div>
        <h3 className="ld-panel-title">Bring your own key. Never hit a wall.</h3>
        <p className="ld-panel-copy" style={{ marginBottom: 18 }}>Requests rotate across every saved provider and model. One exhausted key never breaks the conversation.</p>
        <div className="ld-chips" style={{ marginBottom: 14 }}>
          {PROVIDERS.map((p, i) => <span key={p} className={`ld-prov ${i === cur ? 'on' : ''} ${i === dead ? 'dead' : ''}`}>{p}</span>)}
        </div>
        <div className="ld-mono" style={{ fontSize: 11.5, color: 'var(--faint)', lineHeight: 1.7 }}>
          LRU round-robin · rate-limited keys skipped<br />Stop button · reset-memory per persona<br />Free tier: shared hourly limit. BYOK removes it.
        </div>
      </div>
    </div>
  );
}

/* ---------- static data ---------- */
const SECURITY = [
  ['lock', 'Two-factor authentication', 'TOTP via Google Authenticator, 1Password or Authy, or email OTP. 10 downloadable backup codes and a 12-hour re-auth window.'],
  ['shield', 'Instant session revocation', 'Change your 2FA settings and every other session is signed out immediately.'],
  ['mail', 'OTP password reset', '6-digit code by email, 10-minute expiry, capped at 5 attempts.'],
  ['user', 'Google SSO', 'One-click sign-in alongside email and password.'],
  ['ban', 'Hard sign-out on bans', 'Banned accounts are signed out everywhere through a token version bump.'],
  ['check', 'Reproducible metrics', 'Every number is recomputed from your raw trades. No black boxes.'],
];

const FREE = ['Journal dashboard, Analyse and Trade logs', 'CSV / XLSX import, custom columns', 'Sessions and Economic Calendar', '9 trading calculators', 'Accounts and Strategies playbook', 'Chats and Mave AI (shared hourly limit)', '2FA and Google SSO'];
const PRO = ['Everything in Free', 'Backtester Dashboard (R-mode, R:R sweep)', 'Test logs for Backtest accounts', 'Monte Carlo Simulator, 3 methods, up to 100k runs', 'GEX Levels for NQ and ES', 'Chart with trade boxes and indicators'];

const FAQ = [
  ['How is this different from a spreadsheet?', 'A spreadsheet shows you history. MavRix gives you verdicts: expectancy, drawdown, R:R optimization and Monte Carlo ranges, recomputed every time you import or change a filter.'],
  ['What formats can I import?', 'CSV and XLSX broker exports. Unknown columns can be added as custom columns with dropdowns, and every trade can be tagged to a strategy.'],
  ['Which markets does it cover?', 'Futures (NQ, MNQ, ES, MES, YM, MYM, GC, CL) plus forex and metals like EUR/USD, GBP/USD, XAU/USD and XAG/USD.'],
  ['Do I need to be profitable already?', 'No. Import a losing book and the Edge Explorer shows which sessions, weekdays or setups are the leak, before you risk another dollar.'],
  ['What is free and what is Pro?', 'Journal, Analyse, Trade logs, utilities, calculators, Strategies and Chats are free. Pro adds the Backtester, Monte Carlo Simulator, GEX Levels and Chart. There is no self-serve billing yet; Pro is granted per account.'],
  ['Is my data safe?', 'Trades live in your account on a PostgreSQL database behind an Express API. Sign-in supports 2FA and Google SSO, and sessions revoke instantly when security settings change.'],
];

const TICKERS = ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'GC', 'CL', 'EUR/USD', 'GBP/USD', 'XAU/USD', 'XAG/USD'];

function SecHead({ eyebrow, title, sub }) {
  return (
    <div className="ld-head ld-reveal">
      <div className="ld-eyebrow">{eyebrow}</div>
      <h2 className="ld-h2">{title}</h2>
      {sub && <p className="ld-sub">{sub}</p>}
    </div>
  );
}

/* ============================== PAGE ============================== */
export default function Landing() {
  const navigate = useNavigate();
  const [accent, setAccent] = useState(PALETTE[0].hex);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [cmdOpen, setCmdOpen] = useState(false);

  const vars = useMemo(() => ({
    '--accent': accent, '--accent-2': lighten(accent), '--accent-soft': hexToRgba(accent, 0.1), '--accent-soft2': hexToRgba(accent, 0.3),
  }), [accent]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    initReveal();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((v) => !v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const scrollTo = useCallback((sel) => { document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []);

  const cmdItems = useMemo(() => [
    { label: 'Import → edge demo', hint: 'G I', icon: 'top', run: () => scrollTo('#import') },
    { label: 'Edge Explorer', hint: 'G E', icon: 'pulse', run: () => scrollTo('#analyse') },
    { label: 'Dashboard panels', hint: 'G D', icon: 'grid', run: () => scrollTo('#dashboard') },
    { label: 'R:R Simulator', hint: 'G R', icon: 'bolt', run: () => scrollTo('#sim') },
    { label: 'Monte Carlo', hint: 'G M', icon: 'gear', run: () => scrollTo('#mc') },
    { label: 'Utilities', hint: 'G U', icon: 'chart', run: () => scrollTo('#tools') },
    { label: 'Mave AI', hint: 'G A', icon: 'chat', run: () => scrollTo('#ai') },
    { label: 'Security', hint: 'G S', icon: 'lock', run: () => scrollTo('#security') },
    { label: 'Free vs Pro', hint: 'G P', icon: 'check', run: () => scrollTo('#pricing') },
    { label: 'FAQ', hint: 'G Q', icon: 'book', run: () => scrollTo('#faq') },
    { label: 'Start free', hint: '⏎', icon: 'arrow', run: () => navigate('/signup') },
    { label: 'Login', hint: '⏎', icon: 'arrow', run: () => navigate('/login') },
    { label: 'Back to top', hint: 'G T', icon: 'top', run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
  ], [scrollTo, navigate]);

  const S = SAMPLE_STATS;

  return (
    <div className="ld-root" style={vars}>
      <style>{LD}</style>
      <Cursor />
      <ScrollProgress />
      <AccentPicker accent={accent} onChange={setAccent} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} items={cmdItems} />

      {/* NAV */}
      <header className={`ld-nav ${scrolled ? 'ld-scrolled' : ''}`}>
        <div className="ld-nav-in">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: 'none', border: 'none', display: 'flex', padding: 0 }} aria-label="MavRix Journal — top">
            <img src={navLogo} alt="MavRix Journal" style={{ height: 34 }} />
          </button>
          <nav className="ld-navlinks">
            <a href="#import" className="ld-navlink">Import</a>
            <a href="#analyse" className="ld-navlink">Analyse</a>
            <a href="#sim" className="ld-navlink">Backtest</a>
            <a href="#tools" className="ld-navlink">Utilities</a>
            <a href="#ai" className="ld-navlink">Mave AI</a>
            <a href="#pricing" className="ld-navlink">Plans</a>
            <a href="#faq" className="ld-navlink">FAQ</a>
          </nav>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button className="ld-kbd ld-hide-sm" onClick={() => setCmdOpen(true)} aria-label="Open command palette"><b>⌘</b><b>K</b></button>
            <SessionClock />
            <Link to="/login" className="ld-navlink" style={{ fontWeight: 600 }}>Login</Link>
            <Link to="/signup" className="ld-btn ld-primary ld-btn-sm">Sign up free</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="ld-hero">
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}><ParticleCanvas accent={accent} /></div>
        <div className="ld-orb" style={{ left: '1%', top: '12%', width: 340, height: 340, background: `radial-gradient(circle, ${hexToRgba(accent, 0.16)}, transparent 68%)` }} />
        <div className="ld-orb" style={{ right: '0', top: '34%', width: 360, height: 360, background: 'radial-gradient(circle, rgba(34,211,238,.09), transparent 70%)', animationDelay: '-4s' }} />
        <div className="ld-wrap ld-hero-grid">
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="ld-badge"><i />MATH-FIRST TRADING ANALYTICS</span>
            <h1 className="ld-h1">Trades in.<br /><span className="ld-gradtext">Verdicts</span> out.</h1>
            <p className="ld-hero-p">
              Import your broker sheet and MavRix recomputes expectancy, drawdown, R:R and Monte Carlo ranges on every filter change.
            </p>
            <div className="ld-mono" style={{ fontSize: 14, color: 'var(--dim)', marginBottom: 28, letterSpacing: '.04em' }}>
              Built to <RotatingWord /> your edge.
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
              <Magnetic><Link to="/signup" className="ld-btn ld-primary" style={{ padding: '16px 32px', fontSize: 16 }}>Start free <Icon name="arrow" size={16} /></Link></Magnetic>
              <Magnetic><button className="ld-btn ld-secondary" style={{ padding: '16px 32px', fontSize: 16 }} onClick={() => scrollTo('#import')}>See your edge in 30 seconds</button></Magnetic>
            </div>
            <div className="ld-mono" style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--faint)', fontSize: 12.5, letterSpacing: '.05em', flexWrap: 'wrap' }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: '#22c55e', boxShadow: '0 0 10px #22c55e', animation: 'ldBlink 1.4s infinite' }} />
              CSV · XLSX · LIVE RECOMPUTE · NO CREDIT CARD
            </div>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}><HeroDashboard accent={accent} /></div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="ld-marquee" aria-label="Supported markets">
        <div className="ld-marquee-track">
          {[...TICKERS, ...TICKERS].map((t, i) => <span key={i}><b>◆</b>{t}</span>)}
        </div>
      </div>

      {/* STATS */}
      <section className="ld-sec" style={{ paddingBottom: 40 }}>
        <div className="ld-wrap">
          <div className="ld-panel ld-stats ld-reveal">
            {[[12, '', 0, 'dashboard panels, drag and resize'], [9, '', 0, 'production calculators'], [3, '', 0, 'Monte Carlo methods'], [100, 'k', 0, 'simulation runs per test'], [6, '', 0, 'AI providers, bring your own key']].map(([end, suf, dec, label]) => (
              <div key={label} className="ld-stat">
                <div className="n"><Counter end={end} suffix={suf} decimals={dec} /></div>
                <div className="l">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPORT */}
      <section id="import" className="ld-sec">
        <div className="ld-wrap">
          <SecHead eyebrow="Import" title={<>Upload a broker sheet. See your <span className="ld-gradtext">edge</span>.</>} sub="Drag in a CSV or XLSX. The equity curve, expectancy and your biggest leak appear before your coffee cools." />
          <ImportDemo accent={accent} />
        </div>
      </section>

      <div className="ld-divider" />

      {/* ANALYSE */}
      <section id="analyse" className="ld-sec">
        <div className="ld-wrap">
          <SecHead eyebrow="Analyse" title={<>Plain-language insights. <span className="ld-gradtext">Zero</span> spreadsheet work.</>} sub="The Analyse page tells you your strongest edge and your biggest leak, then lets you slice every trade to prove it." />
          <EdgeExplorer />
          <div className="ld-chips ld-reveal" style={{ justifyContent: 'center', marginTop: 28 }}>
            {['Overview', 'Time heatmap', 'Edge Explorer', 'Risk & Behavior', 'Sharpe · Sortino · Calmar · Kelly', 'Revenge-trading detector'].map((t) => <span key={t} className="ld-chip">{t}</span>)}
          </div>
        </div>
      </section>

      <div className="ld-divider" />

      {/* DASHBOARD */}
      <section id="dashboard" className="ld-sec">
        <div className="ld-wrap">
          <SecHead eyebrow="Journal dashboard" title="Twelve panels. Your layout. Saved." sub="Drag, resize and hide panels. Keep up to three layout presets per account, one for daily use and one for weekly review." />
          <DashboardShowcase />
        </div>
      </section>

      <div className="ld-divider" />

      {/* BACKTEST */}
      <section id="sim" className="ld-sec">
        <div className="ld-wrap">
          <SecHead eyebrow="Backtester · Pro" title={<>Drag the sliders. Watch your edge <span className="ld-gradtext">move</span>.</>} sub="Expectancy, profit factor, Kelly sizing and a fresh equity path recompute instantly. The Backtester runs the same math on your logged R." />
          <RrSimulator accent={accent} />
          <div className="ld-chips ld-reveal" style={{ justifyContent: 'center', marginTop: 28 }}>
            {['R-mode dashboard', 'R:R sweep 1:1 → 1:4', 'Separate test logs', 'Backtest accounts'].map((t) => <span key={t} className="ld-chip">{t}</span>)}
          </div>
        </div>
      </section>

      <section id="mc" className="ld-sec" style={{ paddingTop: 10 }}>
        <div className="ld-wrap"><MonteCarlo accent={accent} /></div>
      </section>

      <div className="ld-divider" />

      {/* TOOLS */}
      <section id="tools" className="ld-sec">
        <div className="ld-wrap">
          <SecHead eyebrow="Utilities" title="The tools you already Google, in one tab." sub="Calculators, sessions, the economic calendar, GEX levels and a trade-aware chart. Most are free." />
          <div className="ld-bento">
            <div className="ld-panel ld-pad ld-hover ld-reveal b3">
              <div className="ld-ico"><Icon name="gear" /></div>
              <div className="ld-panel-title">Calculators <span className="ld-free">FREE</span></div>
              <p className="ld-panel-copy" style={{ marginBottom: 16 }}>Nine tools including position size, R-multiple, pip value and futures contract value. Pin favourites to the hub.</p>
              <PositionCalc />
            </div>
            <div className="ld-panel ld-pad ld-hover ld-reveal b3">
              <div className="ld-ico"><Icon name="pulse" /></div>
              <div className="ld-panel-title">Economic Calendar <span className="ld-free">FREE</span></div>
              <p className="ld-panel-copy" style={{ marginBottom: 14 }}>CPI, NFP, FOMC and central banks with impact and currency filters, live-release highlights and countdowns.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, alignItems: 'center' }}>
                <Globe accent={accent} />
                <div style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.55 }}>An interactive 3D globe shows which countries have releases this week.<div className="ld-sample" style={{ marginTop: 8 }}>Sample events</div></div>
              </div>
              <div style={{ marginTop: 12 }}><EconCalendar /></div>
            </div>
            <div className="ld-panel ld-pad ld-hover ld-reveal b2">
              <div className="ld-ico"><Icon name="grid" /></div>
              <div className="ld-panel-title">GEX Levels <span className="ld-pro">PRO</span></div>
              <p className="ld-panel-copy" style={{ marginBottom: 14 }}>Daily gamma levels for NQ and ES, drawn as price-level charts.</p>
              <GexLevels />
            </div>
            <div className="ld-panel ld-pad ld-hover ld-reveal b4">
              <div className="ld-ico"><Icon name="chart" /></div>
              <div className="ld-panel-title">Chart <span className="ld-pro">PRO</span></div>
              <p className="ld-panel-copy" style={{ marginBottom: 10 }}>Candles from 1m to 1D, EMA / SMA / VWAP / Bollinger / RSI, Heikin Ashi, measure tool, screenshot export, and your journal trades drawn as boxes over the price.</p>
              <MiniChart accent={accent} />
              <div className="ld-sample" style={{ marginTop: 6 }}>Illustrative chart · trade box overlay</div>
            </div>
            <div className="ld-panel ld-pad ld-hover ld-reveal b6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
              <div>
                <div className="ld-panel-title">Sessions <span className="ld-free">FREE</span></div>
                <p className="ld-panel-copy">A live clock for Asia, London and New York, a DST banner and instrument cards. Know which session you are in before you click.</p>
              </div>
              <SessionRing accent={accent} />
            </div>
          </div>
        </div>
      </section>

      <div className="ld-divider" />

      {/* PLAYBOOK */}
      <section id="playbook" className="ld-sec">
        <div className="ld-wrap">
          <SecHead eyebrow="Strategies" title="A playbook that tracks its own edge." sub="Write the rules once, tag trades to a strategy, and see each one's win rate and net P&L on its detail page." />
          <StrategyCards />
          <p className="ld-sample ld-reveal" style={{ textAlign: 'center', marginTop: 16 }}>Sample strategies · {S.n} sample trades</p>
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="ld-sec">
        <div className="ld-wrap">
          <SecHead eyebrow="Mave AI · Chats" title="A trading coach in the header bar." sub="Three personas, six providers, one conversation that keeps working. Plus DMs and group chats for your desk." />
          <MaveAI />
          <div className="ld-chips ld-reveal" style={{ justifyContent: 'center', marginTop: 28 }}>
            {['Friend requests', 'Public and private groups', 'Typing indicators', 'Read receipts', 'Edit within 15 min', 'Pin · mute · archive'].map((t) => <span key={t} className="ld-chip">{t}</span>)}
          </div>
        </div>
      </section>

      <div className="ld-divider" />

      {/* SECURITY */}
      <section id="security" className="ld-sec">
        <div className="ld-wrap">
          <SecHead eyebrow="Security" title="Account security that takes itself seriously." sub="Your trade history is your edge. The sign-in stack protects it." />
          <div className="ld-sec-grid">
            {SECURITY.map(([ic, t, d], i) => (
              <div key={t} className="ld-panel ld-pad ld-hover ld-reveal" style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
                <div className="ld-ico"><Icon name={ic} /></div>
                <div className="ld-panel-title">{t}</div>
                <p className="ld-panel-copy">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="ld-sec">
        <div className="ld-wrap">
          <SecHead eyebrow="Plans" title="Free is genuinely capable. Pro adds the lab." sub="Journal and analyse for free. Unlock the Backtester, Monte Carlo, GEX Levels and Chart when you need them." />
          <div className="ld-plan">
            <div className="ld-panel ld-pad ld-reveal">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><div className="ld-panel-title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Free</div><span className="ld-free">NO CARD</span></div>
              <p className="ld-panel-copy" style={{ marginBottom: 18 }}>Everything for a serious daily journal.</p>
              {FREE.map((f) => <div key={f} className="ld-li"><span style={{ color: WIN }}><Icon name="check" size={16} sw={2.4} /></span>{f}</div>)}
              <div style={{ marginTop: 24 }}><Link to="/signup" className="ld-btn ld-secondary" style={{ width: '100%' }}>Create free account</Link></div>
            </div>
            <div className="ld-panel ld-pad ld-reveal" style={{ borderColor: 'var(--accent-soft2)', background: 'linear-gradient(180deg, var(--accent-soft), rgba(255,255,255,.012))', boxShadow: `0 40px 90px -60px ${hexToRgba(accent, 0.7)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><div className="ld-panel-title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Pro</div><span className="ld-pro">BACKTESTER · MONTE CARLO</span></div>
              <p className="ld-panel-copy" style={{ marginBottom: 18 }}>For traders who want to prove the edge.</p>
              {PRO.map((f, i) => <div key={f} className="ld-li"><span style={{ color: 'var(--accent)' }}><Icon name="check" size={16} sw={2.4} /></span><span style={{ fontWeight: i === 0 ? 600 : 400 }}>{f}</span></div>)}
              <div style={{ marginTop: 24 }}><Link to="/signup" className="ld-btn ld-primary" style={{ width: '100%' }}>Sign up and get Pro access</Link></div>
              <p className="ld-mono" style={{ marginTop: 12, fontSize: 11, color: 'var(--faint)', textAlign: 'center' }}>Self-serve billing is not live yet. Pro is granted per account.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="ld-sec" style={{ paddingTop: 30 }}>
        <div className="ld-wrap" style={{ maxWidth: 900 }}>
          <SecHead eyebrow="FAQ" title={<>Questions traders actually <span className="ld-gradtext">ask</span>.</>} />
          {FAQ.map(([q, a], i) => {
            const open = openFaq === i;
            return (
              <div key={q} className={`ld-faq ld-reveal ${open ? 'open' : ''}`}>
                <button onClick={() => setOpenFaq(open ? -1 : i)} aria-expanded={open}><span>{q}</span><span className="pm">+</span></button>
                {open && <div className="a">{a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '10px 0 100px' }}>
        <div className="ld-wrap" style={{ maxWidth: 1100 }}>
          <div className="ld-cta ld-reveal" style={{ background: `radial-gradient(700px 340px at 50% 0%, ${hexToRgba(accent, 0.2)}, transparent 70%), linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012))`, boxShadow: `0 50px 100px -60px ${hexToRgba(accent, 0.6)}` }}>
            <h2 className="ld-h2" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', marginBottom: 18 }}>Your next 100 trades deserve <span className="ld-gradtext">a verdict</span>.</h2>
            <p className="ld-sub" style={{ maxWidth: 520, margin: '0 auto 36px' }}>Upload a broker sheet and see your edge in under a minute. No credit card.</p>
            <Magnetic strength={0.2}><Link to="/signup" className="ld-btn ld-primary" style={{ padding: '18px 40px', fontSize: 17 }}>Create your free account <Icon name="arrow" size={16} /></Link></Magnetic>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ld-foot">
        <div className="ld-wrap" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={navLogo} alt="" style={{ height: 24, opacity: 0.55 }} />
            <span>© {new Date().getFullYear()} MavRix Journal</span>
          </div>
          <div style={{ display: 'flex', gap: 26 }}>
            <a href="#import">Features</a>
            <a href="#pricing">Plans</a>
            <a href="#faq">FAQ</a>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}