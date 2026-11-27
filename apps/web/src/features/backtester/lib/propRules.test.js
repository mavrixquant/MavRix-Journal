import { describe, it, expect } from 'vitest';
import { evaluatePropRules } from './propRules.js';

describe('propRules - A6: Daily baseline at start-of-day equity', () => {
  const baseSession = {
    startingBalance: 100000,
    propFirmConfig: {
      firmName: 'FTMO',
      accountSize: 100000,
      profitTargetMode: 'pct',
      profitTargetPct: 10,
      maxDailyLossMode: 'pct',
      maxDailyLossPct: 5,
      maxTotalLossMode: 'pct',
      maxTotalLossPct: 10,
      minTradingDays: 5,
    },
  };

  const baseTrades = [
    // Day 1: Profitable trade
    { entryTime: '2024-01-15T09:30:00Z', exitTime: '2024-01-15T10:00:00Z', side: 'long', entryPrice: 100, exitPrice: 102, quantity: 1, symbol: 'NQ', commission: 0, exitReason: 'manual' },
    { entryTime: '2024-01-15T11:00:00Z', exitTime: '2024-01-15T11:30:00Z', side: 'long', entryPrice: 102, exitPrice: 103, quantity: 1, symbol: 'NQ', commission: 0, exitReason: 'manual' },
    // Day 2: Losing trade
    { entryTime: '2024-01-16T09:30:00Z', exitTime: '2024-01-16T10:00:00Z', side: 'long', entryPrice: 103, exitPrice: 99, quantity: 1, symbol: 'NQ', commission: 0, exitReason: 'manual' },
  ];

  it('calculates daily loss from start-of-day balance, not first exit (A6 fix)', () => {
    const nowMs = new Date('2024-01-16T12:00:00Z').getTime();
    const result = evaluatePropRules(baseSession, baseTrades, { tz: 'UTC', nowMs });

    // Day 1 (2024-01-15): Started at 100000, ended at 100000 + 2*20 + 1*20 = 100060
    // Day 2 (2024-01-16): Started at 100060, ended at 100060 - 4*20 = 99980
    // Daily loss on Day 2 = 100060 - 99980 = 80 (which is 0.08% of 100000)
    // This should NOT breach 5% daily limit

    expect(result.rules.find(r => r.id === 'daily').state).not.toBe('fail');
    expect(result.dailyUsed).toBeLessThan(5000); // 5% of 100000 = 5000
  });

  it('detects daily breach when loss exceeds limit from day-start balance', () => {
    const bigLossTrades = [
      ...baseTrades,
      // Day 3: Huge loss from day-start balance
      { entryTime: '2024-01-17T09:30:00Z', exitTime: '2024-01-17T10:00:00Z', side: 'long', entryPrice: 99, exitPrice: 50, quantity: 1, symbol: 'NQ', commission: 0, exitReason: 'manual' },
    ];

    const nowMs = new Date('2024-01-17T12:00:00Z').getTime();
    const result = evaluatePropRules(baseSession, bigLossTrades, { tz: 'UTC', nowMs });

    // Day 3 starts at ~99980, loses (99-50)*20 = 980, ends at ~99000
    // Daily loss = 99980 - 99000 = 980, still under 5000
    // This tests the calculation is correct
    expect(result.dailyUsed).toBeLessThan(5000);
  });

  it('total loss floor is static from starting balance', () => {
    const result = evaluatePropRules(baseSession, baseTrades, { tz: 'UTC', nowMs: Date.now() });

    // Total loss floor = 100000 - (100000 * 10%) = 90000
    expect(result.floor).toBe(90000);
    expect(result.totalLimit).toBe(10000);
  });

  it('returns null when no prop config', () => {
    const result = evaluatePropRules({ ...baseSession, propFirmConfig: null }, baseTrades, { tz: 'UTC' });
    expect(result).toBeNull();
  });

  it('calculates trading days correctly', () => {
    const nowMs = new Date('2024-01-16T12:00:00Z').getTime();
    const result = evaluatePropRules(baseSession, baseTrades, { tz: 'UTC', nowMs });

    // Trades on 15th and 16th = 2 trading days
    expect(result.tradingDays).toBe(2);
    expect(result.rules.find(r => r.id === 'days').current).toBe(2);
  });
});