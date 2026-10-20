
export async function run(ctx) {
  const { test, tokens } = ctx;

  await test('gex.list · returns day metadata', async () => {
    const res = await ctx.fetch('/api/gex', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.days), 'days not array');
  });

  await test('gex.get · fetch one day if any exist', async () => {
    const list = await ctx.fetch('/api/gex', { token: tokens.a });
    const days = list.body.days || [];
    if (days.length === 0) {
      ctx.expect(true, 'no GEX days uploaded — soft pass');
      return { notes: 'no GEX days available' };
    }
    const res = await ctx.fetch(`/api/gex/${days[0].date}`, {
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.day.levels), 'levels not array');
  });
}