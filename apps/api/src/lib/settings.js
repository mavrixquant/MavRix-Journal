// apps/api/src/lib/settings.js
//
// Typed access to SiteSetting rows with a 15-second in-memory cache.
//
// Seed on first read: if the table is empty, insert every key in DEFAULTS.
// This means the admin Settings page renders real values on a fresh install
// without a manual seed step.

import { prisma } from './prisma.js';

const CACHE_TTL_MS = 15_000;

/**
 * Canonical settings keys. Adding a new key here automatically makes it
 * available to the admin Settings page and enforces its default.
 */
export const DEFAULTS = Object.freeze({
  signupsEnabled: true,
  requireEmailVerification: true,
  maintenanceMode: false,
  maintenanceMessage: 'We are performing scheduled maintenance. Back shortly.',
  maxAccountsPerUser: 10,
  maxTradesPerAccount: 10_000,
  announcementBanner: '',
});

let cache = null; // { value: {...}, expiresAt }
let seedingPromise = null;

async function loadAll() {
  const rows = await prisma.siteSetting.findMany();
  const map = {};
  for (const row of rows) map[row.key] = row.value;

  // Fill any missing keys with their defaults and insert them.
  const missing = Object.keys(DEFAULTS).filter((k) => !(k in map));
  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map((key) =>
        prisma.siteSetting.upsert({
          where: { key },
          create: { key, value: DEFAULTS[key] },
          update: {},
        })
      )
    );
    for (const key of missing) map[key] = DEFAULTS[key];
  }

  return { ...DEFAULTS, ...map };
}

export async function getSettings() {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  // Serialize concurrent cold-start calls.
  if (!seedingPromise) {
    seedingPromise = loadAll()
      .then((value) => {
        cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
        return value;
      })
      .finally(() => {
        seedingPromise = null;
      });
  }
  return seedingPromise;
}

/**
 * Merge `partial` into the current settings. Unknown keys are ignored.
 * Returns the new full settings object.
 */
export async function updateSettings(partial, updatedBy = null) {
  const allowed = Object.keys(DEFAULTS);
  const entries = Object.entries(partial || {}).filter(([k]) =>
    allowed.includes(k)
  );
  if (entries.length === 0) return getSettings();

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value, updatedBy },
        update: { value, updatedBy },
      })
    )
  );

  cache = null; // force reload on next read
  return getSettings();
}

/** Read a single setting. */
export async function getSetting(key) {
  const all = await getSettings();
  return all[key];
}

export function invalidateSettingsCache() {
  cache = null;
}