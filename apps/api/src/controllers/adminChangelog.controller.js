import { prisma } from '../lib/prisma.js';
import { readChangelog } from '../lib/changelog.js';
import { getSettings } from '../lib/settings.js';
import { publishPendingChangelog } from '../services/changelog.service.js';
import { writeAudit } from '../lib/audit.js';

async function actorEmail(userId) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return u?.email || '';
}

export async function listChangelog(_req, res, next) {
  try {
    const cl = readChangelog();
    const settings = await getSettings();
    const published = settings.lastPublishedChangelogVersion || null;
    const releases = (cl?.releases || []).map((r) => ({
      ...r,
      isPublished: r.version === published,
    }));
    res.json({ releases, lastPublishedVersion: published });
  } catch (e) { next(e); }
}

export async function publishChangelog(req, res, next) {
  try {
    const { force } = req.body || {};
    const result = await publishPendingChangelog({ force: !!force });

    await writeAudit({
      actorId: req.userId,
      actorEmail: await actorEmail(req.userId),
      action: 'changelog.publish',
      targetType: 'system',
      metadata: result,
      req,
    });

    res.json(result);
  } catch (e) { next(e); }
}
