// apps/api/src/services/ai.service.js
//
// Orchestrates the AI response lifecycle.
// Called by chat.service.js when a user sends a message to Mave AI.
//
// Concurrency:
//   Each conversation has at most ONE in-flight AI generation. If a
//   message arrives while a generation is running, it is queued. Once
//   the current generation finishes, the queue is drained by triggering
//   one more generation. This prevents rapid-fire user messages from
//   spawning overlapping replies.

import { prisma } from '../lib/prisma.js';
import { broadcastToUser } from '../lib/broadcaster.js';
import { buildContext } from '../lib/ai/context.js';
import { executeChat } from '../lib/ai/router.js';
import { getProviderMeta } from '@mavrix/shared';

/* ------------------------------------------------------------------ */
/*  Concurrency guard                                                  */
/* ------------------------------------------------------------------ */

/** Set<conversationId> — conversations with an in-flight generation. */
const inFlight = new Set();

/** Map<conversationId, { userId, maveAiId }> — pending re-triggers. */
const pending = new Map();

/**
 * Generates and saves an AI reply, then broadcasts it via SSE.
 * Non-blocking — callers do not await the generation.
 */
export async function triggerAiResponse(conversationId, userId, maveAiId) {
  // Already running for this conversation → queue a re-trigger.
  if (inFlight.has(conversationId)) {
    pending.set(conversationId, { userId, maveAiId });
    return;
  }

  inFlight.add(conversationId);
  pending.delete(conversationId);

  // Detached async runner — caller returns immediately.
  (async () => {
    try {
      await generateAndBroadcast(conversationId, userId, maveAiId);
    } catch (err) {
      // generateAndBroadcast already handles its own errors; this is a
      // last-resort guard for anything truly unexpected.
      console.error('[mave-ai] Unhandled trigger error:', err?.message || err);
    } finally {
      inFlight.delete(conversationId);

      const next = pending.get(conversationId);
      if (next) {
        pending.delete(conversationId);
        // Recurse after releasing the lock.
        triggerAiResponse(conversationId, next.userId, next.maveAiId);
      }
    }
  })();
}

/* ------------------------------------------------------------------ */
/*  Core generation                                                    */
/* ------------------------------------------------------------------ */

async function generateAndBroadcast(conversationId, userId, maveAiId) {
  try {
    const messages = await buildContext(conversationId, maveAiId);

    // Guard against loops: only trigger a reply when the last message in
    // context is from the human user.
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') return;

    const result = await executeChat(userId, messages);

    /* ---------- 1. Emit the "switched provider" notice ---------- */
    if (result.switchedFrom) {
      const newProviderLabel =
        getProviderMeta(result.provider)?.label || result.provider;
      const modelLabel = result.model || 'unknown model';

      const switchMsg = await prisma.message.create({
        data: {
          conversationId,
          senderId: maveAiId,
          body: `Switched to ${newProviderLabel} · ${modelLabel} (previous provider limited).`,
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

    /* ---------- 2. Save and broadcast the actual AI reply ---------- */
    const aiMsg = await prisma.message.create({
      data: {
        conversationId,
        senderId: maveAiId,
        body: result.text,
        // kind: 'user' — renders as a normal chat bubble, not a system notice.
        kind: 'user',
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageText: result.text.slice(0, 120),
        lastMessageById: maveAiId,
      },
    });

    broadcastToUser(userId, 'chat:message:new', {
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
    });
  } catch (err) {
    console.error('[mave-ai] Error generating response:', err?.message || err);

    // Save a system message so the user is never left hanging on a silent
    // failure. This is kind: 'system' so it is EXCLUDED from future
    // buildContext() calls.
    const errorText = err.message.includes('Rate limit')
      ? err.message
      : 'Mave AI is temporarily unavailable. Please try again or add your own API key in Settings.';

    try {
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
    } catch (nestedErr) {
      // The DB write itself failed — nothing more we can do here.
      console.error(
        '[mave-ai] Failed to save error message:',
        nestedErr?.message || nestedErr
      );
    }
  }
}