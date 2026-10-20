
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';

const MAX_BYTES = 8 * 1024;

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