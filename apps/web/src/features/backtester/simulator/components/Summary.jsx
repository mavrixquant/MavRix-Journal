import { CheckCircle2, AlertTriangle, XCircle, Info, ArrowRight } from 'lucide-react';
import { fmtUnit, fmtPct, fmtInt, fmtRatio, isNum, plural } from '../lib/format';

const TONE_ICON = { good: CheckCircle2, warn: AlertTriangle, bad: XCircle, neutral: Info };

/** Headline verdict + plain-language takeaways. */
export function Verdict({ insights, onSwitchToBootstrap }) {
  if (!insights) return null;
  const { edge, risk, headline, bullets } = insights;
  return (
    <section className="sx-card sx-verdict">
      <div className="sx-verdict-chips">
        <span className={`sx-badge tone-${edge.tone}`}>{edge.label}</span>
        {risk && <span className={`sx-badge tone-${risk.tone}`}>{risk.label}</span>}
      </div>
      <p className="sx-headline">{headline}</p>
      <ul className="sx-bullets">
        {bullets.map((b, i) => {
          const Icon = TONE_ICON[b.tone] || Info;
          return (
            <li key={i} className={`tone-${b.tone}`}>
              <Icon size={15} className="sx-bullet-icon" />
              <span>
                {b.text}
                {b.action === 'bootstrap' && (
                  <button type="button" className="sx-inline-btn" onClick={onSwitchToBootstrap}>
                    Switch to Bootstrap <ArrowRight size={12} />
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Delta({ cur, prev, fmt, better }) {
  if (!isNum(cur) || !isNum(prev)) return null;
  const d = cur - prev;
  if (Math.abs(d) < 1e-9) return null;
  const good = better === 'higher' ? d > 0 : better === 'lower' ? d < 0 : null;
  return (
    <span className={`sx-delta ${good == null ? '' : good ? 'is-good' : 'is-bad'}`} title="Change vs previous run">
      {d > 0 ? '\u25B2' : '\u25BC'} {fmt(Math.abs(d))}
    </span>
  );
}

function Kpi({ label, value, sub, tone, delta, hint }) {
  return (
    <div className="sx-kpi" title={hint}>
      <div className="sx-kpi-label">{label}</div>
      <div className={`sx-kpi-value ${tone ? `tone-${tone}` : ''}`}>{value}</div>
      <div className="sx-kpi-sub">
        <span>{sub}</span>
        {delta}
      </div>
    </div>
  );
}

export function KpiGrid({ result, summary, previous, isMoney }) {
  const hasLimit = isNum(result.ddThreshold);
  const hasCapital = (result.initialCapital ?? 0) > 0;
  const isPerm = summary.method === 'permutation';
  const u = (v, o) => fmtUnit(v, isMoney, o);
  const p = previous;

  const breachTone = !hasLimit ? undefined : summary.ddBreachPct <= 5 ? 'good' : summary.ddBreachPct <= 15 ? 'warn' : 'bad';
  const profitTone = summary.profitPct >= 75 ? 'good' : summary.profitPct >= 55 ? 'warn' : 'bad';

  return (
    <div className="sx-kpis">
      <Kpi
        label="Median outcome"
        value={u(summary.medianFinal, { sign: true })}
        tone={summary.medianFinal >= 0 ? 'good' : 'bad'}
        sub={isPerm ? 'Identical in every run' : `90% range ${u(summary.p5Final, { sign: true })} to ${u(summary.p95Final, { sign: true })}`}
        delta={!isPerm && <Delta cur={summary.medianFinal} prev={p?.medianFinal} fmt={(d) => u(d)} better="higher" />}
        hint="Median final P&L across all runs."
      />
      {isPerm ? (
        <Kpi
          label="Win rate"
          value={fmtPct(summary.win_p50)}
          sub="Fixed by your trades"
          hint="Permutation does not change which trades win."
        />
      ) : (
        <Kpi
          label="Probability of profit"
          value={fmtPct(summary.profitPct)}
          tone={profitTone}
          sub={`${fmtInt(summary.profitCount)} of ${fmtInt(summary.runs)} runs`}
          delta={<Delta cur={summary.profitPct} prev={p?.profitPct} fmt={(d) => `${d.toFixed(1)} pts`} better="higher" />}
          hint="Share of runs that finish above zero."
        />
      )}
      <Kpi
        label="Drawdown limit breach"
        value={hasLimit ? fmtPct(summary.ddBreachPct) : 'Off'}
        tone={breachTone}
        sub={hasLimit ? `limit ${u(Math.abs(result.ddThreshold))}` : 'Set a limit in the setup panel'}
        delta={hasLimit && <Delta cur={summary.ddBreachPct} prev={p?.ddBreachPct} fmt={(d) => `${d.toFixed(1)} pts`} better="lower" />}
        hint="Share of runs that fall at least this far below their peak at some point."
      />
      <Kpi
        label="Median max drawdown"
        value={u(Math.abs(summary.maxDD_p50))}
        sub={`worst 5%: ${u(Math.abs(summary.maxDD_p5))}${hasCapital && isNum(summary.maxDDPct_p5) ? ` (${fmtPct(Math.abs(summary.maxDDPct_p5), 0)})` : ''}`}
        delta={<Delta cur={Math.abs(summary.maxDD_p50)} prev={p ? Math.abs(p.maxDD_p50) : null} fmt={(d) => u(d)} better="lower" />}
        hint="Deepest peak-to-trough fall in a typical run."
      />
      <Kpi
        label="Expectancy per trade"
        value={u(summary.exp_p50, { sign: true, dp: isMoney ? 2 : 3 })}
        tone={summary.exp_p50 >= 0 ? 'good' : 'bad'}
        sub={`profit factor ${fmtRatio(summary.pf_p50)}`}
        delta={<Delta cur={summary.exp_p50} prev={p?.exp_p50} fmt={(d) => u(d, { dp: isMoney ? 2 : 3 })} better="higher" />}
        hint="Median average P&L per trade."
      />
      <Kpi
        label="Longest losing streak"
        value={`${fmtInt(summary.lossStreak_p50)} ${plural(summary.lossStreak_p50, 'trade')}`}
        sub={`1 in 20 runs: ${fmtInt(summary.lossStreak_p95)}+`}
        delta={<Delta cur={summary.lossStreak_p50} prev={p?.lossStreak_p50} fmt={(d) => String(Math.round(d))} better="lower" />}
        hint="Median of the longest run of consecutive losses."
      />
    </div>
  );
}
