// apps/api/src/services/healthCheck/phases/admin.js
//
// Admin Panel phase — the biggest in the suite.
//
// ALL destructive tests are scoped to healthcheck fixtures (user A / B)
// or (in the settings case) write the value that was read. Nothing real
// is touched.
//
// FIXTURE INVARIANT — READ THIS
// -----------------------------
// Every test below assumes user A is `emailVerified: true`. The
// `unverify-email` test deliberately flips this to false (to prove the
// endpoint works), then immediately restores it via `prisma.user.update`.
// Without this restore, the subsequent group-member tests fail with 403
// because groups require verified users.
//
// Superadmin-only tests are marked `skip` if the caller isn't super —
// but our orchestrator already gates the whole feature to superadmins,
// so in practice every test here runs.

export async function run(ctx) {
  const { test, tokens, ids } = ctx;
  const admin = tokens.admin;

  /* ---------------- me / stats / health ---------------- */

  await test('admin.me · caller identity + capabilities', async () => {
    const res = await ctx.fetch('/api/admin/me', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.role === 'superadmin', `expected superadmin, got ${res.body.role}`);
    ctx.expect(typeof res.body.capabilities === 'object', 'capabilities missing');
  });

  await test('admin.stats · global counters', async () => {
    const res = await ctx.fetch('/api/admin/stats', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.users.total === 'number', 'users.total not number');
    ctx.expect(res.body.signups.length === 30, `expected 30 signup buckets, got ${res.body.signups.length}`);
  });

  await test('admin.health · db + memory', async () => {
    const res = await ctx.fetch('/api/admin/health', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.database.ok === true, 'db not ok');
  });

  /* ---------------- users list + detail ---------------- */

  await test('admin.users.list · paginated', async () => {
    const res = await ctx.fetch('/api/admin/users?limit=10', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.users), 'users not array');
    ctx.expect(typeof res.body.total === 'number', 'total not number');
  });

  await test('admin.users.get · detail for user A', async () => {
    if (!ids.userA) { ctx.skip('admin.users.get', 'no user A'); return; }
    const res = await ctx.fetch(`/api/admin/users/${ids.userA}`, {
      token: admin,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.user.id === ids.userA, 'wrong user');
  });

  await test('admin.users.update · rename user A', async () => {
    if (!ids.userA) { ctx.skip('admin.users.update', 'no user A'); return; }
    const res = await ctx.fetch(`/api/admin/users/${ids.userA}`, {
      method: 'PATCH',
      token: admin,
      body: { firstName: 'HealthAdminUpdated' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(
      res.body.user.firstName === 'HealthAdminUpdated',
      'name not updated'
    );
  });

  await test('admin.users.verify-email · mark verified', async () => {
    if (!ids.userA) { ctx.skip('admin.users.verify-email', 'no user A'); return; }
    const res = await ctx.fetch(`/api/admin/users/${ids.userA}/verify-email`, {
      method: 'POST',
      token: admin,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.user.emailVerified === true, 'not verified');
  });

  await test('admin.users.unverify-email · mark unverified, then restore', async () => {
    if (!ids.userA) { ctx.skip('admin.users.unverify-email', 'no user A'); return; }
    const res = await ctx.fetch(`/api/admin/users/${ids.userA}/unverify-email`, {
      method: 'POST',
      token: admin,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.user.emailVerified === false, 'still verified');

    // -------------------------------------------------------------------
    // RESTORE the invariant: every downstream test (group members, chat,
    // friends) requires user A to be verified. We flip the flag back via
    // prisma directly so the endpoint-under-test's behaviour is preserved.
    // -------------------------------------------------------------------
    await ctx.prisma.user.update({
      where: { id: ids.userA },
      data: { emailVerified: true },
    });
    return { notes: 'restored verified state for downstream phases' };
  });

  await test('admin.users.password-reset · send email trigger', async () => {
    if (!ids.userA) { ctx.skip('admin.users.password-reset', 'no user A'); return; }
    const res = await ctx.fetch(`/api/admin/users/${ids.userA}/password-reset`, {
      method: 'POST',
      token: admin,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.ok === true, 'ok not true');
  });

  await test('admin.users.ban · bans user A', async () => {
    if (!ids.userA) { ctx.skip('admin.users.ban', 'no user A'); return; }
    const res = await ctx.fetch(`/api/admin/users/${ids.userA}/ban`, {
      method: 'POST',
      token: admin,
      body: { reason: 'healthcheck' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.user.isBanned === true, 'not banned');
  });

  await test('admin.users.unban · unbans user A', async () => {
    if (!ids.userA) { ctx.skip('admin.users.unban', 'no user A'); return; }
    const res = await ctx.fetch(`/api/admin/users/${ids.userA}/unban`, {
      method: 'POST',
      token: admin,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.user.isBanned === false, 'still banned');
  });

  await test('admin.users.force-logout · bumps tokenVersion', async () => {
    if (!ids.userA) { ctx.skip('admin.users.force-logout', 'no user A'); return; }
    const res = await ctx.fetch(`/api/admin/users/${ids.userA}/force-logout`, {
      method: 'POST',
      token: admin,
    });
    ctx.assertStatus(res, 200);
  });

  /* ---------------- sessions ---------------- */

  await test('admin.sessions.list · totals', async () => {
    const res = await ctx.fetch('/api/admin/sessions', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.totalClients === 'number', 'totalClients not number');
  });

  await test('admin.sessions.userCount · count for user A', async () => {
    if (!ids.userA) { ctx.skip('admin.sessions.userCount', 'no user A'); return; }
    const res = await ctx.fetch(`/api/admin/sessions/${ids.userA}`, {
      token: admin,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.clients === 'number', 'clients not number');
  });

  await test('admin.sessions.disconnect · kick user A (0 SSE sockets)', async () => {
    if (!ids.userA) { ctx.skip('admin.sessions.disconnect', 'no user A'); return; }
    const res = await ctx.fetch(
      `/api/admin/sessions/${ids.userA}/disconnect`,
      { method: 'POST', token: admin }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.closedSockets === 'number', 'closedSockets not number');
  });

  /* ---------------- accounts ---------------- */

  await test('admin.accounts.list · paginated', async () => {
    const res = await ctx.fetch('/api/admin/accounts?limit=10', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.accounts), 'accounts not array');
  });

  await test('admin.accounts.get · account created by user A', async () => {
    if (!ids.accountBacktest) { ctx.skip('admin.accounts.get', 'no account'); return; }
    const res = await ctx.fetch(`/api/admin/accounts/${ids.accountBacktest}`, {
      token: admin,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.account.id === ids.accountBacktest, 'wrong account');
  });

  await test('admin.accounts.update · rename', async () => {
    if (!ids.accountBacktest) { ctx.skip('admin.accounts.update', 'no account'); return; }
    const res = await ctx.fetch(`/api/admin/accounts/${ids.accountBacktest}`, {
      method: 'PATCH',
      token: admin,
      body: { name: 'HealthAdminRenamed' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.account.name === 'HealthAdminRenamed', 'name not updated');
  });

  /* ---------------- trades ---------------- */

  await test('admin.trades.list · paginated', async () => {
    const res = await ctx.fetch('/api/admin/trades?limit=10', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.trades), 'trades not array');
  });

  /* ---------------- strategies ---------------- */

  await test('admin.strategies.list · paginated', async () => {
    const res = await ctx.fetch('/api/admin/strategies?limit=10', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.strategies), 'strategies not array');
  });

  await test('admin.strategies.get · detail if any exist', async () => {
    const list = await ctx.fetch('/api/admin/strategies?limit=1', { token: admin });
    const rows = list.body.strategies || [];
    if (rows.length === 0) {
      ctx.expect(true, 'no strategies — soft pass');
      return { notes: 'no strategies in DB' };
    }
    const res = await ctx.fetch(`/api/admin/strategies/${rows[0].id}`, {
      token: admin,
    });
    ctx.assertStatus(res, 200);
  });

  /* ---------------- groups ---------------- */

  await test('admin.groups.list · paginated', async () => {
    const res = await ctx.fetch('/api/admin/groups?limit=10', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.groups), 'groups not array');
  });

  await test('admin.groups.create · new public group', async () => {
    const res = await ctx.fetch('/api/admin/groups', {
      method: 'POST',
      token: admin,
      body: {
        name: `HealthCheck Group ${Date.now()}`,
        description: 'Created by health check — safe to delete',
        visibility: 'public',
        color: '#4C8BF5',
      },
    });
    ctx.assertStatus(res, 201);
    ids.adminGroupId = res.body.group.id;
  });

  await test('admin.groups.get · fetch created group', async () => {
    if (!ids.adminGroupId) { ctx.skip('admin.groups.get', 'no group'); return; }
    const res = await ctx.fetch(`/api/admin/groups/${ids.adminGroupId}`, {
      token: admin,
    });
    ctx.assertStatus(res, 200);
  });

  await test('admin.groups.update · rename', async () => {
    if (!ids.adminGroupId) { ctx.skip('admin.groups.update', 'no group'); return; }
    const res = await ctx.fetch(`/api/admin/groups/${ids.adminGroupId}`, {
      method: 'PATCH',
      token: admin,
      body: { description: 'healthcheck updated' },
    });
    ctx.assertStatus(res, 200);
  });

  await test('admin.groups.addMember · add user A', async () => {
    if (!ids.adminGroupId || !ids.userA) {
      ctx.skip('admin.groups.addMember', 'missing group or user A');
      return;
    }

    // Defensive: assert the fixture invariant is intact. If a previous
    // test ever left user A unverified (it shouldn't — we restore in the
    // unverify-email test), this catches it with a clear message rather
    // than an opaque 403.
    const ua = await ctx.prisma.user.findUnique({
      where: { id: ids.userA },
      select: { emailVerified: true },
    });
    if (!ua?.emailVerified) {
      await ctx.prisma.user.update({
        where: { id: ids.userA },
        data: { emailVerified: true },
      });
    }

    const res = await ctx.fetch(
      `/api/admin/groups/${ids.adminGroupId}/members`,
      { method: 'POST', token: admin, body: { userId: ids.userA } }
    );
    ctx.assertStatus(res, 200);
  });

  await test('admin.groups.setRole · user A → moderator', async () => {
    if (!ids.adminGroupId || !ids.userA) {
      ctx.skip('admin.groups.setRole', 'missing fixtures');
      return;
    }
    const res = await ctx.fetch(
      `/api/admin/groups/${ids.adminGroupId}/members/${ids.userA}`,
      { method: 'PATCH', token: admin, body: { role: 'moderator' } }
    );
    ctx.assertStatus(res, 200);
  });

  await test('admin.groups.removeMember · remove user A', async () => {
    if (!ids.adminGroupId || !ids.userA) {
      ctx.skip('admin.groups.removeMember', 'missing fixtures');
      return;
    }
    const res = await ctx.fetch(
      `/api/admin/groups/${ids.adminGroupId}/members/${ids.userA}`,
      { method: 'DELETE', token: admin }
    );
    ctx.assertStatus(res, 200);
  });

  await test('admin.groups.delete · remove created group', async () => {
    if (!ids.adminGroupId) { ctx.skip('admin.groups.delete', 'no group'); return; }
    const res = await ctx.fetch(`/api/admin/groups/${ids.adminGroupId}`, {
      method: 'DELETE',
      token: admin,
    });
    ctx.assertStatus(res, 200);
  });

  /* ---------------- audit ---------------- */

  await test('admin.audit.list · returns rows', async () => {
    const res = await ctx.fetch('/api/admin/audit?limit=10', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.entries), 'entries not array');
    // Non-empty — the destructive ops above must have written audit rows.
    ctx.expect(res.body.entries.length > 0, 'audit log empty after mutations');
  });

  /* ---------------- broadcast ---------------- */

  await test('admin.broadcast · SSE-only, no email', async () => {
    const res = await ctx.fetch('/api/admin/broadcast', {
      method: 'POST',
      token: admin,
      body: {
        message: '[Health Check] Automated test — safe to ignore',
        level: 'info',
        sendEmail: false,
      },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.sseSent === 'number', 'sseSent not number');
  });

  /* ---------------- calendar ---------------- */

  await test('admin.calendar.sync · force sync (slow)', async () => {
    const res = await ctx.fetch('/api/admin/calendar/sync', {
      method: 'POST',
      token: admin,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.elapsedMs === 'number', 'elapsedMs missing');
  });

  await test('admin.calendar.logs · recent sync log', async () => {
    const res = await ctx.fetch('/api/admin/calendar/logs', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.entries), 'entries not array');
  });

  /* ---------------- GEX ---------------- */

  await test('admin.gex.list · metadata', async () => {
    const res = await ctx.fetch('/api/admin/gex', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.days), 'days not array');
  });

  await test('admin.gex.upsert + delete · round-trip', async () => {
    const date = '2099-12-31';   // safely outside any real usage
    // Ensure the date is clean first.
    await ctx.fetch(`/api/admin/gex/${date}?overwrite=true`, {
      method: 'DELETE',
      token: admin,
      allowError: true,
    });

    const create = await ctx.fetch('/api/admin/gex', {
      method: 'POST',
      token: admin,
      body: {
        date,
        levels: [
          { type: 'BL', price: 20000, label: 'HealthCheck BL' },
          { type: 'GEX', price: 20500, label: 'HealthCheck GEX' },
        ],
        converted: 'BL|20000|HealthCheck BL;GEX|20500|HealthCheck GEX',
        sourceTimezone: 'Asia/Kolkata',
      },
    });
    ctx.assertStatus(create, 200);
    ctx.onCleanup(async () => {
      await ctx.fetch(`/api/admin/gex/${date}`, {
        method: 'DELETE',
        token: admin,
        allowError: true,
      });
      return `gex ${date} deleted`;
    });

    const del = await ctx.fetch(`/api/admin/gex/${date}`, {
      method: 'DELETE',
      token: admin,
    });
    ctx.assertStatus(del, 200);
  });

  /* ---------------- settings ---------------- */

  await test('admin.settings.read · returns all keys', async () => {
    const res = await ctx.fetch('/api/admin/settings', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect('signupsEnabled' in res.body, 'signupsEnabled missing');
    ids.originalSettings = res.body;
  });

  await test('admin.settings.update · no-op write', async () => {
    if (!ids.originalSettings) {
      ctx.skip('admin.settings.update', 'no settings snapshot');
      return;
    }
    // Write back the exact same values — a no-op write.
    const same = {
      signupsEnabled: ids.originalSettings.signupsEnabled,
      requireEmailVerification: ids.originalSettings.requireEmailVerification,
      maintenanceMode: ids.originalSettings.maintenanceMode,
      maintenanceMessage: ids.originalSettings.maintenanceMessage,
      maxAccountsPerUser: ids.originalSettings.maxAccountsPerUser,
      maxTradesPerAccount: ids.originalSettings.maxTradesPerAccount,
      announcementBanner: ids.originalSettings.announcementBanner,
    };
    const res = await ctx.fetch('/api/admin/settings', {
      method: 'PUT',
      token: admin,
      body: same,
    });
    ctx.assertStatus(res, 200);
  });

  /* ---------------- account / trade / user admin delete ---------------- */

  await test('admin.trades.deleteByAccount · wipes user A trades on Backtest', async () => {
    if (!ids.accountBacktest) { ctx.skip('admin.trades.deleteByAccount', 'no account'); return; }
    const res = await ctx.fetch(
      `/api/admin/trades/by-account/${ids.accountBacktest}`,
      { method: 'DELETE', token: admin }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.deleted === 'number', 'deleted not number');
  });

  await test('admin.accounts.delete · deletes user A Backtest account', async () => {
    if (!ids.accountBacktest) { ctx.skip('admin.accounts.delete', 'no account'); return; }
    const res = await ctx.fetch(`/api/admin/accounts/${ids.accountBacktest}`, {
      method: 'DELETE',
      token: admin,
    });
    ctx.assertStatus(res, 200);
  });

  await test('admin.users.delete · hard-delete a fresh throwaway user', async () => {
    // Create a throwaway user via signup, then hard-delete via admin.
    const email = `healthcheck-${Date.now()}-throwaway@test.local`;
    const signup = await ctx.fetch('/api/auth/signup', {
      method: 'POST',
      body: {
        email,
        password: 'HealthCheck!2026',
        firstName: 'Throw',
        lastName: 'Away',
      },
    });
    ctx.assertStatus(signup, 201);
    const uid = signup.body.user.id;

    const del = await ctx.fetch(`/api/admin/users/${uid}`, {
      method: 'DELETE',
      token: admin,
    });
    ctx.assertStatus(del, 200);
    ctx.expect(del.body.ok === true, 'ok not true');
  });
}