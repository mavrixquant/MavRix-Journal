import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';
import { Link } from 'react-router-dom';
import navLogo from '../assets/navLOGO.png';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const hexToRgba = (hex, a = 1) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const PALETTE = [
  { name: 'Amber',   hex: '#F59E0B' },
  { name: 'Cyan',    hex: '#22D3EE' },
  { name: 'Violet',  hex: '#A78BFA' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Rose',    hex: '#F43F5E' },
  { name: 'Lime',    hex: '#A3E635' },
];

/* ------------------------------------------------------------------ */
/*  CSS                                                                */
/* ------------------------------------------------------------------ */
const LD = `
  * { box-sizing: border-box; }

  html { scroll-behavior: smooth; }

  /* ---------- Custom cursor ---------- */
  .ld-cur-dot, .ld-cur-ring {
    position: fixed; top: 0; left: 0; pointer-events: none;
    z-index: 9999; border-radius: 50%; will-change: transform;
  }
  .ld-cur-dot {
    width: 6px; height: 6px; background: #fff; margin: -3px 0 0 -3px;
  }
  .ld-cur-ring {
    width: 38px; height: 38px; margin: -19px 0 0 -19px;
    border: 1.5px solid rgba(255,255,255,.45);
    transition: width .28s cubic-bezier(.2,.8,.25,1), height .28s cubic-bezier(.2,.8,.25,1),
                margin .28s cubic-bezier(.2,.8,.25,1), border-color .28s, background .28s;
  }
  .ld-cur-ring.is-hot {
    width: 68px; height: 68px; margin: -34px 0 0 -34px;
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  @media (pointer: coarse) {
    .ld-cur-dot, .ld-cur-ring { display: none !important; }
  }

  /* ---------- Scroll progress ---------- */
  .ld-progress {
    position: fixed; top: 0; left: 0; height: 2px; z-index: 200;
    background: linear-gradient(90deg, var(--accent), #FDE68A, var(--accent));
    background-size: 200% 100%;
    animation: ldGradMove 3s linear infinite;
    box-shadow: 0 0 14px var(--accent);
    transition: width .08s linear;
  }

  /* ---------- Root ---------- */
  .ld-bg {
    position: relative;
    background:
      radial-gradient(900px 520px at 15% -5%, var(--accent-soft), transparent 60%),
      radial-gradient(800px 500px at 88% 8%, rgba(34,211,238,.06), transparent 60%),
      linear-gradient(180deg, #07090D 0%, #0A0D14 45%, #07090D 100%);
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
  }
  .ld-grid::before {
    content:''; position:absolute; inset:0; pointer-events:none;
    background-image:
      linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 72px 72px;
    -webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 30%, transparent 78%);
    mask-image: radial-gradient(ellipse 80% 55% at 50% 0%, black 30%, transparent 78%);
  }

  /* ---------- Reveal ---------- */
  .ld-reveal {
    opacity: 0; transform: translateY(34px);
    transition: opacity .9s cubic-bezier(.2,.8,.25,1), transform .9s cubic-bezier(.2,.8,.25,1);
  }
  .ld-visible { opacity: 1; transform: none; }

  /* ---------- Nav ---------- */
  .ld-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    transition: background .4s, box-shadow .4s, border-color .4s, backdrop-filter .4s;
    border-bottom: 1px solid transparent;
  }
  .ld-scrolled {
    background: rgba(7,9,13,.7);
    backdrop-filter: blur(20px) saturate(140%);
    border-bottom-color: rgba(255,255,255,.07);
    box-shadow: 0 16px 44px -22px rgba(0,0,0,.9);
  }
  .ld-navlink {
    position: relative; color: rgba(255,255,255,.68); text-decoration: none;
    font-size: 14px; font-weight: 500; padding: 6px 2px;
    transition: color .2s;
  }
  .ld-navlink::after {
    content:''; position:absolute; left: 0; right: 100%; bottom: 0;
    height: 1.5px; background: linear-gradient(90deg, var(--accent), var(--accent-2));
    transition: right .32s cubic-bezier(.2,.8,.25,1);
  }
  .ld-navlink:hover { color: #fff; }
  .ld-navlink:hover::after { right: 0; }

  .ld-kbd {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: ui-monospace, monospace; font-size: 11px;
    color: rgba(255,255,255,.5);
    padding: 5px 10px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,.12);
    background: rgba(255,255,255,.035);
    cursor: pointer;
    transition: all .2s;
  }
  .ld-kbd:hover { color: #fff; border-color: var(--accent); background: var(--accent-soft); }
  .ld-kbd b {
    font-weight: 600; background: rgba(255,255,255,.09);
    padding: 1px 5px; border-radius: 4px; color: rgba(255,255,255,.85);
  }

  /* ---------- Buttons ---------- */
  .ld-btn {
    position: relative; display: inline-flex; align-items: center; justify-content: center;
    gap: 9px; text-decoration: none; padding: 15px 30px; border-radius: 14px;
    font-weight: 700; overflow: hidden; cursor: pointer; border: none;
    letter-spacing: .01em; white-space: nowrap;
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275),
                box-shadow .3s, background .3s, border-color .3s, color .3s;
  }
  .ld-btn:hover { transform: translateY(-2px); }
  .ld-btn:active { transform: translateY(1px) scale(.98); }
  .ld-btn::after {
    content:''; position:absolute; inset: 0; pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: ldShine 4.2s ease-in-out infinite;
  }
  .ld-primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0A0D13;
    box-shadow: 0 10px 30px -8px var(--accent-soft),
                inset 0 1px 0 rgba(255,255,255,.4);
  }
  .ld-primary:hover {
    box-shadow: 0 16px 42px -10px var(--accent-soft), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .ld-secondary {
    background: rgba(255,255,255,.035); color: #fff;
    border: 1px solid rgba(255,255,255,.14);
    backdrop-filter: blur(8px);
  }
  .ld-secondary:hover {
    background: rgba(255,255,255,.07);
    border-color: rgba(255,255,255,.24);
  }

  /* ---------- Tilt / Cards ---------- */
  .ld-tilt {
    transition: transform .5s cubic-bezier(.2,.8,.25,1),
                box-shadow .5s, border-color .5s, background .5s;
    will-change: transform;
  }
  .ld-card {
    position: relative; border-radius: 20px; padding: 30px;
    background: linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012));
    border: 1px solid rgba(255,255,255,.085);
    transition: transform .5s cubic-bezier(.2,.8,.25,1),
                box-shadow .5s, border-color .5s, background .5s;
  }
  .ld-card:hover {
    border-color: var(--accent-soft2, rgba(245,158,11,.32));
    background: linear-gradient(180deg, var(--accent-soft), rgba(255,255,255,.012));
  }

  .ld-icon-tile {
    width: 52px; height: 52px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,.03));
    border: 1px solid var(--accent-soft2, rgba(245,158,11,.25));
    color: var(--accent);
    transition: transform .4s cubic-bezier(.2,.8,.25,1);
  }
  .ld-card:hover .ld-icon-tile { transform: scale(1.08) rotate(-3deg); }

  /* ---------- Range sliders ---------- */
  input[type="range"].ld-range {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 6px; border-radius: 99px;
    background: rgba(255,255,255,.09);
    outline: none; cursor: pointer;
  }
  input[type="range"].ld-range::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 20px; height: 20px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 16px var(--accent), 0 0 0 4px var(--accent-soft);
    cursor: grab; border: 2px solid #0A0D13;
    transition: transform .2s;
  }
  input[type="range"].ld-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
  input[type="range"].ld-range::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.05); }
  input[type="range"].ld-range::-moz-range-thumb {
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 16px var(--accent);
    cursor: grab; border: 2px solid #0A0D13;
  }

  /* ---------- Command palette ---------- */
  .ld-cmd-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(4,6,9,.7);
    backdrop-filter: blur(12px);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 14vh;
    animation: ldFadeIn .18s ease;
  }
  .ld-cmd {
    width: 560px; max-width: 92vw;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 18px; overflow: hidden;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.9), 0 0 0 1px var(--accent-soft);
    animation: ldCmdIn .28s cubic-bezier(.2,.8,.25,1);
  }
  .ld-cmd-input {
    width: 100%; padding: 20px 22px; background: transparent; border: none;
    outline: none; color: #fff; font-size: 16px; font-family: inherit;
    border-bottom: 1px solid rgba(255,255,255,.06);
  }
  .ld-cmd-input::placeholder { color: rgba(255,255,255,.35); }
  .ld-cmd-list { max-height: 320px; overflow-y: auto; padding: 8px; }
  .ld-cmd-item {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 14px; border-radius: 12px; cursor: pointer;
    transition: background .15s;
    color: rgba(255,255,255,.8);
  }
  .ld-cmd-item.is-active {
    background: var(--accent-soft);
    color: #fff;
  }
  .ld-cmd-item svg { color: var(--accent); flex-shrink: 0; }
  .ld-cmd-item .ld-cmd-hint {
    margin-left: auto; font-family: ui-monospace, monospace; font-size: 11px;
    color: rgba(255,255,255,.4);
  }

  /* ---------- Accent picker ---------- */
  .ld-accent-wrap {
    position: fixed; bottom: 26px; right: 26px; z-index: 90;
    display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
  }
  .ld-accent-toggle {
    width: 48px; height: 48px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,.15);
    background: rgba(15,18,25,.85);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--accent);
    box-shadow: 0 12px 30px -10px rgba(0,0,0,.8), 0 0 0 1px var(--accent-soft);
    transition: transform .3s cubic-bezier(.2,.8,.25,1);
  }
  .ld-accent-toggle:hover { transform: rotate(90deg) scale(1.06); }
  .ld-accent-panel {
    background: rgba(15,18,25,.9);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 16px; padding: 14px;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
    animation: ldCmdIn .22s cubic-bezier(.2,.8,.25,1);
  }
  .ld-accent-swatch {
    width: 30px; height: 30px; border-radius: 50%;
    cursor: pointer; border: 2px solid transparent;
    transition: transform .25s cubic-bezier(.2,.8,.25,1), border-color .2s;
  }
  .ld-accent-swatch:hover { transform: scale(1.15); }
  .ld-accent-swatch.is-active { border-color: #fff; box-shadow: 0 0 0 3px rgba(255,255,255,.1); }

  /* ---------- Misc ---------- */
  .ld-eyebrow {
    font-family: ui-monospace, monospace; font-size: 12px;
    letter-spacing: .22em; color: var(--accent); text-transform: uppercase;
  }
  .ld-gradtext {
    background: linear-gradient(90deg, var(--accent), var(--accent-2), #22d3ee, var(--accent));
    background-size: 300% 100%;
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: ldGradMove 6s linear infinite;
  }
  .ld-hero-canvas { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: .9; }

  .ld-orb  { animation: ldFloat 8s ease-in-out infinite; }
  .ld-orb2 { animation: ldFloat2 11s ease-in-out infinite; }

  .ld-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent); }
  .ld-section { scroll-margin-top: 90px; }

  .ld-tip {
    position: absolute; padding: 8px 12px; border-radius: 8px;
    background: rgba(15,18,25,.95); border: 1px solid var(--accent-soft2, rgba(245,158,11,.3));
    font-family: ui-monospace, monospace; font-size: 11px;
    color: #fff; white-space: nowrap; pointer-events: none;
    transform: translate(-50%, -130%);
    box-shadow: 0 10px 30px -10px rgba(0,0,0,.9);
    z-index: 50;
  }

  /* ---------- Keyframes ---------- */
  @keyframes ldFloat  { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
  @keyframes ldFloat2 { 0%,100% { transform: translateY(0) rotate(0deg) } 50% { transform: translateY(16px) rotate(3deg) } }
  @keyframes ldPulse  { 0%,100% { transform: scale(1); opacity:.85 } 50% { transform: scale(1.45); opacity:1 } }
  @keyframes ldBlink  { 0%,100% { opacity:.35 } 50% { opacity:1 } }
  @keyframes ldShine  { 0%,100% { transform: translateX(-130%) skewX(-18deg) } 55% { transform: translateX(230%) skewX(-18deg) } }
  @keyframes ldDraw   { to { stroke-dashoffset: 0 } }
  @keyframes ldGradMove { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes ldFadeUp { from { opacity:0; transform: translateY(12px) } to { opacity:1; transform:none } }
  @keyframes ldFadeIn { from { opacity:0 } to { opacity:1 } }
  @keyframes ldCmdIn  { from { opacity: 0; transform: translateY(-12px) scale(.97) } to { opacity: 1; transform: none } }
  @keyframes ldSpin   { to { transform: rotate(360deg) } }

  @media (prefers-reduced-motion: reduce) {
    .ld-reveal { opacity: 1 !important; transform: none; }
    .ld-reveal, .ld-orb, .ld-orb2, .ld-btn::after, .ld-progress { animation: none !important; transition: none; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Custom Cursor                                                      */
/* ------------------------------------------------------------------ */
function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my, raf = 0;
    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      const t = e.target;
      const hot = t.closest('a, button, .ld-card, .ld-cmd-item, .ld-accent-swatch, input, [role="button"]');
      if (ringRef.current) ringRef.current.classList.toggle('is-hot', !!hot);
    };
    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      if (dotRef.current) dotRef.current.style.transform = `translate(${mx}px, ${my}px)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <>
      <div ref={ringRef} className="ld-cur-ring" aria-hidden />
      <div ref={dotRef} className="ld-cur-dot" aria-hidden />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Scroll Progress                                                    */
/* ------------------------------------------------------------------ */
function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return <div className="ld-progress" style={{ width: `${p}%` }} aria-hidden />;
}

/* ------------------------------------------------------------------ */
/*  Magnetic                                                           */
/* ------------------------------------------------------------------ */
function Magnetic({ children, strength = 0.25, style = {} }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        display: 'inline-block',
        transition: 'transform .45s cubic-bezier(.2,.8,.25,1)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Command Palette                                                    */
/* ------------------------------------------------------------------ */
function CommandPalette({ open, onClose, items }) {
  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [query, items]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((v) => Math.min(v + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((v) => Math.max(v - 1, 0)); }
      if (e.key === 'Enter' && filtered[idx]) {
        filtered[idx].run();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, idx, filtered, onClose]);

  if (!open) return null;
  return (
    <div className="ld-cmd-overlay" onClick={onClose}>
      <div className="ld-cmd" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="ld-cmd-input"
          placeholder="Search pages, actions…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIdx(0); }}
        />
        <div className="ld-cmd-list">
          {filtered.length === 0 && (
            <div style={{ padding: '22px 14px', color: 'rgba(255,255,255,.4)', fontSize: 14 }}>
              No results for “{query}”
            </div>
          )}
          {filtered.map((it, i) => (
            <div
              key={it.label}
              className={`ld-cmd-item ${i === idx ? 'is-active' : ''}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => { it.run(); onClose(); }}
            >
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8">
                {it.icon}
              </svg>
              <span style={{ fontSize: 14.5 }}>{it.label}</span>
              <span className="ld-cmd-hint">{it.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Accent Picker                                                      */
/* ------------------------------------------------------------------ */
function AccentPicker({ accent, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ld-accent-wrap">
      {open && (
        <div className="ld-accent-panel">
          {PALETTE.map((p) => (
            <button
              key={p.name}
              title={p.name}
              onClick={() => onChange(p.hex)}
              className={`ld-accent-swatch ${accent === p.hex ? 'is-active' : ''}`}
              style={{ background: p.hex, boxShadow: `0 0 14px ${p.hex}` }}
              aria-label={p.name}
            />
          ))}
        </div>
      )}
      <button
        className="ld-accent-toggle"
        onClick={() => setOpen((v) => !v)}
        title="Change accent"
        aria-label="Change accent color"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Particle Canvas                                                    */
/* ------------------------------------------------------------------ */
function ParticleCanvas({ accent }) {
  const ref = useRef(null);
  const accentRef = useRef(accent);
  useEffect(() => { accentRef.current = accent; }, [accent]);

  useEffect(() => {
    const canvas = ref.current;
    const wrap = canvas.parentElement;
    let w = 0, h = 0, ctx = null, parts = [], mouse = { x: -9999, y: -9999 }, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = '100%'; canvas.style.height = '100%';
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(24, Math.min(64, Math.floor(w / 30)));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .32, vy: (Math.random() - .5) * .32,
        r: Math.random() * 1.5 + 1,
      }));
    };
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const tick = () => {
      if (!ctx) { raf = requestAnimationFrame(tick); return; }
      const ac = accentRef.current;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.fillStyle = hexToRgba(ac, .65);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120) {
            ctx.strokeStyle = `rgba(125,140,255,${(1 - Math.sqrt(d2) / 120) * .18})`;
            ctx.lineWidth = .7;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const a = parts[i];
        const dx = a.x - mouse.x, dy = a.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 170 * 170) {
          ctx.strokeStyle = hexToRgba(ac, (1 - Math.sqrt(d2) / 170) * .45);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    resize(); tick();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);
  return <canvas ref={ref} className="ld-hero-canvas" />;
}

/* ------------------------------------------------------------------ */
/*  Counter                                                            */
/* ------------------------------------------------------------------ */
function Counter({ end, suffix = '', decimals = 0, duration = 1600 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0, started = false;
    const run = () => {
      if (started) return;
      started = true;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const ease = 1 - Math.pow(1 - p, 4);
        el.textContent = (end * ease).toLocaleString('en-US', {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals,
        }) + suffix;
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(); io.unobserve(en.target); } });
    }, { threshold: .4 });
    io.observe(el);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [end, decimals, duration, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/*  Rotating Word                                                      */
/* ------------------------------------------------------------------ */
function RotatingWord({ words = ['TRACK', 'ANALYZE', 'OPTIMIZE', 'SCALE'] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % words.length), 2400);
    return () => clearInterval(id);
  }, [words.length]);
  return (
    <span key={i} style={{ display: 'inline-block', animation: 'ldFadeUp .6s cubic-bezier(.2,.8,.25,1)' }}>
      <span className="ld-gradtext">{words[i]}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Reveal on scroll                                                   */
/* ------------------------------------------------------------------ */
function initReveal() {
  const els = Array.from(document.querySelectorAll('.ld-reveal:not(.ld-inited)'));
  if (!els.length) return;
  els.forEach((el) => el.classList.add('ld-inited'));
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('ld-visible')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('ld-visible'); io.unobserve(en.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -70px 0px' });
  els.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ */
/*  Tilt                                                               */
/* ------------------------------------------------------------------ */
function onTilt(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - .5;
  const y = (e.clientY - r.top) / r.height - .5;
  el.style.transform = `perspective(1000px) rotateX(${-y * 9}deg) rotateY(${x * 11}deg) translateY(-6px)`;
}
function offTilt(e) {
  e.currentTarget.style.transform = '';
}

/* ------------------------------------------------------------------ */
/*  Session Clock                                                      */
/* ------------------------------------------------------------------ */
function SessionClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const h = et.getHours();
  const m = et.getMinutes();
  const day = et.getDay();
  const isWeekend = day === 0 || day === 6;
  const isOpen = !isWeekend && ((h === 9 && m >= 30) || (h > 9 && h < 16));
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ET`;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      fontFamily: 'ui-monospace, monospace', fontSize: 11.5,
      color: 'rgba(255,255,255,.55)',
      padding: '5px 10px', borderRadius: 8,
      border: '1px solid rgba(255,255,255,.09)',
      background: 'rgba(255,255,255,.025)',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isOpen ? '#22c55e' : 'rgba(255,255,255,.25)',
        boxShadow: isOpen ? '0 0 10px #22c55e' : 'none',
        animation: isOpen ? 'ldPulse 1.4s infinite' : 'none',
      }} />
      {time} · {isOpen ? 'OPEN' : 'CLOSED'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Dashboard                                                     */
/* ------------------------------------------------------------------ */
function HeroDashboard({ accent }) {
  const [m, setM] = useState(0);
  const [pnl, setPnl] = useState(4812);
  const [hoverMetric, setHoverMetric] = useState(null);
  const [hoverPt, setHoverPt] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setM((v) => (v + 1) % 5), 2000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      setPnl((v) => {
        const delta = (Math.random() - .4) * 240;
        return Math.max(3000, Math.min(7000, v + delta));
      });
    }, 1600);
    return () => clearInterval(id);
  }, []);

  const metrics = [
    ['Net P/L', `${pnl >= 0 ? '+' : '-'}$${Math.round(Math.abs(pnl)).toLocaleString()}`, '#22c55e', 'Live cumulative P/L across all closed trades.'],
    ['Win rate', '58.4%', '#22c55e', 'Share of trades closed in profit over the last 100 sessions.'],
    ['Expectancy', '+1.42R', accent, 'Average R earned per trade. The single most decision-relevant number.'],
    ['Sharpe', '2.7', '#22d3ee', 'Risk-adjusted return. Above 2.0 is elite for a discretionary book.'],
    ['Drawdown', '-8.1%', '#ef4444', 'Peak-to-trough equity decline over the sample window.'],
  ];

  // Interactive chart with hover tracking
  const W = 900, H = 300;
  const pts = useMemo(() => {
    const seed = [0, 196, 210, 160, 176, 120, 140, 92, 118, 64, 96, 40, 60];
    return seed.map((y, i) => ({ x: (i / (seed.length - 1)) * W, y }));
  }, []);

  const path = useMemo(() => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '), [pts]);

  const onChartMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    // find nearest point
    let nearest = pts[0], best = Infinity;
    for (const p of pts) {
      const d = Math.abs(p.x - x);
      if (d < best) { best = d; nearest = p; }
    }
    setHoverPt(nearest);
  };

  return (
    <div
      className="ld-tilt"
      onMouseMove={onTilt}
      onMouseLeave={offTilt}
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #10141D, #0B0E15)',
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,.09)',
        boxShadow: `0 50px 100px -40px rgba(0,0,0,.95), 0 0 0 1px rgba(255,255,255,.03) inset, 0 0 60px -20px ${hexToRgba(accent, .28)}`,
        animation: 'ldFloat 7s ease-in-out infinite',
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 18px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        {['#EF4444', '#F59E0B', '#10B981'].map((c) => (
          <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: .85 }} />
        ))}
        <span style={{ flex: 1 }} />
        <span style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 11,
          color: hexToRgba(accent, .9), background: hexToRgba(accent, .08),
          border: `1px solid ${hexToRgba(accent, .28)}`,
          padding: '3px 10px', borderRadius: 99, letterSpacing: '.1em',
        }}>
          LIVE
        </span>
        <span style={{
          width: 9, height: 9, borderRadius: '50%', background: '#22c55e',
          boxShadow: '0 0 12px #22c55e', animation: 'ldPulse 1.4s infinite',
        }} />
      </div>

      {/* Metric tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 10, padding: '18px 18px 6px' }}>
        {metrics.map(([label, val, color, tip], i) => (
          <div
            key={label}
            onMouseEnter={() => setHoverMetric(i)}
            onMouseLeave={() => setHoverMetric(null)}
            style={{
              position: 'relative',
              background: i === m ? hexToRgba(accent, .08) : 'rgba(255,255,255,.03)',
              border: `1px solid ${i === m ? hexToRgba(accent, .32) : 'rgba(255,255,255,.06)'}`,
              borderRadius: 11, padding: '9px 12px',
              transition: 'all .45s cubic-bezier(.2,.8,.25,1)',
              transform: hoverMetric === i ? 'translateY(-3px)' : 'none',
              cursor: 'help',
            }}
          >
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.48)', marginBottom: 3, letterSpacing: '.04em' }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>{val}</div>
            {hoverMetric === i && (
              <div className="ld-tip" style={{ top: -8, left: '50%', whiteSpace: 'normal', width: 200, textAlign: 'center', lineHeight: 1.5 }}>
                {tip}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ padding: '10px 16px 20px', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="270"
          preserveAspectRatio="none"
          style={{ display: 'block', cursor: 'crosshair' }}
          onMouseMove={onChartMove}
          onMouseLeave={() => setHoverPt(null)}
        >
          <defs>
            <linearGradient id="lda" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={accent} stopOpacity=".35" />
              <stop offset="1" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[60, 120, 180, 240].map((y) => (
            <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,.05)" />
          ))}
          <path
            d={`${path} L${W} ${H} L0 ${H} Z`}
            fill="url(#lda)"
          />
          <path
            d={path}
            fill="none"
            stroke={accent}
            strokeWidth="3.2"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 12px ${hexToRgba(accent, .5)})` }}
          />
          {hoverPt && (
            <g>
              <line x1={hoverPt.x} y1="0" x2={hoverPt.x} y2={H} stroke={hexToRgba(accent, .4)} strokeDasharray="3 3" />
              <circle cx={hoverPt.x} cy={hoverPt.y} r="6" fill={accent} stroke="#0A0D13" strokeWidth="2" />
            </g>
          )}
          <circle cx={W} cy={pts[pts.length - 1].y} r="5" fill={accent} style={{ animation: 'ldPulse 1.3s infinite' }} />
          <text x="690" y="34" fontSize="13" fill="#86efac" fontFamily="ui-monospace, monospace">+19.4R</text>
          <text x="470" y="82" fontSize="13" fill={hexToRgba(accent, .95)} fontFamily="ui-monospace, monospace">+$458</text>
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  R:R Simulator (star feature)                                       */
/* ------------------------------------------------------------------ */
function genEquity(winRate, rr, n, seed) {
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pts = [0];
  let eq = 0;
  for (let i = 0; i < n; i++) {
    const win = rand() < winRate;
    eq += win ? rr : -1;
    pts.push(eq);
  }
  return pts;
}

function RrSimulator({ accent }) {
  const [wr, setWr] = useState(55);
  const [rr, setRr] = useState(1.8);
  const [n, setN] = useState(200);
  const [seed, setSeed] = useState(7);

  const stats = useMemo(() => {
    const p = wr / 100;
    const expectancy = p * rr - (1 - p);
    const evDollars = expectancy * 100;
    const pf = (p * rr) / Math.max(0.0001, 1 - p);
    const kelly = p - (1 - p) / Math.max(0.0001, rr);
    return { expectancy, evDollars, pf, kelly };
  }, [wr, rr]);

  const curve = useMemo(() => genEquity(wr / 100, rr, n, seed), [wr, rr, n, seed]);

  const { path, area, maxDD } = useMemo(() => {
    if (!curve.length) return { path: '', area: '', maxDD: 0 };
    const min = Math.min(...curve, 0);
    const max = Math.max(...curve, 1);
    const range = max - min || 1;
    const W = 900, H = 260;
    const pts = curve.map((v, i) => ({
      x: (i / (curve.length - 1)) * W,
      y: H - ((v - min) / range) * (H - 30) - 15,
    }));
    const p = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    const a = `${p} L${W} ${H} L0 ${H} Z`;
    let peak = -Infinity, dd = 0;
    for (const v of curve) {
      if (v > peak) peak = v;
      dd = Math.min(dd, v - peak);
    }
    return { path: p, area: a, maxDD: dd };
  }, [curve]);

  const last = curve[curve.length - 1];
  const color = stats.expectancy >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div
      className="ld-reveal"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012))',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 26,
        padding: 0,
        overflow: 'hidden',
        boxShadow: `0 50px 100px -60px ${hexToRgba(accent, .5)}`,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr' }} className="ld-rrsim-grid">
        {/* Controls */}
        <div style={{ padding: '30px 28px', borderRight: '1px solid rgba(255,255,255,.06)' }}>
          <div className="ld-eyebrow" style={{ marginBottom: 10 }}>Live Simulator</div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 24, lineHeight: 1.2 }}>
            Test the math of your edge
          </h3>

          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.65)' }}>Win Rate</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: accent }}>{wr}%</span>
            </div>
            <input className="ld-range" type="range" min="20" max="85" value={wr} onChange={(e) => setWr(+e.target.value)} />
          </div>

          <div style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.65)' }}>Risk : Reward</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: accent }}>{rr.toFixed(2)}R</span>
            </div>
            <input className="ld-range" type="range" min="0.5" max="5" step="0.1" value={rr} onChange={(e) => setRr(+e.target.value)} />
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.65)' }}>Sample Size</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: accent }}>{n} trades</span>
            </div>
            <input className="ld-range" type="range" min="50" max="500" step="10" value={n} onChange={(e) => setN(+e.target.value)} />
          </div>

          <button
            onClick={() => setSeed((s) => s + 1)}
            className="ld-btn ld-secondary"
            style={{ fontSize: 13.5, padding: '11px 18px', width: '100%', background: hexToRgba(accent, .08), borderColor: hexToRgba(accent, .3) }}
          >
            <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 11a8 8 0 1 1 2 5.3M3 18v-5h5" />
            </svg>
            Reroll sequence
          </button>
        </div>

        {/* Results */}
        <div style={{ padding: '30px 30px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em', marginBottom: 4 }}>EXPECTANCY</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color, fontFamily: 'ui-monospace, monospace', letterSpacing: '-.02em', lineHeight: 1 }}>
                {stats.expectancy >= 0 ? '+' : ''}{stats.expectancy.toFixed(2)}R
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', marginTop: 6, fontFamily: 'ui-monospace, monospace' }}>
                {stats.evDollars >= 0 ? '+' : ''}${stats.evDollars.toFixed(0)} per $100 risked
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em', marginBottom: 4 }}>PROFIT FACTOR</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', fontFamily: 'ui-monospace, monospace', letterSpacing: '-.02em', lineHeight: 1 }}>
                {stats.pf.toFixed(2)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', marginTop: 6, fontFamily: 'ui-monospace, monospace' }}>
                {stats.pf >= 2 ? 'Elite' : stats.pf >= 1.5 ? 'Solid' : stats.pf >= 1 ? 'Marginal' : 'Negative'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em', marginBottom: 4 }}>KELLY %</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: stats.kelly >= 0 ? '#22d3ee' : '#ef4444', fontFamily: 'ui-monospace, monospace', letterSpacing: '-.02em', lineHeight: 1 }}>
                {stats.kelly >= 0 ? '+' : ''}{(stats.kelly * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', marginTop: 6, fontFamily: 'ui-monospace, monospace' }}>
                {stats.kelly >= 0 ? 'of bankroll per trade' : 'do not trade this'}
              </div>
            </div>
          </div>

          {/* Equity curve */}
          <div style={{ position: 'relative', marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', fontFamily: 'ui-monospace, monospace', letterSpacing: '.05em' }}>SIMULATED EQUITY</div>
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>
                <span style={{ color: 'rgba(255,255,255,.5)' }}>End </span>
                <span style={{ color, fontWeight: 700 }}>{last >= 0 ? '+' : ''}{last.toFixed(1)}R</span>
                <span style={{ color: 'rgba(255,255,255,.5)', marginLeft: 14 }}>Max DD </span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{maxDD.toFixed(1)}R</span>
              </div>
            </div>
            <svg viewBox="0 0 900 260" width="100%" height="220" preserveAspectRatio="none" style={{ display: 'block' }}>
              <defs>
                <linearGradient id="rrsim-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={accent} stopOpacity=".35" />
                  <stop offset="1" stopColor={accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[60, 120, 180].map((y) => (
                <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="rgba(255,255,255,.05)" />
              ))}
              <line x1="0" y1="130" x2="900" y2="130" stroke="rgba(255,255,255,.1)" strokeDasharray="4 4" />
              <path d={area} fill="url(#rrsim-fill)" />
              <path
                d={path}
                fill="none"
                stroke={accent}
                strokeWidth="2.4"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 10px ${hexToRgba(accent, .55)})` }}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Monte Carlo Runner                                                 */
/* ------------------------------------------------------------------ */
function MonteCarlo({ accent }) {
  const [runs, setRuns] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runSim = () => {
    if (running) return;
    setRunning(true);
    setProgress(0);
    setRuns([]);
    const total = 40;
    let count = 0;
    const next = () => {
      count++;
      const seed = Math.floor(Math.random() * 900) + 20;
      const path = genEquity(0.55, 1.8, 300, seed);
      setRuns((r) => [...r, path]);
      setProgress(count / total);
      if (count < total) setTimeout(next, 22);
      else setTimeout(() => setRunning(false), 300);
    };
    next();
  };

  useEffect(() => { runSim(); /* eslint-disable-next-line */ }, []);

  const { paths, p5, p95, W, H } = useMemo(() => {
    const W = 900, H = 260, N = 300;
    if (!runs.length) return { paths: [], p5: null, p95: null, W, H };
    const flat = runs.flat();
    const min = Math.min(...flat, 0);
    const max = Math.max(...flat, 1);
    const range = max - min || 1;
    const scale = (v, i) => ({
      x: (i / N) * W,
      y: H - ((v - min) / range) * (H - 30) - 15,
    });
    const paths = runs.map((c) =>
      c.map((v, i) => {
        const pt = scale(v, i);
        return `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
      }).join(' ')
    );
    // percentiles per index
    const p5Arr = [], p95Arr = [];
    for (let i = 0; i <= N; i++) {
      const col = runs.map((r) => r[i]).sort((a, b) => a - b);
      const lo = col[Math.floor(col.length * 0.05)];
      const hi = col[Math.floor(col.length * 0.95)];
      p5Arr.push(scale(lo, i));
      p95Arr.push(scale(hi, i));
    }
    const p5 = p5Arr.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    const p95 = p95Arr.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    return { paths, p5, p95, W, H };
  }, [runs]);

  const finalMedian = useMemo(() => {
    if (!runs.length) return 0;
    const finals = runs.map((r) => r[r.length - 1]).sort((a, b) => a - b);
    return finals[Math.floor(finals.length / 2)];
  }, [runs]);

  return (
    <div
      className="ld-reveal"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012))',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 26,
        padding: '32px 30px 28px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 22 }}>
        <div>
          <div className="ld-eyebrow" style={{ marginBottom: 10 }}>Monte Carlo</div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 8 }}>
            40 possible futures, right now
          </h3>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 14.5, maxWidth: 520, margin: 0, lineHeight: 1.6 }}>
            Your historical sequence, re-simulated with fresh randomness. Watch the 5th–95th percentile cone build live.
          </p>
        </div>
        <Magnetic strength={0.15}>
          <button
            onClick={runSim}
            disabled={running}
            className="ld-btn ld-primary"
            style={{ fontSize: 14, padding: '13px 24px', opacity: running ? 0.7 : 1 }}
          >
            {running ? (
              <>
                <svg width="14" height="14" viewBox="0 0 22 22" style={{ animation: 'ldSpin 1s linear infinite' }}>
                  <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="30 12" />
                </svg>
                Simulating… {Math.round(progress * 100)}%
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 22 22" fill="currentColor"><path d="M6 4l12 7-12 7z" /></svg>
                Run new simulation
              </>
            )}
          </button>
        </Magnetic>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 18, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em', marginBottom: 4, fontFamily: 'ui-monospace, monospace' }}>MEDIAN FINAL</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: finalMedian >= 0 ? '#22c55e' : '#ef4444', fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
            {finalMedian >= 0 ? '+' : ''}{finalMedian.toFixed(1)}R
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em', marginBottom: 4, fontFamily: 'ui-monospace, monospace' }}>5TH PERCENTILE</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
            {(() => {
              if (!runs.length) return '—';
              const finals = runs.map((r) => r[r.length - 1]).sort((a, b) => a - b);
              const v = finals[Math.floor(finals.length * 0.05)];
              return (v >= 0 ? '+' : '') + v.toFixed(1) + 'R';
            })()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em', marginBottom: 4, fontFamily: 'ui-monospace, monospace' }}>95TH PERCENTILE</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e', fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
            {(() => {
              if (!runs.length) return '—';
              const finals = runs.map((r) => r[r.length - 1]).sort((a, b) => a - b);
              const v = finals[Math.floor(finals.length * 0.95)];
              return (v >= 0 ? '+' : '') + v.toFixed(1) + 'R';
            })()}
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="240" preserveAspectRatio="none" style={{ display: 'block' }}>
        {[60, 120, 180].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,.05)" />
        ))}
        {paths.map((p, i) => (
          <path
            key={i}
            d={p}
            fill="none"
            stroke={hexToRgba(accent, .16)}
            strokeWidth="1"
            style={{ animation: 'ldFadeIn .4s ease' }}
          />
        ))}
        {p95 && <path d={p95} fill="none" stroke={hexToRgba(accent, .75)} strokeWidth="2" strokeDasharray="4 4" />}
        {p5 && <path d={p5} fill="none" stroke="rgba(239,68,68,.75)" strokeWidth="2" strokeDasharray="4 4" />}
      </svg>

      <div style={{ display: 'flex', gap: 22, marginTop: 14, fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: 'rgba(255,255,255,.5)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 2, background: hexToRgba(accent, .8) }} /> 95th percentile
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 2, background: 'rgba(239,68,68,.8)' }} /> 5th percentile
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 2, background: hexToRgba(accent, .3) }} /> individual paths
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const FEATURES = [
  ['Live Dashboards', 'Equity curve, win rate, expectancy — recomputed live as your journal grows.', 'chart'],
  ['Deep Backtesting', 'Dial R:R targets, session times and confluence combos to statistically prove your edge.', 'bolt'],
  ['Smart Journaling', 'Import broker sheets, tag every trade, track screenshots and the emotional side of the book.', 'book'],
  ['Monte Carlo', 'Run thousands of simulated futures to size risk instead of guessing your next 100 trades.', 'gear'],
  ['Optimization Engine', 'Find the filter combos that maximize expectancy and minimize drawdown in minutes.', 'pulse'],
  ['Zero-Opacity Audit', 'Every metric is reproducible from your raw trades. No black boxes, ever.', 'shield'],
];

const TESTS = [
  { name: 'Aarav M.', role: 'Swing Trader · 6 yrs', text: 'The R:R optimizer changed how I cut losers. I finally quantify when a setup stops working instead of hoping.' },
  { name: 'Priya S.', role: 'Futures Scalper', text: 'Uploading my broker CSV and seeing my edge on the equity curve in 30 seconds? That is the whole product.' },
  { name: 'Daniel R.', role: 'CTO, prop desk', text: 'Monte Carlo in the browser on my low screen time. I run a thousand scenarios before ever risking a dollar.' },
];

const ICONS = {
  chart: <path d="M3 17 C8 14 11 8 16 9 20 5 21 4 22 3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  bolt: <path d="M13 2 L6 12 h5 l-1 8 7 -10 h-5 z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />,
  book: <><path d="M5 4 h6 v14 H5 z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M14 5 c-.5 4-1 8-1 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  gear: <g fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="4" /><path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.6 4.6l1.4 1.4M16 16l1.4 1.4M17.4 4.6L16 6M6 16l-1.4 1.4" strokeLinecap="round" /></g>,
  pulse: <path d="M1 11 h5 l2 -6 l3 12 l2.5 -6 h6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  shield: <path d="M11 2 L4 5 v6 c0 5 3.5 8.2 7 9.5 3.5 -1.3 7 -4.5 7 -9.5 V5 z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
};

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function Landing() {
  const [accent, setAccent] = useState(PALETTE[0].hex);
  const [scrolled, setScrolled] = useState(false);
  const [testi, setTesti] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const [cmdOpen, setCmdOpen] = useState(false);

  const accentSoft = useMemo(() => hexToRgba(accent, 0.10), [accent]);
  const accentSoft2 = useMemo(() => hexToRgba(accent, 0.30), [accent]);
  const accent2 = useMemo(() => {
    // lighten accent for gradient partner
    const h = accent.replace('#', '');
    const r = Math.min(255, parseInt(h.slice(0, 2), 16) + 60);
    const g = Math.min(255, parseInt(h.slice(2, 4), 16) + 60);
    const b = Math.min(255, parseInt(h.slice(4, 6), 16) + 60);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }, [accent]);

  /* scroll state */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    initReveal();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* testimonial rotate */
  useEffect(() => {
    const id = setInterval(() => setTesti((v) => (v + 1) % TESTS.length), 5600);
    return () => clearInterval(id);
  }, []);

  /* command palette hotkey */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const scrollTo = useCallback((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const cmdItems = useMemo(() => [
    { label: 'Go to Features', hint: 'G F', icon: ICONS.bolt, run: () => scrollTo('#features') },
    { label: 'Go to Live Simulator', hint: 'G S', icon: ICONS.pulse, run: () => scrollTo('#sim') },
    { label: 'Go to Monte Carlo', hint: 'G M', icon: ICONS.gear, run: () => scrollTo('#mc') },
    { label: 'Go to FAQ', hint: 'G Q', icon: ICONS.book, run: () => scrollTo('#faq') },
    { label: 'Start free', hint: '⏎', icon: ICONS.shield, run: () => { window.location.href = '/signup'; } },
    { label: 'Login', hint: '⏎', icon: ICONS.shield, run: () => { window.location.href = '/login'; } },
    { label: 'Back to top', hint: 'G T', icon: ICONS.chart, run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
  ], [scrollTo]);

  const rootStyle = {
    '--accent': accent,
    '--accent-2': accent2,
    '--accent-soft': accentSoft,
    '--accent-soft2': accentSoft2,
    minHeight: '100vh',
    color: '#F3F4F6',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    overflowX: 'hidden',
    WebkitFontSmoothing: 'antialiased',
    cursor: 'none',
  };

  return (
    <div className="ld-bg ld-grid" style={rootStyle}>
      <style>{LD}</style>
      <Cursor />
      <ScrollProgress />
      <AccentPicker accent={accent} onChange={setAccent} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} items={cmdItems} />

      {/* ============ NAV ============ */}
      <header
        className={`ld-nav ${scrolled ? 'ld-scrolled' : ''}`}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 5%', gap: 20,
        }}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ background: 'none', border: 'none', cursor: 'none', display: 'flex', alignItems: 'center', padding: 0 }}
        >
          <img src={navLogo} alt="Backtest Dashboard" style={{ height: 34 }} />
        </button>

        <nav style={{ display: 'flex', gap: 30, alignItems: 'center' }} className="ld-nav-links">
          <a href="#features" className="ld-navlink">Features</a>
          <a href="#sim" className="ld-navlink">Simulator</a>
          <a href="#mc" className="ld-navlink">Monte Carlo</a>
          <a href="#faq" className="ld-navlink">FAQ</a>
        </nav>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <SessionClock />
          <Link to="/login" className="ld-navlink" style={{ fontWeight: 600 }}>Login</Link>
          <Link to="/signup" className="ld-btn ld-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
            Sign Up Free
          </Link>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section
        style={{
          position: 'relative',
          padding: '150px 6% 90px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(430px, 1fr))',
          gap: 60,
          alignItems: 'center',
          maxWidth: 1560, margin: '0 auto',
        }}
      >
        <ParticleCanvas accent={accent} />

        <div className="ld-orb" style={{ position: 'absolute', left: '2%', top: '10%', width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${hexToRgba(accent, .16)}, transparent 68%)`, pointerEvents: 'none' }} />
        <div className="ld-orb2" style={{ position: 'absolute', right: '0%', top: '30%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,.09), transparent 70%)', pointerEvents: 'none' }} />

        <div className="ld-reveal ld-visible" style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: 'ui-monospace, monospace', fontSize: 12, letterSpacing: '.16em',
              color: accent, padding: '7px 15px', borderRadius: 99,
              border: `1px solid ${hexToRgba(accent, .3)}`,
              background: hexToRgba(accent, .07),
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, animation: 'ldBlink 1.6s infinite' }} />
            NEXT-GEN TRADING ANALYTICS
          </div>

          <h1 style={{
            fontSize: 'clamp(2.4rem, 5vw, 4.4rem)',
            lineHeight: 1.05, fontWeight: 800,
            letterSpacing: '-.03em', margin: '26px 0 20px',
          }}>
            Find your edge &amp; <RotatingWord />
            <br />
            the <span className="ld-gradtext">markets</span> — math-first.
          </h1>

          <p style={{ maxWidth: 580, fontSize: '1.1rem', color: 'rgba(255,255,255,.62)', lineHeight: 1.65, marginBottom: 36 }}>
            Backtest thousands of sessions, monitor your equity curve in real time, and zero in on the filter combos that actually make money.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 30 }}>
            <Magnetic>
              <Link to="/signup" className="ld-btn ld-primary" style={{ fontSize: 15.5, padding: '16px 32px' }}>
                Start Free Today →
              </Link>
            </Magnetic>
            <Magnetic>
              <button
                onClick={() => scrollTo('#sim')}
                className="ld-btn ld-secondary"
                style={{ fontSize: 15.5, padding: '16px 32px', cursor: 'none' }}
              >
                See your edge live
              </button>
            </Magnetic>
          </div>

          <div style={{
            display: 'flex', gap: 10, alignItems: 'center',
            color: 'rgba(255,255,255,.42)', fontSize: 12.5,
            fontFamily: 'ui-monospace, monospace', letterSpacing: '.05em',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: '#22c55e', boxShadow: '0 0 10px #22c55e', animation: 'ldBlink 1.4s infinite' }} />
            CSV · XLSX · LIVE RECOMPUTE · NO CREDIT CARD
          </div>
        </div>

        <div className="ld-reveal ld-visible" style={{ position: 'relative', zIndex: 1 }}>
          <HeroDashboard accent={accent} />
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section style={{ padding: '40px 6% 90px', maxWidth: 1560, margin: '0 auto', textAlign: 'center' }}>
        <h2 className="ld-reveal" style={{
          fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)', fontWeight: 800,
          letterSpacing: '-.02em', marginBottom: 14,
        }}>
          Numbers the math <span className="ld-gradtext">won’t fudge</span>
        </h2>
        <p className="ld-reveal" style={{ color: 'rgba(255,255,255,.55)', fontSize: '1.05rem', marginBottom: 48 }}>
          Calculated from raw trade sheets. Reproducible, always.
        </p>

        <div
          className="ld-reveal"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            background: 'linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012))',
            border: '1px solid rgba(255,255,255,.085)',
            borderRadius: 22, overflow: 'hidden',
            backdropFilter: 'blur(10px)',
          }}
        >
          {[
            [12500, '', 0, 'trades analyzed'],
            [98.2, '%', 1, 'reproducible metrics'],
            [24, 'h', 0, 'saved per week'],
            [40, '+', 0, 'strategies stress-tested'],
          ].map(([end, suffix, decimals, label], i) => (
            <div key={label} style={{
              padding: '38px 22px',
              borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,.07)',
            }}>
              <div style={{
                fontSize: 'clamp(1.9rem, 3vw, 2.5rem)', fontWeight: 800,
                letterSpacing: '-.02em', color: accent,
                fontFamily: 'ui-monospace, monospace',
              }}>
                <Counter end={end} suffix={suffix} decimals={decimals} />
              </div>
              <div style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ RR SIMULATOR ============ */}
      <section id="sim" className="ld-section" style={{ padding: '20px 6% 90px', maxWidth: 1560, margin: '0 auto' }}>
        <div className="ld-reveal" style={{ textAlign: 'center', marginBottom: 42 }}>
          <div className="ld-eyebrow" style={{ marginBottom: 14 }}>Play with the math</div>
          <h2 style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 14 }}>
            Drag the sliders. Watch your edge <span className="ld-gradtext">move</span>.
          </h2>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '1.05rem', maxWidth: 620, margin: '0 auto' }}>
            Every number below recomputes instantly — expectancy, profit factor, Kelly sizing, and a fresh 200-trade equity path.
          </p>
        </div>

        <RrSimulator accent={accent} />
      </section>

      <div className="ld-divider" style={{ maxWidth: 1200, margin: '0 auto' }} />

      {/* ============ FEATURES ============ */}
      <section id="features" className="ld-section" style={{ padding: '90px 6%', maxWidth: 1560, margin: '0 auto' }}>
        <div className="ld-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="ld-eyebrow" style={{ marginBottom: 14 }}>Capabilities</div>
          <h2 style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 14 }}>
            Everything to treat trading like a <span className="ld-gradtext">business</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '1.05rem' }}>Six instruments. One edge-finder.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 26 }}>
          {FEATURES.map(([title, desc, kind]) => (
            <div key={title} className="ld-card ld-reveal ld-tilt" onMouseMove={onTilt} onMouseLeave={offTilt} style={{ overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,.05) 50%, transparent 65%)', animation: 'ldShine 6s ease-in-out infinite' }} />
              <div className="ld-icon-tile" style={{ marginBottom: 22 }}>
                <svg width="26" height="26" viewBox="0 0 22 22" fill="currentColor">{ICONS[kind]}</svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: 12, fontWeight: 700, letterSpacing: '-.01em' }}>{title}</h3>
              <p style={{ color: 'rgba(255,255,255,.6)', lineHeight: 1.65, fontSize: 14.5, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ MONTE CARLO ============ */}
      <section id="mc" className="ld-section" style={{ padding: '20px 6% 90px', maxWidth: 1560, margin: '0 auto' }}>
        <MonteCarlo accent={accent} />
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section style={{ padding: '40px 6% 90px', maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
        <div className="ld-eyebrow ld-reveal" style={{ marginBottom: 14 }}>Signal, not noise</div>
        <h2 className="ld-reveal" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 44 }}>
          Traders who <span className="ld-gradtext">stopped guessing</span>
        </h2>

        <div
          key={testi}
          className="ld-reveal ld-visible"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012))',
            border: '1px solid rgba(255,255,255,.09)',
            borderRadius: 24, padding: '48px 40px',
            animation: 'ldFadeUp .6s cubic-bezier(.2,.8,.25,1)',
            boxShadow: `0 40px 80px -50px ${hexToRgba(accent, .4)}`,
          }}
        >
          <div style={{ color: accent, fontSize: 16, letterSpacing: 4, marginBottom: 20 }}>★★★★★</div>
          <p style={{
            fontSize: 'clamp(1.05rem, 1.8vw, 1.28rem)', lineHeight: 1.6,
            margin: '0 0 24px', fontStyle: 'italic',
            color: 'rgba(255,255,255,.85)',
          }}>
            “{TESTS[testi].text}”
          </p>
          <div style={{ color: 'rgba(255,255,255,.92)', fontWeight: 700, fontSize: 15 }}>{TESTS[testi].name}</div>
          <div style={{ color: 'rgba(255,255,255,.45)', fontSize: 13, marginTop: 3 }}>{TESTS[testi].role}</div>

          <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 28 }}>
            {TESTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTesti(i)}
                aria-label={`testimonial ${i + 1}`}
                style={{
                  width: i === testi ? 26 : 8, height: 8, borderRadius: 99, border: 'none',
                  background: i === testi ? accent : 'rgba(255,255,255,.18)',
                  cursor: 'none', transition: 'all .35s cubic-bezier(.2,.8,.25,1)', padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="ld-section" style={{ padding: '40px 6% 90px', maxWidth: 980, margin: '0 auto' }}>
        <div className="ld-reveal" style={{ textAlign: 'center', marginBottom: 46 }}>
          <div className="ld-eyebrow" style={{ marginBottom: 14 }}>FAQ</div>
          <h2 style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-.02em' }}>
            Questions traders actually <span className="ld-gradtext">ask</span>
          </h2>
        </div>

        {[
          ['Is my data ever sent anywhere?', 'Your trade data is stored in your own Firebase project / account record. The app never sells it, and every metric is computed locally from your raw sheets before anything is synced.'],
          ['How is this different from a spreadsheet?', 'A spreadsheet shows you history. This shows you verdicts — expectancy, drawdown risk, R:R optimization, and Monte Carlo ranges computed instantly every time you import or filter.'],
          ['What formats can I import?', 'CSV and XLSX broker exports work out of the box, including symbol columns, timestamps, win/loss, and R:R. Unknown columns are detected automatically and can be mapped in the import screen.'],
          ['Do I need to be profitable already to use it?', 'No — that is the whole point. Import your book even if it is losing and let the optimizer tell you which sessions, targets, or filters might flip it, before you risk more.'],
          ['Can I export or delete my data?', 'Yes. Your journal is your data — export anytime, or delete your account to purge records from your Firebase project. No lock-in, no dark patterns.'],
        ].map(([q, a], i) => {
          const open = openFaq === i;
          return (
            <div
              key={q}
              className="ld-reveal"
              style={{
                border: `1px solid ${open ? hexToRgba(accent, .3) : 'rgba(255,255,255,.085)'}`,
                borderRadius: 16,
                background: open ? `linear-gradient(180deg, ${hexToRgba(accent, .06)}, rgba(255,255,255,.012))` : 'rgba(255,255,255,.022)',
                padding: '18px 22px', marginBottom: 12,
                transition: 'all .35s cubic-bezier(.2,.8,.25,1)',
              }}
            >
              <button
                onClick={() => setOpenFaq(open ? -1 : i)}
                aria-expanded={open}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  cursor: 'none', color: 'rgba(255,255,255,.92)', fontSize: 15.5,
                  fontWeight: 600, padding: '4px 0', gap: 16, fontFamily: 'inherit',
                }}
              >
                <span>{q}</span>
                <span style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                  border: `1px solid ${hexToRgba(accent, .5)}`, color: accent,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'ui-monospace, monospace', fontSize: 16,
                  transition: 'transform .35s cubic-bezier(.2,.8,.25,1)',
                  transform: open ? 'rotate(45deg)' : 'none',
                }}>+</span>
              </button>
              {open && (
                <div style={{
                  textAlign: 'left', color: 'rgba(255,255,255,.65)', fontSize: 14.5,
                  lineHeight: 1.7, marginTop: 12,
                  animation: 'ldFadeUp .4s cubic-bezier(.2,.8,.25,1)',
                }}>
                  {a}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ============ CTA ============ */}
      <section style={{ padding: '20px 6% 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="ld-reveal" style={{
          position: 'relative', textAlign: 'center',
          padding: '72px 40px', borderRadius: 28, overflow: 'hidden',
          background: `radial-gradient(700px 340px at 50% 0%, ${hexToRgba(accent, .18)}, transparent 70%), linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012))`,
          border: '1px solid rgba(255,255,255,.1)',
          boxShadow: `0 50px 100px -60px ${hexToRgba(accent, .6)}`,
        }}>
          <div style={{ fontSize: 36, marginBottom: 18, animation: 'ldFloat 4.5s ease-in-out infinite' }}>⚡</div>
          <h2 style={{ fontSize: 'clamp(1.9rem, 3.6vw, 2.8rem)', fontWeight: 800, letterSpacing: '-.025em', marginBottom: 18 }}>
            Your next 100 trades deserve <span className="ld-gradtext">a plan</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '1.08rem', maxWidth: 520, margin: '0 auto 38px', lineHeight: 1.6 }}>
            Free forever for one account. Upload a broker sheet and see your edge in under a minute.
          </p>
          <Magnetic strength={0.2}>
            <Link to="/signup" className="ld-btn ld-primary" style={{ fontSize: 16.5, padding: '18px 40px' }}>
              Create Your Free Account →
            </Link>
          </Magnetic>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,.07)',
        padding: '40px 6%',
        display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 22,
        color: 'rgba(255,255,255,.42)',
        fontFamily: 'ui-monospace, monospace', fontSize: 12.5,
        background: 'rgba(255,255,255,.012)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={navLogo} alt="logo" style={{ height: 24, opacity: .5 }} />
          <span>© {new Date().getFullYear()} Trading Analytics. All rights reserved.</span>
        </div>
        <div style={{ display: 'flex', gap: 26 }}>
          {['Privacy Policy', 'Terms of Service', 'Support'].map((t) => (
            <span
              key={t}
              style={{ cursor: 'none', transition: 'color .2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,.55)')}
            >
              {t}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}