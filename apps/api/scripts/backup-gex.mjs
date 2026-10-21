#!/usr/bin/env node
// ============================================================================
// GEX BACKUP
//
// Dumps every GexDay row (NQ + ES + any future symbols) into a single JSON
// file. The file is fully self-describing (kind + version + timestamp) and can
// be fed back through restore-gex.mjs to recreate the table state.
//
// Usage:
//   npm run gex:backup                                  # → apps/api/backups/gex-backup-<ts>.json
//   npm run gex:backup -- --out=./my-gex.json           # custom path
//   npm run gex:backup -- --symbol=NQ                   # single symbol only
//   npm run gex:backup -- --out=./x.json --symbol=ES    # both
//
// The output path is resolved relative to the current working directory
// (which is apps/api when invoked via npm from that folder).
// ============================================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/lib/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/api/scripts/ → apps/api
const API_ROOT = path.resolve(__dirname, '..');

const BACKUP_VERSION = 1;
const BACKUP_KIND = 'mavrix.gex.backup';

const USAGE = `
GEX BACKUP
──────────
Dumps every GexDay row into a single JSON file.

Options:
  --out=<path>      Output path (default: apps/api/backups/gex-backup-<ts>.json)
  --symbol=<NQ|ES>  Only back up the given symbol (default: all)
  --help, -h        Show this message

Examples:
  npm run gex:backup
  npm run gex:backup -- --out=./snapshots/pre-2026-12-01.json
  npm run gex:backup -- --symbol=NQ
`.trim();

function parseArgs(argv) {
  const out = { out: null, symbol: null };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else if (a.startsWith('--out=')) {
      out.out = a.slice('--out='.length);
    } else if (a.startsWith('--symbol=')) {
      const s = a.slice('--symbol='.length).toUpperCase();
      if (!['NQ', 'ES'].includes(s)) {
        throw new Error(`Invalid --symbol "${s}". Allowed: NQ, ES`);
      }
      out.symbol = s;
    } else {
      throw new Error(`Unknown argument: ${a}\n\n${USAGE}`);
    }
  }
  return out;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

function serializeRow(r) {
  // Preserve every meaningful field. `levels` is Json in Prisma so it comes
  // back already parsed; keep it that way (don't stringify) for round-trip
  // fidelity.
  return {
    id: r.id,
    date: r.date,
    symbol: r.symbol,
    levels: r.levels,
    converted: r.converted,
    levelCount: r.levelCount,
    blCount: r.blCount,
    gexCount: r.gexCount,
    otherCount: r.otherCount,
    sourceTimezone: r.sourceTimezone,
    uploadedBy: r.uploadedBy,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const where = args.symbol ? { symbol: args.symbol } : {};

  console.log(`[backup] reading GexDay${args.symbol ? ` (${args.symbol} only)` : ''}…`);

  const rows = await prisma.gexDay.findMany({
    where,
    orderBy: [{ symbol: 'asc' }, { date: 'asc' }],
  });

  if (rows.length === 0) {
    console.warn('[backup] no GexDay rows found — the database is empty');
  }

  const payload = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    count: rows.length,
    symbols: [...new Set(rows.map((r) => r.symbol))].sort(),
    dateRange: rows.length > 0
      ? {
          from: rows.reduce((m, r) => (r.date < m ? r.date : m), rows[0].date),
          to: rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0].date),
        }
      : null,
    rows: rows.map(serializeRow),
  };

  const outPath = args.out
    ? path.resolve(process.cwd(), args.out)
    : path.join(API_ROOT, 'backups', `gex-backup-${timestamp()}.json`);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');

  const stat = await fs.stat(outPath);
  console.log(
    `[backup] ✓ wrote ${rows.length} row(s) ` +
    `(${payload.symbols.join(', ') || '—'}) · ` +
    `${(stat.size / 1024).toFixed(1)} KB`
  );
  console.log(`[backup] → ${outPath}`);
}

main()
  .catch((err) => {
    console.error('[backup] ✗ failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });