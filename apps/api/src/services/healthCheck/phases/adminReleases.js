// Admin releases phase — draft lifecycle only.
//
// SKIPPED on purpose:
//   • POST /releases/:id/publish     — broadcastToAll(invalidate) to every
//                                       connected SSE client (noisy for users).
//   • POST /releases/:id/rebroadcast — same.
//   • POST /releases/:id/unpublish   — only meaningful for a published release.
//
// Draft create → update → delete is fully self-contained and side-effect free.

export async function run(ctx) {
  const { test, tokens } = ctx;
  const admin = tokens.admin;

  await test('admin.releases.list · returns array', async () => {
    const res = await ctx.fetch('/api/admin/releases', { token: admin });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body?.releases), 'releases not array');
  });

  const version = `0.0.0-hc-${Date.now()}`;
  let releaseId = null;

  await test('admin.releases.create · creates a draft', async () => {
    const res = await ctx.fetch('/api/admin/releases', {
      method: 'POST',
      token: admin,
      body: {
        version,
        date: new Date().toISOString().slice(0, 10),
        highlights: ['Health-check automated draft'],
        sections: { added: ['created by health check'], changed: [], fixed: [] },
        publish: false,
      },
    });
    ctx.assertStatus(res, 201);
    ctx.expect(res.body?.release?.id, 'release id missing');
    ctx.expect(res.body?.release?.isPublished === false, 'draft should not be published');
    releaseId = res.body.release.id;
  });

  await test('admin.releases.update · updates the draft', async () => {
    if (!releaseId) { ctx.skip('admin.releases.update', 'no draft'); return; }
    const res = await ctx.fetch(`/api/admin/releases/${releaseId}`, {
      method: 'PATCH',
      token: admin,
      body: {
        version,
        date: new Date().toISOString().slice(0, 10),
        highlights: ['Updated by health check'],
        sections: { added: ['updated'], changed: [], fixed: [] },
      },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body?.release?.highlights), 'highlights not array');
    ctx.expect(res.body.release.highlights[0] === 'Updated by health check', 'highlights not updated');
  });

  await test('admin.releases.delete · removes the draft', async () => {
    if (!releaseId) { ctx.skip('admin.releases.delete', 'no draft'); return; }
    const res = await ctx.fetch(`/api/admin/releases/${releaseId}`, {
      method: 'DELETE',
      token: admin,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'ok not true');
  });
}