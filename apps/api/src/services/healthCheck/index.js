// ============================================================================
// Health-check orchestrator.
//
// New in this version:
//   • 9 additional phases (version, ai, notifications, bugReports, twoFactor,
//     adminMarketData, adminReleases, adminCalendar).
//   • Wrapping the whole run in begin()/end() of the healthCheckMode flag,
//     which suppresses real emails and persistent notifications for the
//     duration of the run.
// ============================================================================

import { createRun, emit, complete, fail } from './runStore.js';
import { createRunner } from './runner.js';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { signAccessToken } from '../../lib/jwt.js';
import { begin as beginHealthCheckMode, end as endHealthCheckMode } from '../../lib/healthCheckMode.js';

import * as authPhase        from './phases/auth.js';
import * as accountsPhase    from './phases/accounts.js';
import * as tradesPhase      from './phases/trades.js';
import * as strategiesPhase  from './phases/strategies.js';
import * as usersPhase       from './phases/users.js';
import * as friendsPhase     from './phases/friends.js';
import * as chatPhase        from './phases/chat.js';
import * as calendarPhase    from './phases/calendar.js';
import * as marketDataPhase  from './phases/marketData.js';
import * as gexPhase         from './phases/gex.js';
import * as adminPhase       from './phases/admin.js';
import * as ssePhase         from './phases/sse.js';
import * as versionPhase     from './phases/version.js';
import * as aiPhase          from './phases/ai.js';
import * as notificationsPhase from './phases/notifications.js';
import * as bugReportsPhase  from './phases/bugReports.js';
import * as twoFactorPhase   from './phases/twoFactor.js';
import * as adminMarketDataPhase from './phases/adminMarketData.js';
import * as adminReleasesPhase   from './phases/adminReleases.js';
import * as adminCalendarPhase   from './phases/adminCalendar.js';

const PHASE_REGISTRY = {
  auth:           authPhase,
  accounts:       accountsPhase,
  trades:         tradesPhase,
  strategies:     strategiesPhase,
  users:          usersPhase,
  friends:        friendsPhase,
  chat:           chatPhase,
  calendar:       calendarPhase,
  marketData:     marketDataPhase,
  gex:            gexPhase,
  ai:             aiPhase,
  notifications:  notificationsPhase,
  bugReports:     bugReportsPhase,
  twoFactor:      twoFactorPhase,
  version:        versionPhase,
  admin:          adminPhase,
  adminMarketData: adminMarketDataPhase,
  adminReleases:  adminReleasesPhase,
  adminCalendar:  adminCalendarPhase,
  sse:            ssePhase,
};

export const PHASE_META = {
  auth:            { label: 'Authentication',     description: 'Signup · login · verify · reset · profile · 2FA status', est: 24 },
  accounts:        { label: 'Accounts',           description: 'CRUD + column configs',                    est: 6  },
  trades:          { label: 'Trades',             description: 'CRUD · bulk · dynamic columns',            est: 12 },
  strategies:      { label: 'Strategies',         description: 'CRUD · archive',                           est: 6  },
  users:           { label: 'Layouts & Prefs',    description: 'Dashboard layouts · user preferences',     est: 7  },
  friends:         { label: 'Friends',            description: 'Requests · accept/decline · blocks',       est: 11 },
  chat:            { label: 'Chat',               description: 'DMs · groups · typing · receipts · presence', est: 18 },
  calendar:        { label: 'Calendar',           description: 'Events · currencies · meta',               est: 4  },
  marketData:      { label: 'Market Data',        description: 'Catalog · bars · validation',              est: 5  },
  gex:             { label: 'GEX Levels',         description: 'List · get',                               est: 2  },
  ai:              { label: 'Mave AI',            description: 'Providers · settings (no external calls)', est: 4  },
  notifications:   { label: 'Notifications',      description: 'List · unread · read · delete',            est: 7  },
  bugReports:      { label: 'Bug Reports',        description: 'Create · validation (email suppressed)',   est: 3  },
  twoFactor:       { label: 'Two-Factor',         description: 'Status · TOTP setup (no enable)',          est: 4  },
  version:         { label: 'Version & Changelog',description: 'Health · version · changelog',             est: 3  },
  admin:           { label: 'Admin Panel',        description: 'Every admin endpoint (destructive scoped)', est: 38 },
  adminMarketData: { label: 'Admin · Market Data',description: 'Stats · jobs · safe wipe',                 est: 3  },
  adminReleases:   { label: 'Admin · Releases',   description: 'Draft lifecycle (no publish)',             est: 3  },
  adminCalendar:   { label: 'Admin · Calendar',   description: 'Events · stats · scoped import/delete',    est: 4  },
  sse:             { label: 'SSE Stream',         description: 'Open /api/events · receive hello',         est: 1  },
};

export const ALL_PHASES = Object.keys(PHASE_REGISTRY);

export function startHealthCheck({ phases, requestedBy }) {
  const selected = (phases && phases.length ? phases : ALL_PHASES).filter(
    (p) => PHASE_REGISTRY[p]
  );
  const run = createRun({ phases: selected, requestedBy });

  beginHealthCheckMode(run.id);

  (async () => {
    const baseUrl = `http://127.0.0.1:${env.port}`;
    const runner = createRunner({ run, baseUrl, adminId: requestedBy, prisma });

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
      emit(run, { type: 'cleanup:start' });
      let cleanupResults;
      try {
        cleanupResults = await runner.runCleanups();
      } catch (err) {
        cleanupResults = [{ ok: false, label: err?.message || String(err) }];
      }

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
  })()
    .catch((err) => {
      fail(run, err);
      emit(run, { type: 'run:error', error: err?.message || String(err) });
    })
    .finally(() => {
      endHealthCheckMode(run.id);
    });

  return run;
}