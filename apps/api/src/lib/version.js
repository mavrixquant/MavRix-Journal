// ============================================================================
// Single source of truth for the API version.
//
// Reads apps/api/package.json at module load. That file is bumped by
// scripts/bump-version.mjs and is the ONLY place the API version lives.
//
// Memoized - reads disk once at boot, then serves from memory.
// ============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _version = '0.0.0-unknown';
try {
  const pkgPath = resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  _version = pkg.version || _version;
} catch (err) {
  console.error('[version] could not read package.json:', err.message);
}

export const APP_VERSION = _version;
