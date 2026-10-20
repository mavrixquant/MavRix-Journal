// ============================================================================
// Conversation context builder — persona-aware.
//
// The `aiId` argument is the persona's user ID (Guide / Trainer / Chat).
// We resolve the persona to pick the correct system prompt.
// ============================================================================

import { prisma } from '../prisma.js';
import { getSystemPrompt } from './systemPrompt.js';
import { getPersonaForAiId } from '../../services/maveAiBootstrap.js';
import { env } from '../../config/env.js';

export async function buildContext(conversationId, aiId) {
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

  const persona = getPersonaForAiId(aiId) || 'guide';
  const systemPrompt = getSystemPrompt(persona);

  const history = [{ role: 'system', content: systemPrompt }];

  for (const msg of rows) {
    const role = msg.senderId === aiId ? 'assistant' : 'user';
    if (!msg.body || !msg.body.trim()) continue;
    history.push({ role, content: msg.body });
  }

  return history;
}