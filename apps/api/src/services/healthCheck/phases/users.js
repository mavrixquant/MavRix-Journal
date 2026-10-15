// apps/api/src/services/healthCheck/phases/users.js
//
// Layouts & Preferences phase — 7 tests.
// Every endpoint here operates on the CALLING user, so we exercise them
// with tokens.a (healthcheck user A).

export async function run(ctx) {
  const { test, tokens, ids } = ctx;

  /* ---------------- layouts ---------------- */

  await test('users.layouts.list · fresh user has 0', async () => {
    const res = await ctx.fetch('/api/users/layouts', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.layouts), 'not array');
    ctx.expect(res.body.layouts.length === 0, 'expected 0 layouts');
  });

  const layoutId = `healthcheck-layout-${Date.now()}`;

  await test('users.layouts.create · first layout is active', async () => {
    const res = await ctx.fetch('/api/users/layouts', {
      method: 'POST',
      token: tokens.a,
      body: {
        id: layoutId,
        name: 'HealthCheck Layout',
        layout: [
          { i: 'hero', x: 0, y: 0, w: 24, h: 8, minW: 1, minH: 1, visible: true },
        ],
      },
    });
    ctx.assertStatus(res, 201);
    ctx.expect(res.body.layout.isActive === true, 'first layout should be active');
  });

  await test('users.layouts.update · rename', async () => {
    const res = await ctx.fetch(`/api/users/layouts/${layoutId}`, {
      method: 'PATCH',
      token: tokens.a,
      body: { name: 'HealthCheck Renamed' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.layout.name === 'HealthCheck Renamed', 'name not updated');
  });

  await test('users.layouts.activate · idempotent success', async () => {
    const res = await ctx.fetch(`/api/users/layouts/${layoutId}/activate`, {
      method: 'POST',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
  });

  await test('users.layouts.delete · removed', async () => {
    const res = await ctx.fetch(`/api/users/layouts/${layoutId}`, {
      method: 'DELETE',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.ok === true, 'ok not true');
  });

  /* ---------------- preferences ---------------- */

  await test('users.preferences.get · returns object', async () => {
    const res = await ctx.fetch('/api/users/preferences', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(
      res.body.preferences && typeof res.body.preferences === 'object',
      'preferences not an object'
    );
  });

  await test('users.preferences.put · round-trip', async () => {
    const payload = {
      preferences: {
        appearance: { accentColor: '#4C8BF5', density: 'compact' },
        preferences: { timeFormat: '24h' },
      },
    };
    const put = await ctx.fetch('/api/users/preferences', {
      method: 'PUT',
      token: tokens.a,
      body: payload,
    });
    ctx.assertStatus(put, 200);

    const get = await ctx.fetch('/api/users/preferences', { token: tokens.a });
    ctx.expect(
      get.body.preferences?.appearance?.accentColor === '#4C8BF5',
      'preferences not persisted'
    );
  });

  await test('users.preferences.put · oversized payload → 413', async () => {
    const big = 'x'.repeat(9000);
    const res = await ctx.fetch('/api/users/preferences', {
      method: 'PUT',
      token: tokens.a,
      body: { preferences: { big } },
      allowError: true,
    });
    ctx.assertStatus(res, 413);
  });
}