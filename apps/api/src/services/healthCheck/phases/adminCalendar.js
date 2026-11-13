// Admin calendar phase — events list/stats + a scoped import/delete round-trip.
//
// SKIPPED on purpose:
//   • POST /admin/calendar/sync-range — hits Biquote.
//
// The import test uses the "hc-${ts}-" externalId prefix and deletes by those
// exact ids, so no real events are touched.

export async function run(ctx) {
  const { test, tokens } = ctx;
  const admin = tokens.admin;

  await test('admin.calendar.events.list · paginated', async () => {
    const res = await ctx.fetch('/api/admin/calendar/events?limit=10', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body?.events), 'events not array');
    ctx.expect(typeof res.body?.total === 'number', 'total not number');
  });

  await test('admin.calendar.stats · totals + date range', async () => {
    const res = await ctx.fetch('/api/admin/calendar/stats', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body?.total === 'number', 'total not number');
    ctx.expect(typeof res.body?.impactCounts === 'object', 'impactCounts missing');
  });

  await test('admin.calendar.import · accepts test rows', async () => {
    const ts = Date.now();
    const rows = [{
      externalId: `hc-${ts}-1`,
      dateTimeUtc: new Date(Date.now() + 3600_000).toISOString(),
      currency: 'HCX',
      countryCode: 'HC',
      event: 'Health check event',
      impact: 'low',
      source: 'healthcheck',
    }];
    const res = await ctx.fetch('/api/admin/calendar/import', {
      method: 'POST',
      token: admin,
      body: { rows, mode: 'merge' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'ok not true');
    ctx.expect(res.body?.valid === 1, `expected 1 valid, got ${res.body?.valid}`);

    ctx.onCleanup(async () => {
      await ctx.fetch('/api/admin/calendar/events', {
        method: 'DELETE',
        token: admin,
        body: { currency: 'HCX' },
        allowError: true,
      });
      return 'calendar hc rows removed';
    });
  });

  await test('admin.calendar.delete · removes HCX rows', async () => {
    const res = await ctx.fetch('/api/admin/calendar/events', {
      method: 'DELETE',
      token: admin,
      body: { currency: 'HCX' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'ok not true');
  });
}