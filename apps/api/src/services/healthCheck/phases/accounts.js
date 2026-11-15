export async function run(ctx) {
  const { test, tokens, ids } = ctx;

  // FIXED 2026-11-15 — signup now atomically creates a default "Main"
  // Demo account, so a "fresh user" has 1 account, not 0.
  await test('accounts.list · fresh user has 1 default account', async () => {
    const res = await ctx.fetch('/api/accounts', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.accounts), 'accounts not array');
    ctx.expect(
      res.body.accounts.length === 1,
      `fresh user should have exactly 1 account (default Main), got ${res.body.accounts.length}`
    );
    const [main] = res.body.accounts;
    ctx.expect(main.name === 'Main', `default account name should be "Main", got "${main.name}"`);
    ctx.expect(main.type === 'Demo', `default account type should be "Demo", got "${main.type}"`);
    ctx.expect(main.currency === 'USD', `default account currency should be "USD", got "${main.currency}"`);
    ctx.expect(main.balance === 10000, `default account balance should be 10000, got ${main.balance}`);
  });


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


  // FIXED 2026-11-15 — 1 default (Main) + Backtest + Live = 3.
  await test('accounts.list · returns all 3 accounts', async () => {
    const res = await ctx.fetch('/api/accounts', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(
      res.body.accounts.length === 3,
      `expected 3 (Main + Backtest + Live), got ${res.body.accounts.length}`
    );
  });


  await test('accounts.get · fetch backtest account', async () => {
    const res = await ctx.fetch(`/api/accounts/${ids.accountBacktest}`, {
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.account.id === ids.accountBacktest, 'wrong account');
  });


  await test('accounts.update · rename backtest account', async () => {
    const res = await ctx.fetch(`/api/accounts/${ids.accountBacktest}`, {
      method: 'PATCH',
      token: tokens.a,
      body: { name: 'Health Check Renamed' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.account.name === 'Health Check Renamed', 'rename failed');
  });


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


  await test('accounts.get · user B cannot read user A\'s account → 404', async () => {
    const res = await ctx.fetch(`/api/accounts/${ids.accountBacktest}`, {
      token: tokens.b,
      allowError: true,
    });
    ctx.assertStatus(res, 404);
  });


  // FIXED 2026-11-15 — after deleting Live, user A still has Main + Backtest.
  await test('accounts.delete · remove live account', async () => {
    const res = await ctx.fetch(`/api/accounts/${ids.accountLive}`, {
      method: 'DELETE',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    const verify = await ctx.fetch('/api/accounts', { token: tokens.a });
    ctx.expect(
      verify.body.accounts.length === 2,
      `expected 2 (Main + Backtest), got ${verify.body.accounts.length}`
    );
  });
}