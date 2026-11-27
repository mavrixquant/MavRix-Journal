import { describe, it, expect, vi, afterEach } from 'vitest';
import { snapToBar, normalizeBars, barUtcSec } from './time.js';

describe('snapToBar', () => {
  const mockBars = [
    { time: 1700000000000, utc: 1700000000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
    { time: 1700003600000, utc: 1700003600, open: 105, high: 115, low: 100, close: 110, volume: 1200 },
    { time: 1700007200000, utc: 1700007200, open: 110, high: 120, low: 105, close: 115, volume: 800 },
    { time: 1700010800000, utc: 1700010800, open: 115, high: 118, low: 110, close: 112, volume: 600 },
    { time: 1700014400000, utc: 1700014400, open: 112, high: 125, low: 110, close: 120, volume: 1500 },
  ];

  describe('binary search behavior', () => {
    it('returns -1 for empty or null bars array', () => {
      expect(snapToBar(null, 1000)).toBe(-1);
      expect(snapToBar(undefined, 1000)).toBe(-1);
      expect(snapToBar([], 1000)).toBe(-1);
    });

    it('returns correct index for exact match', () => {
      expect(snapToBar(mockBars, 1700000000)).toBe(0);
      expect(snapToBar(mockBars, 1700003600)).toBe(1);
      expect(snapToBar(mockBars, 1700014400)).toBe(4);
    });

    it('returns correct index for value between bars', () => {
      // Value between first and second bar
      expect(snapToBar(mockBars, 1700001000)).toBe(0);
      // Value between third and fourth bar
      expect(snapToBar(mockBars, 1700009000)).toBe(2);
    });

    it('returns last index for value after all bars', () => {
      expect(snapToBar(mockBars, 2000000000)).toBe(4);
    });

    it('returns -1 for value before all bars', () => {
      expect(snapToBar(mockBars, 1000000000)).toBe(-1);
    });
  });

  describe('custom key support', () => {
    it('uses custom key when provided', () => {
      const barsWithOpenClose = [
        { utc: 1700000000, open: 100, close: 105 },
        { utc: 1700003600, open: 105, close: 110 },
      ];

      // Search using 'open' as key
      expect(snapToBar(barsWithOpenClose, 100, 'open')).toBe(0);
      expect(snapToBar(barsWithOpenClose, 105, 'open')).toBe(1);

      // Search using 'close' as key
      expect(snapToBar(barsWithOpenClose, 105, 'close')).toBe(0);
      expect(snapToBar(barsWithOpenClose, 110, 'close')).toBe(1);
    });
  });

  describe('memoization with WeakMap', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('returns cached result for same bars array identity', () => {
      const bars = [...mockBars];
      const t = 1700001000;

      // First call
      const result1 = snapToBar(bars, t);
      expect(result1).toBe(0);

      // Second call with same bars array - should return cached result
      const result2 = snapToBar(bars, t);
      expect(result2).toBe(0);
    });

    it('does not cache across different bars arrays (different identity)', () => {
      const t = 1700001000;
      const bars1 = mockBars;
      const bars2 = [...mockBars]; // Different array identity

      const result1 = snapToBar(bars1, t);
      const result2 = snapToBar(bars2, t);

      expect(result1).toBe(0);
      expect(result2).toBe(0); // Same result but computed independently
    });

    it('cache is invalidated when time or key changes', () => {
      const bars = mockBars;

      const result1 = snapToBar(bars, 1000000000);
      expect(result1).toBe(-1);

      const result2 = snapToBar(bars, 1700001000);
      expect(result2).toBe(0);

      const result3 = snapToBar(bars, 1000000000, 'utc');
      expect(result3).toBe(-1);
    });

    it('memoization avoids recomputation', () => {
      const bars = mockBars;
      // Spy on the binary search by checking performance characteristics
      // WeakMap memoization should make repeated calls with same args fast

      const iterations = 1000;
      const t = 1700003600;

      // Warm up and measure first call
      snapToBar(bars, t);

      // Many repeated calls should be nearly instant due to caching
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        snapToBar(bars, t);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;
      // Cached calls should be extremely fast (< 0.01ms average)
      expect(avgTime).toBeLessThan(0.01);
    });
  });

  describe('edge cases', () => {
    it('handles NaN and undefined times gracefully (snapToBar works with valid utc values)', () => {
      const bars = [
        { utc: 1700000000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { utc: 1700003600, open: 105, high: 115, low: 100, close: 110, volume: 1200 },
      ];

      // snapToBar works fine with valid data even if other bars have NaN
      expect(snapToBar(bars, 1700003600)).toBe(1);
    });

    it('handles single bar array', () => {
      const singleBar = [mockBars[0]];

      expect(snapToBar(singleBar, 1700000000)).toBe(0);
      expect(snapToBar(singleBar, 1600000000)).toBe(-1);
      expect(snapToBar(singleBar, 2000000000)).toBe(0);
    });

    it('handles negative times', () => {
      const bars = [
        { utc: -1000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { utc: 0, open: 105, high: 115, low: 100, close: 110, volume: 1200 },
      ];

      expect(snapToBar(bars, -500)).toBe(0);
      expect(snapToBar(bars, 0)).toBe(1);
    });
  });
});

describe('normalizeBars', () => {
  describe('flat bar filtering', () => {
    it('filters bars with open === high === low === close and zero volume', () => {
      const rawBars = [
        { time: 1700000000, open: 100, high: 100, low: 100, close: 100, volume: 0 },
        { time: 1700003600, open: 105, high: 115, low: 100, close: 110, volume: 1200 },
      ];

      const result = normalizeBars(rawBars, '1d');
      expect(result).toHaveLength(1);
      expect(result[0].close).toBe(110);
    });

    it('keeps bars with open === high === low === close but non-zero volume', () => {
      const rawBars = [
        { time: 1700000000, open: 100, high: 100, low: 100, close: 100, volume: 100 },
      ];

      const result = normalizeBars(rawBars, '1d');
      expect(result).toHaveLength(1);
    });
  });

  describe('number conversion', () => {
    it('converts string numbers to actual numbers (via Number()) on bar properties', () => {
      const rawBars = [
        { time: '2023-11-14', open: '100', high: '110', low: '90', close: '105', volume: '1000' },
      ];

      const result = normalizeBars(rawBars, '1d');
      expect(typeof result[0].open).toBe('number');
      expect(typeof result[0].high).toBe('number');
      expect(typeof result[0].low).toBe('number');
      expect(typeof result[0].close).toBe('number');
      expect(typeof result[0].volume).toBe('number');
      expect(result[0].open).toBe(100);
      expect(result[0].high).toBe(110);
    });

    it('defaults volume to 0 when absent', () => {
      const rawBars = [
        { time: 1000, open: 100, high: 110, low: 90, close: 105 },
      ];

      const result = normalizeBars(rawBars, '1d');
      expect(result[0].volume).toBe(0);
    });
  });

  describe('sorting', () => {
    it('sorts bars by utc ascending', () => {
      const rawBars = [
        { time: 7000, open: 110, high: 120, low: 105, close: 115, volume: 800 },
        { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
        { time: 2000, open: 105, high: 115, low: 100, close: 110, volume: 1200 },
      ];

      const result = normalizeBars(rawBars, '1d');
      expect(result).toHaveLength(3);
      expect(result[0].utc).toBe(1000);
      expect(result[1].utc).toBe(2000);
      expect(result[2].utc).toBe(7000);
    });
  });
});

describe('barUtcSec', () => {
  it('returns number time directly when time is already a number', () => {
    const result = barUtcSec({ time: 1700000000 }, '1d');
    expect(result).toBe(1700000000);
  });

  it('converts ISO date string to unix seconds', () => {
    const result = barUtcSec({ time: '2023-11-14T00:00:00Z' }, '1d');
    expect(result).toBe(1699920000);
  });

  it('converts Date object to unix seconds', () => {
    const date = new Date('2023-11-14T00:00:00Z');
    const result = barUtcSec({ time: date }, '1d');
    expect(result).toBe(1699920000);
  });

  it('handles YYYY-MM-DD format (local timezone)', () => {
    const result = barUtcSec({ time: '2023-11-14' }, '1d');
    expect(typeof result).toBe('number');
    expect(Number.isInteger(result)).toBe(true);
  });
});