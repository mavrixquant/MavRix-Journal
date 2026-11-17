import { Link } from 'react-router-dom';
import { ArrowLeft, Flag, PanelRight } from 'lucide-react';
import { fmtMoney, fmtSigned, toneOf } from '../../lib/format';
import { fmtDateTime } from '../../lib/time';

export default function ReplayHeader({
  session, symbol, onSymbol, canSwitch, currentBar, precision, tz,
  balance, equity, onConclude, concludeDisabled, panelOpen, onTogglePanel, propLabel,
}) {
  const cur = session.currency;
  const floating = equity - balance;
  const close = currentBar?.close;

  return (
    <div className="rp-head">
      <Link to={`/backtester/${session.id}`} className="rp-back" title="Back to dashboard">
        <ArrowLeft size={15} /><span>Dashboard</span>
      </Link>

      <div className="rp-title">
        <b title={session.name}>{session.name}</b>
        <span className="rp-chips">
          <i className={`rp-chip is-${session.type}`}>{session.type === 'prop' ? `Prop · ${propLabel}` : 'Standard'}</i>
          {session.status !== 'active' && <i className="rp-chip is-closed">{session.status}</i>}
        </span>
      </div>

      <div className="rp-syms" role="tablist" aria-label="Instrument">
        {session.instruments.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === symbol}
            className={s === symbol ? 'is-on' : ''}
            onClick={() => onSymbol(s)}
            title={!canSwitch && s !== symbol ? 'Close your open position to switch instrument' : s}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rp-price">
        <b>{close != null ? Number(close).toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision }) : '—'}</b>
        <em>{currentBar ? fmtDateTime(currentBar.utc * 1000, tz) : 'Loading…'}</em>
      </div>

      <div className="rp-acct">
        <div><span>Balance</span><b>{fmtMoney(balance, cur)}</b></div>
        <div>
          <span>Equity</span>
          <b className={toneOf(floating)}>{fmtMoney(equity, cur)}</b>
        </div>
        <div>
          <span>Session P&amp;L</span>
          <b className={toneOf(equity - session.startingBalance)}>{fmtSigned(equity - session.startingBalance, cur)}</b>
        </div>
      </div>

      <div className="rp-head-actions">
        <button type="button" className="rp-btn" onClick={onConclude} disabled={concludeDisabled} title="Close open positions and end the session">
          <Flag size={14} /><span>Conclude</span>
        </button>
        <button
          type="button"
          className={`rp-icon${panelOpen ? ' is-on' : ''}`}
          onClick={onTogglePanel}
          aria-pressed={panelOpen}
          aria-label="Toggle order panel"
          title="Order panel ( [ )"
        >
          <PanelRight size={15} />
        </button>
      </div>
    </div>
  );
}
