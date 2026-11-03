import { SESSIONS } from '../lib/sessionModel';

const C = 180;
const R = 138;
const W = 24;

const toDeg = (min) => (min / 1440) * 360;
function polar(deg, r) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}
function arc(startMin, endMin) {
  const sweep = (((endMin - startMin) % 1440) + 1440) % 1440 || 1440;
  const a0 = toDeg(startMin) + 0.5;
  const a1 = toDeg(startMin) + toDeg(sweep) - 0.5;
  const [x0, y0] = polar(a0, R);
  const [x1, y1] = polar(a1, R);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** 24h dial in Eastern Time. Midnight ET at the top, needle = now. */
export default function SessionRing({ rows, etMinutes, dimmed, label, name, clock, sub, color }) {
  const needle = toDeg(etMinutes);
  const [nx0, ny0] = polar(needle, R - W / 2 - 8);
  const [nx1, ny1] = polar(needle, R + W / 2 + 5);

  return (
    <div className={`ssp-dial${dimmed ? ' is-dim' : ''}`}>
      <svg viewBox="0 0 360 360" role="img" aria-label="24-hour dial of trading sessions in Eastern Time">
        <circle cx={C} cy={C} r={R} className="ssp-dial-track" style={{ strokeWidth: W }} />
        <circle cx={C} cy={C} r={R - W / 2 - 16} className="ssp-dial-inner" />

        {SESSIONS.map((s) => {
          const row = rows.find((r) => r.id === s.id);
          return (
            <path
              key={s.id}
              d={arc(s.start, s.end)}
              className={`ssp-dial-arc${row?.live ? ' is-live' : ''}`}
              style={{ stroke: s.color, strokeWidth: W }}
            />
          );
        })}

        {Array.from({ length: 24 }, (_, h) => {
          const major = h % 3 === 0;
          const [x0, y0] = polar(h * 15, R + W / 2 + 3);
          const [x1, y1] = polar(h * 15, R + W / 2 + (major ? 10 : 6));
          const [tx, ty] = polar(h * 15, R + W / 2 + 24);
          return (
            <g key={h}>
              <line x1={x0} y1={y0} x2={x1} y2={y1} className={`ssp-dial-tick${major ? ' is-major' : ''}`} />
              {major && (
                <text x={tx} y={ty} className="ssp-dial-lbl" textAnchor="middle" dominantBaseline="central">
                  {String(h).padStart(2, '0')}
                </text>
              )}
            </g>
          );
        })}

        <line x1={nx0} y1={ny0} x2={nx1} y2={ny1} className="ssp-dial-needle" />
        <circle cx={nx1} cy={ny1} r="4.5" className="ssp-dial-knob" />
      </svg>

      <div className="ssp-dial-center">
        <span className="ssp-dial-label">{label}</span>
        <span className="ssp-dial-name" style={{ color }}>{name}</span>
        <span className="ssp-dial-clock">{clock}</span>
        <span className="ssp-dial-sub">{sub}</span>
      </div>
    </div>
  );
}