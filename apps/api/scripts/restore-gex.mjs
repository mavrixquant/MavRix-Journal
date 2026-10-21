#!/usr/bin/env node
// ============================================================================
// GEX RESTORE
//
// Reads a backup created by backup-gex.mjs and writes the rows back into
// GexDay. Three modes:
//
//   skip       (default) — create missing rows, leave existing rows untouched
//   update     — create missing rows, overwrite the data fields of existing
//                rows (keeps the existing row id)
//   overwrite  — delete + recreate every row that matches (id from backup)
//
// The script validates the entire file up front and can be run with
// --dry-run to preview what it would do.
//
// Usage:
//   npm run gex:restore -- apps/api/backups/gex-backup-20261201-120000.json
//   npm run gex:restore -- ./backup.json --mode=update
//   npm run gex:restore -- ./backup.json --mode=overwrite --yes
//   npm run gex:restore -- ./backup.json --dry-run
// ============================================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { prisma } from '../src/lib/prisma.js';

const VALID_MODES = ['skip', 'update', 'overwrite'];
const VALID_SYMBOLS = ['NQ', 'ES'];
const BACKUP_KIND = 'mavrix.gex.backup';

const USAGE = `
GEX RESTORE
───────────
Restores GexDay rows from a backup file created by backup-gex.mjs.

Options:
  <file>                Path to the backup JSON (required)
  --mode=<mode>         skip (default) | update | overwrite
  --dry-run             Print the plan and exit without writing
  --yes, -y             Skip the interactive confirmation
  --help, -h            Show this message

Modes:
  skip        Create missing rows, leave existing rows as-is
  update      Create missing rows, overwrite the data fields of existing rows
  overwrite   Delete + recreate every matching row (uses backup id)

Examples:
  npm run gex:restore -- ./backups/gex-backup-20261201-120000.json
  npm run gex:restore -- ./backup.json --mode=overwrite
  npm run gex:restore -- ./backup.json --dry-run
`.trim();

function parseArgs(argv) {
  const out = { file: null, mode: 'skip', dryRun: false, yes: false };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else if (a.startsWith('--mode=')) {
      out.mode = a.slice('--mode='.length);
    } else if (a === '--dry-run') {
      out.dryRun = true;
    } else if (a === '--yes' || a === '-y') {
      out.yes = true;
    } else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}\n\n${USAGE}`);
    } else if (!out.file) {
      out.file = a;
    } else {
      throw new Error(`Unexpected positional argument: ${a}`);
    }
  }
  if (!out.file) throw new Error('Backup file path is required.\n\n' + USAGE);
  if (!VALID_MODES.includes(out.mode)) {
    throw new Error(`Invalid --mode "${out.mode}". Allowed: ${VALID_MODES.join(' | ')}`);
  }
  return out;
}

function validateRow(row, i) {
  const errs = [];
  const where = `row ${i + 1}`;
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    errs.push(`${where}: not an object`);
    return errs;
  }
  if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(row.date))) {
    errs.push(`${where}: invalid date "${row.date}"`);
  }
  if (!row.symbol || !VALID_SYMBOLS.includes(String(row.symbol))) {
    errs.push(`${where}: invalid symbol "${row.symbol}" (allowed: ${VALID_SYMBOLS.join(', ')})`);
  }
  if (!Array.isArray(row.levels)) {
    errs.push(`${where}: "levels" must be an array`);
  }
  if (typeof row.converted !== 'string') {
    errs.push(`${where}: "converted" must be a string`);
  }
  if (!row.uploadedBy || typeof row.uploadedBy !== 'string') {
    errs.push(`${where}: "uploadedBy" must be a string`);
  }
  return errs;
}

function buildDataFromRow(row) {
  // Only the fields that can be written. `id`, `createdAt` handled separately
  // per-action (create vs update).
  return {
    levels: row.levels,
    converted: row.converted,
    levelCount:
      typeof row.levelCount === 'number' ? row.levelCount : row.levels.length,
    blCount: typeof row.blCount === 'number' ? row.blCount : 0,
    gexCount: typeof row.gexCount === 'number' ? row.gexCount : 0,
    otherCount: typeof row.otherCount === 'number' ? row.otherCount : 0,
    sourceTimezone: row.sourceTimezone || 'Asia/Kolkata',
    uploadedBy: row.uploadedBy,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const absPath = path.resolve(process.cwd(), args.file);

  // ---- read + parse ----
  let raw;
  try {
    raw = await fs.readFile(absPath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read ${absPath}: ${err.message}`);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }

  if (payload?.kind !== BACKUP_KIND) {
    throw new Error(
      `Not a GEX backup — expected kind="${BACKUP_KIND}", got "${payload?.kind}"`
    );
  }
  if (!Array.isArray(payload.rows)) {
    throw new Error('Backup file is missing a "rows" array');
  }

  // ---- validate every row up front ----
  const allErrors = [];
  payload.rows.forEach((row, i) => allErrors.push(...validateRow(row, i)));
  if (allErrors.length > 0) {
    console.error(`[restore] ✗ ${allErrors.length} validation error(s):`);
    allErrors.slice(0, 25).forEach((e) => console.error('   • ' + e));
    if (allErrors.length > 25) {
      console.error(`   … and ${allErrors.length - 25} more`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[restore] file:  ', absPath);
  console.log('[restore] backup:', payload.createdAt, `(${payload.count} rows)`);
  console.log('[restore] mode:  ', args.mode);
  if (args.dryRun) console.log('[restore] DRY RUN — no writes');

  // ---- build the plan (single pass of DB lookups) ----
  const plan = [];
  const summary = { create: 0, skip: 0, update: 0, overwrite: 0 };

  for (const row of payload.rows) {
    const existing = await prisma.gexDay.findUnique({
      where: { date_symbol: { date: row.date, symbol: row.symbol } },
      select: { id: true },
    });

    let action;
    if (!existing) action = 'create';
    else if (args.mode === 'skip') action = 'skip';
    else if (args.mode === 'update') action = 'update';
    else action = 'overwrite'; // 'overwrite'

    summary[action]++;
    plan.push({ row, action });
  }

  console.log('[restore] plan:  ', summary);

  if (summary.create === 0 && summary.update === 0 && summary.overwrite === 0) {
    console.log('[restore] nothing to do — every row already exists');
    return;
  }

  // ---- dry-run: print and bail ----
  if (args.dryRun) {
    for (const { row, action } of plan) {
      if (action === 'skip') continue;
      console.log(
        `   ${action.padEnd(10)} ${row.symbol} ${row.date} ` +
        `(${(row.levelCount ?? row.levels.length)} levels)`
      );
    }
    return;
  }

  // ---- confirm ----
  if (!args.yes) {
    const rl = readline.createInterface({ input, output });
    const ans = await rl.question(
      `\nApply this plan? Type "yes" to proceed: `
    );
    rl.close();
    if (ans.trim().toLowerCase() !== 'yes') {
      console.log('[restore] aborted — nothing was written');
      return;
    }
  }

  // ---- execute ----
  let done = 0;
  for (const { row, action } of plan) {
    if (action === 'skip') continue;

    const data = buildDataFromRow(row);
    const createdAt = row.createdAt ? new Date(row.createdAt) : undefined;

    if (action === 'create') {
      await prisma.gexDay.create({
        data: {
          ...(row.id ? { id: row.id } : {}),
          date: row.date,
          symbol: row.symbol,
          ...data,
          ...(createdAt ? { createdAt } : {}),
        },
      });
    } else if (action === 'update') {
      await prisma.gexDay.update({
        where: { date_symbol: { date: row.date, symbol: row.symbol } },
        data,
      });
    } else {
      // overwrite
      await prisma.$transaction(async (tx) => {
        await tx.gexDay.delete({
          where: { date_symbol: { date: row.date, symbol: row.symbol } },
        });
        await tx.gexDay.create({
          data: {
            ...(row.id ? { id: row.id } : {}),
            date: row.date,
            symbol: row.symbol,
            ...data,
            ...(createdAt ? { createdAt } : {}),
          },
        });
      });
    }

    done++;
    if (done % 10 === 0 || done === plan.length) {
      console.log(`[restore] ${done}/${plan.length} written…`);
    }
  }

  console.log(
    `[restore] ✓ done — ` +
    `${summary.create} created, ${summary.update} updated, ` +
    `${summary.overwrite} overwritten, ${summary.skip} skipped`
  );
}

main()
  .catch((err) => {
    console.error('[restore] ✗ failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });