// apps/api/src/services/healthCheck/phases/accounts.js
//
// Accounts phase — 6 tests.
//
// Fixtures: creates 1 Backtest + 1 Live account owned by healthcheck user A.
// IDs are stashed on ctx.ids for later phases (trades needs an account).
// Cleanup is handled by the orchestrator's cascade delete.

export async function run(ctx) {
  const { test, tokens, ids } = ctx;

  /* ---------------- list (empty for a fresh user) ---------------- */

  await test('accounts.list · fresh user has 0 accounts', async () => {
    const res = await ctx.fetch('/api/accounts', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.accounts), 'accounts not array');
    ctx.expect(res.body.accounts.length === 0, 'fresh user should have 0 accounts');
  });

  /* ---------------- create ---------------- */

  await test('accounts.create · Backtest account', async () => {
    const res = await ctx.fetch('/api/accounts', {
      method: 'POST',
      token: tokens.a,
      body: {
        name: `Health Check BT ${Date.now()}`,
        balance: 10000,
        currency: 'USD',
        type: 'Backtest',
        riskType: 'fixed',
        riskValue: 1,
        riskUnit: 'percent',
        slValue: 12.5,
        slUnit: 'points',
        commissionMode: 'flat',
        commissionValue: 2.5,
      },
    });
    ctx.assertStatus(res, 201);
    ctx.expect(res.body.account?.id, 'no account id');
    ids.accountBacktest = res.body.account.id;
    ctx.onCleanup(async () => `account(backtest) ${ids.accountBacktest} cascades via user`);
  });

  await test('accounts.create · Live account', async () => {
    const res = await ctx.fetch('/api/accounts', {
      method: 'POST',
      token: tokens.a,
      body: {
        name: `Health Check Live ${Date.now()}`,
        balance: 5000,
        currency: 'USD',
        type: 'Live',
      },
    });
    ctx.assertStatus(res, 201);
    ids.accountLive = res.body.account.id;
  });

  await test('accounts.create · invalid currency → 400', async () => {
    const res = await ctx.fetch('/api/accounts', {
      method: 'POST',
      token: tokens.a,
      body: { name: 'X', balance: 1, currency: 'XYZ', type: 'Live' },
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });

  /* ---------------- list now shows 2 ---------------- */

  await test('accounts.list · returns both accounts', async () => {
    const res = await ctx.fetch('/api/accounts', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.accounts.length === 2, `expected 2, got ${res.body.accounts.length}`);
  });

  /* ---------------- get ---------------- */

  await test('accounts.get · fetch backtest account', async () => {
    const res = await ctx.fetch(`/api/accounts/${ids.accountBacktest}`, {
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.account.id === ids.accountBacktest, 'wrong account');
  });

  /* ---------------- update ---------------- */

  await test('accounts.update · rename backtest account', async () => {
    const res = await ctx.fetch(`/api/accounts/${ids.accountBacktest}`, {
      method: 'PATCH',
      token: tokens.a,
      body: { name: 'Health Check Renamed' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.account.name === 'Health Check Renamed', 'rename failed');
  });

  /* ---------------- column-configs ---------------- */

  await test('accounts.column-configs · write configs', async () => {
    const res = await ctx.fetch(
      `/api/accounts/${ids.accountBacktest}/column-configs`,
      {
        method: 'PATCH',
        token: tokens.a,
        body: {
          columnConfigs: {
            setup: { type: 'text' },
            grade: { type: 'dropdown', options: ['A', 'B', 'C'] },
          },
        },
      }
    );
    ctx.assertStatus(res, 200);
  });

  /* ---------------- ownership isolation ---------------- */

  await test('accounts.get · user B cannot read user A\'s account → 404', async () => {
    const res = await ctx.fetch(`/api/accounts/${ids.accountBacktest}`, {
      token: tokens.b,
      allowError: true,
    });
    ctx.assertStatus(res, 404);
  });

  /* ---------------- delete live account ---------------- */

  await test('accounts.delete · remove live account', async () => {
    const res = await ctx.fetch(`/api/accounts/${ids.accountLive}`, {
      method: 'DELETE',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    const verify = await ctx.fetch('/api/accounts', { token: tokens.a });
    ctx.expect(verify.body.accounts.length === 1, 'account not deleted');
  });
}