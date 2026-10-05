// apps/api/scripts/restore-gex-days.mjs
//
// Restore gex_days rows from a backup JSON produced by backup-gex-days.mjs.
// Uses upsert, so it's safe to re-run — existing dates get overwritten,
// new dates get inserted.
//
// Usage (from apps/api):
//   node --env-file=.env scripts/restore-gex-days.mjs backups/gex-days-2026-10-05T22-15-30.json

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error(
      'Usage: node --env-file=.env scripts/restore-gex-days.mjs <path-to-backup.json>'
    );
    process.exit(1);
  }

  const raw = await fs.readFile(path.resolve(inputPath), 'utf8');
  const payload = JSON.parse(raw);

  // Support both { rows: [...] } (our format) and a bare array
  const rows = Array.isArray(payload) ? payload : payload.rows;
  if (!Array.isArray(rows)) {
    throw new Error('Backup file does not contain a rows array.');
  }

  console.log(`[restore] restoring ${rows.length} row(s)…`);

  let ok = 0;
  let fail = 0;

  for (const r of rows) {
    try {
      const data = {
        levels: r.levels,
        converted: r.converted,
        levelCount: r.levelCount,
        blCount: r.blCount,
        gexCount: r.gexCount,
        otherCount: r.otherCount,
        sourceTimezone: r.sourceTimezone || 'Asia/Kolkata',
        uploadedBy: r.uploadedBy || 'restore-script',
      };

      await prisma.gexDay.upsert({
        where: { date: r.date },
        create: { date: r.date, ...data },
        update: data,
      });
      ok += 1;
    } catch (err) {
      fail += 1;
      console.error(`[restore]   ✗ ${r.date}: ${err?.message || err}`);
    }
  }

  console.log(`[restore] done. ok=${ok}  fail=${fail}`);
}

main()
  .catch((err) => {
    console.error('[restore] FAILED:', err?.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());