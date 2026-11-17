// ============================================================================
// Admin market-data service — LEGACY WRAPPER
//
// All import logic has moved to services/marketDataImport.service.js.
// This file re-exports the new API so existing imports keep working.
// ============================================================================

export {
  startImportJob,
  stopJob,
  listJobs,
  getJob,
  getStats,
  wipeCache,
} from './marketDataImport.service.js';

// For backward compatibility — no-op in new design
export async function markInterruptedJobs() {
  return 0;
}