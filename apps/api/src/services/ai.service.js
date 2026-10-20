// ============================================================================
// AI response orchestration — silent provider switching + stop support.
//
// Each conversation gets a private AbortController tracked in `running`.
// `stopAiForConversation()` aborts it; the AI writeup catches `isAborted`
// and persists an "Interrupted" system message instead of a normal reply.
//
// Provider switches (e.g., OpenRouter → Groq → Gemini) are SILENT — no
// `ai_switch` message is emitted any more.
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { broadcastToUser } from '../lib/broadcaster.js';
import { buildContext } from '../lib/ai/context.js';
import { executeChat } from '../lib/ai/router.js';
import { getMaveAiUser } from './maveAiBootstrap.js';

const inFlight = new Set();
const pending = new Map();
const running = new Map(); // conversationId → { controller, userId }

function personaSender(aiId) {
  const cached = getMaveAiUser(aiId);
  if (cached) {
    return {
      id: aiId,
      firstName: cached.firstName || 'Mave',
      lastName: cached.lastName || 'AI',
      isAi: true,
    };
  }
  return { id: aiId, firstName: 'Mave', lastName: 'AI', isAi: true };
}

/** Called from chat.controller.js stopAi handler. */
export function stopAiForConversation(conversationId, userId) {
  const entry = running.get(conversationId);
  if (!entry) return { ok: true, wasRunning: false };
  if (entry.userId !== userId) {
    return { ok: false, wasRunning: false, error: 'not-yours' };
  }
  try {
    entry.controller.abort();
  } catch {}
  // Clear any queued next-message triggers too
  pending.delete(conversationId);
  return { ok: true, wasRunning: true };
}

export async function triggerAiResponse(conversationId, userId, aiId) {
  if (inFlight.has(conversationId)) {
    pending.set(conversationId, { userId, aiId });
    return;
  }

  inFlight.add(conversationId);
  pending.delete(conversationId);

  const controller = new AbortController();
  running.set(conversationId, { controller, userId });

  (async () => {
    try {
      await generateAndBroadcast(conversationId, userId, aiId, controller.signal);
    } catch (err) {
      if (!err?.isAborted) {
        console.error('[mave-ai] Unhandled trigger error:', err?.message || err);
      }
    } finally {
      inFlight.delete(conversationId);
      running.delete(conversationId);

      const next = pending.get(conversationId);
      if (next) {
        pending.delete(conversationId);
        triggerAiResponse(conversationId, next.userId, next.aiId);
      }
    }
  })();
}

async function generateAndBroadcast(conversationId, userId, aiId, signal) {
  let messages;
  try {
    messages = await buildContext(conversationId, aiId);
  } catch (err) {
    console.error('[mave-ai] buildContext failed:', err?.message || err);
    return;
  }

  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== 'user') return;

  let result;
  try {
    result = await executeChat(userId, messages, { signal });
  } catch (err) {
    if (err?.isAborted || signal?.aborted) {
      // Persist an "Interrupted" system message
      try {
        const interrupted = await prisma.message.create({
          data: {
            conversationId,
            senderId: aiId,
            body: 'Interrupted',
            kind: 'system',
          },
        });
        broadcastToUser(userId, 'chat:message:new', {
          conversationId,
          message: {
            id: interrupted.id,
            conversationId,
            senderId: aiId,
            body: interrupted.body,
            kind: 'system',
            createdAt: interrupted.createdAt,
            deleted: false,
          },
        });
      } catch (nestedErr) {
        console.error('[mave-ai] failed to save interrupted message:', nestedErr?.message || nestedErr);
      }
      return;
    }

    console.error('[mave-ai] Error generating response:', err?.message || err);

    const errorText = err.message?.includes('Rate limit')
      ? err.message
      : 'Mave AI is temporarily unavailable. Please try again or add your own API key in Settings.';

    try {
      const errorMsg = await prisma.message.create({
        data: {
          conversationId,
          senderId: aiId,
          body: errorText,
          kind: 'system',
        },
      });
      broadcastToUser(userId, 'chat:message:new', {
        conversationId,
        message: {
          id: errorMsg.id,
          conversationId,
          senderId: aiId,
          body: errorMsg.body,
          kind: 'system',
          createdAt: errorMsg.createdAt,
          deleted: false,
        },
      });
    } catch (nestedErr) {
      console.error('[mave-ai] Failed to save error message:', nestedErr?.message || nestedErr);
    }
    return;
  }

  if (signal?.aborted) return;

  try {
    const aiMsg = await prisma.message.create({
      data: {
        conversationId,
        senderId: aiId,
        body: result.text,
        kind: 'user',
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageText: result.text.slice(0, 120),
        lastMessageById: aiId,
      },
    });

    broadcastToUser(userId, 'chat:message:new', {
      conversationId,
      message: {
        id: aiMsg.id,
        conversationId,
        senderId: aiId,
        sender: personaSender(aiId),
        body: aiMsg.body,
        kind: 'user',
        createdAt: aiMsg.createdAt,
        editedAt: null,
        deletedAt: null,
        deleted: false,
        deliveredAt: null,
        readAt: null,
      },
    });
  } catch (err) {
    console.error('[mave-ai] Failed to persist AI message:', err?.message || err);
  }
}