// ============================================================================
// Changelog broadcast - publishes a notification to every user whenever a
// new version appears in CHANGELOG.json and hasn't been broadcast yet.
//
// Idempotent across restarts:
//   site_settings.lastPublishedChangelogVersion tracks the last version
//   broadcast. If it matches the latest release, nothing happens.
//
// Wired into apps/api/src/index.js boot callback.
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { getSettings, updateSettings } from '../lib/settings.js';
import { getLatestRelease } from '../lib/changelog.js';
import { pushNotificationBulk } from './notifications.service.js';

export async function publishPendingChangelog({ force = false } = {}) {
  const latest = getLatestRelease();
  if (!latest) {
    return { ok: false, reason: 'no-changelog' };
  }

  if (!latest.version || !Array.isArray(latest.highlights)) {
    console.warn('[changelog] latest release missing version or highlights');
    return { ok: false, reason: 'malformed-release' };
  }

  const settings = await getSettings();

  if (!force && settings.changelogAutoPublish === false) {
    return { ok: false, reason: 'auto-publish-disabled' };
  }

  const lastPublished = settings.lastPublishedChangelogVersion || null;

  if (!force && lastPublished === latest.version) {
    return {
      ok: true,
      skipped: true,
      reason: 'already-published',
      version: latest.version,
    };
  }

  const recipients = await prisma.user.findMany({
    where: { isAi: false, isBanned: false },
    select: { id: true },
  });

  if (recipients.length === 0) {
    await updateSettings({ lastPublishedChangelogVersion: latest.version });
    return { ok: true, recipients: 0, version: latest.version };
  }

  const title = `v${latest.version} is live`;
  const body = latest.highlights.slice(0, 3).join(' · ');

  await pushNotificationBulk(
    recipients.map((u) => u.id),
    {
      type: 'changelog',
      section: 'broadcasts',
      title,
      body,
      data: { version: latest.version, date: latest.date, link: '/journal' },
    }
  );

  await updateSettings({ lastPublishedChangelogVersion: latest.version });

  console.log(
    `[changelog] published v${latest.version} to ${recipients.length} user(s)`
  );

  return { ok: true, recipients: recipients.length, version: latest.version };
}
