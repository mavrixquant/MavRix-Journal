import { useEffect, useRef, useState } from 'react';
import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import landTopo from 'world-atlas/land-110m.json';
import { CURRENCY_GEO } from '../lib/currencyGeo';

/* ------------------------------------------------------------------ */
/*  Land dots: sampled once from real coastline data, then cached      */
/* ------------------------------------------------------------------ */
const D2R = Math.PI / 180;
let LAND = null;

function buildLand(n = 14000) {
  const f = feature(landTopo, landTopo.objects.land);
  const feats = f.type === 'FeatureCollection' ? f.features : [f];
  const polys = [];
  for (const ft of feats) {
    const g = ft.geometry;
    const list = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
    for (const coords of list) {
      let minX = 181, maxX = -181, minY = 91, maxY = -91;
      for (const [x, y] of coords[0]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      polys.push({ minX, maxX, minY, maxY, geom: { type: 'Polygon', coordinates: coords } });
    }
  }
  const sLat = [], cLat = [], lng = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const la = Math.asin(1 - (i / (n - 1)) * 2) / D2R;
    const lo = ((((i * golden) / D2R + 180) % 360) + 360) % 360 - 180;
    const hit = polys.some(
      (p) => la >= p.minY && la <= p.maxY && lo >= p.minX && lo <= p.maxX && geoContains(p.geom, [lo, la])
    );
    if (!hit) continue;
    sLat.push(Math.sin(la * D2R));
    cLat.push(Math.cos(la * D2R));
    lng.push(lo * D2R);
  }
  return { sLat: Float32Array.from(sLat), cLat: Float32Array.from(cLat), lng: Float32Array.from(lng), n: lng.length };
}

/* ------------------------------------------------------------------ */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = (n) => String(n).padStart(2, '0');

function readRgb(el, varName, fallback) {
  try {
    const raw = getComputedStyle(el).getPropertyValue(varName).trim();
    if (!raw) return fallback;
    const probe = document.createElement('span');
    probe.style.color = raw;
    el.appendChild(probe);
    const m = getComputedStyle(probe).color.match(/[\d.]+/g);
    el.removeChild(probe);
    return m ? [Math.round(m[0]), Math.round(m[1]), Math.round(m[2])] : fallback;
  } catch {
    return fallback;
  }
}

function Countdown({ to }) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const ms = Math.max(0, new Date(to).getTime() - t);
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  const s = Math.floor((ms % 6e4) / 1e3);
  return (
    <span className="eg-count">
      {d > 0 && <span className="eg-count-d">{d}d</span>}
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

export default function MarketGlobe({
  stats = [],
  selected = [],
  focus = null,
  next = null,
  loading = false,
  onPick,
  onOpenEvent,
}) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState(0);
  const [land, setLand] = useState(LAND);
  const [tip, setTip] = useState(null);

  // live values read by the render loop (no restart when they change)
  const statsRef = useRef(stats);
  const selectedRef = useRef(selected);
  const rot = useRef({ lng: 10, lat: 22 });
  const target = useRef(null);
  const holdUntil = useRef(0);
  const drag = useRef(null);
  const hits = useRef([]);
  const hoverRef = useRef(null);
  const zoomTarget = useRef(1);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const landRef = useRef(land);

  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { landRef.current = land; }, [land]);

  // build land dots after first paint so the page never blocks
  useEffect(() => {
    if (LAND) return undefined;
    const id = setTimeout(() => {
      LAND = buildLand();
      setLand(LAND);
    }, 40);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(Math.floor(Math.min(width, height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // mouse-wheel / trackpad zoom (native listener so the page doesn't scroll)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      zoomTarget.current = clamp(zoomTarget.current * Math.exp(-e.deltaY * 0.0015), 0.8, 3.5);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    if (!focus) return;
    const geo = CURRENCY_GEO[focus.currency];
    if (!geo) return;
    target.current = { lng: geo[1], lat: clamp(geo[0] * 0.7, -35, 35) };
    holdUntil.current = performance.now() + 5000;
  }, [focus]);

  /* ----------------------------- render loop ----------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || size < 80) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const [ar, ag, ab] = readRgb(stage, '--accent', [251, 191, 36]);
    const acc = (a) => `rgba(${ar},${ag},${ab},${a})`;
    const INK = '136,146,163'; // --ink-2

    const cx = size / 2;
    const cy = size / 2;
    const baseR = size * 0.42;
    let zoom = 1;

    // graticule polylines (lat/lng in radians), projected each frame
    const lines = [];
    for (let lo = -180; lo < 180; lo += 30) {
      const pts = [];
      for (let la = -90; la <= 90; la += 6) pts.push([la * D2R, lo * D2R]);
      lines.push(pts);
    }
    for (let la = -60; la <= 60; la += 30) {
      const pts = [];
      for (let lo = -180; lo <= 180; lo += 6) pts.push([la * D2R, lo * D2R]);
      lines.push(pts);
    }

    let raf;
    let last = performance.now();

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const r = rot.current;
      zoom += (zoomTarget.current - zoom) * 0.15;
      const R = baseR * zoom;
      const ds = 1.6 * Math.sqrt(zoom);

      // rotation: ease to target, otherwise slow auto-spin
      if (target.current) {
        let d = target.current.lng - r.lng;
        d = ((((d + 180) % 360) + 360) % 360) - 180;
        r.lng += d * 0.08;
        r.lat += (target.current.lat - r.lat) * 0.08;
        if (Math.abs(d) < 0.2) target.current = null;
      } else if (!drag.current && !reduce && now > holdUntil.current) {
        r.lng += 6 * dt;
      }

      const l0 = r.lng * D2R;
      const sp = Math.sin(r.lat * D2R);
      const cp = Math.cos(r.lat * D2R);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // atmosphere glow in the accent colour
      const glow = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.3);
      glow.addColorStop(0, acc(0.2));
      glow.addColorStop(1, acc(0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // sphere body
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, '#1A2030');
      body.addColorStop(1, '#0B0E15');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // graticule
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const pts of lines) {
        let pen = false;
        for (const [la, lo] of pts) {
          const dl = lo - l0;
          const cl = Math.cos(dl);
          const cLa = Math.cos(la);
          const sLa = Math.sin(la);
          if (sp * sLa + cp * cLa * cl > 0) {
            const x = cx + R * cLa * Math.sin(dl);
            const y = cy - R * (cp * sLa - sp * cLa * cl);
            if (pen) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
            pen = true;
          } else pen = false;
        }
      }
      ctx.stroke();

      // land dots
      const L = landRef.current;
      if (L) {
        ctx.fillStyle = `rgb(${INK})`;
        for (let i = 0; i < L.n; i += 1) {
          const dl = L.lng[i] - l0;
          const cl = Math.cos(dl);
          const cosc = sp * L.sLat[i] + cp * L.cLat[i] * cl;
          if (cosc <= 0.04) continue;
          ctx.globalAlpha = 0.14 + 0.62 * Math.sqrt(cosc);
          ctx.fillRect(cx + R * L.cLat[i] * Math.sin(dl) - ds / 2, cy - R * (cp * L.sLat[i] - sp * L.cLat[i] * cl) - ds / 2, ds, ds);
        }
        ctx.globalAlpha = 1;
      }

      // rim light
      ctx.strokeStyle = acc(0.28);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      // markers
      const sel = selectedRef.current;
      const anySel = sel.length > 0;
      const found = [];
      const t = now / 1000;
      statsRef.current.forEach((s, idx) => {
        const geo = CURRENCY_GEO[s.currency];
        if (!geo) return;
        const la = geo[0] * D2R;
        const dl = geo[1] * D2R - l0;
        const cLa = Math.cos(la);
        const sLa = Math.sin(la);
        const cl = Math.cos(dl);
        const cosc = sp * sLa + cp * cLa * cl;
        if (cosc <= 0.08) return;
        const x = cx + R * cLa * Math.sin(dl);
        const y = cy - R * (cp * sLa - sp * cLa * cl);
        const isSel = sel.includes(s.currency);
        const isHover = hoverRef.current === s.currency;
        const rad = (3 + Math.min(4.5, Math.sqrt(s.count) * 0.45) + (isSel ? 1 : 0)) * Math.sqrt(zoom);
        const alpha = (anySel && !isSel ? 0.5 : 1) * Math.min(1, 0.4 + cosc);

        if (s.high > 0 && !reduce) {
          const ph = (t * 0.7 + idx * 0.37) % 1;
          ctx.strokeStyle = acc((1 - ph) * 0.55 * alpha);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(x, y, rad + ph * 16, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowColor = acc(0.9);
        ctx.shadowBlur = isSel || isHover ? 16 : 9;
        ctx.fillStyle = acc(alpha);
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isSel || isHover) {
          ctx.strokeStyle = acc(0.9);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, rad + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = '600 10px "IBM Plex Mono", ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#E7E9EE';
          ctx.fillText(s.currency, x, y - rad - 9);
        }
        found.push({ stat: s, x, y, r: rad + 6 });
      });
      hits.current = found;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  /* ----------------------------- interaction ----------------------------- */
  const pointerPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const hitAt = (x, y) =>
    hits.current.find((h) => (h.x - x) ** 2 + (h.y - y) ** 2 <= h.r * h.r) ?? null;

  const onDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    target.current = null;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), z0: zoomTarget.current };
      drag.current = null;
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, moved: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
  };
  const onMove = (e) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      zoomTarget.current = clamp(pinch.current.z0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d0), 0.8, 3.5);
      return;
    }
    if (drag.current) {
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
      drag.current.moved += Math.abs(dx) + Math.abs(dy);
      rot.current.lng -= (dx * 0.4) / zoomTarget.current;
      rot.current.lat = clamp(rot.current.lat + (dy * 0.3) / zoomTarget.current, -60, 60);
      return;
    }
    const { x, y } = pointerPos(e);
    const hit = hitAt(x, y);
    const cur = hit?.stat.currency ?? null;
    if (hoverRef.current !== cur) {
      hoverRef.current = cur;
      setTip(hit ? { x: hit.x, y: hit.y, stat: hit.stat } : null);
      e.currentTarget.style.cursor = hit ? 'pointer' : 'grab';
    }
  };
  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      drag.current = null;
      return;
    }
    const wasClick = drag.current && drag.current.moved < 5;
    drag.current = null;
    holdUntil.current = performance.now() + 3000;
    e.currentTarget.style.cursor = hoverRef.current ? 'pointer' : 'grab';
    if (wasClick) {
      const { x, y } = pointerPos(e);
      const hit = hitAt(x, y);
      if (hit) onPick?.(hit.stat.currency);
    }
  };
  const onLeave = () => {
    hoverRef.current = null;
    setTip(null);
  };

  const chips = stats.slice(0, 8);

  return (
    <div className="ec-card eg-card">
      <div className="eg-head">
        <div>
          <div className="eg-title">Global pulse</div>
          <div className="eg-sub">Releases over the next 7 days · drag to rotate · scroll to zoom</div>
        </div>
        <span className="eg-live"><i />Live</span>
      </div>

      <div className="eg-stage-wrap">
        <div className="eg-stage" ref={stageRef}>
          <canvas
            ref={canvasRef}
            className="eg-canvas"
            style={{ width: size, height: size }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onPointerLeave={onLeave}
            onDoubleClick={() => { zoomTarget.current = 1; }}
            aria-label="Interactive globe showing where upcoming economic releases happen"
          />
          {tip && (
            <div
              className="eg-tip"
              style={{ left: tip.x + (stageRef.current ? (stageRef.current.clientWidth - size) / 2 : 0), top: tip.y + (stageRef.current ? (stageRef.current.clientHeight - size) / 2 : 0) }}
            >
              <b>{tip.stat.currency}</b> {tip.stat.count} releases · {tip.stat.high} high
            </div>
          )}
          {loading && <div className="eg-loading">Loading releases…</div>}
        </div>

        {next ? (
          <button type="button" className="eg-next" onClick={() => onOpenEvent?.(next.id)}>
            <span className="eg-next-text">
              <span className="eg-next-label">
                Next {next.impact === 'high' ? 'high-impact release' : 'release'}
              </span>
              <span className="eg-next-name">{next.currency} · {next.event}</span>
            </span>
            <Countdown to={next.dateTimeUtc} />
          </button>
        ) : (
          !loading && <div className="eg-next is-empty">No pending releases this week</div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="eg-chips">
          {chips.map((s) => {
            const active = selected.includes(s.currency);
            return (
              <button
                key={s.currency}
                type="button"
                className={`eg-chip${active ? ' is-active' : ''}`}
                onClick={() => onPick?.(s.currency)}
                title={`${s.count} releases, ${s.high} high impact`}
              >
                {s.high > 0 && <span className="eg-chip-dot" />}
                <b>{s.currency}</b>
                <span>{s.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}