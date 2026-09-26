import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt.js';
import { HttpError } from '../middleware/error.js';
import { generateSecureToken, VERIFY_TTL_MS } from '../lib/tokens.js';
import { sendVerificationEmail } from '../lib/mailer.js';
import { verifyGoogleAccessToken } from '../lib/google.js';

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  emailVerified: u.emailVerified,
  photoUrl: u.photoUrl,
  hasGoogle: !!u.googleId,
});

const issueTokens = (user) => {
  const payload = { sub: user.id, email: user.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

export async function signup({ email, password, firstName, lastName }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'Email already registered');

  const passwordHash = await hashPassword(password);
  const verifyToken = generateSecureToken();
  const verifyTokenExpiry = new Date(Date.now() + VERIFY_TTL_MS);

  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, verifyToken, verifyTokenExpiry },
  });

  await sendVerificationEmail({ to: user.email, token: verifyToken });

  return { user: publicUser(user), ...issueTokens(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new HttpError(401, 'Invalid email or password');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid email or password');

  return { user: publicUser(user), ...issueTokens(user) };
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  return publicUser(user);
}

export async function verifyEmail(token) {
  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user) throw new HttpError(400, 'Invalid verification token');
  if (user.verifyTokenExpiry && user.verifyTokenExpiry < new Date()) {
    throw new HttpError(400, 'Verification token expired');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null, verifyTokenExpiry: null },
  });

  return { ok: true };
}

export async function resendVerification(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, 'User not found');
  if (user.emailVerified) throw new HttpError(400, 'Email already verified');

  const verifyToken = generateSecureToken();
  const verifyTokenExpiry = new Date(Date.now() + VERIFY_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: { verifyToken, verifyTokenExpiry },
  });

  await sendVerificationEmail({ to: user.email, token: verifyToken });
  return { ok: true };
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw new HttpError(401, 'Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new HttpError(401, 'User no longer exists');

  return { user: publicUser(user), ...issueTokens(user) };
}

// ---------------------------------------------------------------------------
// Google
// ---------------------------------------------------------------------------

export async function loginWithGoogle(accessToken) {
  const g = await verifyGoogleAccessToken(accessToken);

  // Case 1: existing user with this googleId
  const byGoogle = await prisma.user.findUnique({ where: { googleId: g.googleId } });
  if (byGoogle) {
    return { user: publicUser(byGoogle), ...issueTokens(byGoogle) };
  }

  // Case 2: existing user with this email (created via password signup)
  const byEmail = await prisma.user.findUnique({ where: { email: g.email } });
  if (byEmail) {
    // Auto-link only if their email was already verified.
    if (!byEmail.emailVerified) {
      throw new HttpError(
        409,
        'An account with this email already exists and is not verified. Verify it first or log in with your password.'
      );
    }
    const linked = await prisma.user.update({
      where: { id: byEmail.id },
      data: {
        googleId: g.googleId,
        photoUrl: byEmail.photoUrl || g.photoUrl,
      },
    });
    return { user: publicUser(linked), ...issueTokens(linked) };
  }

  // Case 3: brand new user, Google-verified email
  const created = await prisma.user.create({
    data: {
      email: g.email,
      googleId: g.googleId,
      firstName: g.firstName,
      lastName: g.lastName,
      photoUrl: g.photoUrl,
      emailVerified: true,
      passwordHash: null,
    },
  });
  return { user: publicUser(created), ...issueTokens(created) };
}

export async function linkGoogleAccount(userId, accessToken) {
  const g = await verifyGoogleAccessToken(accessToken);

  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) throw new HttpError(404, 'User not found');

  if (me.googleId === g.googleId) {
    return publicUser(me); // idempotent
  }

  const clash = await prisma.user.findUnique({ where: { googleId: g.googleId } });
  if (clash && clash.id !== userId) {
    throw new HttpError(409, 'This Google account is already linked to another user');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      googleId: g.googleId,
      photoUrl: me.photoUrl || g.photoUrl,
    },
  });
  return publicUser(updated);
}

export async function unlinkGoogleAccount(userId) {
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) throw new HttpError(404, 'User not found');

  if (!me.googleId) return publicUser(me); // idempotent

  if (!me.passwordHash) {
    throw new HttpError(
      400,
      'Set a password before unlinking Google, otherwise you would be locked out'
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { googleId: null },
  });
  return publicUser(updated);
}