import { CheckCircle2, ShieldAlert, Hourglass } from 'lucide-react';
import { fmtMoney, fmtSigned } from '../../lib/format';

const STATUS = {
  passed: { icon: CheckCircle2, label: 'Passed', text: 'Every rule is satisfied.' },
  failed: { icon: ShieldAlert, label: 'Failed', text: 'A loss limit was breached.' },
  in_progress: { icon: Hourglass, label: 'In progress', text: 'Keep going — the challenge is still open.' },
};

function fmtVal(rule, v, cur) {
  return rule.unit === 'days' ? `${v}` : fmtMoney(v, cur, { digits: 0 });
}

export default function PropRulesTab({ session, prop }) {
  if (!prop) return null;
  const cur = session.currency;
  const S = STATUS[prop.status];
  const Icon = S.icon;
  const cfg = session.propFirmConfig;

  return (
    <div className="bt-prop">
      <section className={`bt-prop-hero is-${prop.status}`}>
        <Icon size={26} />
        <div>
          <b>{prop.firmLabel} · {S.label}</b>
          <p>{S.text}{prop.failed && prop.breach ? ` (${prop.breach === 'daily' ? 'daily loss' : prop.breach === 'total' ? 'total loss' : 'rule breach'})` : ''}</p>
        </div>
        <span className={`bt-pill is-${prop.status}`}>{prop.status === 'passed' ? 'PASS' : prop.status === 'failed' ? 'FAIL' : 'LIVE'}</span>
      </section>

      <div className="bt-rules">
        {prop.rules.map((r) => (
          <article key={r.id} className={`bt-rule is-${r.state}`}>
            <header>
              <b>{r.label}</b>
              <span className={`bt-pill is-${r.state}`}>
                {r.state === 'pass' ? 'Pass' : r.state === 'fail' ? 'Breached' : r.state === 'warn' ? 'Close' : r.id === 'profit' || r.id === 'days' ? 'Pending' : 'Safe'}
              </span>
            </header>
            <div className="bt-rule-num">
              <strong>{fmtVal(r, r.current, cur)}</strong>
              <span>/ {fmtVal(r, r.limit, cur)}</span>
            </div>
            <div className="bt-rule-bar"><i style={{ width: `${r.pct}%` }} /></div>
            <footer>
              <span>{r.detail}</span>
              <span>{r.id === 'profit' || r.id === 'days' ? `${fmtVal(r, r.remaining, cur)} to go` : `${fmtVal(r, r.remaining, cur)} left`}</span>
            </footer>
          </article>
        ))}
      </div>

      <section className="bt-card-plain">
        <h4>Challenge details</h4>
        <div className="bt-kvlist">
          <div className="bt-kv"><span>Account size</span><b>{fmtMoney(cfg.accountSize, cur, { digits: 0 })}</b></div>
          <div className="bt-kv"><span>Equity</span><b>{fmtMoney(prop.equity, cur)}</b></div>
          <div className="bt-kv"><span>Profit so far</span><b className={prop.profit >= 0 ? 'pos' : 'neg'}>{fmtSigned(prop.profit, cur)}</b></div>
          <div className="bt-kv"><span>Loss floor (equity)</span><b>{fmtMoney(prop.floor, cur, { digits: 0 })}</b></div>
          <div className="bt-kv"><span>Max position</span><b>{cfg.maxPositionSize || 'No limit'}</b></div>
          {cfg.notes && <div className="bt-kv"><span>Notes</span><b>{cfg.notes}</b></div>}
        </div>
        <p className="bt-note">Daily loss uses your display timezone for the day boundary; the total-loss floor is static from the starting balance.</p>
      </section>
    </div>
  );
}
