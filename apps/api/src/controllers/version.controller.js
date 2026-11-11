// ============================================================================
// /api/version and /api/changelog — DB-backed.
//
// `version` reflects the latest PUBLISHED release (admin-controlled, no
// rebuild needed). `buildVersion` is package.json — kept for debugging
// "which code is running".
// ============================================================================

import { APP_VERSION } from '../lib/version.js';
import { listPublished, getCurrentRelease } from '../services/releases.service.js';

export async function getVersion(_req, res, next) {
  try {
    const current = await getCurrentRelease();
    res.json({
      version: current?.version || null,
      buildVersion: APP_VERSION,
      latestRelease: current
        ? { version: current.version, date: current.date, highlights: current.highlights }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getChangelog(_req, res, next) {
  try {
    const releases = await listPublished();
    res.json({ releases });
  } catch (err) {
    next(err);
  }
}
