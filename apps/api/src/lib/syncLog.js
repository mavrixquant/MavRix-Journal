
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

