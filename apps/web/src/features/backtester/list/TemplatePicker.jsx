import { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { getSelectablePropFirms } from './selectablePropFirms';
import { FIRM_LOGOS } from './propFirmLogos';
import './templatePicker.css';

const fmtVal = (mode, v) => (v == null ? 'None' : mode === 'pct' ? `${v}%` : `$${v.toLocaleString()}`);
const fmtSize = (n) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));

const DRAWDOWN_LABELS = {
  static: 'Static',
  trailing: 'Trailing',
  dynamic: 'Dynamic',
  'eod-trailing': 'End-of-day trailing',
  'eod-dynamic': 'End-of-day dynamic',
  'intraday-trailing': 'Intraday trailing',
  'varies-by-stage': 'Varies by stage',
  'selectable-eod-or-intraday-trailing': 'EOD or intraday (your choice)',
};
const drawdownLabel = (t) => (t ? DRAWDOWN_LABELS[t] || t.replace(/-/g, ' ') : null);

/* A tier can only fill the form when it has a maximum loss. */
const usable = (tier) => tier && tier.total != null;

export function FirmLogo({ firm, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const logo = FIRM_LOGOS[firm.id];
  if (failed || !logo) {
    return (
      <span className="bt-tp-mono" style={{ width: size, height: size, background: firm.color }}>
        {firm.name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  if (logo.kind === 'square') {
    return (
      <img
        className="bt-tp-logo is-square" src={logo.src} alt={firm.name}
        style={{ width: size, height: size }} onError={() => setFailed(true)}
      />
    );
  }
  return (
    <img className="bt-tp-logo" src={logo.src} alt={firm.name} style={{ height: size }} onError={() => setFailed(true)} />
  );
}

function PlanCard({ plan, onApply }) {
  const [size, setSize] = useState(plan.tiers[0].size);
  const tier = plan.tiers.find((t) => t.size === size) || plan.tiers[0];
  const ok = usable(tier);
  const stats = [
    ['Profit target', fmtVal(tier.mode, tier.target)],
    ['Daily loss', fmtVal(tier.mode, tier.daily)],
    ['Max loss', fmtVal(tier.mode, tier.total)],
    ['Drawdown', drawdownLabel(plan.drawdownType) || '—'],
    ['Min days', plan.minDays || 'None'],
    ['Profit split', plan.profitSplit || '—'],
  ];
  if (plan.consistency) stats.push(['Consistency', plan.consistency]);
  const source = plan.sourceUrls?.[0];

  return (
    <div className="bt-tp-plan">
      <div className="bt-tp-plan-top">
        <h4>{plan.name}</h4>
        {plan.evaluation === false && <span className="bt-tp-tag">Direct funded</span>}
      </div>

      <div className="bt-tp-sizes" role="group" aria-label="Account size">
        {plan.tiers.map((t) => (
          <button key={t.size} type="button" className={t.size === size ? 'is-on' : ''} onClick={() => setSize(t.size)}>
            ${fmtSize(t.size)}
          </button>
        ))}
      </div>

      <dl className="bt-tp-stats">
        {stats.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
      </dl>

      {plan.notes && <p className="bt-tp-note">{plan.notes}</p>}
      {tier.target == null && ok && (
        <p className="bt-tp-note">This model has no profit target, so a default target is filled in. You can edit it.</p>
      )}
      {!ok && <p className="bt-tp-note is-warn">Loss limits aren't published for this size. Enter the rules manually.</p>}

      <div className="bt-tp-plan-foot">
        {source && (
          <a className="bt-tp-link" href={source} target="_blank" rel="noopener noreferrer">
            Official rules <ExternalLink size={11} />
          </a>
        )}
        <button type="button" className="bt-btn is-primary is-sm" disabled={!ok} onClick={() => onApply(plan, tier)}>
          Use ${fmtSize(size)} template
        </button>
      </div>
    </div>
  );
}

export default function TemplatePicker({ onClose, onApply }) {
  const [tab, setTab] = useState('forex');
  const [firm, setFirm] = useState(null);

  // Only firms with at least one plan that can be picked (no legacy / invite-only / empty plans).
  const firms = useMemo(
    () => getSelectablePropFirms(tab)
      .map((f) => ({ ...f, plans: f.plans.filter((p) => p.tiers?.length) }))
      .filter((f) => f.plans.length > 0),
    [tab],
  );

  const counts = useMemo(
    () => ({ forex: getSelectablePropFirms('forex').length, futures: getSelectablePropFirms('futures').length }),
    [],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (firm) setFirm(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [firm, onClose]);

  return (
    <div className="bt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bt-tp" role="dialog" aria-modal="true" aria-label="Load prop firm template">
        <div className="bt-tp-head">
          {firm ? (
            <button type="button" className="bt-btn is-sm is-ghost" onClick={() => setFirm(null)}>
              <ArrowLeft size={14} /> Firms
            </button>
          ) : <h3>Load prop firm template</h3>}
          <button type="button" className="bt-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        {!firm ? (
          <>
            <div className="bt-tp-tabs" role="tablist">
              {[['forex', 'Forex'], ['futures', 'Futures']].map(([k, label]) => (
                <button
                  key={k} type="button" role="tab" aria-selected={tab === k}
                  className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}
                >
                  {label} ({counts[k]})
                </button>
              ))}
            </div>
            <div className="bt-tp-body">
              <div className="bt-tp-firms">
                {firms.map((f) => (
                  <button key={f.id} type="button" className="bt-tp-firm" onClick={() => setFirm(f)}>
                    <div className="bt-tp-firm-logo"><FirmLogo firm={f} /></div>
                    <div className="bt-tp-firm-meta">
                      <b>{f.name}</b>
                      <span>{f.description}</span>
                    </div>
                    <em>{f.plans.length} plan{f.plans.length === 1 ? '' : 's'} <ChevronRight size={13} /></em>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bt-tp-body">
            <div className="bt-tp-firm-head">
              <FirmLogo firm={firm} size={36} />
              <span>{firm.plans.length} plan{firm.plans.length === 1 ? '' : 's'}</span>
            </div>
            <div className="bt-tp-plans">
              {firm.plans.map((p) => (
                <PlanCard key={p.id} plan={p} onApply={(plan, tier) => onApply(firm, plan, tier)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}