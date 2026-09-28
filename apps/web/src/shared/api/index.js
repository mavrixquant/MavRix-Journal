// apps/web/src/shared/api/index.js
//
// Public surface of the HTTP/cache/realtime layer.

// Client
export * from './client.js';

// Cache
export { queryClient } from './queryClient.js';

// Realtime
export { useSSEBridge, useSSEFallback } from './sse.js';

// Domain resource hooks
export * from './accounts.js';
export * from './trades.js';