// AI settings phase — safe tests only.
//
// SKIPPED on purpose:
//   • POST /api/ai/settings    — calls discoverModels() which hits the provider
//   • POST /api/ai/test        — same, and rate-limited
//
// The credential create / test flow is verified manually through the settings UI.

export async function run(ctx) {
  const { test, tokens } = ctx;

  await test('ai.providers · GET /providers returns list', async () => {
    const res = await ctx.fetch('/api/ai/providers', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body?.providers), 'providers not array');
    ctx.expect(res.body.providers.length > 0, 'providers list is empty');
    // Each entry must have the shape the settings UI depends on.
    const p = res.body.providers[0];
    ctx.expect(typeof p.id === 'string', 'provider.id missing');
    ctx.expect(typeof p.label === 'string', 'provider.label missing');
  });

  await test('ai.settings.list · fresh user has no credentials', async () => {
    const res = await ctx.fetch('/api/ai/settings', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body?.credentials), 'credentials not array');
    ctx.expect(res.body.credentials.length === 0, 'fresh user should have no credentials');
  });

  await test('ai.settings.updateModels · 404 when no credential', async () => {
    const res = await ctx.fetch('/api/ai/settings/unknown/models', {
      method: 'PATCH',
      token: tokens.a,
      body: { models: ['dummy'] },
      allowError: true,
    });
    ctx.assertStatus(res, 404);
  });

  await test('ai.settings.delete · no-op for missing provider', async () => {
    const res = await ctx.fetch('/api/ai/settings/unknown', {
      method: 'DELETE',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'expected { ok: true }');
  });
}