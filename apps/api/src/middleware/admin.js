// apps/api/src/middleware/admin.js
//
// Role gates. Mount AFTER requireAuth — these read req.userRole, which
// requireAuth sets from the access token's `role` claim.
//
// Privilege ranking is deliberately tiny and hard-coded. If you ever add
// more roles, extend ROLE_RANK and nothing else.

import { HttpError } from './error.js';

const ROLE_RANK = { user: 0, admin: 1, superadmin: 2 };

function roleRank(role) {
  return ROLE_RANK[role] ?? -1;
}

/** Requires req.userRole to be at least `admin`. */
export function requireAdmin(req, _res, next) {
  if (roleRank(req.userRole) < ROLE_RANK.admin) {
    return next(new HttpError(403, 'Admin access required'));
  }
  next();
}

/** Requires req.userRole === 'superadmin'. */
export function requireSuperadmin(req, _res, next) {
  if (req.userRole !== 'superadmin') {
    return next(new HttpError(403, 'Superadmin access required'));
  }
  next();
}

export { ROLE_RANK, roleRank };