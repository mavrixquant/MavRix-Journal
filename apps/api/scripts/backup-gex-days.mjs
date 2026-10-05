// apps/api/scripts/backup-gex-days.mjs
//
// Dump every row of the `gex_days` table to a timestamped JSON file under
// apps/api/backups/. Uses the already-installed Prisma client — nothing to
// download, nothing to install.
//
// Usage (from apps/api):
//   node --env-file=.env scripts/backup-gex-days.mjs

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();

async function main() {
  console.log('[backup] reading gex_days…');

  const rows = await prisma.gexDay.findMany({
    orderBy: { date: 'asc' },
  });

  console.log(`[backup] fetched ${rows.length} row(s)`);

  // Timestamp filename: 2026-10-05T22-15-30 (colons stripped for Windows)
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);

  const backupDir = path.resolve('backups');
  await fs.mkdir(backupDir, { recursive: true });

  const outPath = path.join(backupDir, `gex-days-${stamp}.json`);

  const payload = {
    exportedAt: new Date().toISOString(),
    table: 'gex_days',
    count: rows.length,
    rows,
  };

  const json = JSON.stringify(payload, null, 2);
  await fs.writeFile(outPath, json, 'utf8');

  const kb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
  console.log(`[backup] written → ${outPath}`);
  console.log(`[backup] size: ${kb} KB`);
}

main()
  .catch((err) => {
    console.error('[backup] FAILED:', err?.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());