import { Activity, BarChart3, Landmark, Bitcoin } from 'lucide-react';
import { fmtDur, fmtTime, fmtDay, tzAbbr, HOUR } from '../lib/tz';

const ICONS = { forex: Activity, cme: BarChart3, equities: Landmark, crypto: Bitcoin };
const STATE_COLOR = {
  open: '#4ade80',
  extended: '#f5b94a',
  break: '#f5b94a',
  closed: '#f87171',
};

export default function InstrumentCard({ inst, now, tz, h12 }) {
  const Icon = ICONS[inst.id] || Activity;
  const color = STATE_COLOR[inst.state];
  const o = { h12 };
  const remaining = inst.until ? inst.until - now : null;

  return (
    <article className="ssp-panel ssp-inst" style={{ '--k': color }}>
      <header className="ssp-inst-head">
        <span className="ssp-inst-icon"><Icon size={15} /></span>
        <div className="ssp-inst-id">
          <b>{inst.name}</b>
          <small>{inst.sub}</small>
        </div>
        <span
          className="ssp-pill"
          style={{ color, borderColor: `${color}55`, background: `${color}15` }}
        >
          <i className={`ssp-dot${inst.state === 'open' ? ' is-pulse' : ''}`} />
          {inst.stateLabel}
        </span>
      </header>

      <div className="ssp-inst-count">
        {remaining !== null ? (
          <>
            <span className="ssp-inst-count-lbl">{inst.untilLabel}</span>
            <span className="ssp-inst-count-val">{fmtDur(remaining)}</span>
          </>
        ) : (
          <span className="ssp-inst-count-lbl">No scheduled open in the next 10 days</span>
        )}
      </div>

      <div className="ssp-bar" aria-hidden>
        {inst.segments.map((s, i) => (
          <span
            key={i}
            className={`ssp-bar-seg is-${s.kind}`}
            style={{ left: `${s.from * 100}%`, width: `${(s.to - s.from) * 100}%` }}
          />
        ))}
      </div>
      <div className="ssp-bar-axis">
        <span>{fmtTime(now, tz, o)}</span>
        <span>{fmtTime(now + 12 * HOUR, tz, o)}</span>
        <span>{fmtTime(now + 24 * HOUR, tz, o)}</span>
      </div>

      <footer className="ssp-inst-foot">
        <span>{inst.hours}</span>
        {inst.until && inst.id !== 'crypto' && (
          <span>
            {inst.untilLabel.replace(/ in$/, '')} {fmtDay(inst.until, tz)}, {fmtTime(inst.until, tz, o)} {tzAbbr(inst.until, tz)}
          </span>
        )}
        {inst.note && <span className="ssp-inst-note">{inst.note}</span>}
      </footer>
    </article>
  );
}