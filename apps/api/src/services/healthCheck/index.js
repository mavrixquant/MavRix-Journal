// apps/api/src/services/healthCheck/index.js
//
// Health-check orchestrator. Runs a subset (or all) of the phase modules
// sequentially against the local API, streams every event over the
// runStore EventEmitter, and guarantees cleanup in a `finally` block.
//
// Cleanup strategy (belt & braces):
//   1. Phase-registered cleanups (LIFO) — used for resources not owned
//      by a health-check user (e.g. GEX days keyed by date).
//   2. Cascade delete of every user whose email starts with `healthcheck-`
//      — Prisma's onDelete: Cascade removes their accounts, trades,
//      strategies, layouts, conversations, messages, friendships,
//      friend requests, blocks.
//   3. Audit-log sweep scoped to the requesting superadmin + this run's
//      time window — deletes the audit rows our admin-phase tests wrote.
//
// Ordering matters: (3) must run AFTER (2), because deleting users also
// writes audit rows in some paths.

import { createRun, emit, complete, fail } from './runStore.js';
import { createRunner } from './runner.js';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { signAccessToken } from '../../lib/jwt.js';

import * as authPhase       from './phases/auth.js';
import * as accountsPhase   from './phases/accounts.js';
import * as tradesPhase     from './phases/trades.js';
import * as strategiesPhase from './phases/strategies.js';
import * as usersPhase      from './phases/users.js';
import * as friendsPhase    from './phases/friends.js';
import * as chatPhase       from './phases/chat.js';
import * as calendarPhase   from './phases/calendar.js';
import * as marketDataPhase from './phases/marketData.js';
import * as gexPhase        from './phases/gex.js';
import * as adminPhase      from './phases/admin.js';
import * as ssePhase        from './phases/sse.js';

const PHASE_REGISTRY = {
  auth:       authPhase,
  accounts:   accountsPhase,
  trades:     tradesPhase,
  strategies: strategiesPhase,
  users:      usersPhase,
  friends:    friendsPhase,
  chat:       chatPhase,
  calendar:   calendarPhase,
  marketData: marketDataPhase,
  gex:        gexPhase,
  admin:      adminPhase,
  sse:        ssePhase,
};

// Metadata for the UI's phase picker. `est` is a rough count.
export const PHASE_META = {
  auth:       { label: 'Authentication',   description: 'Signup · login · verify · reset · Google', est: 16 },
  accounts:   { label: 'Accounts',         description: 'CRUD + column configs',                    est: 6  },
  trades:     { label: 'Trades',           description: 'CRUD · bulk · dynamic columns',            est: 12 },
  strategies: { label: 'Strategies',       description: 'CRUD · archive',                           est: 6  },
  users:      { label: 'Layouts & Prefs',  description: 'Dashboard layouts · user preferences',     est: 7  },
  friends:    { label: 'Friends',          description: 'Requests · accept/decline · blocks',       est: 10 },
  chat:       { label: 'Chat',             description: 'DMs · groups · typing · receipts',         est: 16 },
  calendar:   { label: 'Calendar',         description: 'Events · currencies · meta · sync',        est: 5  },
  marketData: { label: 'Market Data',      description: 'Catalog · bars · quote · quotes',          est: 4  },
  gex:        { label: 'GEX Levels',       description: 'List · get',                               est: 2  },
  admin:      { label: 'Admin Panel',      description: 'Every admin endpoint (destructive scoped)', est: 40 },
  sse:        { label: 'SSE Stream',       description: 'Open /api/events · receive hello',         est: 1  },
};

export const ALL_PHASES = Object.keys(PHASE_REGISTRY);

/**
 * Start a run. Returns immediately with the Run object; the actual work
 * happens in a detached async IIFE.
 */
export function startHealthCheck({ phases, requestedBy }) {
  const selected = (phases && phases.length ? phases : ALL_PHASES).filter(
    (p) => PHASE_REGISTRY[p]
  );
  const run = createRun({ phases: selected, requestedBy });

  (async () => {
    const baseUrl = `http://127.0.0.1:${env.port}`;
    const runner = createRunner({ run, baseUrl, adminId: requestedBy, prisma });

    // Mint a bearer token for the requesting superadmin so tests can call
    // protected routes without needing a real cookie session.
    const admin = await prisma.user.findUnique({
      where: { id: requestedBy },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });
    if (!admin) {
      emit(run, { type: 'run:error', error: 'Requesting user not found' });
      fail(run, new Error('Requesting user not found'));
      return;
    }
    if (admin.role !== 'superadmin') {
      emit(run, { type: 'run:error', error: 'Requester is not a superadmin' });
      fail(run, new Error('Requester is not a superadmin'));
      return;
    }

    runner.tokens.admin = signAccessToken({
      sub: admin.id,
      email: admin.email,
      role: 'superadmin',
      sv: admin.tokenVersion ?? 0,
    });

    emit(run, {
      type: 'run:start',
      runId: run.id,
      phases: selected,
      requestedBy: admin.email,
    });

    try {
      for (const phaseName of selected) {
        const phase = PHASE_REGISTRY[phaseName];
        runner.setPhase(phaseName);
        try {
          await phase.run(runner);
        } catch (err) {
          emit(run, {
            type: 'phase:error',
            phase: phaseName,
            error: err?.message || String(err),
          });
        }
        runner.endPhase();
      }
    } catch (err) {
      emit(run, { type: 'run:error', error: err?.message || String(err) });
    } finally {
      /* ---------------- 1. Phase-registered cleanups ---------------- */
      emit(run, { type: 'cleanup:start' });
      let cleanupResults = [];
      try {
        cleanupResults = await runner.runCleanups();
      } catch (err) {
        cleanupResults = [{ ok: false, label: err?.message || String(err) }];
      }

      /* ---------------- 2. Cascade delete health-check users -------- */
      let cascadeDeleted = 0;
      try {
        const deleted = await prisma.user.deleteMany({
          where: { email: { startsWith: 'healthcheck-' } },
        });
        cascadeDeleted = deleted.count;
        emit(run, {
          type: 'cleanup:step',
          ok: true,
          label: `cascade-deleted ${cascadeDeleted} healthcheck user(s)`,
        });
      } catch (err) {
        emit(run, {
          type: 'cleanup:step',
          ok: false,
          label: `cascade delete failed: ${err?.message || String(err)}`,
        });
      }

      /* ---------------- 3. Audit-log sweep --------------------------- */
      try {
        const auditSweep = await prisma.adminAuditLog.deleteMany({
          where: {
            actorId: requestedBy,
            createdAt: { gte: new Date(run.startedAt) },
          },
        });
        emit(run, {
          type: 'cleanup:step',
          ok: true,
          label: `deleted ${auditSweep.count} audit row(s) from this run`,
        });
      } catch (err) {
        emit(run, {
          type: 'cleanup:step',
          ok: false,
          label: `audit sweep failed: ${err?.message || String(err)}`,
        });
      }

      emit(run, { type: 'cleanup:end', deleted: cascadeDeleted });

      /* ---------------- Summary ------------------------------------- */
      const elapsedMs = Date.now() - runner.startedAt;
      const pass = runner.results.filter((r) => r.status === 'pass').length;
      const failCount = runner.results.filter((r) => r.status === 'fail').length;
      const skipCount = runner.results.filter((r) => r.status === 'skip').length;

      const summary = {
        runId: run.id,
        total: runner.results.length,
        pass,
        fail: failCount,
        skip: skipCount,
        elapsedMs,
        results: runner.results,
        cleanup: cleanupResults,
        cascadeDeleted,
        requestedBy: admin.email,
      };

      complete(run, summary);
      emit(run, { type: 'run:complete', summary });
    }
  })().catch((err) => {
    fail(run, err);
    emit(run, { type: 'run:error', error: err?.message || String(err) });
  });

  return run;
}