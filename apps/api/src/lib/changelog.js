// ============================================================================
// Raw CHANGELOG.json reader. Only used by lib/seedReleases.js on first boot.
//
// All runtime changelog/version reads go through services/releases.service.js.
// If the file is missing, returns null — callers must skip gracefully.
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CANDIDATES = [
  resolve(__dirname, '../../../../CHANGELOG.json'),
  resolve(__dirname, '../../../CHANGELOG.json'),
  resolve(process.cwd(), 'CHANGELOG.json'),
];

let _cache = undefined;

export function readChangelogJson() {
  if (_cache !== undefined) return _cache;

  for (const p of CANDIDATES) {
    try {
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw);
      const releases = Array.isArray(parsed.releases) ? parsed.releases : [];
      _cache = { releases };
      console.log(`[changelog-seed] loaded ${releases.length} release(s) from ${p}`);
      return _cache;
    } catch (err) {
      console.error(`[changelog-seed] failed to read ${p}:`, err.message);
    }
  }

  console.warn('[changelog-seed] CHANGELOG.json not found in any expected location');
  _cache = null;
  return null;
}
