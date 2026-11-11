// ============================================================================
// Releases service — DB-backed changelog + version.
//
// The DB (app_releases) is the single source of truth for "what is the
// current release". CHANGELOG.json is seed-only (see lib/seedReleases.js).
//
// Publish semantics:
//   draft       -> publishedAt = NULL, invisible to users
//   publish     -> publishedAt = now, broadcasts notification
//   rebroadcast -> re-broadcast only, publishedAt unchanged
//   unpublish   -> publishedAt = NULL, hidden from /api/changelog
//   delete      -> confirm-and-remove
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';
import { pushNotificationBulk } from './notifications.service.js';

const VERSION_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

const serialize = (r) => ({
  id: r.id,
  version: r.version,
  date: r.date,
  highlights: r.highlights || [],
  sections: r.sections || {},
  publishedAt: r.publishedAt,
  publishedBy: r.publishedBy,
  createdBy: r.createdBy,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  isPublished: !!r.publishedAt,
});

function validatePayload(payload) {
  const version = String(payload.version || '').trim();
  if (!VERSION_RE.test(version)) {
    throw new HttpError(400, 'Version must look like 1.2.3 or 1.2.3-beta.1');
  }
  const date = String(payload.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, 'Date must be YYYY-MM-DD');
  }
  const highlights = Array.isArray(payload.highlights)
    ? payload.highlights.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
    : [];
  const sectionsIn = payload.sections && typeof payload.sections === 'object' ? payload.sections : {};
  const sections = {};
  for (const k of ['added', 'changed', 'fixed']) {
    sections[k] = Array.isArray(sectionsIn[k])
      ? sectionsIn[k].map((s) => String(s).trim()).filter(Boolean).slice(0, 100)
      : [];
  }
  return { version, date, highlights, sections };
}

export async function listAll() {
  const rows = await prisma.appRelease.findMany({
    orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
  });
  return rows.map(serialize);
}

export async function listPublished() {
  const rows = await prisma.appRelease.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
  });
  return rows.map(serialize);
}

export async function getCurrentRelease() {
  const row = await prisma.appRelease.findFirst({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
  });
  return row ? serialize(row) : null;
}

export async function createRelease(actor, payload, { publish = false } = {}) {
  const data = validatePayload(payload);

  const existing = await prisma.appRelease.findUnique({ where: { version: data.version } });
  if (existing) throw new HttpError(409, `Version ${data.version} already exists`);

  const row = await prisma.appRelease.create({
    data: {
      ...data,
      publishedAt: publish ? new Date() : null,
      publishedBy: publish ? actor.id : null,
      createdBy: actor.id,
    },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: publish ? 'release.create_and_publish' : 'release.create',
    targetType: 'app_release',
    targetId: row.id,
    metadata: { version: row.version, published: publish },
    req: actor.req,
  });

  if (publish) {
    await broadcastRelease(actor, row).catch((err) =>
      console.error('[releases] broadcast failed:', err?.message || err)
    );
  }

  return serialize(row);
}

export async function updateRelease(actor, id, payload) {
  const existing = await prisma.appRelease.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Release not found');

  const data = validatePayload(payload);

  if (data.version !== existing.version) {
    const clash = await prisma.appRelease.findUnique({ where: { version: data.version } });
    if (clash) throw new HttpError(409, `Version ${data.version} already exists`);
  }

  const row = await prisma.appRelease.update({ where: { id }, data });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'release.update',
    targetType: 'app_release',
    targetId: id,
    metadata: { version: row.version, previousVersion: existing.version },
    req: actor.req,
  });

  return serialize(row);
}

export async function publishRelease(actor, id) {
  const existing = await prisma.appRelease.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Release not found');
  if (existing.publishedAt) {
    throw new HttpError(400, `Release ${existing.version} is already published`);
  }

  const row = await prisma.appRelease.update({
    where: { id },
    data: { publishedAt: new Date(), publishedBy: actor.id },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'release.publish',
    targetType: 'app_release',
    targetId: id,
    metadata: { version: row.version },
    req: actor.req,
  });

  await broadcastRelease(actor, row).catch((err) =>
    console.error('[releases] broadcast failed:', err?.message || err)
  );

  return serialize(row);
}

export async function rebroadcastRelease(actor, id) {
  const existing = await prisma.appRelease.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Release not found');
  if (!existing.publishedAt) {
    throw new HttpError(400, `Release ${existing.version} is a draft — publish it first`);
  }

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'release.rebroadcast',
    targetType: 'app_release',
    targetId: id,
    metadata: { version: existing.version },
    req: actor.req,
  });

  await broadcastRelease(actor, existing);

  return { ok: true, version: existing.version };
}

export async function unpublishRelease(actor, id) {
  const existing = await prisma.appRelease.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Release not found');
  if (!existing.publishedAt) return serialize(existing);

  const row = await prisma.appRelease.update({
    where: { id },
    data: { publishedAt: null, publishedBy: null },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'release.unpublish',
    targetType: 'app_release',
    targetId: id,
    metadata: { version: row.version },
    req: actor.req,
  });

  return serialize(row);
}

export async function deleteRelease(actor, id) {
  const existing = await prisma.appRelease.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Release not found');

  await prisma.appRelease.delete({ where: { id } });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'release.delete',
    targetType: 'app_release',
    targetId: id,
    metadata: { version: existing.version, wasPublished: !!existing.publishedAt },
    req: actor.req,
  });

  return { ok: true, version: existing.version };
}

async function broadcastRelease(actor, row) {
  const recipients = await prisma.user.findMany({
    where: { isAi: false, isBanned: false },
    select: { id: true },
  });
  if (recipients.length === 0) return { recipients: 0 };

  const highlights = Array.isArray(row.highlights) ? row.highlights : [];
  const title = `v${row.version} is live`;
  const body = highlights.slice(0, 3).join(' · ');

  await pushNotificationBulk(
    recipients.map((u) => u.id),
    {
      type: 'changelog',
      section: 'broadcasts',
      title,
      body,
      data: { version: row.version, date: row.date, link: '/changelog', by: actor.email },
    }
  );

  console.log(`[releases] broadcast v${row.version} to ${recipients.length} user(s)`);
  return { recipients: recipients.length };
}
