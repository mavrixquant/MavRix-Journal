// Pure helpers that derive everything the new panels need from stats.outcomes.

export function getEquity(stats) {
  if (Array.isArray(stats?.equity) && stats.equity.length) return stats.equity;
  let c = 0;
  return (stats?.outcomes || []).map((o) => ({ x: o.date, y: (c += Number(o.score) || 0) }));
}

export function summarize(stats) {
  const out = stats?.outcomes || [];
  const scores = out.map((o) => Number(o.score) || 0);

  let grossWin = 0;
  let grossLoss = 0;
  let wn = 0;
  let ln = 0;
  scores.forEach((s) => {
    if (s > 0) {
      grossWin += s;
      wn += 1;
    } else if (s < 0) {
      grossLoss += -s;
      ln += 1;
    }
  });
  const avgWin = wn ? grossWin / wn : 0;
  const avgLoss = ln ? grossLoss / ln : 0;

  const equity = getEquity(stats);
  let peak = 0;
  let maxDD = 0;
  equity.forEach((p) => {
    peak = Math.max(peak, p.y);
    maxDD = Math.max(maxDD, peak - p.y);
  });
  const last = equity.length ? equity[equity.length - 1].y : 0;
  const curDD = Math.max(0, peak - last);

  // current streak (consecutive wins or losses at the end)
  let streak = { type: null, n: 0 };
  for (let i = out.length - 1; i >= 0; i -= 1) {
    const r = out[i].result;
    if (r !== 'win' && r !== 'loss') break;
    if (!streak.type) streak = { type: r, n: 1 };
    else if (streak.type === r) streak.n += 1;
    else break;
  }

  let best = null;
  let worst = null;
  out.forEach((o) => {
    const s = Number(o.score) || 0;
    if (!best || s > best.score) best = { score: s, date: o.date };
    if (!worst || s < worst.score) worst = { score: s, date: o.date };
  });

  return {
    n: out.length,
    scores,
    grossWin,
    grossLoss,
    avgWin,
    avgLoss,
    payoff: avgLoss > 0 ? avgWin / avgLoss : null,
    equity,
    maxDD,
    curDD,
    streak,
    best,
    worst,
    recentResults: out.slice(-20).map((o) => o.result),
    recentScores: scores.slice(-16),
  };
}

export function aggregate(outcomes, keyFn, order) {
  const map = new Map();
  (outcomes || []).forEach((o) => {
    const key = keyFn(o);
    if (key == null || key === '') return;
    if (!map.has(key)) map.set(key, { key, total: 0, n: 0, wins: 0 });
    const row = map.get(key);
    row.total += Number(o.score) || 0;
    row.n += 1;
    if (o.result === 'win') row.wins += 1;
  });
  const rows = [...map.values()].map((r) => ({ ...r, winRate: r.n ? (r.wins / r.n) * 100 : 0 }));
  if (order) {
    const rank = (k) => {
      const i = order.indexOf(k);
      return i === -1 ? 999 : i;
    };
    return rows.sort((a, b) => rank(a.key) - rank(b.key));
  }
  return rows.sort((a, b) => b.total - a.total);
}

export function monthly(outcomes) {
  const map = new Map();
  (outcomes || []).forEach((o) => {
    const key = o.date?.slice(0, 7);
    if (!key) return;
    if (!map.has(key)) map.set(key, { key, total: 0, n: 0, wins: 0 });
    const row = map.get(key);
    row.total += Number(o.score) || 0;
    row.n += 1;
    if (o.result === 'win') row.wins += 1;
  });
  return [...map.values()]
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((r) => ({ ...r, winRate: r.n ? (r.wins / r.n) * 100 : 0 }));
}

export function rollingAverage(values, window) {
  const out = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out.push({ i, v: sum / window });
  }
  return out;
}
