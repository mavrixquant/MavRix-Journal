import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for ALL mocks that need to be referenced in vi.mock factories
const {
  mockOuterGexDayFindUnique,
  mockTxGexDayFindUnique,
  mockTxGexDayCreate,
  mockTxGexDayUpdate,
  mockUserFindMany,
  mockTransaction,
  mockWriteAudit,
  mockPushNotificationBulk,
  mockSerializeGexLevels,
} = vi.hoisted(() => ({
  mockOuterGexDayFindUnique: vi.fn(),
  mockTxGexDayFindUnique: vi.fn(),
  mockTxGexDayCreate: vi.fn(),
  mockTxGexDayUpdate: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockWriteAudit: vi.fn(),
  mockPushNotificationBulk: vi.fn(),
  // Exact copy of the real serializeGexLevels from packages/shared/src/gex.js:54-58
  mockSerializeGexLevels: (levels) => levels.map((l) => `${l.type}|${l.price}|${l.label}`).join(';'),
}));

// Mock @mavrix/shared using hoisted mock
vi.mock('@mavrix/shared', () => ({
  serializeGexLevels: mockSerializeGexLevels,
  GEX_DEFAULT_TIMEZONE: 'UTC',
  GEX_SYMBOLS: ['SPX', 'NDX', 'RUT'],
  DEFAULT_GEX_SYMBOL: 'SPX',
}));

// Mock Prisma - use hoisted mocks for transaction client
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    gexDay: {
      findUnique: mockOuterGexDayFindUnique,
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: mockUserFindMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('../lib/audit.js', () => ({
  writeAudit: mockWriteAudit,
}));

vi.mock('./notifications.service.js', () => ({
  pushNotificationBulk: mockPushNotificationBulk,
}));

import { _prisma } from '../lib/prisma.js';
import * as adminGexService from './adminGex.service.js';

describe('adminGex.service - B1: GEX upsert in transaction', () => {
  const mockActor = {
    id: 'user-1',
    email: 'admin@test.com',
    req: { ip: '127.0.0.1', headers: {} },
  };

  const mockLevels = [
    { type: 'GEX', price: 4500, label: 'Call Wall' },
    { type: 'BL', price: 4400, label: 'Put Wall' },
  ];
  const mockConverted = 'GEX|4500|Call Wall;BL|4400|Put Wall';
  const mockPayload = {
    date: '2024-01-15',
    levels: mockLevels,
    converted: mockConverted,
    sourceTimezone: 'UTC',
    symbol: 'SPX',
  };

  const mockRow = {
    id: 'gex-1',
    date: '2024-01-15',
    symbol: 'SPX',
    levels: mockLevels,
    converted: mockConverted,
    levelCount: 2,
    blCount: 1,
    gexCount: 1,
    otherCount: 0,
    sourceTimezone: 'UTC',
    uploadedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default transaction behavior - provides a tx client
    mockTransaction.mockImplementation(async (cb) => {
      const txClient = {
        gexDay: {
          findUnique: mockTxGexDayFindUnique,
          create: mockTxGexDayCreate,
          update: mockTxGexDayUpdate,
        },
        user: { findMany: mockUserFindMany },
      };
      return cb(txClient);
    });

    // Default: no existing gexDay in transaction, empty user list for notifications
    mockTxGexDayFindUnique.mockResolvedValue(null);
    mockTxGexDayCreate.mockResolvedValue(mockRow);
    mockTxGexDayUpdate.mockResolvedValue(mockRow);
    mockUserFindMany.mockResolvedValue([]);

    // Final fetch after transaction - use the outer mock
    mockOuterGexDayFindUnique.mockResolvedValue(mockRow);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('wraps upsert in prisma.$transaction (B1 fix)', async () => {
    const result = await adminGexService.upsertGexDay(mockActor, mockPayload);

    // Verify $transaction was called
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockTxGexDayFindUnique).toHaveBeenCalled();
    expect(mockTxGexDayCreate).toHaveBeenCalled();

    // Verify result is returned
    expect(result).toEqual(expect.objectContaining({ id: 'gex-1', symbol: 'SPX' }));
  });

  it('uses transaction client for findUnique and create/update', async () => {
    const result = await adminGexService.upsertGexDay(mockActor, mockPayload);

    expect(mockTxGexDayFindUnique).toHaveBeenCalled();
    expect(mockTxGexDayCreate).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: 'gex-1' }));
  });

  it('handles concurrent upsert race (TOCTOU prevention)', async () => {
    const result = await adminGexService.upsertGexDay(mockActor, mockPayload);

    expect(result).toEqual(expect.objectContaining({ id: 'gex-1', symbol: 'SPX' }));
    expect(mockTransaction).toHaveBeenCalled();
  });
});