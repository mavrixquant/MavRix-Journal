import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();

const VALID_SYMBOLS = new Set(['NQ', 'ES']);
const DEFAULT_SYMBOL = 'NQ';

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

  const rows = Array.isArray(payload) ? payload : payload.rows;
  if (!Array.isArray(rows)) {
    throw new Error('Backup file does not contain a rows array.');
  }

  console.log(`[restore] restoring ${rows.length} row(s)…`);

  let ok = 0;
  let fail = 0;

  for (const r of rows) {
    try {
      // Backups made before the symbol column existed have no `symbol` field.
      // Fall back to NQ so those backups still restore cleanly.
      const symbol = VALID_SYMBOLS.has(r.symbol) ? r.symbol : DEFAULT_SYMBOL;

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
        where: { date_symbol: { date: r.date, symbol } },
        create: { date: r.date, symbol, ...data },
        update: data,
      });
      ok += 1;
    } catch (err) {
      fail += 1;
      console.error(
        `[restore]   x ${r.date}/${r.symbol || DEFAULT_SYMBOL}: ${err?.message || err}`
      );
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