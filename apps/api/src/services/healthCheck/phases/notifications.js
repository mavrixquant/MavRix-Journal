// Notifications phase.
//
// The health-check user starts with zero notifications because notification
// creation is suppressed globally while a run is active (see healthCheckMode).

export async function run(ctx) {
  const { test, tokens } = ctx;

  await test('notifications.list · fresh user has empty list', async () => {
    const res = await ctx.fetch('/api/notifications', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body?.notifications), 'notifications not array');
    ctx.expect(res.body.notifications.length === 0, 'fresh user should have no notifications');
  });

  await test('notifications.unreadCount · fresh user is 0', async () => {
    const res = await ctx.fetch('/api/notifications/unread-count', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.count === 0, `expected count 0, got ${res.body?.count}`);
  });

  await test('notifications.readAll · no-op with zero rows', async () => {
    const res = await ctx.fetch('/api/notifications/read-all', {
      method: 'POST',
      token: tokens.a,
      body: {},
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'expected { ok: true }');
    ctx.expect(res.body?.updated === 0, 'updated should be 0');
  });

  await test('notifications.clearRead · no-op with zero read rows', async () => {
    const res = await ctx.fetch('/api/notifications/read-clear', {
      method: 'POST',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.deleted === 0, 'deleted should be 0');
  });

  await test('notifications.readFriends · no-op', async () => {
    const res = await ctx.fetch('/api/notifications/read-friends', {
      method: 'POST',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'expected { ok: true }');
  });

  await test('notifications.markRead · 404 for unknown id', async () => {
    const res = await ctx.fetch('/api/notifications/does-not-exist/read', {
      method: 'POST',
      token: tokens.a,
      allowError: true,
    });
    ctx.assertStatus(res, 404);
  });

  await test('notifications.delete · 404 for unknown id', async () => {
    const res = await ctx.fetch('/api/notifications/does-not-exist', {
      method: 'DELETE',
      token: tokens.a,
      allowError: true,
    });
    ctx.assertStatus(res, 404);
  });
}