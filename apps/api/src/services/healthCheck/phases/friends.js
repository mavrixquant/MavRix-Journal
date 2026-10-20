
export async function run(ctx) {
  const { test, tokens, ids } = ctx;

  if (!ids.userA || !ids.userB) {
    ctx.skip('friends.*', 'need 2 healthcheck users (auth phase)');
    return;
  }


  await test('friends.list · A has no friends', async () => {
    const res = await ctx.fetch('/api/friends', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.friends), 'not array');
  });

  await test('friends.status · B is not a friend yet', async () => {
    const res = await ctx.fetch(`/api/friends/status/${ids.userB}`, {
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.status.isFriend === false, 'should not be friend');
  });


  await test('friends.requests.send · A → B', async () => {
    const res = await ctx.fetch('/api/friends/requests', {
      method: 'POST',
      token: tokens.a,
      body: { toUserId: ids.userB, message: 'healthcheck friend request' },
    });
    ctx.assertStatus(res, 201);
    ids.friendRequestId = res.body.request.id;
    ctx.expect(res.body.request.status === 'pending', 'not pending');
  });

  await test('friends.requests.send · duplicate → 409', async () => {
    const res = await ctx.fetch('/api/friends/requests', {
      method: 'POST',
      token: tokens.a,
      body: { toUserId: ids.userB },
      allowError: true,
    });
    ctx.assertStatus(res, 409);
  });

  await test('friends.requests.list · B sees 1 incoming', async () => {
    const res = await ctx.fetch('/api/friends/requests', { token: tokens.b });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.incoming.length === 1, `expected 1 incoming, got ${res.body.incoming.length}`);
  });


  await test('friends.requests.accept · B accepts', async () => {
    const res = await ctx.fetch(
      `/api/friends/requests/${ids.friendRequestId}/accept`,
      { method: 'POST', token: tokens.b }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.request.status === 'accepted', 'not accepted');
  });

  await test('friends.list · A now has 1 friend', async () => {
    const res = await ctx.fetch('/api/friends', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.friends.length === 1, `expected 1 friend, got ${res.body.friends.length}`);
  });


  await test('friends.remove · A removes B', async () => {
    const res = await ctx.fetch(`/api/friends/${ids.userB}`, {
      method: 'DELETE',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
  });


  await test('friends.requests.send · A → B again', async () => {
    const res = await ctx.fetch('/api/friends/requests', {
      method: 'POST',
      token: tokens.a,
      body: { toUserId: ids.userB },
    });
    ctx.assertStatus(res, 201);
    ids.friendRequestId2 = res.body.request.id;
  });

  await test('friends.requests.decline · B declines', async () => {
    const res = await ctx.fetch(
      `/api/friends/requests/${ids.friendRequestId2}/decline`,
      { method: 'POST', token: tokens.b }
    );
    ctx.assertStatus(res, 200);
  });


  await test('friends.requests.cancel · A sends then cancels', async () => {
    const send = await ctx.fetch('/api/friends/requests', {
      method: 'POST',
      token: tokens.a,
      body: { toUserId: ids.userB },
    });
    ctx.assertStatus(send, 201);
    const reqId = send.body.request.id;
    const cancel = await ctx.fetch(`/api/friends/requests/${reqId}`, {
      method: 'DELETE',
      token: tokens.a,
    });
    ctx.assertStatus(cancel, 200);
  });


  await test('friends.block · A blocks B', async () => {
    const res = await ctx.fetch('/api/friends/blocks', {
      method: 'POST',
      token: tokens.a,
      body: { userId: ids.userB, reason: 'healthcheck' },
    });
    ctx.assertStatus(res, 200);
  });

  await test('friends.blocks.list · A sees 1 block', async () => {
    const res = await ctx.fetch('/api/friends/blocks', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.blocks.length === 1, `expected 1 block, got ${res.body.blocks.length}`);
  });

  await test('friends.unblock · A unblocks B', async () => {
    const res = await ctx.fetch(`/api/friends/blocks/${ids.userB}`, {
      method: 'DELETE',
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
  });
}