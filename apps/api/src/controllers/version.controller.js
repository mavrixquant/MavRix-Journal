// ============================================================================
// /api/version and /api/changelog — DB-backed.
//
// `version` reflects the latest PUBLISHED release (admin-controlled, no
// rebuild needed). `buildVersion` is package.json — kept for debugging
// "which code is running".
//
// /api/system/status is the maintenance-mode probe used by the web app.
// It is NOT gated by the maintenance middleware (see ALWAYS_ALLOWED in
// middleware/maintenance.js) so the maintenance page can always read it.
// ============================================================================

import { APP_VERSION } from '../lib/version.js';
import { listPublished, getCurrentRelease } from '../services/releases.service.js';
import { getSettings } from '../lib/settings.js';

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

// ---------------------------------------------------------------------------
// FIXED 2026-11-15 — new endpoint for maintenance gate.
// Exposes just enough for the web app to decide whether to render the
// maintenance page. No auth required so it works even when nobody is
// logged in.
// ---------------------------------------------------------------------------
export async function getSystemStatus(_req, res, next) {
  try {
    const [settings, current] = await Promise.all([
      getSettings(),
      getCurrentRelease().catch(() => null),
    ]);
    res.json({
      maintenanceMode: !!settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage || '',
      version: current?.version || null,
      buildVersion: APP_VERSION,
      ts: Date.now(),
    });
  } catch (err) {
    next(err);
  }
}