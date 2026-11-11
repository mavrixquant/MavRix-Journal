// ============================================================================
// One-shot seed of app_releases from CHANGELOG.json.
//
// Runs on every boot; no-ops when the table already has rows. After the first
// seed, CHANGELOG.json is inert — all future releases come from /admin/releases.
// Imported entries get publishedAt = now() so existing user preferences stay
// meaningful and nothing re-broadcasts unexpectedly.
// ============================================================================

import { prisma } from './prisma.js';
import { readChangelogJson } from './changelog.js';

export async function seedReleasesFromJsonIfEmpty() {
  try {
    const count = await prisma.appRelease.count();
    if (count > 0) {
      console.log(`[releases] seed skipped — ${count} row(s) already in app_releases`);
      return { seeded: 0 };
    }

    const cl = readChangelogJson();
    const releases = Array.isArray(cl?.releases) ? cl.releases : [];
    if (releases.length === 0) {
      console.log('[releases] seed skipped — no CHANGELOG.json releases to import');
      return { seeded: 0 };
    }

    let seeded = 0;
    for (const r of releases) {
      if (!r?.version) continue;
      try {
        await prisma.appRelease.create({
          data: {
            version: String(r.version),
            date: String(r.date || ''),
            highlights: Array.isArray(r.highlights) ? r.highlights : [],
            sections: r.sections && typeof r.sections === 'object' ? r.sections : {},
            publishedAt: new Date(),
          },
        });
        seeded += 1;
      } catch (err) {
        console.warn(`[releases] seed row v${r.version} failed:`, err?.message || err);
      }
    }

    console.log(`[releases] seeded ${seeded} release(s) from CHANGELOG.json`);
    return { seeded };
  } catch (err) {
    console.error('[releases] seed failed:', err?.message || err);
    return { seeded: 0, error: err?.message };
  }
}
