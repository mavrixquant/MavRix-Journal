import { emit } from './runStore.js';

// FIXED 2026-11-15 — SkipError is thrown by skip() so the outer test()
// catch-block can record exactly ONE result. Before this fix, a skip()
// call inside a test() would push its own 'skip' row AND test() would
// also push a 'pass' row for the same test — producing two entries per
// skip, inflating the pass count and confusing the report.
class SkipError extends Error {
  constructor(reason) {
    super(reason || 'skipped');
    this.name = 'SkipError';
    this.isSkip = true;
  }
}

export function createRunner({ run, baseUrl, adminId, prisma }) {
  const results = [];
  const cleanups = [];
  const ids = Object.create(null);
  const tokens = { admin: null, a: null, b: null, c: null };

  let phaseName = null;
  let testCount = 0;


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
      // skip() throws SkipError — record as a single skip row, no fake pass.
      if (err?.isSkip) {
        const result = {
          id,
          phase: phaseName,
          name,
          status: 'skip',
          reason: err.message || 'skipped',
          durationMs: 0,
        };
        results.push(result);
        emit(run, { type: 'test:end', ...result });
        return null;
      }

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
      return null;
    }
  }

  // FIXED 2026-11-15 — throws SkipError instead of pushing its own result.
  // The old callers (`ctx.skip('name', 'reason'); return;`) keep working —
  // the trailing `return` is unreachable after the throw, which is fine.
  function skip(_name, reason) {
    throw new SkipError(reason);
  }


  async function httpFetch(path, opts = {}) {
    const url = `${baseUrl}${path}`;
    const headers = { ...(opts.headers || {}) };
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    if (opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

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


  function onCleanup(fn) {
    cleanups.push(fn);
  }

  async function runCleanups() {
    const cleanupResults = [];
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