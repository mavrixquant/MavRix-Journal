// apps/api/src/lib/ai/context.js
//
// Fetches the last N messages from a conversation and formats them into
// the { role, content } array that LLM providers expect.
//
// It also prepends the Mave AI system prompt.

import { prisma } from '../prisma.js';
import { MAVE_AI_SYSTEM_PROMPT } from './systemPrompt.js';
import { env } from '../../config/env.js';

/**
 * Builds the chat history for a conversation.
 *
 * @param {string} conversationId
 * @param {string} maveAiId — the sentinel user ID for Mave AI
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
export async function buildContext(conversationId, maveAiId) {
  const limit = env.ai.historyLimit;

  // Fetch the newest `limit` messages, ascending by time so they read
  // naturally to the LLM.
  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      // Ignore inline system notices so they don't confuse the LLM
      kind: 'user',
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // We fetched descending (newest first). Reverse to chronological.
  rows.reverse();

  const history = [
    { role: 'system', content: MAVE_AI_SYSTEM_PROMPT },
  ];

  for (const msg of rows) {
    // The AI sends messages via the Mave AI user ID.
    // Everyone else is a human 'user'.
    const role = msg.senderId === maveAiId ? 'assistant' : 'user';
    
    // Skip empty messages
    if (!msg.body || !msg.body.trim()) continue;

    history.push({
      role,
      content: msg.body,
    });
  }

  return history;
}