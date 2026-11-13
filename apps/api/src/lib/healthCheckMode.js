// ============================================================================
// Health-check safety flag.
//
// While at least one health-check run is active, `isHealthCheckActive()` returns
// true. The mailer and notifications service short-circuit on it so a test can
// never send a real email or create a persistent notification for any user.
//
// Usage:
//   import { begin, end, isHealthCheckActive } from '../lib/healthCheckMode.js'
//   begin(run.id)   //  at run start
//   end(run.id)     //  in finally
//
// Using a Set (not a bool) means concurrent runs cannot clear each other's flag.
// ============================================================================

const activeRuns = new Set();

export const begin  = (runId) => activeRuns.add(String(runId));
export const end    = (runId) => activeRuns.delete(String(runId));
export const isHealthCheckActive = () => activeRuns.size > 0;