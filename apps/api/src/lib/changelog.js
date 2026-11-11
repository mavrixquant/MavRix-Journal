// ============================================================================
// Reads CHANGELOG.json from repo root. Tries multiple candidate paths so it
// works locally, on Render, and inside Docker without any config change.
//
// If the file is missing everywhere, returns null - callers must skip
// gracefully. Never throws at boot.
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CANDIDATES = [
  resolve(__dirname, '../../../../CHANGELOG.json'), // repo root
  resolve(__dirname, '../../../CHANGELOG.json'),      // apps/api (fallback)
  resolve(process.cwd(), 'CHANGELOG.json'),
];

let _cache = undefined;

export function readChangelog() {
  if (_cache !== undefined) return _cache;

  for (const p of CANDIDATES) {
    try {
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw);
      const releases = Array.isArray(parsed.releases) ? parsed.releases : [];
      _cache = { releases };
      console.log(`[changelog] loaded ${releases.length} release(s) from ${p}`);
      return _cache;
    } catch (err) {
      console.error(`[changelog] failed to read ${p}:`, err.message);
    }
  }

  console.warn('[changelog] CHANGELOG.json not found in any expected location');
  _cache = null;
  return null;
}

export function getLatestRelease() {
  const cl = readChangelog();
  if (!cl || cl.releases.length === 0) return null;
  return cl.releases[0];
}

export function getReleaseByVersion(version) {
  const cl = readChangelog();
  if (!cl) return null;
  return cl.releases.find((r) => r.version === version) || null;
}
