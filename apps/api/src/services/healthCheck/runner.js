// apps/api/src/services/healthCheck/runner.js
//
// The test-runner context every phase receives. Owns:
//   • test(name, fn)         — records timing + status, never throws
//   • skip(name, reason)     — records an intentional skip
//   • fetch(path, opts)      — thin wrapper around global fetch
//   • expect / assertStatus  — tiny assertion helpers
//   • onCleanup(fn)          — registers a cleanup step
//   • runCleanups()          — runs them in reverse (LIFO) order
//
// Every emitted event goes through runStore.emit() so the SSE controller
// can stream it live.
//
// HEALTH-CHECK HEADER
// -------------------
// Every outbound request carries `X-Health-Check-Run: <runId>`. The API's
// rate limiter checks this header (plus the superadmin role) and skips its
// bucket. That lets the suite exercise sensitive endpoints back-to-back
// without tripping limits designed for human-paced use.

import { emit } from './runStore.js';

export function createRunner({ run, baseUrl, adminId, prisma }) {
  const results = [];
  const cleanups = [];
  const ids = Object.create(null);
  const tokens = { admin: null, a: null, b: null, c: null };

  let phaseName = null;
  let testCount = 0;

  /* ------------------------------------------------------------------ */
  /*  Phase lifecycle                                                    */
  /* ------------------------------------------------------------------ */

  function setPhase(name) {
    phaseName = name;
    testCount = 0;
    emit(run, { type: 'phase:start', phase: name });
  }

  function endPhase() {
    const phaseResults = results.filter((r) => r.phase === phaseName);
    emit(run, {
      type: 'phase:end',
      phase: phaseName,
      summary: {
        total: phaseResults.length,
        pass:  phaseResults.filter((r) => r.status === 'pass').length,
        fail:  phaseResults.filter((r) => r.status === 'fail').length,
        skip:  phaseResults.filter((r) => r.status === 'skip').length,
      },
    });
    phaseName = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Test recording                                                     */
  /* ------------------------------------------------------------------ */

  async function test(name, fn) {
    const id = `${phaseName}:${++testCount}`;
    const startedAt = Date.now();
    emit(run, { type: 'test:start', phase: phaseName, id, name });

    try {
      const out = await fn();
      const durationMs = Date.now() - startedAt;
      const result = {
        id,
        phase: phaseName,
        name,
        status: 'pass',
        durationMs,
        notes: out?.notes || null,
      };
      results.push(result);
      emit(run, { type: 'test:end', ...result });
      return out;
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const result = {
        id,
        phase: phaseName,
        name,
        status: 'fail',
        durationMs,
        error: err?.message || String(err),
        status_code: err?.status || null,
        body: err?.body || null,
      };
      results.push(result);
      emit(run, { type: 'test:end', ...result });
      // Never throw — one failure shouldn't abort the phase.
      return null;
    }
  }

  function skip(name, reason) {
    const id = `${phaseName}:${++testCount}`;
    const result = {
      id,
      phase: phaseName,
      name,
      status: 'skip',
      reason: reason || 'skipped',
      durationMs: 0,
    };
    results.push(result);
    emit(run, { type: 'test:end', ...result });
  }

  /* ------------------------------------------------------------------ */
  /*  HTTP wrapper                                                       */
  /* ------------------------------------------------------------------ */

  async function httpFetch(path, opts = {}) {
    const url = `${baseUrl}${path}`;
    const headers = { ...(opts.headers || {}) };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    if (opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Health-check bypass header — lets the API's rate limiter skip its
    // bucket for this superadmin run.
    if (run?.id) headers['X-Health-Check-Run'] = run.id;

    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body:
        opts.body === undefined
          ? undefined
          : typeof opts.body === 'string'
            ? opts.body
            : JSON.stringify(opts.body),
    });

    const text = await res.text();
    let body = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = { raw: text }; }
    }

    if (!res.ok && !opts.allowError) {
      const err = new Error(
        `HTTP ${res.status} ${path}: ${
          body?.error || text?.slice(0, 120) || 'error'
        }`
      );
      err.status = res.status;
      err.body = body;
      throw err;
    }

    return { status: res.status, body, ok: res.ok };
  }

  /* ------------------------------------------------------------------ */
  /*  Tiny assertions                                                    */
  /* ------------------------------------------------------------------ */

  function expect(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
  }

  function assertStatus(res, expected) {
    const wanted = Array.isArray(expected) ? expected : [expected];
    if (!wanted.includes(res.status)) {
      throw new Error(
        `Expected status ${wanted.join('|')} but got ${res.status}. ` +
          `Body: ${JSON.stringify(res.body).slice(0, 200)}`
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Cleanup registry                                                   */
  /* ------------------------------------------------------------------ */

  function onCleanup(fn) {
    cleanups.push(fn);
  }

  async function runCleanups() {
    const cleanupResults = [];
    // LIFO — later tests may depend on earlier fixtures being alive.
    for (const fn of [...cleanups].reverse()) {
      try {
        const label = await fn();
        cleanupResults.push({ ok: true, label: label || 'cleanup step' });
        emit(run, { type: 'cleanup:step', ok: true, label });
      } catch (err) {
        const msg = err?.message || String(err);
        cleanupResults.push({ ok: false, label: msg });
        emit(run, { type: 'cleanup:step', ok: false, label: msg });
      }
    }
    return cleanupResults;
  }

  /* ------------------------------------------------------------------ */

  return {
    run,
    baseUrl,
    adminId,
    prisma,
    ids,
    tokens,
    results,
    startedAt: run.startedAt,

    setPhase,
    endPhase,
    test,
    skip,
    fetch: httpFetch,
    expect,
    assertStatus,
    onCleanup,
    runCleanups,
  };
}