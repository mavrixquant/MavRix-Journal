import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { MAX_LAYOUTS } from '@mavrix/shared';

const serialize = (l) => ({
  id: l.id,
  name: l.name,
  layout: l.layout,
  isActive: l.isActive,
  createdAt: l.createdAt,
  updatedAt: l.updatedAt,
});

export async function listLayouts(userId) {
  const layouts = await prisma.userLayout.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  const active = layouts.find((l) => l.isActive);

  return {
    layouts: layouts.map(serialize),
    activeId: active?.id ?? layouts[0]?.id ?? null,
  };
}

export async function createLayout(userId, { id, name, layout }) {
  const count = await prisma.userLayout.count({ where: { userId } });

  if (count >= MAX_LAYOUTS) {
    throw new HttpError(409, `Maximum of ${MAX_LAYOUTS} layouts allowed`);
  }

  const isFirst = count === 0;

  try {
    const created = await prisma.userLayout.create({
      data: {
        id,
        userId,
        name,
        layout,
        isActive: isFirst,
      },
    });
    return serialize(created);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new HttpError(409, 'Layout ID already exists');
    }
    throw err;
  }
}

export async function updateLayout(userId, layoutId, { name, layout }) {
  const existing = await prisma.userLayout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!existing) throw new HttpError(404, 'Layout not found');

  const data = {};
  if (name !== undefined) data.name = name;
  if (layout !== undefined) data.layout = layout;

  const updated = await prisma.userLayout.update({
    where: { id: layoutId },
    data,
  });
  return serialize(updated);
}

export async function activateLayout(userId, layoutId) {
  const existing = await prisma.userLayout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!existing) throw new HttpError(404, 'Layout not found');

  await prisma.$transaction([
    prisma.userLayout.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    }),
    prisma.userLayout.update({
      where: { id: layoutId },
      data: { isActive: true },
    }),
  ]);

  return { ok: true };
}

export async function deleteLayout(userId, layoutId) {
  const existing = await prisma.userLayout.findFirst({
    where: { id: layoutId, userId },
  });
  if (!existing) throw new HttpError(404, 'Layout not found');

  await prisma.userLayout.delete({ where: { id: layoutId } });

  // If we deleted the active layout, promote the most recent remaining one.
  if (existing.isActive) {
    const next = await prisma.userLayout.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (next) {
      await prisma.userLayout.update({
        where: { id: next.id },
        data: { isActive: true },
      });
    }
  }

  return { ok: true };
}