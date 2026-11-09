import { useMemo } from 'react';
import { CalendarClock, Check } from 'lucide-react';
import {
  NY, LONDON, DAY, HOUR,
  findTransitions, tzOffset, fmtDay, tzAbbr,
} from '../lib/tz';

const REGIONS = [
  { id: 'us', name: 'US', tz: NY, anchor: 'New York open' },
  { id: 'uk', name: 'UK', tz: LONDON, anchor: 'London open' },
];

function describe(t, region, userTz, now) {
  const fwd = t.to > t.from;
  const hrs = Math.abs(t.to - t.from) / HOUR;
  const past = t.at <= now;
  // Region wall-clock expressed in the user's zone, before vs after the change.
  const before = tzOffset(t.at - 2000, userTz) - tzOffset(t.at - 2000, region.tz);
  const after = tzOffset(t.at + 2000, userTz) - tzOffset(t.at + 2000, region.tz);
  const shift = (after - before) / HOUR;

  const verb = past ? (fwd ? 'began' : 'ended') : fwd ? 'begins' : 'ends';
  const impact =
    shift === 0
      ? `No change to the ${region.anchor} in your time (${tzAbbr(now, userTz)}).`
      : `In your time (${tzAbbr(now, userTz)}) the ${region.anchor} moves ${Math.abs(shift)}h ${shift < 0 ? 'earlier' : 'later'}.`;

  return {
    key: `${region.id}-${t.at}`,
    past,
    soon: !past && t.at - now <= 21 * DAY,
    title: `${region.name} DST ${verb} ${fmtDay(t.at, region.tz)}`,
    detail: `Clocks go ${fwd ? 'forward' : 'back'} ${hrs} hour${hrs === 1 ? '' : 's'}. ET-based sessions keep their ET times. ${impact}`,
    count: past ? 'done' : `in ${Math.ceil((t.at - now) / DAY)}d`,
  };
}

export default function DstBanner({ now, tz }) {
  const dayKey = Math.floor(now / DAY);

  const { rows, gapNote, soon } = useMemo(() => {
    const per = REGIONS.map((r) => {
      const list = findTransitions(r.tz, now);
      return {
        region: r,
        recent: [...list].reverse().find((t) => t.at <= now && now - t.at < 10 * DAY) || null,
        next: list.find((t) => t.at > now) || null,
      };
    });

    const out = [];
    per.forEach(({ region, recent, next }) => {
      if (recent) out.push(describe(recent, region, tz, now));
      if (next) out.push(describe(next, region, tz, now));
    });

    // The US and UK change on different weekends, which temporarily moves London x NY.
    let note = null;
    const us = per[0].next;
    const uk = per[1].next;
    if (us && uk && Math.abs(us.at - uk.at) < 45 * DAY) {
      const mid = Math.floor((us.at + uk.at) / 2);
      const lead = (tzOffset(mid, LONDON) - tzOffset(mid, NY)) / HOUR;
      if (lead !== 5) {
        const [a, b] = us.at < uk.at ? [us, uk] : [uk, us];
        note = `From ${fmtDay(a.at, NY)} to ${fmtDay(b.at, NY)} London leads New York by ${lead}h instead of 5h, so the London × NY overlap runs ${9 - lead}h instead of 4h.`;
      }
    }
    return { rows: out, gapNote: note, soon: out.some((r) => r.soon) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, tz]);

  return (
    <section className={`ssp-panel ssp-dst${soon ? ' is-soon' : ''}`}>
      <div className="ssp-head">
        <CalendarClock size={14} style={{ color: 'var(--accent)' }} />
        <span className="ssp-title">Daylight saving</span>
        <span className="ssp-head-sub">Updates automatically</span>
      </div>
      <div className="ssp-dst-rows">
        {rows.map((r) => (
          <div key={r.key} className={`ssp-dst-row${r.past ? ' is-past' : ''}${r.soon ? ' is-soon' : ''}`}>
            <span className="ssp-dst-mark">{r.past ? <Check size={12} /> : <i />}</span>
            <div className="ssp-dst-text">
              <b>{r.title}</b>
              <span>{r.detail}</span>
            </div>
            <span className="ssp-dst-count">{r.count}</span>
          </div>
        ))}
        {gapNote && <p className="ssp-dst-gap">{gapNote}</p>}
      </div>
    </section>
  );
}