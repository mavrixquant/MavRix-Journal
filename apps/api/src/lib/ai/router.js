// apps/api/src/lib/ai/router.js
//
// The decision engine. Decides which provider/model to use, decrypts BYOK
// keys if present, and falls back through the admin provider chain on
// failure.
//
// Chain construction (in order of preference):
//
//   1. Every BYOK credential the user owns, ordered by `lastUsedAt` ASC
//      with NULLs FIRST. Every model in each credential's `models[]` is
//      expanded into its own attempt, so a single key with 5 models
//      contributes 5 attempts.
//
//   2. Admin env providers in `env.ai.providerPriority` order. One model
//      each (the provider's defaultModel) — admin chain stays single-model
//      so a single shared key doesn't get rate-limited trying 5 models.
//
// Rate limiting:
//   The admin rate-limit bucket is reserved LAZILY — only when we are
//   actually about to try an admin provider. This means a user whose
//   BYOK key succeeds never touches the admin budget, no matter how
//   many admin providers are configured. When we do reach admin, the
//   slot is reserved ONCE per request (not once per attempt), so an
//   N-attempt chain doesn't drain N slots from a 20/hr budget.
//
// lastUsedAt write-back:
//   On success, we UPDATE the winning credential's lastUsedAt
//   (fire-and-forget). That bumps it to the back of the LRU queue for
//   the next message, giving round-robin behaviour across credentials.

import { prisma } from '../prisma.js';
import { env } from '../../config/env.js';
import { decryptKey } from './crypto.js';
import { getProviderAdapter } from './registry.js';
import { getProviderMeta } from '@mavrix/shared';
import { checkRateLimit } from './limiter.js';

/**
 * Resolves the ordered list of provider attempts to try.
 */
async function getProviderChain(userId) {
  const chain = [];

  // ---------------------------------------------------------------------
  // 1. BYOK credentials (LRU order, nulls first)
  // ---------------------------------------------------------------------
  const creds = await prisma.aiCredential.findMany({
    where: { userId },
    orderBy: [
      { lastUsedAt: { sort: 'asc', nulls: 'first' } },
      { updatedAt: 'asc' },
    ],
  });

  for (const cred of creds) {
    let apiKey;
    try {
      apiKey = decryptKey(cred);
    } catch (err) {
      console.warn(
        `[mave-ai] Failed to decrypt BYOK for ${cred.provider}:`,
        err.message
      );
      continue;
    }

    const meta = getProviderMeta(cred.provider);
    const models =
      Array.isArray(cred.models) && cred.models.length > 0
        ? cred.models
        : cred.model
          ? [cred.model]
          : [meta?.defaultModel].filter(Boolean);

    for (const model of models) {
      chain.push({
        id: cred.provider,
        apiKey,
        model,
        isByok: true,
        credentialId: cred.id,
      });
    }
  }

  // ---------------------------------------------------------------------
  // 2. Admin env providers (fallback), one model each
  // ---------------------------------------------------------------------
  for (const providerId of env.ai.providerPriority) {
    const apiKey = env.ai.keys[providerId];
    if (apiKey) {
      chain.push({
        id: providerId,
        apiKey,
        model: getProviderMeta(providerId)?.defaultModel,
        isByok: false,
        credentialId: null,
      });
    }
  }

  return chain;
}

/**
 * Executes a chat completion.
 *
 * @param {string} userId
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{
 *   text: string,
 *   provider: string,
 *   model: string,
 *   switchedFrom?: string,
 * }>}
 */
export async function executeChat(userId, messages) {
  const chain = await getProviderChain(userId);

  if (chain.length === 0) {
    throw new Error(
      'No AI providers configured. Please add your own API key in Settings -> Mave AI.'
    );
  }

  // Rate limit is checked lazily — only when we're about to try an admin
  // provider. Users whose BYOK key succeeds never touch this bucket.
  let rateLimitReserved = false;

  let previousLabel = null;

  for (const attempt of chain) {
    // --- Lazy rate-limit gate ---
    if (!attempt.isByok && !rateLimitReserved) {
      const limitCheck = checkRateLimit(userId);
      if (!limitCheck.allowed) {
        const mins = Math.ceil(limitCheck.retryAfterMs / 60000);
        throw new Error(
          `Rate limit reached. Try again in ${mins} minutes, or add your own API key in Settings -> Mave AI for unlimited access.`
        );
      }
      rateLimitReserved = true;
    }

    const meta = getProviderMeta(attempt.id);
    const label = meta ? meta.label : attempt.id;

    const adapter = getProviderAdapter(attempt.id);

    try {
      const result = await adapter.chat(messages, {
        apiKey: attempt.apiKey,
        model: attempt.model,
        maxTokens: env.ai.maxTokens,
        timeoutMs: env.ai.requestTimeoutMs,
      });

      // Bump lastUsedAt on success so this credential slides to the back
      // of the LRU queue for the next request.
      if (attempt.isByok && attempt.credentialId) {
        prisma.aiCredential
          .update({
            where: { id: attempt.credentialId },
            data: { lastUsedAt: new Date() },
          })
          .catch((err) => {
            console.warn('[mave-ai] Failed to update lastUsedAt:', err.message);
          });
      }

      return {
        text: result.text,
        provider: attempt.id,
        model: result.model,
        switchedFrom: previousLabel,
      };
    } catch (err) {
      console.warn(
        `[mave-ai] Provider ${attempt.id} (${attempt.model}) failed:`,
        err.message
      );
      previousLabel = `${label} · ${attempt.model}`;

      // Fallback on:
      // - 429 rate limit
      // - 401 invalid key
      // - 404 model not found (deprecated)
      // - 5xx server errors
      // - 504 timeout
      if (
        err.isRateLimit ||
        err.status === 401 ||
        err.status === 404 ||
        err.status === 429 ||
        (err.status >= 500 && err.status <= 599) ||
        err.status === 504
      ) {
        continue; // try next attempt
      }

      // Hard failure (bad request, content policy) — don't retry.
      throw err;
    }
  }

  throw new Error('All AI providers are currently unavailable. Please try again later.');
}