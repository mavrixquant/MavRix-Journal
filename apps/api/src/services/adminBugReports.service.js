import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { writeAudit } from '../lib/audit.js';

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const serialize = (r) => ({
  id: r.id,
  userId: r.userId,
  title: r.title,
  description: r.description,
  category: r.category,
  severity: r.severity,
  status: r.status,
  pageUrl: r.pageUrl,
  userAgent: r.userAgent,
  adminNote: r.adminNote,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  user: r.user ? {
    id: r.user.id,
    email: r.user.email,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    role: r.user.role,
  } : undefined,
});

export async function listReports({
  status,
  severity,
  category,
  q = '',
  page = 1,
  limit = 25,
} = {}) {
  const take = Math.min(Math.max(1, Number(limit)), 100);
  const skip = (Math.max(1, Number(page)) - 1) * take;

  const where = {};
  if (status && VALID_STATUSES.includes(status)) where.status = status;
  if (severity) where.severity = severity;
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { title: { contains: String(q), mode: 'insensitive' } },
      { description: { contains: String(q), mode: 'insensitive' } },
      { user: { email: { contains: String(q), mode: 'insensitive' } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.bugReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    }),
    prisma.bugReport.count({ where }),
  ]);

  return {
    reports: rows.map(serialize),
    total,
    page: Math.max(1, Number(page)),
    limit: take,
    pages: Math.ceil(total / take),
  };
}

export async function updateReport(actor, reportId, patch = {}) {
  const existing = await prisma.bugReport.findUnique({ where: { id: reportId } });
  if (!existing) throw new HttpError(404, 'Bug report not found');

  const data = {};

  if (patch.status !== undefined) {
    const next = String(patch.status);
    if (!VALID_STATUSES.includes(next)) {
      throw new HttpError(400, `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`);
    }
    data.status = next;
  }

  if (patch.adminNote !== undefined) {
    data.adminNote =
      patch.adminNote == null || patch.adminNote === ''
        ? null
        : String(patch.adminNote).trim().slice(0, 2000);
  }

  if (Object.keys(data).length === 0) {
    return serialize({ ...existing, user: null });
  }

  const updated = await prisma.bugReport.update({
    where: { id: reportId },
    data,
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      },
    },
  });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'bug-report.update',
    targetType: 'bug_report',
    targetId: reportId,
    metadata: {
      patch,
      previous: { status: existing.status, adminNote: existing.adminNote },
    },
    req: actor.req,
  });

  return serialize(updated);
}

export async function deleteReport(actor, reportId) {
  const existing = await prisma.bugReport.findUnique({ where: { id: reportId } });
  if (!existing) throw new HttpError(404, 'Bug report not found');

  await prisma.bugReport.delete({ where: { id: reportId } });

  await writeAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: 'bug-report.delete',
    targetType: 'bug_report',
    targetId: reportId,
    metadata: { title: existing.title, ownerId: existing.userId },
    req: actor.req,
  });

  return { ok: true };
}