
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

  await test('marketData.quote · EURUSD single', async () => {
    const res = await ctx.fetch('/api/market-data/quote?symbol=EURUSD', {
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.price != null, 'price missing');
  });

  await test('marketData.quotes · EURUSD + NQ batch', async () => {
    const res = await ctx.fetch(
      '/api/market-data/quotes?symbols=EURUSD,NQ',
      { token: tokens.a }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.quotes), 'quotes not array');
    ctx.expect(res.body.quotes.length === 2, `expected 2 quotes, got ${res.body.quotes.length}`);
  });
}