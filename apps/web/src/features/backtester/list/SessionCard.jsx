import { Link } from 'react-router-dom';
import { Play, LayoutDashboard, Trash2 } from 'lucide-react';
import { fmtMoney, fmtSignedPct, toneOf } from '../lib/format';

const STATUS_LABEL = { active: 'Active', completed: 'Completed', archived: 'Archived' };

export default function SessionCard({ session: s, onDelete }) {
  const pct = s.startingBalance > 0 ? (s.netPnl / s.startingBalance) * 100 : 0;
  const firm = s.propFirmConfig
    ? (s.propFirmConfig.firmName === 'Other' ? s.propFirmConfig.firmNameCustom : s.propFirmConfig.firmName)
    : null;

  return (
    <article className={`bt-card is-${s.status}`}>
      <header className="bt-card-head">
        <Link to={`/backtester/${s.id}`} className="bt-card-title" title={s.name}>{s.name}</Link>
        <span className={`bt-badge is-${s.type}`}>{s.type === 'prop' ? `Prop${firm ? ` · ${firm}` : ''}` : 'Standard'}</span>
      </header>

      <div className="bt-card-sub">
        <span>{s.instruments.join(' · ')}</span>
        <span>{s.interval.toUpperCase()}</span>
        <span>{s.fromDate} → {s.toDate}</span>
      </div>

      <div className="bt-card-bal">
        <div>
          <span>Balance</span>
          <b>{fmtMoney(s.startingBalance, s.currency, { digits: 0 })} <i>→</i> {fmtMoney(s.currentBalance, s.currency, { digits: 0 })}</b>
        </div>
        <strong className={toneOf(s.netPnl)}>{fmtSignedPct(pct)}</strong>
      </div>

      <div className="bt-card-meta">
        <span><b>{s.tradesCount}</b> trade{s.tradesCount === 1 ? '' : 's'}{s.openCount > 0 ? ` · ${s.openCount} open` : ''}</span>
        <span className={`bt-status is-${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span>
        <span className="bt-card-date">{new Date(s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>

      <footer className="bt-card-actions">
        <Link to={`/backtester/${s.id}/replay`} className="bt-btn is-primary"><Play size={13} /> {s.status === 'active' ? 'Replay' : 'Open chart'}</Link>
        <Link to={`/backtester/${s.id}`} className="bt-btn"><LayoutDashboard size={13} /> Dashboard</Link>
        <button type="button" className="bt-icon-btn is-danger" onClick={() => onDelete(s)} aria-label={`Delete ${s.name}`} title="Delete session"><Trash2 size={14} /></button>
      </footer>
    </article>
  );
}
