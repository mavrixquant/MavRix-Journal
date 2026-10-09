// apps/web/src/shared/symbols/SymbolIcon.jsx
//
// Renders the icon spec produced by symbolIcons.getIconSpec().
//
// Public API (unchanged from the old features/charts/components/SymbolIcon.jsx):
//   <SymbolIcon symbol="NQ" size={16} />
//   <SymbolIcon symbol="EURUSD" size={22} className="..." />
//
// Returns null when the symbol has no icon mapping — callers should treat
// the icon as purely decorative and always render the symbol CODE as text
// alongside it.

import { getIconSpec } from './symbolIcons';

const RADIUS_RATIO = 0.18;

export default function SymbolIcon({
  symbol,
  size = 16,
  className,
  alt,
  title,
}) {
  const spec = getIconSpec(symbol);
  if (!spec) return null;

  const s = Math.max(10, Math.round(size));
  const radius = Math.max(2, Math.round(s * RADIUS_RATIO));
  const label = alt ?? spec.alt ?? symbol;
  const titleAttr = title ?? undefined;

  /* ---------------- single ---------------- */
  if (spec.kind === 'single') {
    return (
      <img
        src={spec.src}
        alt={label}
        title={titleAttr}
        width={s}
        height={s}
        draggable={false}
        loading="lazy"
        className={className}
        style={{
          display: 'block',
          width: s,
          height: s,
          borderRadius: radius,
          objectFit: 'contain',
          flexShrink: 0,
          userSelect: 'none',
        }}
      />
    );
  }

  /* ---------------- dual (forex flags) ---------------- */
  if (spec.kind === 'dual') {
    const overlap = Math.round(s * 0.42);
    const totalW = s + overlap;

    return (
      <span
        role="img"
        aria-label={label}
        title={titleAttr}
        className={className}
        style={{
          position: 'relative',
          display: 'inline-block',
          width: totalW,
          height: s,
          flexShrink: 0,
          lineHeight: 0,
        }}
      >
        <img
          src={spec.left}
          alt=""
          width={s}
          height={s}
          draggable={false}
          loading="lazy"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: s,
            height: s,
            borderRadius: radius,
            objectFit: 'cover',
            boxShadow: '0 0 0 1px rgba(0,0,0,.55)',
            userSelect: 'none',
          }}
        />
        <img
          src={spec.right}
          alt=""
          width={s}
          height={s}
          draggable={false}
          loading="lazy"
          style={{
            position: 'absolute',
            left: overlap,
            top: 0,
            width: s,
            height: s,
            borderRadius: radius,
            objectFit: 'cover',
            boxShadow: '0 0 0 1px rgba(0,0,0,.55)',
            userSelect: 'none',
          }}
        />
      </span>
    );
  }

  /* ---------------- badge (spot metals) ---------------- */
  if (spec.kind === 'badge') {
    return (
      <span
        role="img"
        aria-label={label}
        title={titleAttr}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: s,
          height: s,
          borderRadius: '50%',
          background: `${spec.color}22`,
          border: `1px solid ${spec.color}66`,
          color: spec.color,
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: Math.max(8, Math.round(s * 0.5)),
          fontWeight: 700,
          letterSpacing: '.02em',
          lineHeight: 1,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {spec.text}
      </span>
    );
  }

  return null;
}