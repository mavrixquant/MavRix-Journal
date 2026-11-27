import { describe, it, expect } from 'vitest';
import { barTouchesLevel, checkFill, buildDisplayEntries, displayUpTo } from './replayMath.js';

describe('barTouchesLevel', () => {
  const mockBar = { open: 100, high: 110, low: 90, close: 105, volume: 1000 };

  it('returns true when price is exactly at low', () => {
    expect(barTouchesLevel(90, mockBar)).toBe(true);
  });

  it('returns true when price is exactly at high', () => {
    expect(barTouchesLevel(110, mockBar)).toBe(true);
  });

  it('returns true when price is within range', () => {
    expect(barTouchesLevel(100, mockBar)).toBe(true);
    expect(barTouchesLevel(105, mockBar)).toBe(true);
  });

  it('returns false when price is below low', () => {
    expect(barTouchesLevel(89, mockBar)).toBe(false);
  });

  it('returns false when price is above high', () => {
    expect(barTouchesLevel(111, mockBar)).toBe(false);
  });

  it('returns false when price is null', () => {
    expect(barTouchesLevel(null, mockBar)).toBe(false);
  });

  it('returns false when price is undefined', () => {
    expect(barTouchesLevel(undefined, mockBar)).toBe(false);
  });

  describe('edge cases', () => {
    it('handles NaN price', () => {
      expect(barTouchesLevel(NaN, mockBar)).toBe(false);
    });

    it('handles price as string that can be coerced', () => { {
      const result = barTouchesLevel('100', mockBar);
      expect(result).toBe(true); // '100' coerced to 100
    }});

    it('handles bar with high equal to low (doji bar)', () => {
      const dojiBar = { open: 100, high: 100, low: 100, close: 100 };
      expect(barTouchesLevel(100, dojiBar)).toBe(true);
      expect(barTouchesLevel(99, dojiBar)).toBe(false);
      expect(barTouchesLevel(101, dojiBar)).toBe(false);
    });

    it('handles zero price', () => {
      const zeroBar = { open: 0, high: 10, low: -10, close: 5 };
      expect(barTouchesLevel(0, zeroBar)).toBe(true);
    });
  });
});

describe('checkFill', () => {
  const mockBar = { open: 100, high: 110, low: 90, close: 105 };

  describe('long position', () => {
    it('triggers SL when price drops below stop loss', () => {
      const position = { side: 'long', stopLoss: 95, takeProfit: 115 };
      const result = checkFill(position, mockBar);
      expect(result).toEqual({ price: 95, reason: 'sl' });
    });

    it('triggers TP when price rises above take profit', () => {
      const position = { side: 'long', stopLoss: 80, takeProfit: 108 };
      const result = checkFill(position, mockBar);
      expect(result).toEqual({ price: 108, reason: 'tp' });
    });

    it('SL takes priority when both touched in same bar', () => {
      const position = { side: 'long', stopLoss: 95, takeProfit: 108 };
      const result = checkFill(position, mockBar);
      expect(result).toEqual({ price: 95, reason: 'sl' });
    });

    it('returns null when no SL/TP set', () => {
      const position = { side: 'long' };
      const result = checkFill(position, mockBar);
      expect(result).toBeNull();
    });
  });

  describe('short position', () => {
    it('triggers SL when price rises above stop loss', () => {
      // For short: SL is hit when bar.high >= sl (price went too high)
      // TP is hit when bar.low <= tp (price went too low)
      const position = { side: 'short', stopLoss: 105, takeProfit: 102 };
      const result = checkFill(position, mockBar);
      // bar.high (110) >= sl (105): SL triggered
      // bar.open (100) < sl (105): no gap, fill at SL
      expect(result).toEqual({ price: 105, reason: 'sl' });
    });

    it('triggers TP when price drops below take profit', () => {
      // short TP: need bar.low <= tp
      // gap for short TP: bar.open < tp means gap up, fill at open
      const barForShortTP = { open: 90, high: 105, low: 94, close: 98 };
      const position = { side: 'short', stopLoss: 106, takeProfit: 95 };
      const result = checkFill(position, barForShortTP);
      // bar.high (105) < sl (106): SL not triggered
      // bar.low (94) <= tp (95): TP triggered
      // bar.open (90) < tp (95): gap, fill at open (90)
      expect(result).toEqual({ price: 90, reason: 'tp' });
    });

    it('no gap TP fill for short', () => {
      const barForShortTP = { open: 100, high: 105, low: 94, close: 98 };
      const position = { side: 'short', stopLoss: 106, takeProfit: 95 };
      const result = checkFill(position, barForShortTP);
      // bar.high (105) < sl (106): SL not triggered
      // bar.low (94) <= tp (95): TP triggered
      // bar.open (100) > tp (95): no gap, fill at TP (95)
      expect(result).toEqual({ price: 95, reason: 'tp' });
    });

    it('gap behavior at SL for short', () => {
      const barWithGap = { open: 92, high: 110, low: 88, close: 90 };
      const position = { side: 'short', stopLoss: 90, takeProfit: 80 };
      const result = checkFill(position, barWithGap);
      // bar.high (110) >= sl (90): SL triggered
      // bar.open (92) > sl (90): gap, fill at open (92)
      expect(result).toEqual({ price: 92, reason: 'sl' });
    });
  });

  describe('gap fill behavior', () => {
    it('fills at open when gap through SL (long)', () => {
      const barWithGap = { open: 80, high: 100, low: 75, close: 85 };
      const position = { side: 'long', stopLoss: 90, takeProfit: 120 };
      const result = checkFill(position, barWithGap);
      expect(result).toEqual({ price: 80, reason: 'sl' }); // Gap at open
    });

    it('fills at open when gap through SL (short)', () => {
      const barWithGap = { open: 105, high: 120, low: 100, close: 110 };
      const position = { side: 'short', stopLoss: 95, takeProfit: 80 };
      const result = checkFill(position, barWithGap);
      expect(result).toEqual({ price: 105, reason: 'sl' }); // Gap at open
    });

    it('fills at open when gap through TP (long)', () => {
      const barWithGap = { open: 115, high: 115, low: 100, close: 110 };
      const position = { side: 'long', stopLoss: 90, takeProfit: 110 };
      const result = checkFill(position, barWithGap);
      expect(result).toEqual({ price: 115, reason: 'tp' }); // Gap at open
    });
  });

  describe('no stop loss or take profit', () => {
    it('returns null when no SL or TP', () => {
      const position = { side: 'long' };
      const result = checkFill(position, mockBar);
      expect(result).toBeNull();
    });
  });
});

describe('buildDisplayEntries', () => {
  const mockBaseBars = [
    { time: 1700000000, utc: 1700000000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
    { time: 1700003600, utc: 1700003600, open: 105, high: 115, low: 100, close: 110, volume: 1200 },
  ];

  it('returns same bars for 1d interval (view == base)', () => {
    const entries = buildDisplayEntries(mockBaseBars, { viewSec: 86400, baseSec: 86400, offset: 0, isDaily: true });
    expect(entries).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    const entries = buildDisplayEntries([], { viewSec: 86400, baseSec: 86400, offset: 0, isDaily: false });
    expect(entries).toEqual([]);
  });
});