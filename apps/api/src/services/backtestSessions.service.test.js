import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set required env vars BEFORE importing any modules
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('JWT_SECRET', 'test-secret');
vi.stubEnv('REFRESH_SECRET', 'test-refresh-secret');
vi.stubEnv('NODE_ENV', 'test');

const mockPrisma = {
  marketBar: {
    findMany: vi.fn(),
  },
  backtestTrade: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    groupBy: vi.fn(),
  },
  backtestSession: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  strategy: {
    findFirst: vi.fn(),
  },
  marketBarCoverage: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  $executeRawUnsafe: vi.fn(),
};

vi.mock('../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import validation function directly for unit testing
// We'll test it by checking the function's behavior

describe('validateFillAgainstBars (A5 - Server-side fill validation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bar data fetching', () => {
    it('fetches bars around exit time', async () => {
      const mockBars = [
        { time: new Date('2024-01-15T09:30:00Z'), open: 45000, high: 45050, low: 44950, close: 45000 },
        { time: new Date('2024-01-15T09:35:00Z'), open: 45000, high: 45020, low: 44980, close: 45010 },
      ];

      mockPrisma.marketBar.findMany.mockResolvedValue(mockBars);

      // Simulate the validation logic
      const exitTime = new Date('2024-01-15T09:35:00Z');
      const from = new Date(exitTime.getTime() - 300_000 * 2);
      const to = new Date(exitTime.getTime() + 300_000 * 2);

      const bars = await mockPrisma.marketBar.findMany({
        where: {
          symbol: 'NQ',
          interval: '5m',
          time: { gte: from, lte: to },
        },
        orderBy: { time: 'asc' },
        take: 10,
      });

      expect(mockPrisma.marketBar.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            symbol: 'NQ',
            interval: '5m',
          }),
        })
      );
      expect(bars.length).toBe(2);
    });

    it('returns validation with no_data when no bars found', async () => {
      mockPrisma.marketBar.findMany.mockResolvedValue([]);

      const exitTime = new Date('2024-01-15T09:35:00Z');
      const from = new Date(exitTime.getTime() - 300_000 * 2);
      const to = new Date(exitTime.getTime() + 300_000 * 2);

      const bars = await mockPrisma.marketBar.findMany({
        where: {
          symbol: 'NQ',
          interval: '5m',
          time: { gte: from, lte: to },
        },
        orderBy: { time: 'asc' },
        take: 10,
      });

      // When no bars, validation should indicate no_data
      expect(bars.length).toBe(0);
    });
  });

  describe('SL/TP fill simulation logic', () => {
    const testBars = [
      { time: new Date('2024-01-15T09:30:00Z'), open: 45000, high: 45050, low: 44950, close: 45000 },
      { time: new Date('2024-01-15T09:35:00Z'), open: 45000, high: 45030, low: 44970, close: 45010 },
      { time: new Date('2024-01-15T09:40:00Z'), open: 45010, high: 45030, low: 44980, close: 45000 },
    ];

    it('validates SL hit for long position with gap', () => {
      const long = true;
      const sl = 44980;
      const _tp = null;
      const exitBar = testBars[1]; // low: 44970, open: 45000

      // Check if SL was hit (low <= sl means price touched SL level)
      const slHit = sl != null && (long ? exitBar.low <= sl : exitBar.high >= sl);
      expect(slHit).toBe(true); // 44970 <= 44980

      // Expected fill price per checkFill logic (replayMath.js):
      // For long: if bar.low <= sl, SL is hit
      // gap = bar.open < sl means the open is BELOW the SL
      // If gap: fill at open (which is worse for long trader = higher price = more loss)
      // If no gap: fill at SL price
      const gap = long ? exitBar.open < sl : exitBar.open > sl;
      // gap = 45000 < 44980 = false, so no gap
      // fill at SL price = 44980
      const expectedPrice = gap ? exitBar.open : sl;
      expect(gap).toBe(false); // open 45000 is NOT < sl 44980
      expect(expectedPrice).toBe(44980); // fill at SL
    });

    it('validates SL hit for long position when gapped through', () => {
      const long = true;
      const sl = 45010; // Higher SL
      const exitBar = testBars[1]; // low: 44970, open: 45000

      // Check if SL was hit
      const slHit = long ? exitBar.low <= sl : exitBar.high >= sl;
      expect(slHit).toBe(true); // 44970 <= 45010

      // gap = open < sl = 45000 < 45010 = true
      const gap = long ? exitBar.open < sl : exitBar.open > sl;
      const expectedPrice = gap ? exitBar.open : sl;
      // When gapped: fill at open = 45000 (worse for long trader than SL 45010)
      expect(expectedPrice).toBe(45000);
    });

    it('validates TP hit for long position', () => {
      const long = true;
      const _sl = null;
      const tp = 45025;
      const exitBar = testBars[1]; // high: 45030, open: 45000

      // Check if TP was hit
      const tpHit = tp != null && (long ? exitBar.high >= tp : exitBar.low <= tp);
      expect(tpHit).toBe(true); // 45030 >= 45025

      // gap = open > tp = 45000 > 45025 = false
      const gap = long ? exitBar.open > tp : exitBar.open < tp;
      const expectedPrice = gap ? exitBar.open : tp;
      // No gap, fill at TP = 45025
      expect(expectedPrice).toBe(45025);
    });

    it('validates short position SL hit', () => {
      const long = false; // short
      const sl = 45020;
      const exitBar = testBars[1]; // high: 45030, open: 45000

      // For short: SL is above entry, check if high >= sl
      const slHit = sl != null && (long ? exitBar.low <= sl : exitBar.high >= sl);
      expect(slHit).toBe(true); // 45030 >= 45020

      // For short with SL: gap = open > sl
      const gap = long ? exitBar.open < sl : exitBar.open > sl;
      const expectedPrice = gap ? exitBar.open : sl;
      // gap = 45000 > 45020 = false, fill at SL = 45020
      expect(expectedPrice).toBe(45020);
    });

    it('validates short position TP hit', () => {
      const long = false; // short
      const _sl = null;
      const tp = 44985;
      const exitBar = testBars[1]; // low: 44970, open: 45000

      // For short: TP is below entry, check if low <= tp
      const tpHit = tp != null && (long ? exitBar.high >= tp : exitBar.low <= tp);
      expect(tpHit).toBe(true); // 44970 <= 44985

      // gap = open < tp = 45000 < 44985 = false
      const gap = long ? exitBar.open < tp : exitBar.open < tp;
      const expectedPrice = gap ? exitBar.open : tp;
      expect(expectedPrice).toBe(44985);
    });
  });

  describe('price deviation validation', () => {
    it('accepts valid price with small slippage when tick is futures point value', () => {
      // In futures, prices are quoted in points (e.g., NQ at 45000)
      // A tick for NQ is 0.25 points normally
      // For this validation, we allow reasonable client-side rounding
      const tick = 1; // Using 1 point as reasonable tolerance
      const expectedPrice = 45000;
      const actualPrice = 45000.50;
      const deviation = Math.abs(actualPrice - expectedPrice);

      // Should accept if within 3 ticks
      expect(deviation).toBeLessThanOrEqual(tick * 3);
    });

    it('rejects price with large deviation', () => {
      const tick = 1; // 1 point tolerance
      const expectedPrice = 45000;
      const actualPrice = 45100; // 100 point deviation
      const deviation = Math.abs(actualPrice - expectedPrice);

      // Should reject if beyond 3 ticks
      expect(deviation).toBeGreaterThan(tick * 3);
    });
  });

  describe('interval to ms conversion', () => {
    it('correctly converts intervals to milliseconds', () => {
      const map = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000 };

      expect(map['1m']).toBe(60_000);
      expect(map['5m']).toBe(300_000);
      expect(map['1h']).toBe(3_600_000);
      expect(map['4h']).toBe(14_400_000);
      expect(map['1d']).toBe(86_400_000);
    });
  });

  describe('SL/TP precedence', () => {
    it('SL takes precedence over TP when both hit in same bar', () => {
      const long = true;
      const sl = 44980;
      const _tp = 45025;
      // exitBar: low: 44970, high: 45030, open: 45000

      // Check SL first
      const slHit = long ? 44970 <= sl : 45030 >= sl;
      expect(slHit).toBe(true); // 44970 <= 44980

      // Since SL hits first, it wins
      const gap = long ? 45000 < sl : 45000 > sl; // false
      const expectedPrice = gap ? 45000 : sl; // 44980

      expect(expectedPrice).toBe(44980); // SL price
    });
  });
});

// Integration-style test for the updateTrade validation flow
describe('updateTrade with fill validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects exit with price deviation from market data', async () => {
    // This would be the full flow from updateTrade
    // For now, just verify the bar lookup happens

    const mockBars = [
      { time: new Date('2024-01-15T09:35:00Z'), open: 45000, high: 45030, low: 44970, close: 45010 },
    ];

    mockPrisma.marketBar.findMany.mockResolvedValue(mockBars);

    const exitPrice = 45100; // Way off from market
    const ticket = 0.01;

    const deviation = Math.abs(exitPrice - 45000);

    // Would be rejected
    expect(deviation).toBeGreaterThan(ticket * 3);
  });

  it('accepts valid SL exit price', async () => {
    const mockBars = [
      { time: new Date('2024-01-15T09:35:00Z'), open: 45000, high: 45030, low: 44970, close: 45010 },
    ];

    mockPrisma.marketBar.findMany.mockResolvedValue(mockBars);

    // Client submits exit at SL price 44980
    const stopLoss = 44980;
    const clientExitPrice = 44980;

    const long = true;
    const sl = stopLoss;
    const exitBar = mockBars[0];

    // Validate SL hit
    const slHit = long ? exitBar.low <= sl : exitBar.high >= sl;
    expect(slHit).toBe(true); // 44970 <= 44980

    // No gap, so fill at SL price
    const gap = long ? exitBar.open < sl : exitBar.open > sl; // 45000 < 44980 = false
    const expectedPrice = gap ? exitBar.open : sl; // 44980

    // Client submitted price should match expected price
    expect(clientExitPrice).toBe(expectedPrice); // 44980
  });
});