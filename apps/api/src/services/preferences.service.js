// apps/api/src/services/preferences.service.js
//
// Per-user UI preference storage.
//
// The server is a dumb, versioned store — it does NOT know the shape of
// the preferences object. That lets the web client add new settings
// without a backend deploy. The only server-side constraints are:
//   - must be a plain JSON object (not null, not array, not primitive)
//   - serialized size <= 8 KB
//
// Reads and writes are scoped to req.userId via requireAuth.

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

const MAX_BYTES = 8 * 1024;

/**
 * Guard against oversized or malformed payloads.
 * Returns the value unchanged if valid, throws HttpError otherwise.
 */
export function assertPreferencesShape(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'preferences must be a plain object');
  }

  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new HttpError(400, 'preferences is not JSON-serializable');
  }

  if (serialized.length > MAX_BYTES) {
    throw new HttpError(
      413,
      `preferences exceeds the ${MAX_BYTES}-byte limit (was ${serialized.length}).`
    );
  }

  return value;
}

export async function getPreferences(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  if (!user) throw new HttpError(404, 'User not found');
  return user.preferences ?? {};
}

export async function setPreferences(userId, preferences) {
  const safe = assertPreferencesShape(preferences);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { preferences: safe },
    select: { preferences: true },
  });

  return user.preferences;
}