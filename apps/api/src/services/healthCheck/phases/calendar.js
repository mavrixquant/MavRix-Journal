
export async function run(ctx) {
  const { test, tokens } = ctx;

  const today = new Date();
  const from = today.toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 7 * 86400_000).toISOString().slice(0, 10);

  await test('calendar.list · 7-day window', async () => {
    const res = await ctx.fetch(
      `/api/calendar?from=${from}&to=${to}`,
      { token: tokens.a }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.events), 'events not array');
  });

  await test('calendar.list · missing from → 400', async () => {
    const res = await ctx.fetch(`/api/calendar?to=${to}`, {
      token: tokens.a,
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });

  await test('calendar.currencies · distinct list', async () => {
    const res = await ctx.fetch('/api/calendar/currencies', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.currencies), 'not array');
  });

  await test('calendar.meta · totals', async () => {
    const res = await ctx.fetch('/api/calendar/meta', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body.totalEvents === 'number', 'totalEvents not number');
  });
}