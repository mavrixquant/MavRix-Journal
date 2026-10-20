
import { prisma } from './prisma.js';

const SV_TTL_MS = 30_000;

const cache = new Map();

export function getCachedSv(userId) {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(userId);
    return null;
  }
  return entry.sv;
}

export function setCachedSv(userId, sv) {
  cache.set(userId, { sv, expiresAt: Date.now() + SV_TTL_MS });
}

export function invalidateSvCache(userId) {
  if (userId) cache.delete(userId);
}

export async function resolveSv(userId) {
  const cached = getCachedSv(userId);
  if (cached != null) return cached;

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  if (!row) return null;

  setCachedSv(userId, row.tokenVersion);
  return row.tokenVersion;
}