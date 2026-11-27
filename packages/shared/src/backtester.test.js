import { describe, it, expect } from 'vitest';
import { getPointValue, computeBacktestPnl, propFirmConfigSchema } from './backtester.js';

describe('shared/backtester - Critical Paths', () => {
  // A2: getPointValue throws on unknown symbol
  describe('getPointValue - A2 fix', () => {
    it('returns correct pointValue for known symbols', () => {
      expect(getPointValue('NQ')).toBe(20);
      expect(getPointValue('ES')).toBe(50);
      expect(getPointValue('MNQ')).toBe(2);
      expect(getPointValue('CL')).toBe(1000);
    });

    it('handles case-insensitive symbols', () => {
      expect(getPointValue('nq')).toBe(20);
      expect(getPointValue('Es')).toBe(50);
    });

    it('strips contract month suffixes', () => {
      expect(getPointValue('NQM24')).toBe(20);
      expect(getPointValue('ESU23!')).toBe(50);
      expect(getPointValue('NQZ25')).toBe(20);
      expect(getPointValue('ESH24')).toBe(50);
    });

    it('THROWS on unknown symbol (A2 fix)', () => {
      expect(() => getPointValue('UNKNOWN')).toThrow('Unknown futures symbol: UNKNOWN');
      expect(() => getPointValue('XYZ')).toThrow('Unknown futures symbol: XYZ');
      expect(() => getPointValue('')).toThrow('Unknown futures symbol: ');
    });
  });

  // A1: checkFill / checkOrderFill gap-fill behavior (verified in web tests)
  describe('computeBacktestPnl', () => {
    it('computes P&L correctly for long position', () => {
      const pnl = computeBacktestPnl({
        side: 'long',
        entryPrice: 100,
        exitPrice: 105,
        quantity: 2,
        symbol: 'NQ', // pointValue = 20
      });
      // (105 - 100) * 2 * 20 = 200
      expect(pnl).toBe(200);
    });

    it('computes P&L correctly for short position', () => {
      const pnl = computeBacktestPnl({
        side: 'short',
        entryPrice: 100,
        exitPrice: 95,
        quantity: 1,
        symbol: 'ES', // pointValue = 50
      });
      // (100 - 95) * 1 * 50 = 250
      expect(pnl).toBe(250);
    });

    it('returns negative P&L for losing long trade', () => {
      const pnl = computeBacktestPnl({
        side: 'long',
        entryPrice: 100,
        exitPrice: 95,
        quantity: 1,
        symbol: 'NQ',
      });
      expect(pnl).toBe(-100);
    });
  });

  describe('propFirmConfigSchema validation', () => {
    it('validates required fields for percentage mode', () => {
      const valid = {
        firmName: 'FTMO',
        accountSize: 100000,
        profitTargetMode: 'pct',
        profitTargetPct: 10,
        maxDailyLossMode: 'pct',
        maxDailyLossPct: 5,
        maxTotalLossMode: 'pct',
        maxTotalLossPct: 10,
      };
      expect(() => propFirmConfigSchema.parse(valid)).not.toThrow();
    });

    it('requires usd amounts when mode is usd', () => {
      const invalid = {
        firmName: 'FTMO',
        accountSize: 100000,
        profitTargetMode: 'usd',
        // missing profitTargetUsd
        maxDailyLossMode: 'pct',
        maxDailyLossPct: 5,
        maxTotalLossMode: 'pct',
        maxTotalLossPct: 10,
      };
      expect(() => propFirmConfigSchema.parse(invalid)).toThrow();
    });
  });
});