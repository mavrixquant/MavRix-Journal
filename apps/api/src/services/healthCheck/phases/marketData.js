
export async function run(ctx) {
  const { test, tokens } = ctx;

  await test('marketData.catalog · symbols + intervals', async () => {
    const res = await ctx.fetch('/api/market-data/catalog', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.symbols), 'symbols not array');
    ctx.expect(Array.isArray(res.body.intervals), 'intervals not array');
  });

  await test('marketData.bars · EURUSD 5m', async () => {
    const res = await ctx.fetch(
      '/api/market-data/bars?symbol=EURUSD&interval=5m',
      { token: tokens.a }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.bars), 'bars not array');
    return { notes: `fetched ${res.body.bars.length} bars` };
  });

  await test('marketData.bars · invalid symbol → 404', async () => {
    const res = await ctx.fetch('/api/market-data/bars?symbol=NOTREAL&interval=1h', {
      token: tokens.a,
      allowError: true,
    });
    ctx.assertStatus(res, 404);
  });

  await test('marketData.bars · invalid interval → 400', async () => {
    const res = await ctx.fetch('/api/market-data/bars?symbol=NQ&interval=7h', {
      token: tokens.a,
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });
}