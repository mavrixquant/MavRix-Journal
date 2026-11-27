import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set required env vars BEFORE importing any modules
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('JWT_SECRET', 'test-secret');
vi.stubEnv('REFRESH_SECRET', 'test-refresh-secret');
vi.stubEnv('NODE_ENV', 'test');

// Use vi.hoisted for mocks referenced in vi.mock factories
const {
  mockAuthServiceRefresh,
  mockInvalidateSvCache,
  mockPrismaUserUpdate,
} = vi.hoisted(() => ({
  mockAuthServiceRefresh: vi.fn(),
  mockInvalidateSvCache: vi.fn(),
  mockPrismaUserUpdate: vi.fn(),
}));

// Mock dependencies BEFORE importing the controller
vi.mock('../services/auth.service.js', () => ({
  default: { refresh: mockAuthServiceRefresh },
  refresh: mockAuthServiceRefresh,
}));
vi.mock('../lib/session.js', () => ({
  invalidateSvCache: mockInvalidateSvCache,
  getCachedSv: vi.fn(),
  setCachedSv: vi.fn(),
  resolveSv: vi.fn(),
}));
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: mockPrismaUserUpdate,
    },
  },
}));

import * as authController from './auth.controller.js';
import * as sessionLib from '../lib/session.js';
import { _prisma } from '../lib/prisma.js'; // Imported for type consistency in tests

describe('auth.controller - C1: Logout increments tokenVersion', () => {
  const mockReq = {
    cookies: { refreshToken: 'valid-refresh-token' },
    userId: 'user-1',
  };

  // Mock response that properly chains status().end()
  const createMockRes = () => {
    const res = {
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      status: vi.fn(function(code) { this.statusCode = code; return this; }),
      json: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      statusCode: 200,
    };
    return res;
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('logout', () => {
    it('clears refresh cookie', async () => {
      const mockRes = createMockRes();
      mockPrismaUserUpdate.mockResolvedValue({ id: 'user-1', tokenVersion: 2 });

      await authController.logout(mockReq, mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.objectContaining({
        httpOnly: true,
        path: '/api/auth',
        maxAge: 0,
      }));
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('increments user tokenVersion in database (C1 fix)', async () => {
      const mockRes = createMockRes();
      mockPrismaUserUpdate.mockResolvedValue({ id: 'user-1', tokenVersion: 2 });

      await authController.logout(mockReq, mockRes);

      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tokenVersion: { increment: 1 } },
      });
    });

    it('invalidates server-side tokenVersion cache (C1 fix)', async () => {
      const mockRes = createMockRes();
      mockPrismaUserUpdate.mockResolvedValue({ id: 'user-1', tokenVersion: 2 });

      await authController.logout(mockReq, mockRes);

      expect(sessionLib.invalidateSvCache).toHaveBeenCalledWith('user-1');
    });

    it('handles logout when userId not on request', async () => {
      const mockRes = createMockRes();
      const reqWithoutUser = { cookies: {} };

      await authController.logout(reqWithoutUser, mockRes);

      // Should still clear cookie but not try to update tokenVersion
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
      expect(sessionLib.invalidateSvCache).not.toHaveBeenCalled();
    });
  });

  describe('refresh - tokenVersion validation', () => {
    it('rejects refresh when tokenVersion mismatch', async () => {
      const mockRes = createMockRes();
      mockAuthServiceRefresh.mockRejectedValue(new Error('Invalid token'));

      mockReq.cookies = { refreshToken: 'stale-token' };
      await authController.refresh(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(200);
    });
  });
});