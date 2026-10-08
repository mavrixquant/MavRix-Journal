// apps/web/src/features/charts/components/SymbolIcon.jsx
//
// Renders the correct icon for a symbol based on the spec returned by
// getIconSpec(). Three visual modes:
//
//   single  → one square image (CME logo, or crypto coin)
//   dual    → two circular flags overlapping diagonally (forex pairs)
//   badge   → small colored badge with 2-letter text (spot metals)
//
// The dual (forex) mode renders each flag as a circle and scales the
// overall footprint to 1.15× so forex rows carry the same visual weight
// as the square CME logo. Row heights do not shift because the parent
// rows have vertical padding that absorbs the extra ~2px.

import { getIconSpec } from '../lib/symbolIcons';

const CSS = `
  .si-root {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* ---------- Single (CME logo, crypto coin) ---------- */
  .si-single {
    display: block;
    object-fit: contain;
    border-radius: 3px;
  }

  /* ---------- Dual (forex flags — circles) ---------- */
  .si-dual {
    position: relative;
    display: inline-block;
    flex-shrink: 0;
  }
  .si-dual img {
    position: absolute;
    object-fit: cover;
    border-radius: 50%;
    border: 1.5px solid rgba(0,0,0,.6);
    box-shadow:
      0 1px 3px rgba(0,0,0,.5),
      0 0 0 0.5px rgba(255,255,255,.08);
    background: #0D1117;
  }
  .si-dual img:nth-child(1) {
    top: 0;
    left: 0;
    z-index: 2;
  }
  .si-dual img:nth-child(2) {
    bottom: 0;
    right: 0;
    z-index: 1;
  }

  /* ---------- Badge (metals, fallback) ---------- */
  .si-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: rgba(0,0,0,.35);
    border: 1px solid;
    flex-shrink: 0;
  }

  /* Neutral fallback for unknown symbols */
  .si-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255,255,255,.05);
    border: 1px solid rgba(255,255,255,.12);
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 700;
    flex-shrink: 0;
  }
`;

// Forex flags get a bigger footprint than the base size prop.
const DUAL_BOX_SCALE = 1.15;
const DUAL_FLAG_FRACTION = 0.75;

export default function SymbolIcon({ symbol, size = 16 }) {
  const spec = getIconSpec(symbol);

  /* ---------------- Fallback — unknown symbol ---------------- */
  if (!spec) {
    const initials = String(symbol || '?').slice(0, 2).toUpperCase();
    return (
      <>
        <style>{CSS}</style>
        <span
          className="si-fallback"
          style={{
            width: size,
            height: size,
            fontSize: Math.max(7, Math.round(size * 0.5)),
          }}
          aria-hidden
        >
          {initials}
        </span>
      </>
    );
  }

  /* ---------------- Single — one square image ---------------- */
  if (spec.kind === 'single') {
    return (
      <>
        <style>{CSS}</style>
        <span className="si-root" style={{ width: size, height: size }}>
          <img
            className="si-single"
            src={spec.src}
            alt={spec.alt || ''}
            width={size}
            height={size}
            style={{ width: size, height: size }}
            loading="lazy"
            draggable={false}
          />
        </span>
      </>
    );
  }

  /* ---------------- Dual — two circular flags ---------------- */
  if (spec.kind === 'dual') {
    const boxSize = Math.round(size * DUAL_BOX_SCALE);
    const flagSize = Math.round(boxSize * DUAL_FLAG_FRACTION);

    return (
      <>
        <style>{CSS}</style>
        <span
          className="si-dual"
          style={{ width: boxSize, height: boxSize }}
          aria-hidden
        >
          <img
            src={spec.left}
            alt=""
            width={flagSize}
            height={flagSize}
            style={{ width: flagSize, height: flagSize }}
            loading="lazy"
            draggable={false}
          />
          <img
            src={spec.right}
            alt=""
            width={flagSize}
            height={flagSize}
            style={{ width: flagSize, height: flagSize }}
            loading="lazy"
            draggable={false}
          />
        </span>
      </>
    );
  }

  /* ---------------- Badge — metals, other ---------------- */
  if (spec.kind === 'badge') {
    return (
      <>
        <style>{CSS}</style>
        <span
          className="si-badge"
          style={{
            width: size,
            height: size,
            fontSize: Math.max(7, Math.round(size * 0.48)),
            color: spec.color,
            borderColor: `${spec.color}66`,
          }}
          aria-hidden
        >
          {spec.text}
        </span>
      </>
    );
  }

  return null;
}