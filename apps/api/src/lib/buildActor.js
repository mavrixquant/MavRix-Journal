// ============================================================================
// Build Actor Utility — shared factory for admin controller actors
//
// D2 (Phase 2): Horizontal Scaling — Extract duplicated buildActor function
// ============================================================================

import { prisma } from './prisma.js';

/**
 * Builds an actor object from a request for admin operations.
 * @param {Object} req - Express request object with userId and userRole
 * @returns {Promise<Object>} Actor object with id, email, role, and req
 */
export async function buildActor(req) {
  const u = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  return {
    id: req.userId,
    email: u?.email || '',
    role: req.userRole,
    req,
  };
}