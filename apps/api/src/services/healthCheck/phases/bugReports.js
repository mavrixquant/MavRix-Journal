// Bug-report phase.
//
// createReport() fires a support email via .catch() — the mailer safety flag
// suppresses it while a health-check run is active, so this is safe.
// Reports are cascade-deleted with the health-check user at end of run.

export async function run(ctx) {
  const { test, tokens } = ctx;

  await test('bugReports.create · accepts a valid report', async () => {
    const res = await ctx.fetch('/api/bug-reports', {
      method: 'POST',
      token: tokens.a,
      body: {
        title: 'Health check bug report',
        description: 'This is a health-check-generated report. Safe to delete.',
        category: 'bug',
        severity: 'low',
      },
    });
    ctx.assertStatus(res, 201);
    ctx.expect(res.body?.report?.id, 'report id missing');
  });

  await test('bugReports.create · rejects too-short title', async () => {
    const res = await ctx.fetch('/api/bug-reports', {
      method: 'POST',
      token: tokens.a,
      body: {
        title: 'ab',
        description: 'This is a valid-length description but the title is too short.',
        category: 'bug',
        severity: 'low',
      },
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });

  await test('bugReports.create · rejects too-short description', async () => {
    const res = await ctx.fetch('/api/bug-reports', {
      method: 'POST',
      token: tokens.a,
      body: {
        title: 'Valid title here',
        description: 'short',
        category: 'bug',
        severity: 'low',
      },
      allowError: true,
    });
    ctx.assertStatus(res, 400);
  });
}