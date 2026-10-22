export function landingFor(user) {
  if (!user) return '/login';
  if (!user.emailVerified) return '/verify-email';
  if (!user.username) return '/set-username';
  if (user.role === 'admin' || user.role === 'superadmin') return '/admin';
  return '/journal';
}