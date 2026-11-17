import { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { fmtMoney } from '../../lib/format';

function Row({ label, left, tone, pct, text }) {
  return (
    <div className={`rp-hud-row is-${tone}`}>
      <div className="rp-hud-top">
        <span>{label}</span>
        <b>{text}</b>
      </div>
      <div className="rp-hud-bar"><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
      {left != null && <em>{left}</em>}
    </div>
  );
}

/** Live prop-firm HUD (top-right of the chart). Numbers come from propRules.js. */
export default function PropHud({ prop, currency }) {
  const [open, setOpen] = useState(true);
  if (!prop) return null;

  const [profit, daily, total, days] = prop.rules;
  const StatusIcon = prop.status === 'failed' ? ShieldAlert : prop.status === 'passed' ? ShieldCheck : Shield;

  const leftPct = (r) => Math.max(0, 100 - r.pct);

  return (
    <div className={`rp-hud is-${prop.status}`} role="status" aria-label="Prop firm rules">
      <button type="button" className="rp-hud-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <StatusIcon size={14} />
        <span>{prop.firmLabel}</span>
        <em>{prop.status === 'failed' ? 'Failed' : prop.status === 'passed' ? 'Passed' : 'In progress'}</em>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="rp-hud-body">
          <Row
            label="Profit target"
            tone={profit.state === 'pass' ? 'pass' : 'ok'}
            pct={profit.pct}
            text={profit.state === 'pass' ? 'Reached' : `${leftPct(profit).toFixed(0)}% to go`}
            left={`${fmtMoney(profit.current, currency, { digits: 0 })} / ${fmtMoney(profit.limit, currency, { digits: 0 })}`}
          />
          <Row
            label="Daily loss"
            tone={daily.state}
            pct={daily.pct}
            text={`${leftPct(daily).toFixed(0)}% left`}
            left={`${fmtMoney(daily.remaining, currency, { digits: 0 })} room today`}
          />
          <Row
            label="Total loss"
            tone={total.state}
            pct={total.pct}
            text={`${leftPct(total).toFixed(0)}% left`}
            left={`${fmtMoney(total.remaining, currency, { digits: 0 })} to the floor`}
          />
          <Row
            label="Trading days"
            tone={days.state === 'pass' ? 'pass' : 'ok'}
            pct={days.pct}
            text={`${days.current} / ${days.limit}`}
          />
        </div>
      )}
    </div>
  );
}
