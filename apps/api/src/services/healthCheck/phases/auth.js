
export async function run(ctx) {
  const { test, ids, tokens } = ctx;
  const ts = Date.now();
  const emailA = `healthcheck-${ts}-a@test.local`;
  const emailB = `healthcheck-${ts}-b@test.local`;
  const password = 'HealthCheck!2026';

  ids.emailA = emailA;
  ids.emailB = emailB;
  ids.password = password;


  await test('auth.signup · creates user A', async () => {
    const res = await ctx.fetch('/api/auth/signup', {
      method: 'POST',
      body: { email: emailA, password, firstName: 'Health', lastName: 'CheckA' },
    });
    ctx.assertStatus(res, 201);
    ctx.expect(res.body?.accessToken, 'missing accessToken');
    tokens.a = res.body.accessToken;
    ids.userA = res.body.user.id;

    await ctx.prisma.user.update({
      where: { id: ids.userA },
      data: { emailVerified: true },
    });

    return { notes: `created + verified ${emailA}` };
  });

  await test('auth.signup · creates user B', async () => {
    const res = await ctx.fetch('/api/auth/signup', {
      method: 'POST',
      body: { email: emailB, password, firstName: 'Health', lastName: 'CheckB' },
    });
    ctx.assertStatus(res, 201);
    tokens.b = res.body.accessToken;
    ids.userB = res.body.user.id;

    await ctx.prisma.user.update({
      where: { id: ids.userB },
      data: { emailVerified: true },
    });

    return { notes: `created + verified ${emailB}` };
  });

  await test('auth.signup · duplicate email → 409', async () => {
    const res = await ctx.fetch('/api/auth/signup', {
      method: 'POST',
      body: { email: emailA, password, firstName: 'Dup', lastName: 'User' },
      allowError: true,
    });
    ctx.assertStatus(res, 409);
  });

  await test('auth.signup · invalid payload → 400', async () => {
    const res = await ctx.fetch('/api/auth/signup', {
      method: 'POST',
      body: { email: 'not-an-email', password: 'x' },
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });


  await test('auth.login · valid credentials', async () => {
    const res = await ctx.fetch('/api/auth/login', {
      method: 'POST',
      body: { email: emailA, password },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.accessToken, 'missing accessToken');
    tokens.a = res.body.accessToken;
  });

  await test('auth.login · wrong password → 401', async () => {
    const res = await ctx.fetch('/api/auth/login', {
      method: 'POST',
      body: { email: emailA, password: 'wrong-password-xyz' },
      allowError: true,
    });
    ctx.assertStatus(res, 401);
  });

  await test('auth.login · unknown email → 401', async () => {
    const res = await ctx.fetch('/api/auth/login', {
      method: 'POST',
      body: { email: `nope-${ts}@test.local`, password },
      allowError: true,
    });
    ctx.assertStatus(res, 401);
  });


  await test('auth.me · returns caller', async () => {
    const res = await ctx.fetch('/api/auth/me', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.user?.email === emailA, 'user email mismatch');
    ctx.expect(res.body.user?.role === 'user', 'fresh user role should be "user"');
  });

  await test('auth.me · no token → 401', async () => {
    const res = await ctx.fetch('/api/auth/me', { allowError: true });
    ctx.assertStatus(res, 401);
  });

  await test('auth.me · malformed token → 401', async () => {
    const res = await ctx.fetch('/api/auth/me', {
      token: 'not.a.jwt',
      allowError: true,
    });
    ctx.assertStatus(res, 401);
  });


  await test('auth.refresh · missing cookie → 401', async () => {
    const res = await ctx.fetch('/api/auth/refresh', {
      method: 'POST',
      allowError: true,
    });
    ctx.assertStatus(res, 401);
    return { notes: 'cookie path requires browser session; happy path not asserted' };
  });


  await test('auth.verify-email · invalid token → 400', async () => {
    const res = await ctx.fetch('/api/auth/verify-email', {
      method: 'POST',
      body: { token: 'invalid-token-xxx' },
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });

  await test('auth.resend-verification · returns 200/400', async () => {
    const res = await ctx.fetch('/api/auth/resend-verification', {
      method: 'POST',
      token: tokens.a,
      allowError: true,
    });
    ctx.expect(
      [200, 400].includes(res.status),
      `unexpected status ${res.status}`
    );
  });


  await test('auth.request-password-reset · opaque response', async () => {
    const res = await ctx.fetch('/api/auth/request-password-reset', {
      method: 'POST',
      body: { email: `nonexistent-${ts}@nowhere.invalid` },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.ok === true, 'expected { ok: true }');
  });

  await test('auth.reset-password · invalid token → 400', async () => {
    const res = await ctx.fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: 'invalid-reset-token-xyz', password: 'NewPassword!1' },
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });


  await test('auth.google · missing accessToken → 400', async () => {
    const res = await ctx.fetch('/api/auth/google', {
      method: 'POST',
      body: {},
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });

  await test('auth.google/link · missing token → 400', async () => {
    const res = await ctx.fetch('/api/auth/google/link', {
      method: 'POST',
      body: {},
      token: tokens.a,
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });


  await test('auth.logout · 204 and re-login works', async () => {
    const res = await ctx.fetch('/api/auth/logout', {
      method: 'POST',
      token: tokens.a,
    });
    ctx.assertStatus(res, 204);
    const relogin = await ctx.fetch('/api/auth/login', {
      method: 'POST',
      body: { email: emailA, password },
    });
    ctx.assertStatus(relogin, 200);
    tokens.a = relogin.body.accessToken;
  });
}