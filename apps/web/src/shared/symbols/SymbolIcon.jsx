
import { getIconSpec } from './symbolIcons';

const RADIUS_RATIO = 0.18;
const DUAL_OVERLAP_RATIO = 0.42;

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

  if (spec.kind === 'dual') {
    const overlap = Math.round(s * DUAL_OVERLAP_RATIO);
    const total = s + overlap;

    return (
      <span
        role="img"
        aria-label={label}
        title={titleAttr}
        className={className}
        style={{
          position: 'relative',
          display: 'inline-block',
          width: total,
          height: total,
          flexShrink: 0,
          lineHeight: 0,
        }}
      >
        {}
        <img
          src={spec.right}
          alt=""
          width={s}
          height={s}
          draggable={false}
          loading="lazy"
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: s,
            height: s,
            borderRadius: '50%',
            objectFit: 'cover',
            boxShadow: '0 0 0 1px rgba(0,0,0,.55)',
            userSelect: 'none',
          }}
        />
        {}
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
            borderRadius: '50%',
            objectFit: 'cover',
            boxShadow: '0 0 0 1px rgba(0,0,0,.55)',
            userSelect: 'none',
          }}
        />
      </span>
    );
  }

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