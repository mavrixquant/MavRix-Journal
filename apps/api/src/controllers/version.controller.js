import { APP_VERSION } from '../lib/version.js';

export function getVersion(_req, res) {
  res.json({ version: APP_VERSION });
}
