// apps/api/src/lib/session.js
//
// In-memory tokenVersion cache.
//
// requireAuth compares the JWT's `sv` claim against users.tokenVersion so
// that "force logout" and password-resets can invalidate issued tokens.
// Reading the DB on every request would be a per-request round trip; instead
// we cache (userId → tokenVersion) for SV_TTL_MS. Worst-case staleness is
// bounded by this TTL — well inside the 15m access-token lifetime anyway.
//
// Single-process only. Multi-instance deployments would need Redis pub/sub.

import { prisma } from './prisma.js';

const SV_TTL_MS = 30_000;

/** userId → { sv, expiresAt } */
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

/** Called by admin actions after bumping a user's tokenVersion. */
export function invalidateSvCache(userId) {
  if (userId) cache.delete(userId);
}

/**
 * Reads the current tokenVersion from cache, falling back to a single DB
 * read. Returns null if the user row no longer exists.
 */
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