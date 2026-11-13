import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['apps/web/src', 'apps/api/src', 'packages/shared/src'];
const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.json']);

let bad = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!EXTS.has(extname(p))) continue;
    const text = readFileSync(p).toString('utf8');
    if (text.includes('\uFFFD')) {
      console.error(`Non-UTF-8 bytes in: ${p}`);
      bad++;
    }
  }
}
for (const r of ROOTS) walk(r);
process.exit(bad ? 1 : 0);