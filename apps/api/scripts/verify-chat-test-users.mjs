// apps/api/scripts/verify-chat-test-users.mjs
//
// Dev-only utility: force-verify a fixed pair of chat smoke-test users.
// Run with:   node --env-file=.env scripts/verify-chat-test-users.mjs
//
// Safe to re-run. No-ops if the users don't exist yet (signup first).

import { PrismaClient } from '@prisma/client';

const EMAILS = ['chat-a@test.local', 'chat-b@test.local'];

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: { in: EMAILS } },
    data: {
      emailVerified: true,
      verifyToken: null,
      verifyTokenExpiry: null,
    },
  });
  console.log(`[verify-chat-test-users] verified ${result.count} user(s)`);
}

main()
  .catch((err) => {
    console.error('[verify-chat-test-users] FAILED:', err?.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());