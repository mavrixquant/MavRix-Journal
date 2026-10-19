// apps/api/src/lib/ai/router.js
//
// The decision engine. Decides which provider to use, decrypts BYOK keys
// if present, and falls back through the admin provider chain on failure.

import { prisma } from '../prisma.js';
import { env } from '../../config/env.js';
import { decryptKey } from './crypto.js';
import { getProviderAdapter } from './registry.js';
import { ProviderError } from './providers/base.js';
import { AI_PROVIDERS, getProviderMeta } from '@mavrix/shared';
import { checkRateLimit } from './limiter.js';

/**
 * Resolves the ordered list of providers to try.
 */
async function getProviderChain(userId) {
  const chain = [];

  // 1. Check for user BYOK
  const cred = await prisma.aiCredential.findUnique({
    where: { userId },
  });

  if (cred) {
    try {
      const decryptedKey = decryptKey(cred);
      chain.push({
        id: cred.provider,
        apiKey: decryptedKey,
        model: cred.model || getProviderMeta(cred.provider)?.defaultModel,
        isByok: true,
      });
    } catch (err) {
      console.warn(`[mave-ai] Failed to decrypt BYOK for user ${userId}:`, err.message);
      // Continue to admin providers if BYOK decryption fails
    }
  }

  // 2. Add admin providers (fallback)
  for (const providerId of env.ai.providerPriority) {
    const apiKey = env.ai.keys[providerId];
    if (apiKey) {
      chain.push({
        id: providerId,
        apiKey,
        model: getProviderMeta(providerId)?.defaultModel,
        isByok: false,
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
 * @returns {Promise<{ text: string, provider: string, model: string, switchedFrom?: string }>}
 */
export async function executeChat(userId, messages) {
  const chain = await getProviderChain(userId);
  
  if (chain.length === 0) {
    throw new Error('No AI providers configured. Please add your own API key in Settings -> Mave AI.');
  }

  let previousProviderName = null;

  for (const attempt of chain) {
    // Rate limit ONLY admin providers. BYOK is the user's own quota.
    if (!attempt.isByok) {
      const limitCheck = checkRateLimit(userId);
      if (!limitCheck.allowed) {
        const mins = Math.ceil(limitCheck.retryAfterMs / 60000);
        throw new Error(`Rate limit reached. Try again in ${mins} minutes, or add your own API key in Settings -> Mave AI for unlimited access.`);
      }
    }

    const adapter = getProviderAdapter(attempt.id);

    try {
      const result = await adapter.chat(messages, {
        apiKey: attempt.apiKey,
        model: attempt.model,
        maxTokens: env.ai.maxTokens,
        timeoutMs: env.ai.requestTimeoutMs,
      });

      return {
        text: result.text,
        provider: attempt.id,
        model: result.model,
        // If this isn't the first provider we tried, tell the caller
        switchedFrom: previousProviderName 
      };

    } catch (err) {
      console.warn(`[mave-ai] Provider ${attempt.id} failed:`, err.message);

      const meta = getProviderMeta(attempt.id);
      previousProviderName = meta ? meta.label : attempt.id;

      // If it's a rate limit (429), or a generic 5xx server error,
      // we try the next provider.
      // If it's a 401 (invalid key), we also try the next provider
      // (e.g., user BYOK is dead, fall back to admin).
      if (
        err.isRateLimit ||
        err.status === 401 ||
        err.status === 429 ||
        (err.status >= 500 && err.status <= 599) ||
        err.status === 504 // timeout
      ) {
        continue; // try next
      }

      // Hard failure (e.g., bad request, content policy)
      throw err;
    }
  }

  throw new Error('All AI providers are currently unavailable. Please try again later.');
}