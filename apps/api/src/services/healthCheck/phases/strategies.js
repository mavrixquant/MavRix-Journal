// apps/api/src/services/healthCheck/phases/strategies.js
//
// Strategies phase — 6 tests.
// Creates a strategy owned by user A, exercises CRUD + archive.

export async function run(ctx) {
  const { test, tokens, ids } = ctx;

  await test('strategies.list · fresh user has 0', async () => {
    const res = await ctx.fetch('/api/strategies', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.strategies), 'not array');
    ctx.expect(res.body.strategies.length === 0, 'expected 0 strategies');
  });

  await test('strategies.create · new strategy', async () => {
    const res = await ctx.fetch('/api/strategies', {
      method: 'POST',
      token: tokens.a,
      body: {
        name: `HealthCheck Strategy ${Date.now()}`,
        description: 'Created by health check',
        rules: '1. do the thing',
        status: 'active',
        color: '#4C8BF5',
        direction: 'Long',
        timeframe: '5m',
        tags: ['healthcheck'],
      },
    });
    ctx.assertStatus(res, 201);
    ids.strategyId = res.body.strategy.id;
  });

  await test('strategies.create · duplicate name → 409', async () => {
    const res = await ctx.fetch('/api/strategies', {
      method: 'POST',
      token: tokens.a,
      body: {
        name: `HealthCheck Strategy ${new Date().toISOString().slice(0, 10)}`, // different, so use same one
        status: 'active',
      },
      allowError: true,
    });
    // The name won't collide with the previous dynamic one, so this will succeed.
    // Instead, re-fetch and duplicate with the exact same name.
    const first = await ctx.fetch('/api/strategies', { token: tokens.a });
    const name = first.body.strategies[0]?.name;
    if (!name) { ctx.expect(false, 'no strategy to duplicate'); return; }
    const dup = await ctx.fetch('/api/strategies', {
      method: 'POST',
      token: tokens.a,
      body: { name, status: 'active' },
      allowError: true,
    });
    ctx.assertStatus(dup, 409);
  });

  await test('strategies.get · fetch back', async () => {
    const res = await ctx.fetch(`/api/strategies/${ids.strategyId}`, {
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.strategy.id === ids.strategyId, 'wrong strategy');
  });

  await test('strategies.update · pause', async () => {
    const res = await ctx.fetch(`/api/strategies/${ids.strategyId}`, {
      method: 'PATCH',
      token: tokens.a,
      body: { status: 'paused' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.strategy.status === 'paused', 'status not paused');
  });

  await test('strategies.archive · archived', async () => {
    const res = await ctx.fetch(`/api/strategies/${ids.strategyId}/archive`, {
      method: 'POST',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.strategy.status === 'archived', 'not archived');
  });

  await test('strategies.delete · removed', async () => {
    const res = await ctx.fetch(`/api/strategies/${ids.strategyId}`, {
      method: 'DELETE',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.ok === true, 'ok not true');
  });
}