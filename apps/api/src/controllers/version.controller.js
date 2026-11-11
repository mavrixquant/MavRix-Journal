import { APP_VERSION } from '../lib/version.js';
import { readChangelog, getLatestRelease } from '../lib/changelog.js';

export function getVersion(_req, res) {
  res.json({
    version: APP_VERSION,
    latestRelease: getLatestRelease(),
  });
}

export function getChangelog(_req, res) {
  const cl = readChangelog();
  res.json(cl || { releases: [] });
}
