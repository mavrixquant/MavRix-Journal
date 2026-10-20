
import { prisma } from '../prisma.js';
import { env } from '../../config/env.js';
import { decryptKey } from './crypto.js';
import { getProviderAdapter } from './registry.js';
import { getProviderMeta } from '@mavrix/shared';
import { checkRateLimit } from './limiter.js';

async function getProviderChain(userId) {
  const chain = [];

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

export async function executeChat(userId, messages) {
  const chain = await getProviderChain(userId);

  if (chain.length === 0) {
    throw new Error(
      'No AI providers configured. Please add your own API key in Settings -> Mave AI.'
    );
  }

  let rateLimitReserved = false;

  let previousLabel = null;

  for (const attempt of chain) {
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

      if (
        err.isRateLimit ||
        err.status === 401 ||
        err.status === 404 ||
        err.status === 429 ||
        (err.status >= 500 && err.status <= 599) ||
        err.status === 504
      ) {
        continue;
      }

      throw err;
    }
  }

  throw new Error('All AI providers are currently unavailable. Please try again later.');
}