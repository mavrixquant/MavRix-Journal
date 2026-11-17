// ============================================================================
// Maintenance-mode gate.
//
// Runs before every /api/* route (except SSE which is mounted after it).
// If site_settings.maintenanceMode is ON, requests are rejected with 503
// unless:
//   • the path is one of the always-public endpoints below, OR
//   • the caller is an admin/superadmin with a valid access token, OR
//   • the caller sent an expired/invalid token — in which case the request
//     passes through so requireAuth can answer 401 and trigger a client
//     refresh. Answering 503 here used to make token expiry look like
//     "maintenance" and silently logged admins out. OR
//   • the request carries the health-check-run header (test harness bypass).
//
// The check runs against the CACHED settings (lib/settings.js), so the
// per-request cost is one Map lookup, not a DB query.
// ============================================================================

import { getSettings } from '../lib/settings.js';
import { verifyAccessToken } from '../lib/jwt.js';

// Always reachable, even during maintenance. Needed by the maintenance
// page itself (system/status), by monitoring (health), and by the changelog
// widget embedded in the landing page.
const ALWAYS_ALLOWED = new Set([
  '/api/health',
  '/api/version',
  '/api/changelog',
  '/api/system/status',
]);

// Auth sub-tree is always reachable: superadmins need to log in / refresh
// their token so they can reach /admin/settings and disable maintenance.
const ALLOWED_PREFIXES = ['/api/auth/'];

// Roles allowed to bypass maintenance entirely. Admins operate the site and
// need the admin panel during an outage; for that reason they bypass too.
const BYPASS_ROLES = new Set(['superadmin', 'admin']);

function readToken(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  // SSE clients pass ?token=… instead of a header.
  if (typeof req.query?.token === 'string') return req.query.token;
  return null;
}

// Classify the bearer token.
//   { hasToken:false }                       → anonymous
//   { hasToken:true, valid:true, role }      → verified
//   { hasToken:true, valid:false }           → expired / invalid (client must refresh)
function tokenState(req) {
  const token = readToken(req);
  if (!token) return { hasToken: false, valid: false, role: null };
  try {
    const payload = verifyAccessToken(token);
    return { hasToken: true, valid: true, role: payload.role || 'user' };
  } catch {
    return { hasToken: true, valid: false, role: null };
  }
}

export async function maintenanceGate(req, res, next) {
  // Health-check runs must always get through — otherwise the run itself
  // can never complete while maintenance is on.
  if (req.headers['x-health-check-run']) return next();

  const path = req.originalUrl.split('?')[0];

  if (ALWAYS_ALLOWED.has(path)) return next();
  for (const prefix of ALLOWED_PREFIXES) {
    if (path.startsWith(prefix)) return next();
  }

  let settings;
  try {
    settings = await getSettings();
  } catch (err) {
    // If settings can't be read we fail OPEN rather than lock everyone out.
    console.warn('[maintenance-gate] getSettings failed, allowing request:', err?.message);
    return next();
  }

  if (!settings.maintenanceMode) return next();

  const { hasToken, valid, role } = tokenState(req);

  // Admin/superadmin with a valid token → always through.
  if (valid && BYPASS_ROLES.has(role)) return next();

  // Token present but expired/invalid: do NOT answer 503 here. Passing
  // through lets requireAuth return 401, which is what triggers the client's
  // silent refresh. Without this, an admin's token expiry after 15 min looked
  // like "maintenance" (503) and the session could never recover.
  if (hasToken && !valid) return next();

  res.set('Retry-After', '60');
  return res.status(503).json({
    error: 'Maintenance in progress',
    maintenance: true,
    message:
      settings.maintenanceMessage ||
      'We are performing scheduled maintenance. Back shortly.',
  });
}