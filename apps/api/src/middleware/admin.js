
import { HttpError } from './error.js';

const ROLE_RANK = { user: 0, admin: 1, superadmin: 2 };

function roleRank(role) {
  return ROLE_RANK[role] ?? -1;
}

export function requireAdmin(req, _res, next) {
  if (roleRank(req.userRole) < ROLE_RANK.admin) {
    return next(new HttpError(403, 'Admin access required'));
  }
  next();
}

export function requireSuperadmin(req, _res, next) {
  if (req.userRole !== 'superadmin') {
    return next(new HttpError(403, 'Superadmin access required'));
  }
  next();
}

export { ROLE_RANK, roleRank };