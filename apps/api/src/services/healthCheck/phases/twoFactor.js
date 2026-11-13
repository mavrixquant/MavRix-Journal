// Two-factor phase — safe tests only.
//
// SKIPPED on purpose:
//   • /2fa/totp/confirm  with a real code  — would enable 2FA and lock out
//     subsequent tests in the same run.
//   • /2fa/email/enable / confirm / disable — email OTP endpoints.
//   • /2fa/backup-codes/regenerate          — requires a live TOTP code.
//
// We DO exercise setup() because it only generates a pending secret in the
// user row and returns a QR data URL — no external call, no email. The pending
// secret is cleaned up when the health-check user is deleted.

export async function run(ctx) {
  const { test, tokens } = ctx;

  await test('2fa.status · disabled for fresh user', async () => {
    const res = await ctx.fetch('/api/auth/2fa/status', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.enabled === false, 'enabled should be false');
    ctx.expect(res.body?.totpEnabled === false, 'totpEnabled should be false');
    ctx.expect(res.body?.emailEnabled === false, 'emailEnabled should be false');
  });

  await test('2fa.totp.setup · returns QR + secret', async () => {
    const res = await ctx.fetch('/api/auth/2fa/totp/setup', {
      method: 'POST',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(typeof res.body?.secret === 'string', 'secret missing');
    ctx.expect(typeof res.body?.qrDataUrl === 'string', 'qrDataUrl missing');
    ctx.expect(res.body.qrDataUrl.startsWith('data:image/'), 'qrDataUrl is not an image data URL');
    ctx.expect(typeof res.body?.otpauth === 'string', 'otpauth URI missing');
  });

  await test('2fa.totp.confirm · rejects wrong code', async () => {
    const res = await ctx.fetch('/api/auth/2fa/totp/confirm', {
      method: 'POST',
      token: tokens.a,
      body: { code: '000000' },
      allowError: true,
    });
    ctx.assertStatus(res, 401);
  });

  await test('2fa.totp.confirm · rejects malformed code', async () => {
    const res = await ctx.fetch('/api/auth/2fa/totp/confirm', {
      method: 'POST',
      token: tokens.a,
      body: { code: 'abc' },
      allowError: true,
    });
    ctx.assertStatus(res, 401);
  });
}