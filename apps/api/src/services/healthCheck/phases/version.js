// Public, no-auth endpoints. Safe by definition — pure reads of the DB
// (version + changelog) and a static health check.

export async function run(ctx) {
  const { test } = ctx;

  await test('version.health · /api/health is ok', async () => {
    const res = await ctx.fetch('/api/health');
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'expected { ok: true }');
    ctx.expect(typeof res.body?.version === 'string', 'version missing');
  });

  await test('version.current · /api/version returns build + release', async () => {
    const res = await ctx.fetch('/api/version');
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body?.buildVersion === 'string', 'buildVersion missing');
    // Current release may be null on a fresh DB — that is a valid state.
    ctx.expect('version' in res.body, 'version key missing');
    ctx.expect('latestRelease' in res.body, 'latestRelease key missing');
  });

  await test('version.changelog · /api/changelog returns releases array', async () => {
    const res = await ctx.fetch('/api/changelog');
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body?.releases), 'releases not array');
  });
}