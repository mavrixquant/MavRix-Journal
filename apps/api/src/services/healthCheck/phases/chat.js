
export async function run(ctx) {
  const { test, tokens, ids } = ctx;

  if (!ids.userA || !ids.userB) {
    ctx.skip('chat.*', 'need 2 healthcheck users (auth phase)');
    return;
  }


  await test('chat.users.search · B finds A by name fragment', async () => {
    const res = await ctx.fetch('/api/chat/users/search?q=Health', {
      token: tokens.b,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.users), 'users not array');
  });

  await test('chat.conversations.create · A opens DM with B', async () => {
    const res = await ctx.fetch('/api/chat/conversations', {
      method: 'POST',
      token: tokens.a,
      body: { peerId: ids.userB },
    });
    ctx.assertStatus(res, 201);
    ids.conversationDm = res.body.conversation.id;
    ctx.expect(res.body.conversation.type === 'dm', 'not dm');
  });

  await test('chat.conversations.create · idempotent', async () => {
    const res = await ctx.fetch('/api/chat/conversations', {
      method: 'POST',
      token: tokens.a,
      body: { peerId: ids.userB },
    });
    ctx.assertStatus(res, 201);
    ctx.expect(res.body.conversation.id === ids.conversationDm, 'not idempotent');
  });

  await test('chat.conversations.list · A sees DM', async () => {
    const res = await ctx.fetch('/api/chat/conversations', { token: tokens.a });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.conversations), 'not array');
    ctx.expect(
      res.body.conversations.some((c) => c.id === ids.conversationDm),
      'DM not in list'
    );
  });

  await test('chat.conversations.get · fetch DM detail', async () => {
    const res = await ctx.fetch(
      `/api/chat/conversations/${ids.conversationDm}`,
      { token: tokens.a }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.conversation.id === ids.conversationDm, 'wrong id');
  });

  await test('chat.conversations.update · pin', async () => {
    const res = await ctx.fetch(
      `/api/chat/conversations/${ids.conversationDm}`,
      { method: 'PATCH', token: tokens.a, body: { isPinned: true } }
    );
    ctx.assertStatus(res, 200);
  });


  await test('chat.messages.send · A → B "hello"', async () => {
    const res = await ctx.fetch(
      `/api/chat/conversations/${ids.conversationDm}/messages`,
      { method: 'POST', token: tokens.a, body: { body: 'hello from healthcheck' } }
    );
    ctx.assertStatus(res, 201);
    ids.messageId = res.body.message.id;
  });

  await test('chat.messages.list · A sees own message', async () => {
    const res = await ctx.fetch(
      `/api/chat/conversations/${ids.conversationDm}/messages`,
      { token: tokens.a }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.messages), 'not array');
    ctx.expect(res.body.messages.length >= 1, 'expected >= 1 msg');
  });

  await test('chat.messages.typing · A signals typing', async () => {
    const res = await ctx.fetch(
      `/api/chat/conversations/${ids.conversationDm}/typing`,
      { method: 'POST', token: tokens.a, body: { isTyping: true } }
    );
    ctx.assertStatus(res, 200);
  });

  await test('chat.messages.read · B marks read', async () => {
    const res = await ctx.fetch(
      `/api/chat/conversations/${ids.conversationDm}/read`,
      { method: 'PATCH', token: tokens.b }
    );
    ctx.assertStatus(res, 200);
  });

  await test('chat.messages.delivered · B acks delivery', async () => {
    const res = await ctx.fetch(
      `/api/chat/messages/${ids.messageId}/delivered`,
      { method: 'POST', token: tokens.b }
    );
    ctx.assertStatus(res, 200);
  });

  await test('chat.messages.edit · A edits', async () => {
    const res = await ctx.fetch(`/api/chat/messages/${ids.messageId}`, {
      method: 'PATCH',
      token: tokens.a,
      body: { body: 'hello from healthcheck (edited)' },
    });
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.message.editedAt, 'editedAt not set');
  });

  await test('chat.messages.delete(scope=me) · B hides for self', async () => {
    const res = await ctx.fetch(
      `/api/chat/messages/${ids.messageId}?scope=me`,
      { method: 'DELETE', token: tokens.b }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.scope === 'me', 'wrong scope');
  });

  await test('chat.messages.delete(scope=all) · A deletes for everyone', async () => {
    const res = await ctx.fetch(
      `/api/chat/messages/${ids.messageId}?scope=all`,
      { method: 'DELETE', token: tokens.a }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(res.body.scope === 'all', 'wrong scope');
  });


  await test('chat.groups.discover · list public groups', async () => {
    const res = await ctx.fetch('/api/chat/groups/discover', {
      token: tokens.a,
    });
    ctx.assertStatus(res, 200);
    ctx.expect(Array.isArray(res.body.groups), 'not array');
  });

  await test('chat.groups.join · join first discoverable, else skip', async () => {
    const discover = await ctx.fetch('/api/chat/groups/discover', {
      token: tokens.a,
    });
    const groups = discover.body.groups || [];
    if (groups.length === 0) {
      ctx.expect(true, 'no groups to join — soft pass');
      return { notes: 'no public groups available' };
    }
    const gid = groups[0].id;
    const join = await ctx.fetch(`/api/chat/groups/${gid}/join`, {
      method: 'POST',
      token: tokens.a,
    });
    ctx.assertStatus(join, 200);
    ids.joinedGroupId = gid;

    const members = await ctx.fetch(`/api/chat/groups/${gid}/members`, {
      token: tokens.a,
    });
    ctx.assertStatus(members, 200);
    ctx.expect(Array.isArray(members.body.members), 'members not array');

    const leave = await ctx.fetch(`/api/chat/groups/${gid}/leave`, {
      method: 'POST',
      token: tokens.a,
    });
    ctx.assertStatus(leave, 200);
  });
}