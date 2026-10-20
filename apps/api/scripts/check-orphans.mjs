
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PREFIX = 'healthcheck-';

function pad(s, n) {
  const str = String(s);
  return str.length >= n ? str : str + ' '.repeat(n - str.length);
}

async function main() {
  console.log('[orphan-check] scanning database for healthcheck-* artifacts…\n');


  const users = await prisma.user.findMany({
    where: { email: { startsWith: PREFIX } },
    select: { id: true, email: true, createdAt: true },
  });
  const userIds = users.map((u) => u.id);
  const userIdsOr = userIds.length ? userIds : ['__none__'];


  const [
    accounts,
    strategies,
    layouts,
    messages,
    conversationsOwned,
    friendships,
    friendRequests,
    blocks,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId: { in: userIdsOr } },
      select: { id: true },
    }),
    prisma.strategy.findMany({
      where: { userId: { in: userIdsOr } },
      select: { id: true },
    }),
    prisma.userLayout.findMany({
      where: { userId: { in: userIdsOr } },
      select: { id: true },
    }),
    prisma.message.findMany({
      where: { senderId: { in: userIdsOr } },
      select: { id: true },
    }),
    prisma.conversation.findMany({
      where: { createdById: { in: userIdsOr } },
      select: { id: true },
    }),
    prisma.friendship.findMany({
      where: {
        OR: [
          { userAId: { in: userIdsOr } },
          { userBId: { in: userIdsOr } },
        ],
      },
      select: { id: true },
    }),
    prisma.friendRequest.findMany({
      where: {
        OR: [
          { fromUserId: { in: userIdsOr } },
          { toUserId: { in: userIdsOr } },
        ],
      },
      select: { id: true },
    }),
    prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: { in: userIdsOr } },
          { blockedId: { in: userIdsOr } },
        ],
      },
      select: { id: true },
    }),
  ]);


  const trades = accounts.length
    ? await prisma.trade.findMany({
        where: { accountId: { in: accounts.map((a) => a.id) } },
        select: { id: true },
      })
    : [];


  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: { in: userIdsOr } },
    select: { id: true },
  });


  const audit = await prisma.adminAuditLog.findMany({
    where: { actorId: { in: userIdsOr } },
    select: { id: true },
  });


  const gex = await prisma.gexDay.findMany({
    where: { uploadedBy: { in: userIdsOr } },
    select: { date: true },
  });


  const rows = [
    ['users (prefix "healthcheck-")', users.length],
    ['accounts', accounts.length],
    ['trades', trades.length],
    ['strategies', strategies.length],
    ['layouts', layouts.length],
    ['conversations (owned)', conversationsOwned.length],
    ['conversation participants', participants.length],
    ['messages (sent)', messages.length],
    ['friendships', friendships.length],
    ['friend requests', friendRequests.length],
    ['user blocks', blocks.length],
    ['admin audit rows', audit.length],
    ['gex days', gex.length],
  ];

  let totalOrphans = 0;
  console.log('  Table                            Count');
  console.log('  ─────────────────────────────    ─────');
  for (const [label, count] of rows) {
    totalOrphans += count;
    const marker = count > 0 ? ' ✗' : ' ✓';
    console.log(`  ${pad(label, 30)}    ${pad(count, 5)}${marker}`);
  }
  console.log('  ─────────────────────────────    ─────');
  console.log(`  ${pad('TOTAL', 30)}    ${pad(totalOrphans, 5)}\n`);

  if (users.length > 0) {
    console.log('  Orphaned users:');
    for (const u of users) {
      console.log(`    · ${u.email}  (${u.id})  created ${u.createdAt.toISOString()}`);
    }
    console.log('');
  }

  if (totalOrphans === 0) {
    console.log('[orphan-check] ✓ CLEAN — no healthcheck artifacts in the database.\n');
    process.exit(0);
  } else {
    console.log(`[orphan-check] ✗ FOUND ${totalOrphans} orphan artifact(s).`);
    console.log('  Run a full Health Checkup again, or manually delete rows above.\n');
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('[orphan-check] FAILED:', err?.message || err);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());