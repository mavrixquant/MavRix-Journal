// apps/web/src/features/utilities/gex/components/GexLevelChart.jsx
//
// NQ GEX price ladder. Same look as the approved NQ1 GEX levels chart:
//  - to-scale price axis, with an axis break for far-away outlier levels
//  - red call wall / green put support / amber HVL / blue GEX rank bars
//  - dashed lines for 0DTE levels, shaded 1D min-max band
//  - collision-free labels with leader lines
//
// Level shape: { price:number, type?:string, label:string }
// Category is derived from the label (type is only a fallback), so labels
// like "Call Resistance - ... Gamma Wall 0DTE (NQ1!)" work as-is.

import { useMemo } from 'react';

const W = 760;
const TOP = 24;
const BOTTOM_PAD = 24;
const X0 = 72;            // y-axis spine
const XE = 400;           // right edge of plot
const XL = 414;           // label chip x
const LABEL_SPACING = 18;
const LABEL_MAX_CHARS = 52;
const FAR_STEP = 26;      // spacing of levels moved behind an axis break
const BREAK_H = 34;
const PX_PER_LEVEL = 38;
const MIN_MAIN_H = 420;
const MAX_MAIN_H = 1100;
const FAR_GAP_FRACTION = 0.4;

const CAT = {
  call: { color: '#E24B4A', legend: 'Call resistance / wall' },
  put:  { color: '#1D9E75', legend: 'Put support' },
  hvl:  { color: '#BA7517', legend: 'HVL' },
  gex:  { color: '#378ADD', legend: 'GEX rank (bar length = rank)' },
  rng:  { color: '#7F77DD', legend: '1D min to max' },
  other:{ color: '#7d838d', legend: 'Other' },
};

function cleanLabel(s) {
  return String(s ?? '').replace(/\s*\([^)]*!\)\s*$/, '').trim();
}

function classify(l) {
  const label = cleanLabel(l.label);
  const rank = (label.match(/^GEX\s*(\d+)/i) || [])[1];
  let cat = 'other';
  if (/1D\s*(min|max)/i.test(label)) cat = 'rng';
  else if (/hvl/i.test(label)) cat = 'hvl';
  else if (/call|resist|gamma\s*wall/i.test(label)) cat = 'call';
  else if (/put|support/i.test(label)) cat = 'put';
  else if (rank || String(l.type).toUpperCase() === 'GEX') cat = 'gex';
  return {
    price: Number(l.price),
    label,
    cat,
    rank: rank ? Number(rank) : null,
    zero: /0\s*dte/i.test(label),
    isMin: /1D\s*min/i.test(label),
    isMax: /1D\s*max/i.test(label),
  };
}

function niceStep(range) {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const target = range / 16;
  const mag = Math.pow(10, Math.floor(Math.log10(target)));
  const n = target / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

const fmtPrice = (p) =>
  Number.isFinite(p)
    ? p.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : '—';
const fmtAxis = (p) => Math.round(p).toLocaleString('en-US');
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const CSS = `
  .gxl-root{--gxl-grid:rgba(255,255,255,.07);--gxl-axis:rgba(255,255,255,.22);
    --gxl-text:#E7E9EE;--gxl-text2:#9AA3B2;--gxl-muted:#6B7482;
    display:flex;flex-direction:column;gap:12px}
  .gxl-legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--gxl-text2)}
  .gxl-legend-item{display:inline-flex;align-items:center;gap:5px}
  .gxl-chip{width:10px;height:10px;border-radius:2px;display:inline-block}
  .gxl-svg{display:block;width:100%;height:auto}
  .gxl-svg text{user-select:none;font-family:inherit}
  .gxl-empty{padding:48px 20px;text-align:center;color:var(--gxl-muted);font-size:12px}
`;

export default function GexLevelChart({ levels = [] }) {
  const layout = useMemo(() => {
    const all = levels.map(classify).filter((l) => Number.isFinite(l.price));
    if (!all.length) return null;
    all.sort((a, b) => b.price - a.price);

    // ---- outliers behind an axis break ----
    const span = all[0].price - all[all.length - 1].price;
    let low = 0, high = 0;
    if (all.length >= 5 && span > 0) {
      for (let n = 1; n <= 3; n++) {
        const i = all.length - n;
        if (all[i - 1].price - all[i].price > FAR_GAP_FRACTION * span) { low = n; break; }
      }
      for (let n = 1; n <= 3; n++) {
        if (n < all.length - low - 1 &&
            all[n - 1].price - all[n].price > FAR_GAP_FRACTION * span) { high = n; break; }
      }
    }
    const highItems = all.slice(0, high);
    const main = all.slice(high, all.length - low);
    const lowItems = all.slice(all.length - low);

    const pmaxRaw = main[0].price;
    const pminRaw = main[main.length - 1].price;
    const mspan = Math.max(pmaxRaw - pminRaw, 1);
    const pad = mspan * 0.06;
    const pmax = pmaxRaw + pad;
    const pmin = pminRaw - pad;
    const mainH = Math.max(MIN_MAIN_H, Math.min(MAX_MAIN_H, main.length * PX_PER_LEVEL));

    // ---- vertical stack: [high far] break [main] break [low far] ----
    let y = TOP;
    const highY = [];
    highItems.forEach((it, j) => { highY.push(y + 6 + j * FAR_STEP); });
    let breakTop = null;
    if (high) { breakTop = y + high * FAR_STEP + 4; y = breakTop + BREAK_H; }
    const mainTop = y;
    const yMap = (p) => mainTop + ((pmax - p) / (pmax - pmin)) * mainH;
    const mainBottom = mainTop + mainH;
    let breakBottom = null;
    const lowY = [];
    let end = mainBottom;
    if (low) {
      breakBottom = mainBottom + 4;
      lowItems.forEach((it, j) => { lowY.push(breakBottom + BREAK_H + j * FAR_STEP); });
      end = lowY[lowY.length - 1];
    }
    const H = end + BOTTOM_PAD;

    const items = [
      ...highItems.map((it, j) => ({ ...it, y: highY[j], far: true })),
      ...main.map((it) => ({ ...it, y: yMap(it.price), far: false })),
      ...lowItems.map((it, j) => ({ ...it, y: lowY[j], far: true })),
    ];

    const step = niceStep(pmax - pmin);
    const grid = [];
    for (let p = Math.ceil(pmin / step) * step; p <= pmax; p += step) {
      grid.push({ price: p, y: yMap(p) });
    }

    // ---- label collision ----
    const byY = [...items].sort((a, b) => a.y - b.y);
    let prev = -Infinity;
    byY.forEach((it) => { it.ly = Math.max(it.y, prev + LABEL_SPACING); prev = it.ly; });
    const over = byY[byY.length - 1].ly - (H - BOTTOM_PAD);
    if (over > 0) byY.forEach((it) => { it.ly -= over; });
    const underTop = TOP - byY[0].ly;
    if (underTop > 0) byY.forEach((it) => { it.ly += underTop; });

    const rMin = items.find((i) => i.isMin && !i.far);
    const rMax = items.find((i) => i.isMax && !i.far);
    const band = rMin && rMax ? { y1: Math.min(rMin.y, rMax.y), y2: Math.max(rMin.y, rMax.y) } : null;
    const maxRank = Math.max(0, ...items.map((i) => i.rank || 0));

    return {
      items, H, grid, band, maxRank,
      mainTop, mainBottom, breakTop, breakBottom,
      highItems, lowItems, highY, lowY,
      cats: new Set(items.map((i) => i.cat)),
      hasZero: items.some((i) => i.zero),
      mainRange: [Math.round(pminRaw), Math.round(pmaxRaw)],
    };
  }, [levels]);

  if (!layout) {
    return (
      <>
        <style>{CSS}</style>
        <div className="gxl-root"><div className="gxl-empty">No price levels recorded for this day.</div></div>
      </>
    );
  }

  const { items, H, grid, band, maxRank, mainTop, mainBottom, breakTop, breakBottom,
          highItems, lowItems, lowY, cats, hasZero } = layout;

  const breakGlyph = (yy, text) => (
    <g>
      <path d={`M${X0 - 8} ${yy} l8 -4 l8 8 l8 -4`} fill="none" stroke="var(--gxl-muted)" />
      <text x={X0 + 40} y={yy + 3} fontSize="11" fill="var(--gxl-muted)">{text}</text>
    </g>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="gxl-root">
        <div className="gxl-legend">
          {['call', 'put', 'hvl', 'gex', 'rng', 'other'].filter((k) => cats.has(k)).map((k) => (
            <span key={k} className="gxl-legend-item">
              <span className="gxl-chip" style={{ background: CAT[k].color, opacity: k === 'rng' ? 0.4 : 1 }} />
              {CAT[k].legend}
            </span>
          ))}
          {hasZero && (
            <span className="gxl-legend-item">
              <svg width="22" height="4"><line x1="0" y1="2" x2="22" y2="2" stroke="#9AA3B2" strokeWidth="2" strokeDasharray="4 3" /></svg>
              Dashed = 0DTE
            </span>
          )}
        </div>

        <svg className="gxl-svg" viewBox={`0 0 ${W} ${H}`} role="img"
             aria-label={`Price ladder with ${items.length} levels`}>
          {band && <rect x={X0} y={band.y1} width={XE - X0} height={band.y2 - band.y1} fill={CAT.rng.color} opacity="0.12" />}

          {/* axis spines */}
          <line x1={X0} x2={X0} y1={mainTop} y2={mainBottom} stroke="var(--gxl-axis)" />
          {highItems.length > 0 && (
            <line x1={X0} x2={X0} y1={TOP} y2={breakTop + 6} stroke="var(--gxl-axis)" />
          )}
          {lowItems.length > 0 && (
            <line x1={X0} x2={X0} y1={breakBottom + BREAK_H - 8} y2={lowY[lowY.length - 1] + 10} stroke="var(--gxl-axis)" />
          )}
          {highItems.length > 0 && breakGlyph(breakTop + 14, 'axis break')}
          {lowItems.length > 0 && breakGlyph(breakBottom + 12, 'axis break')}

          {/* gridlines */}
          {grid.map((g) => (
            <g key={`g-${g.price}`}>
              <line x1={X0} x2={XE} y1={g.y} y2={g.y} stroke="var(--gxl-grid)" strokeWidth="0.5" />
              <text x={X0 - 6} y={g.y + 4} textAnchor="end" fontSize="11" fill="var(--gxl-muted)">{fmtAxis(g.price)}</text>
            </g>
          ))}
          {items.filter((i) => i.far).map((it, i) => (
            <g key={`far-${i}`}>
              <line x1={X0} x2={XE} y1={it.y} y2={it.y} stroke="var(--gxl-grid)" strokeWidth="0.5" />
              <text x={X0 - 6} y={it.y + 4} textAnchor="end" fontSize="11" fill="var(--gxl-muted)">{fmtAxis(it.price)}</text>
            </g>
          ))}

          {/* 1D range lines */}
          {items.filter((i) => i.cat === 'rng').map((it, i) => (
            <line key={`r-${i}`} x1={X0} x2={XE} y1={it.y} y2={it.y}
                  stroke={CAT.rng.color} strokeWidth="1.2" strokeDasharray="2 3">
              <title>{`${fmtPrice(it.price)} — ${it.label}`}</title>
            </line>
          ))}

          {/* GEX rank bars */}
          {items.filter((i) => i.cat === 'gex').map((it, i) => {
            const r = it.rank || maxRank;
            const steps = maxRank + 1 - r;
            const w = 40 + steps * (210 / Math.max(maxRank, 1));
            const op = 0.45 + 0.55 * (steps / (maxRank + 1));
            return (
              <rect key={`b-${i}`} x={X0} y={it.y - 4} width={w} height={8} rx="2"
                    fill={CAT.gex.color} opacity={op.toFixed(2)}>
                <title>{`${fmtPrice(it.price)} — ${it.label}`}</title>
              </rect>
            );
          })}

          {/* call / put / hvl / other lines */}
          {items.filter((i) => ['call', 'put', 'hvl', 'other'].includes(i.cat)).map((it, i) => (
            <line key={`l-${i}`} x1={X0} x2={XE} y1={it.y} y2={it.y}
                  stroke={CAT[it.cat].color}
                  strokeWidth={it.zero ? 1.6 : 2.4}
                  strokeDasharray={it.zero ? '6 4' : undefined}>
              <title>{`${fmtPrice(it.price)} — ${it.label}`}</title>
            </line>
          ))}

          {/* leader lines + labels */}
          {items.map((it, i) => {
            const c = CAT[it.cat].color;
            const bold = it.cat !== 'gex' && it.cat !== 'rng';
            return (
              <g key={`t-${i}`}>
                <path d={`M${XE + 2} ${it.y} L${XL - 8} ${it.ly}`} stroke={c} strokeWidth="0.75" fill="none" opacity="0.7" />
                <rect x={XL - 6} y={it.ly - 5} width="10" height="10" rx="2" fill={c} />
                <text x={XL + 10} y={it.ly + 4} fontSize="12" fill="var(--gxl-text)" fontWeight={bold ? 600 : 400}>
                  {fmtPrice(it.price)}{'  '}
                  <tspan fill="var(--gxl-text2)" fontWeight="400">{truncate(it.label, LABEL_MAX_CHARS)}</tspan>
                  <title>{it.label}</title>
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}