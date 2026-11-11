#!/usr/bin/env node
// Usage:
//   node scripts/bump-version.mjs 0.2.0
//   node scripts/bump-version.mjs 0.2.0 --no-tag
//   node scripts/bump-version.mjs 0.2.0 --dry-run

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));

const newVersion = positional[0];
const dryRun = flags.has('--dry-run');
const noTag = flags.has('--no-tag');

if (!newVersion || !/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/i.test(newVersion)) {
  console.error('Usage: node scripts/bump-version.mjs <MAJOR.MINOR.PATCH> [--no-tag] [--dry-run]');
  process.exit(1);
}

const packages = [
  resolve(ROOT, 'package.json'),
  resolve(ROOT, 'apps/api/package.json'),
  resolve(ROOT, 'apps/web/package.json'),
];

for (const p of packages) {
  if (!existsSync(p)) { console.error(`Missing: ${p}`); process.exit(1); }
}

const current = JSON.parse(readFileSync(packages[0], 'utf8')).version;
console.log(`Current version: ${current}`);
console.log(`New version:     ${newVersion}`);

for (const p of packages) {
  const pkg = JSON.parse(readFileSync(p, 'utf8'));
  pkg.version = newVersion;
  if (!dryRun) writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`  ${dryRun ? '[dry] ' : ''}updated ${relative(ROOT, p)}`);
}

const versionFile = resolve(ROOT, 'VERSION');
if (!dryRun) writeFileSync(versionFile, newVersion + '\n', 'utf8');
console.log(`  ${dryRun ? '[dry] ' : ''}wrote VERSION`);

const changelogPath = resolve(ROOT, 'CHANGELOG.json');
if (existsSync(changelogPath)) {
  const cl = JSON.parse(readFileSync(changelogPath, 'utf8'));
  const has = (cl.releases || []).some((r) => r.version === newVersion);
  if (!has) {
    console.warn(`\n[!] CHANGELOG.json has no entry for "${newVersion}" yet.`);
    console.warn(`    Add one at the top of "releases" before committing.`);
  }
}

if (!noTag && !dryRun) {
  try {
    execSync(`git tag v${newVersion}`, { cwd: ROOT, stdio: 'inherit' });
    console.log(`  tagged v${newVersion}`);
  } catch (err) {
    console.error('  git tag failed:', err.message);
  }
}

if (!dryRun) {
  console.log(`\nNext: git add -A && git commit -m "Release v${newVersion}" && git push --follow-tags`);
}
