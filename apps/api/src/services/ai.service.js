// ============================================================================
// AI response orchestration.
//
// `triggerAiResponse(conversationId, userId, aiId)` — aiId is the specific
// persona's user ID (Guide / Trainer / Chat). The persona determines the
// system prompt (see context.js) and the sender identity used in broadcasts.
// ============================================================================

import { prisma } from '../lib/prisma.js';
import { broadcastToUser } from '../lib/broadcaster.js';
import { buildContext } from '../lib/ai/context.js';
import { executeChat } from '../lib/ai/router.js';
import { getProviderMeta } from '@mavrix/shared';
import { getMaveAiUser } from './maveAiBootstrap.js';

const inFlight = new Set();
const pending = new Map();

export async function triggerAiResponse(conversationId, userId, aiId) {
  if (inFlight.has(conversationId)) {
    pending.set(conversationId, { userId, aiId });
    return;
  }

  inFlight.add(conversationId);
  pending.delete(conversationId);

  (async () => {
    try {
      await generateAndBroadcast(conversationId, userId, aiId);
    } catch (err) {
      console.error('[mave-ai] Unhandled trigger error:', err?.message || err);
    } finally {
      inFlight.delete(conversationId);

      const next = pending.get(conversationId);
      if (next) {
        pending.delete(conversationId);
        triggerAiResponse(conversationId, next.userId, next.aiId);
      }
    }
  })();
}

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

async function generateAndBroadcast(conversationId, userId, aiId) {
  try {
    const messages = await buildContext(conversationId, aiId);

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') return;

    const result = await executeChat(userId, messages);

    if (result.switchedFrom) {
      const newProviderLabel =
        getProviderMeta(result.provider)?.label || result.provider;
      const modelLabel = result.model || 'unknown model';

      const switchMsg = await prisma.message.create({
        data: {
          conversationId,
          senderId: aiId,
          body: `Switched to ${newProviderLabel} · ${modelLabel} (previous provider limited).`,
          kind: 'ai_switch',
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessageText: switchMsg.body.slice(0, 120),
          lastMessageById: aiId,
        },
      });

      broadcastToUser(userId, 'chat:message:new', {
        conversationId,
        message: {
          id: switchMsg.id,
          conversationId,
          senderId: aiId,
          body: switchMsg.body,
          kind: 'ai_switch',
          createdAt: switchMsg.createdAt,
          deleted: false,
        },
      });
    }

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
    console.error('[mave-ai] Error generating response:', err?.message || err);

    const errorText = err.message.includes('Rate limit')
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
      console.error(
        '[mave-ai] Failed to save error message:',
        nestedErr?.message || nestedErr
      );
    }
  }
}