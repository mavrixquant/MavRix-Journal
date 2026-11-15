import { listPublished, getCurrentRelease } from '../services/releases.service.js';
import { getSettings } from '../lib/settings.js';

export async function getVersion(_req, res, next) {
  try {
    const current = await getCurrentRelease();
    res.json({
      version: current?.version || null,
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

    let banner = settings.announcementBanner;
    if (typeof banner === 'string' && banner.trim()) {
      banner = { message: banner.trim(), level: 'info', expiresAt: null };
    } else if (banner && typeof banner === 'object' && banner.message) {
      if (banner.expiresAt && new Date(banner.expiresAt).getTime() < Date.now()) {
        banner = null;
      }
    } else {
      banner = null;
    }

    res.json({
      maintenanceMode: !!settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage || '',
      announcementBanner: banner,
      version: current?.version || null,
      ts: Date.now(),
    });
  } catch (err) {
    next(err);
  }
}