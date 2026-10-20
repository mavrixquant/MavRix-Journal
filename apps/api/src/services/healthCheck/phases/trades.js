
export async function run(ctx) {
  const { test, tokens, ids } = ctx;

  if (!ids.accountBacktest) {
    ctx.skip('trades.*', 'no Backtest account available (accounts phase skipped or failed)');
    return;
  }

  const accountId = ids.accountBacktest;

  const baseTrade = {
    date: '2026-01-15',
    entryTime: '09:35',
    exitTime: '10:15',
    direction: 'Long',
    symbol: 'NQ',
    mae: 8.2,
    mfe: 15.4,
    pnl: 125,
    slPoints: 12.5,
    quantity: 2,
    notes: 'healthcheck trade',
  };


  await test('trades.create · single backtest trade', async () => {
    const res = await ctx.fetch('/api/trades', {
      method: 'POST',
      token: tokens.a,
      body: { accountId, ...baseTrade },
    });
    ctx.assertStatus(res, 201);
    ids.tradeId = res.body.trade.id;
    ctx.expect(res.body.trade.tradeId, 'no tradeId field');
  });


  await test('trades.list · by account', async () => {
    const res = await ctx.fetch(`/api/trades?accountId=${accountId}`, {
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.trades.length >= 1, 'expected >= 1 trade');
  });

  await test('trades.list · no filter → 400', async () => {
    const res = await ctx.fetch('/api/trades', {
      token: tokens.a,
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });


  await test('trades.get · fetch back the trade', async () => {
    const res = await ctx.fetch(`/api/trades/${ids.tradeId}`, {
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.trade.id === ids.tradeId, 'wrong trade');
  });


  await test('trades.update · change notes', async () => {
    const res = await ctx.fetch(`/api/trades/${ids.tradeId}`, {
      method: 'PATCH',
      token: tokens.a,
      body: { notes: 'healthcheck updated' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.trade.notes === 'healthcheck updated', 'notes not updated');
  });


  await test('trades.bulk · create 2 more trades', async () => {
    const res = await ctx.fetch('/api/trades/bulk', {
      method: 'POST',
      token: tokens.a,
      body: {
        accountId,
        trades: [
          { ...baseTrade, date: '2026-01-16', entryTime: '10:00', exitTime: '10:30' },
          { ...baseTrade, date: '2026-01-17', entryTime: '11:00', exitTime: '11:45', direction: 'Short' },
        ],
      },
    });
    ctx.assertStatus(res, 201);
    ctx.expect(res.body.created === 2, `expected created=2, got ${res.body.created}`);
  });


  await test('trades.columns.add · create "healthcheck_tag"', async () => {
    const res = await ctx.fetch(
      `/api/trades/by-account/${accountId}/columns`,
      {
        method: 'POST',
        token: tokens.a,
        body: { name: 'healthcheck_tag' },
      }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.updated === 'number', 'no updated count');
  });

  await test('trades.columns.rename · healthcheck_tag → healthcheck_tag_v2', async () => {
    const res = await ctx.fetch(
      `/api/trades/by-account/${accountId}/columns/healthcheck_tag`,
      {
        method: 'PATCH',
        token: tokens.a,
        body: { newName: 'healthcheck_tag_v2' },
      }
    );
    ctx.assertStatus(res, 200);
  });

  await test('trades.column.value.rename · rename empty value is a no-op success', async () => {
    const res = await ctx.fetch(
      `/api/trades/by-account/${accountId}/columns/healthcheck_tag_v2/rename-value`,
      {
        method: 'POST',
        token: tokens.a,
        body: { oldValue: '', newValue: '' },
        allowError: true,
      }
    );
    ctx.expect([200, 400].includes(res.status), `unexpected status ${res.status}`);
  });

  await test('trades.column.value.clear · clear-value no-op success', async () => {
    const res = await ctx.fetch(
      `/api/trades/by-account/${accountId}/columns/healthcheck_tag_v2/clear-value`,
      {
        method: 'POST',
        token: tokens.a,
        body: { value: 'nonexistent-value-xyz' },
        allowError: true,
      }
    );
    ctx.expect([200, 400].includes(res.status), `unexpected status ${res.status}`);
  });

  await test('trades.columns.delete · drop "healthcheck_tag_v2"', async () => {
    const res = await ctx.fetch(
      `/api/trades/by-account/${accountId}/columns/healthcheck_tag_v2`,
      {
        method: 'DELETE',
        token: tokens.a,
      }
    );
    ctx.assertStatus(res, 200);
  });


  await test('trades.delete · remove the created trade', async () => {
    const res = await ctx.fetch(`/api/trades/${ids.tradeId}`, {
      method: 'DELETE',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
  });


  await test('trades.deleteByAccount · wipe remaining trades', async () => {
    const res = await ctx.fetch(
      `/api/trades/by-account/${accountId}`,
      { method: 'DELETE', token: tokens.a }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.deleted === 'number', 'no deleted count');
  });
}