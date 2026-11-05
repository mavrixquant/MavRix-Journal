import { fmtUnit, fmtPct, fmtInt, oddsOneIn, isNum, plural } from './format';
import { rankPct, recoveryStats } from './stats';

const METHOD_NAME = {
  permutation: 'permutation',
  bootstrap: 'bootstrap',
  block: 'block-bootstrap',
};

function edgeVerdict(summary) {
  if (summary.method === 'permutation') {
    return summary.medianFinal > 0
      ? { label: 'Positive expectancy', tone: 'good' }
      : { label: 'Negative expectancy', tone: 'bad' };
  }
  const p = summary.profitPct;
  if (p >= 85) return { label: 'Strong edge', tone: 'good' };
  if (p >= 65) return { label: 'Positive edge', tone: 'good' };
  if (p >= 50) return { label: 'Marginal edge', tone: 'warn' };
  return { label: 'No reliable edge', tone: 'bad' };
}

function riskVerdict(summary, hasLimit) {
  if (!hasLimit) return null;
  const b = summary.ddBreachPct;
  if (b <= 5) return { label: 'Low path risk', tone: 'good' };
  if (b <= 15) return { label: 'Moderate path risk', tone: 'warn' };
  if (b <= 35) return { label: 'High path risk', tone: 'bad' };
  return { label: 'Severe path risk', tone: 'bad' };
}

/**
 * Plain-language read of a finished simulation.
 * Pure function: everything it shows is derived from the engine output.
 */
export function buildInsights({ result, summary, isMoney, actualFinal }) {
  if (!result || !summary) return null;

  const hasLimit = isNum(result.ddThreshold);
  const limit = hasLimit ? Math.abs(result.ddThreshold) : null;
  const hasCapital = (result.initialCapital ?? 0) > 0;
  const isPerm = summary.method === 'permutation';

  const edge = edgeVerdict(summary);
  const risk = riskVerdict(summary, hasLimit);

  const headline =
    `${fmtInt(summary.runs)} ${METHOD_NAME[summary.method] || summary.method} runs of ` +
    `${fmtInt(summary.n)} trades: median outcome ${fmtUnit(summary.medianFinal, isMoney, { sign: true })}` +
    (isPerm
      ? ' (fixed - same trades, different order).'
      : `, 90% of runs land between ${fmtUnit(summary.p5Final, isMoney, { sign: true })} and ` +
        `${fmtUnit(summary.p95Final, isMoney, { sign: true })}.`);

  const bullets = [];

  if (isPerm) {
    bullets.push({
      tone: 'neutral',
      text:
        'Permutation re-orders your exact trades, so total P&L never changes. ' +
        'It measures path risk (drawdowns, streaks), not whether the edge is real. ' +
        'Use Bootstrap or Block to estimate probability of profit.',
      action: 'bootstrap',
    });
  } else {
    bullets.push({
      tone: summary.profitPct >= 75 ? 'good' : summary.profitPct >= 55 ? 'warn' : 'bad',
      text: `${fmtPct(summary.profitPct)} of runs finish profitable.`,
    });
  }

  if (hasLimit) {
    const odds = oddsOneIn(summary.ddBreachPct);
    bullets.push({
      tone: summary.ddBreachPct <= 5 ? 'good' : summary.ddBreachPct <= 15 ? 'warn' : 'bad',
      text:
        `${fmtPct(summary.ddBreachPct)} of runs breach your ${fmtUnit(limit, isMoney)} drawdown limit` +
        (odds ? ` (${odds}).` : '.'),
    });
  } else {
    bullets.push({ tone: 'neutral', text: 'No drawdown limit is set, so breach odds are not computed.' });
  }

  bullets.push({
    tone: 'neutral',
    text:
      `Typical worst drawdown is ${fmtUnit(Math.abs(summary.maxDD_p50), isMoney)}; ` +
      `in the worst 5% of runs it reaches ${fmtUnit(Math.abs(summary.maxDD_p5), isMoney)}` +
      (hasCapital && isNum(summary.maxDDPct_p5)
        ? ` (${fmtPct(Math.abs(summary.maxDDPct_p5))} of capital).`
        : '.'),
  });

  bullets.push({
    tone: 'neutral',
    text:
      `Expect a losing streak of about ${fmtInt(summary.lossStreak_p50)} ${plural(summary.lossStreak_p50, 'trade')} in a typical run, ` +
      `and ${fmtInt(summary.lossStreak_p95)} or more in 1 run out of 20.`,
  });

  const rec = recoveryStats(result.recoveryTrades);
  if (rec.neverPct >= 1) {
    bullets.push({
      tone: rec.neverPct >= 10 ? 'bad' : 'warn',
      text: `${fmtPct(rec.neverPct)} of runs never recover their worst drawdown before the sample ends.`,
    });
  } else if (rec.p50 != null) {
    bullets.push({
      tone: 'neutral',
      text: `Once in the worst drawdown, runs typically need ${fmtInt(rec.p50)} ${plural(rec.p50, 'trade')} to recover (95th pct: ${fmtInt(rec.p95)}).`,
    });
  }

  let actualRank = null;
  if (!isPerm && isNum(actualFinal) && result._sorted?.final) {
    actualRank = rankPct(result._sorted.final, actualFinal);
    if (actualRank != null) {
      const tone = actualRank >= 80 ? 'warn' : actualRank <= 20 ? 'warn' : 'neutral';
      const read =
        actualRank >= 80
          ? 'your real run was luckier than most simulated paths; expect some regression.'
          : actualRank <= 20
            ? 'your real run was unluckier than most simulated paths.'
            : 'your real run is typical of what the simulation produces.';
      bullets.push({
        tone,
        text: `Your actual result (${fmtUnit(actualFinal, isMoney, { sign: true })}) sits at the ${Math.round(actualRank)}th percentile: ${read}`,
      });
    }
  }

  return { edge, risk, headline, bullets, actualRank, recovery: rec };
}
