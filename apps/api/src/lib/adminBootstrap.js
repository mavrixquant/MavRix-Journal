// apps/api/src/lib/adminBootstrap.js
//
// Boots the very first superadmin account.
//
// Called once at API startup. Behaviour:
//   1. If any user with role='superadmin' already exists → no-op.
//   2. If ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD are set → create
//      (or promote) that user to superadmin, mark email verified.
//   3. Otherwise → log a clear warning and do nothing. The operator must
//      set the env vars, restart the API, then remove them from .env.

import { prisma } from './prisma.js';
import { hashPassword } from './password.js';
import { env } from '../config/env.js';

export async function ensureSuperadmin() {
  const existing = await prisma.user.findFirst({
    where: { role: 'superadmin' },
    select: { id: true, email: true },
  });

  if (existing) {
    console.log(`[admin] superadmin already exists (${existing.email})`);
    return;
  }

  const { bootstrapEmail, bootstrapPassword } = env.admin;

  if (!bootstrapEmail || !bootstrapPassword) {
    console.warn(
      '[admin] no superadmin exists and ADMIN_BOOTSTRAP_EMAIL / ' +
        'ADMIN_BOOTSTRAP_PASSWORD are not set.\n' +
        '        Set them, restart the API, then remove them from .env.'
    );
    return;
  }

  if (bootstrapPassword.length < 8) {
    console.error(
      '[admin] ADMIN_BOOTSTRAP_PASSWORD must be at least 8 characters. Skipping bootstrap.'
    );
    return;
  }

  const email = bootstrapEmail.trim().toLowerCase();
  const passwordHash = await hashPassword(bootstrapPassword);

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    // Promote an existing account. Mark verified — we can't run the email
    // flow from the bootstrap. Clear any ban so we don't lock ourselves out.
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: 'superadmin',
        emailVerified: true,
        passwordHash,
        isBanned: false,
        bannedAt: null,
        bannedReason: null,
        bannedBy: null,
      },
    });
    console.log(`[admin] promoted existing user to superadmin: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        emailVerified: true,
        role: 'superadmin',
      },
    });
    console.log(`[admin] created superadmin: ${email}`);
  }

  console.warn(
    '[admin] You can now remove ADMIN_BOOTSTRAP_EMAIL and ' +
      'ADMIN_BOOTSTRAP_PASSWORD from .env.'
  );
}