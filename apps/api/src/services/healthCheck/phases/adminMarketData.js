// Admin market-data phase — read-only checks.
//
// SKIPPED on purpose:
//   • POST   /import        — starts an async fetch from Yahoo/Biquote.
//   • POST   /jobs/:id/stop — needs a running job (i.e. an import we skipped).
//
// The wipe test targets a fake symbol with no rows in market_bars, so it is a
// guaranteed no-op. Do NOT change "HEALTHCHECK_NONE" to a real symbol.

export async function run(ctx) {
  const { test, tokens } = ctx;
  const admin = tokens.admin;

  await test('admin.marketData.stats · returns totals + rows', async () => {
    const res = await ctx.fetch('/api/admin/market-data/stats', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body?.rows), 'rows not array');
    ctx.expect(typeof res.body?.totals === 'object', 'totals missing');
    ctx.expect(Array.isArray(res.body?.symbols), 'symbols not array');
    ctx.expect(Array.isArray(res.body?.intervals), 'intervals not array');
  });

  await test('admin.marketData.jobs.list · paginated', async () => {
    const res = await ctx.fetch('/api/admin/market-data/jobs?limit=10', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body?.jobs), 'jobs not array');
  });

  await test('admin.marketData.wipe · safe on fake symbol', async () => {
    const res = await ctx.fetch('/api/admin/market-data/cache', {
      method: 'DELETE',
      token: admin,
      body: { symbol: 'HEALTHCHECK_NONE' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'ok not true');
    ctx.expect(res.body?.deleted === 0, `expected 0 deleted, got ${res.body?.deleted}`);
  });
}