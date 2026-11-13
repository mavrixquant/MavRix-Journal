
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

  await test('chat.conversations.viewing · sets presence', async () => {
    const res = await ctx.fetch(
      `/api/chat/conversations/${ids.conversationDm}/viewing`,
      { method: 'POST', token: tokens.a, body: { active: true } }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'ok not true');
  });

  await test('chat.conversations.clear · user-scope clear is safe', async () => {
    const res = await ctx.fetch(
      `/api/chat/conversations/${ids.conversationDm}/clear`,
      { method: 'POST', token: tokens.a }
    );
    ctx.assertStatus(res, 200);
    ctx.expect(res.body?.ok === true, 'ok not true');
    ctx.expect(res.body?.scope === 'me', `expected scope 'me', got ${res.body?.scope}`);
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
}