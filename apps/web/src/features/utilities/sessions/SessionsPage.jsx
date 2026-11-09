import { useMemo, useState } from 'react';
import { Globe, ArrowRightLeft, Clock, Radio } from 'lucide-react';

import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';

import useNow from './hooks/useNow';
import {
  NY, fmtClock, fmtDur, fmtTime, isValidTz, browserTz, relDay, tzAbbr, utcLabel,
} from './lib/tz';
import {
  INSTRUMENTS, computeSessions, computeCenters, computeInstrument,
} from './lib/sessionModel';
import SessionRing from './components/SessionRing';
import InstrumentCard from './components/InstrumentCard';
import DstBanner from './components/DstBanner';
import './SessionsPage.css';

export default function SessionsPage() {
  const { settings } = useSettings();
  const prefTz = settings.preferences.timezone; // 'auto' or an IANA zone
  const tz = useMemo(() => (isValidTz(prefTz) ? prefTz : browserTz()), [prefTz]);

  const [h12, setH12] = useState(settings.preferences.timeFormat === '12h');
  const now = useNow(1000);
  const o = { h12 };

  const sess = useMemo(() => computeSessions(now), [now]);
  const cd = useMemo(() => computeCenters(now), [now]);
  const insts = useMemo(() => INSTRUMENTS.map((s) => computeInstrument(s, now)), [now]);

  const forex = insts.find((i) => i.id === 'forex');
  const cme = insts.find((i) => i.id === 'cme');
  const closed = forex.state === 'closed' && cme.state === 'closed';
  const reopenAt = closed ? Math.min(forex.until ?? Infinity, cme.until ?? Infinity) : null;

  const rows = closed
    ? sess.rows.map((r) => ({ ...r, live: false, status: 'later', progress: 0 }))
    : sess.rows;
  const current = closed ? null : sess.current;
  const next = closed ? null : sess.next;

  usePageHeader({
    title: 'Market Sessions',
    subtitle: closed
      ? `Markets closed · ${tz}`
      : `${current?.name ?? 'Between sessions'} · ${tz}`,
  });

  const ring = closed
    ? {
        label: 'Markets closed',
        name: 'Weekend',
        clock: fmtClock(reopenAt - now),
        sub: 'until futures and FX reopen',
        color: 'var(--ink-2)',
      }
    : {
        label: 'Live now',
        name: current?.name ?? '',
        clock: fmtClock(current.endAt - now),
        sub: `then ${next?.name ?? ''}`,
        color: current?.color,
      };

  const ov = cd.overlap;
  const nxo = cd.nextOverlap;
  const etAbbr = tzAbbr(now, NY);
  const youAbbr = tzAbbr(now, tz);

  return (
    <div className="ssp-root">
      {/* ============ HERO ============ */}
      <section className="ssp-panel ssp-hero">
        <SessionRing
          rows={rows}
          etMinutes={sess.etMinutes}
          dimmed={closed}
          {...ring}
        />

        <div className="ssp-hero-side">
          <div className="ssp-clocks">
            <div className="ssp-tile">
              <span className="ssp-tile-top"><Clock size={12} /> New York</span>
              <span className="ssp-tile-val">{fmtTime(now, NY, { h12, seconds: true })}</span>
              <span className="ssp-tile-sub">{etAbbr} · {utcLabel(now, NY)}</span>
            </div>
            <div className="ssp-tile">
              <span className="ssp-tile-top"><Globe size={12} /> Your time</span>
              <span className="ssp-tile-val">{fmtTime(now, tz, { h12, seconds: true })}</span>
              <span className="ssp-tile-sub">{tz} · {youAbbr}</span>
            </div>
            <div className="ssp-tile">
              <span className="ssp-tile-top"><Radio size={12} /> {closed ? 'Reopens' : 'Next session'}</span>
              <span className="ssp-tile-val">
                {closed ? fmtDur(reopenAt - now) : fmtDur(next.startAt - now)}
              </span>
              <span className="ssp-tile-sub">
                {closed ? relDay(reopenAt, now, tz) : next.name}
              </span>
            </div>
          </div>

          <div className={`ssp-overlap${ov ? ' is-live' : ''}`}>
            <span className="ssp-overlap-icon"><ArrowRightLeft size={14} /></span>
            {ov ? (
              <div className="ssp-overlap-text">
                <b>{ov.names.join(' × ')} overlap</b>
                <span>Ends in {fmtDur(ov.endsAt - now)}. Liquidity is usually highest here.</span>
              </div>
            ) : nxo ? (
              <div className="ssp-overlap-text">
                <b>No overlap right now</b>
                <span>
                  Next: {nxo.names.join(' × ')} in {fmtDur(nxo.startsAt - now)}
                </span>
              </div>
            ) : (
              <div className="ssp-overlap-text"><b>No overlap scheduled</b></div>
            )}
          </div>

          <div className="ssp-centers">
            {cd.centers.map((c) => (
              <div key={c.id} className={`ssp-center${c.open ? ' is-open' : ''}`} style={{ '--k': c.color }}>
                <span className="ssp-center-name">
                  <i className="ssp-dot" /> {c.name}
                </span>
                <span className="ssp-center-time">{fmtTime(now, c.tz, o)}</span>
                <span className="ssp-center-sub">
                  {c.open
                    ? `Closes in ${fmtDur(c.end - now)}`
                    : `Opens in ${fmtDur(c.nextOpen - now)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ INSTRUMENT HOURS ============ */}
      <div className="ssp-insts">
        {insts.map((inst) => (
          <InstrumentCard key={inst.id} inst={inst} now={now} tz={tz} h12={h12} />
        ))}
      </div>

      {/* ============ SESSION SCHEDULE ============ */}
      <section className="ssp-panel">
        <div className="ssp-head">
          <Clock size={14} style={{ color: 'var(--accent)' }} />
          <span className="ssp-title">Session schedule</span>
          <span className="ssp-pill" style={{ color: 'var(--accent)', borderColor: 'var(--accent-soft2)' }}>
            {etAbbr}
          </span>
          <button
            type="button"
            className="ssp-btn"
            onClick={() => setH12((v) => !v)}
            aria-pressed={h12}
            title="Switch between 24-hour and 12-hour time"
          >
            {h12 ? '12h' : '24h'}
          </button>
        </div>

        <div className="ssp-cols" aria-hidden>
          <span />
          <span>Session</span>
          <span>New York</span>
          <span>Your time</span>
          <span>Status</span>
        </div>

        <div className="ssp-srows">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`ssp-srow is-${r.status}`}
              style={{ '--k': r.color, '--p': `${(r.progress * 100).toFixed(1)}%` }}
            >
              <i className="ssp-srow-dot" />
              <div className="ssp-srow-name">
                <b>{r.name}</b>
                <small>{r.desc}</small>
              </div>
              <div className="ssp-srow-time">
                <span>{fmtTime(r.startAt, NY, o)} to {fmtTime(r.endAt, NY, o)}</span>
                <small>{tzAbbr(r.startAt, NY)}</small>
              </div>
              <div className="ssp-srow-time">
                <span>{fmtTime(r.startAt, tz, o)} to {fmtTime(r.endAt, tz, o)}</span>
                <small>{relDay(r.startAt, now, tz)} · {tzAbbr(r.startAt, tz)}</small>
              </div>
              <div className="ssp-srow-state">
                {r.live ? (
                  <>
                    <span className="ssp-live"><i className="ssp-dot is-pulse" /> Live</span>
                    <small>ends in {fmtDur(r.endAt - now)}</small>
                  </>
                ) : (
                  <>
                    <span>{r.status === 'next' ? 'Up next' : 'Later'}</span>
                    <small>in {fmtDur(r.startAt - now)}</small>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="ssp-foot">
          Sessions are anchored to New York time, so their position in your clock shifts when US daylight saving changes.
        </p>
      </section>

      {/* ============ DAYLIGHT SAVING ============ */}
      <DstBanner now={now} tz={tz} />
    </div>
  );
}