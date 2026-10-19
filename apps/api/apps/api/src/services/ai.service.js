// apps/api/src/services/ai.service.js
//
// Orchestrates the AI response lifecycle.
// Called by chat.service.js (Phase 4) when a user sends a message to Mave AI.

import { prisma } from '../lib/prisma.js';
import { broadcastToUser } from '../lib/broadcaster.js';
import { buildContext } from '../lib/ai/context.js';
import { executeChat } from '../lib/ai/router.js';
import { getProviderMeta } from '@mavrix/shared';

/**
 * Generates and saves an AI reply, then broadcasts it via SSE.
 *
 * @param {string} conversationId 
 * @param {string} userId — the human user's ID
 * @param {string} maveAiId — the Mave AI user's ID
 */
export async function triggerAiResponse(conversationId, userId, maveAiId) {
  // Fire-and-forget wrapper: we don't want the HTTP request that saved the
  // user's message to block on the LLM call.
  (async () => {
    try {
      const messages = await buildContext(conversationId, maveAiId);
      
      // If the last message is from the AI, don't trigger another AI reply
      // (prevents infinite loops).
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== 'user') return;

      const result = await executeChat(userId, messages);

      // 1. If we had to switch providers, save a system notice first.
      if (result.switchedFrom) {
        const newProviderLabel = getProviderMeta(result.provider)?.label || result.provider;
        const switchMsg = await prisma.message.create({
          data: {
            conversationId,
            senderId: maveAiId, // Sent by the AI user
            body: `Switched to ${newProviderLabel} (previous provider limited).`,
            kind: 'ai_switch',
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: new Date(),
            lastMessageText: switchMsg.body.slice(0, 120),
            lastMessageById: maveAiId,
          },
        });

        broadcastToUser(userId, 'chat:message:new', {
          conversationId,
          message: {
            id: switchMsg.id,
            conversationId,
            senderId: maveAiId,
            body: switchMsg.body,
            kind: 'ai_switch',
            createdAt: switchMsg.createdAt,
            deleted: false,
          },
        });
      }

      // 2. Save the actual AI reply.
      const aiMsg = await prisma.message.create({
        data: {
          conversationId,
          senderId: maveAiId,
          body: result.text,
          kind: 'user', // Renders as a normal message bubble
        },
      });

      // 3. Update conversation metadata.
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessageText: result.text.slice(0, 120),
          lastMessageById: maveAiId,
        },
      });

      // 4. Broadcast to the user.
      // We construct the payload manually to match chat.service.js serialization.
      const payload = {
        conversationId,
        message: {
          id: aiMsg.id,
          conversationId,
          senderId: maveAiId,
          sender: {
            id: maveAiId,
            firstName: 'Mave',
            lastName: 'AI',
            isAi: true,
          },
          body: aiMsg.body,
          kind: 'user',
          createdAt: aiMsg.createdAt,
          editedAt: null,
          deletedAt: null,
          deleted: false,
          deliveredAt: null,
          readAt: null,
        },
      };

      broadcastToUser(userId, 'chat:message:new', payload);

    } catch (err) {
      console.error('[mave-ai] Error generating response:', err.message);

      // Catch errors (like rate limits or all providers failing) and
      // tell the user inside the chat.
      const errorText = err.message.includes('Rate limit') 
        ? err.message 
        : 'Mave AI is temporarily unavailable. Please try again or add your own API key in Settings.';

      const errorMsg = await prisma.message.create({
        data: {
          conversationId,
          senderId: maveAiId,
          body: errorText,
          kind: 'system',
        },
      });

      broadcastToUser(userId, 'chat:message:new', {
        conversationId,
        message: {
          id: errorMsg.id,
          conversationId,
          senderId: maveAiId,
          body: errorMsg.body,
          kind: 'system',
          createdAt: errorMsg.createdAt,
          deleted: false,
        },
      });
    }
  })();
}