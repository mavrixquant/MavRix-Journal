import { dayKey, toMs } from './time';
import { netOf, isClosed } from './sessionStats';

/* ============================================================================
   Prop-firm rule engine. Pure; recomputed from trade rows on every call.

   Model (documented so it can be tuned per firm later):
   - Percentages are of cfg.accountSize.
   - Equity base is session.startingBalance.
   - Daily loss : (start-of-day balance) − (current equity) >= limit, "day" = display timezone.
   - Total loss : static floor = startingBalance − accountSize × maxTotalLossPct.
   - Trading day: any day on which a trade was opened or closed.
   ============================================================================ */

const clamp01 = (x) => Math.max(0, Math.min(1, x));

export function evaluatePropRules(session, trades, { tz, nowMs, openPnl = 0 } = {}) {
  const cfg = session?.propFirmConfig;
  if (!cfg) return null;

  const initial = Number(session.startingBalance) || 0;
  const size = Number(cfg.accountSize) || initial;
  const targetAmt = (size * cfg.profitTargetPct) / 100;
  const dailyLimit = (size * cfg.maxDailyLossPct) / 100;
  const totalLimit = (size * cfg.maxTotalLossPct) / 100;
  const floor = initial - totalLimit;

  const all = Array.isArray(trades) ? trades : [];
  const closed = all.filter(isClosed).sort((a, b) => toMs(a.exitTime) - toMs(b.exitTime));

  // Realised balance path + historical breaches.
  let bal = initial;
  const dayStartBal = new Map(); // day -> balance at the day's first exit
  const dayNet = new Map();
  let breachedTotalAt = null;
  closed.forEach((t) => {
    const d = dayKey(t.exitTime, tz);
    if (!dayStartBal.has(d)) dayStartBal.set(d, bal);
    dayNet.set(d, (dayNet.get(d) || 0) + netOf(t));
    bal += netOf(t);
    if (bal <= floor && !breachedTotalAt) breachedTotalAt = d;
  });

  let breachedDailyAt = null;
  for (const [d, net] of dayNet) {
    if (-net >= dailyLimit) { breachedDailyAt = d; break; }
  }
  const explicitBreach = closed.some((t) => t.exitReason === 'prop_breach');

  // Live view.
  const realised = bal - initial;
  const equity = bal + openPnl;
  const todayKey = dayKey(nowMs ?? Date.now(), tz);
  const todayNetRealised = dayNet.get(todayKey) || 0;
  const todayPnl = todayNetRealised + openPnl;
  const dailyUsed = Math.max(0, -todayPnl);
  const totalUsed = Math.max(0, initial - equity);
  const profit = equity - initial;

  const days = new Set();
  all.forEach((t) => {
    days.add(dayKey(t.entryTime, tz));
    if (t.exitTime) days.add(dayKey(t.exitTime, tz));
  });
  const tradingDays = days.size;

  const dailyFail = breachedDailyAt != null || dailyUsed >= dailyLimit;
  const totalFail = breachedTotalAt != null || equity <= floor;
  const failed = dailyFail || totalFail || explicitBreach;
  const targetHit = profit >= targetAmt;
  const daysOk = tradingDays >= (cfg.minTradingDays || 0);
  const passed = !failed && targetHit && daysOk;

  const status = failed ? 'failed' : passed ? 'passed' : 'in_progress';

  const rules = [
    {
      id: 'profit',
      label: 'Profit target',
      current: Math.max(0, profit),
      limit: targetAmt,
      pct: clamp01(profit / targetAmt) * 100,
      remaining: Math.max(0, targetAmt - profit),
      unit: 'money',
      state: targetHit ? 'pass' : 'ok',
      detail: targetHit ? 'Target reached' : `${(cfg.profitTargetPct).toFixed(1)}% of account`,
    },
    {
      id: 'daily',
      label: 'Max daily loss',
      current: dailyUsed,
      limit: dailyLimit,
      pct: clamp01(dailyUsed / dailyLimit) * 100,
      remaining: Math.max(0, dailyLimit - dailyUsed),
      unit: 'money',
      state: dailyFail ? 'fail' : dailyUsed / dailyLimit >= 0.7 ? 'warn' : 'ok',
      detail: breachedDailyAt ? `Breached on ${breachedDailyAt}` : `${cfg.maxDailyLossPct}% of account / day`,
    },
    {
      id: 'total',
      label: 'Max total loss',
      current: totalUsed,
      limit: totalLimit,
      pct: clamp01(totalUsed / totalLimit) * 100,
      remaining: Math.max(0, totalLimit - totalUsed),
      unit: 'money',
      state: totalFail ? 'fail' : totalUsed / totalLimit >= 0.7 ? 'warn' : 'ok',
      detail: breachedTotalAt ? `Breached on ${breachedTotalAt}` : `${cfg.maxTotalLossPct}% of account (static)`,
    },
    {
      id: 'days',
      label: 'Trading days',
      current: tradingDays,
      limit: cfg.minTradingDays || 0,
      pct: cfg.minTradingDays ? clamp01(tradingDays / cfg.minTradingDays) * 100 : 100,
      remaining: Math.max(0, (cfg.minTradingDays || 0) - tradingDays),
      unit: 'days',
      state: daysOk ? 'pass' : 'ok',
      detail: daysOk ? 'Minimum met' : `${cfg.minTradingDays} required`,
    },
  ];

  return {
    status, failed, passed,
    equity, realised, profit, floor, targetAmt, dailyLimit, totalLimit,
    todayPnl, dailyUsed, totalUsed, tradingDays,
    rules,
    firmLabel: cfg.firmName === 'Other' ? cfg.firmNameCustom || 'Other' : cfg.firmName,
    breach: failed
      ? dailyFail ? 'daily' : totalFail ? 'total' : 'manual'
      : null,
  };
}
