// apps/api/src/lib/syncLog.js
//
// In-memory ring buffer of the last N calendar sync results.
//
// Single-process only. Used by the admin "Calendar logs" page so operators
// can see recent sync activity without parsing stderr. Auto-syncs from the
// background loop are NOT captured here (they'd need to import this module
// — see note at the bottom). Only manual syncs triggered via the admin
// endpoint log to this buffer.

const MAX_ENTRIES = 20;
const buffer = [];

export function pushSyncLog(entry) {
  buffer.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...entry,
  });
  if (buffer.length > MAX_ENTRIES) buffer.length = MAX_ENTRIES;
}

export function getSyncLogs() {
  return buffer.slice();
}

export function clearSyncLogs() {
  buffer.length = 0;
}

// To also record auto-syncs, add two lines to apps/api/src/lib/calendarSync.js:
//   import { pushSyncLog } from './syncLog.js';
// and inside the successful sync branch:
//   pushSyncLog({ source: 'auto', ...result });