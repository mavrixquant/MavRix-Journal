
import { prisma } from '../prisma.js';
import { MAVE_AI_SYSTEM_PROMPT } from './systemPrompt.js';
import { env } from '../../config/env.js';

export async function buildContext(conversationId, maveAiId) {
  const limit = env.ai.historyLimit;

  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      kind: 'user',
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  rows.reverse();

  const history = [
    { role: 'system', content: MAVE_AI_SYSTEM_PROMPT },
  ];

  for (const msg of rows) {
    const role = msg.senderId === maveAiId ? 'assistant' : 'user';
    
    if (!msg.body || !msg.body.trim()) continue;

    history.push({
      role,
      content: msg.body,
    });
  }

  return history;
}