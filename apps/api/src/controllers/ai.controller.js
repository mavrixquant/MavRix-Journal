// apps/api/src/controllers/ai.controller.js
//
// BYOK credential management for Mave AI.
//
// One credential per (userId, provider). The router walks them in LRU order
// at chat time; the UI shows one card per saved provider.
//
// Endpoints:
//   GET    /providers                       — list of AI_PROVIDERS
//   GET    /settings                        — array of my credentials
//   POST   /settings                        — upsert (userId, provider)
//   PATCH  /settings/:provider/models       — reorder / toggle models[]
//   DELETE /settings/:provider              — remove one credential
//   POST   /test                            — validate a key + model without saving

import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { encryptKey } from '../lib/ai/crypto.js';
import { getProviderAdapter } from '../lib/ai/registry.js';
import { discoverModels } from '../lib/ai/discoverModels.js';
import { AI_PROVIDERS, getProviderMeta, fallbackModels } from '@mavrix/shared';

const credentialSchema = z.object({
  provider: z.enum(['openrouter', 'openai', 'anthropic', 'gemini', 'groq', 'deepseek']),
  apiKey: z.string().trim().min(10).max(500),
  model: z.string().trim().max(100).optional().nullable(),
});

const modelsPatchSchema = z.object({
  models: z.array(z.string().trim().min(1).max(200)).min(1).max(200),
});

const serialize = (cred) => ({
  provider: cred.provider,
  model: cred.model,
  models: Array.isArray(cred.models) ? cred.models : [],
  updatedAt: cred.updatedAt,
  lastUsedAt: cred.lastUsedAt,
  hasKey: true,
});

/* ------------------------------------------------------------------ */
/*  Providers                                                          */
/* ------------------------------------------------------------------ */

export async function listProviders(_req, res) {
  res.json({ providers: AI_PROVIDERS });
}

/* ------------------------------------------------------------------ */
/*  Settings — read                                                    */
/* ------------------------------------------------------------------ */

export async function getSettings(req, res, next) {
  try {
    const creds = await prisma.aiCredential.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ credentials: creds.map(serialize) });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/*  Settings — upsert                                                  */
/* ------------------------------------------------------------------ */

export async function saveSettings(req, res, next) {
  try {
    const payload = credentialSchema.parse(req.body);

    const { encryptedKey, keyIv, keyTag } = encryptKey(payload.apiKey);

    // ---- Discover models from the provider ----
    // If the key works but discovery fails, save with the curated fallback
    // so the user doesn't have to retry. The `discovered` flag tells the UI
    // which path was taken.
    const discovered = await discoverModels(payload.provider, payload.apiKey);
    const models =
      discovered && discovered.length > 0
        ? discovered
        : (fallbackModels[payload.provider] || []);

    const cred = await prisma.aiCredential.upsert({
      where: {
        userId_provider: { userId: req.userId, provider: payload.provider },
      },
      create: {
        userId: req.userId,
        provider: payload.provider,
        encryptedKey,
        keyIv,
        keyTag,
        model: payload.model || null,
        models,
      },
      update: {
        encryptedKey,
        keyIv,
        keyTag,
        model: payload.model || null,
        models,
      },
    });

    res.json({
      credential: serialize(cred),
      discovered: Array.isArray(discovered) && discovered.length > 0,
    });
  } catch (err) {
    if (err.name === 'ZodError') return next(err);
    next(new HttpError(500, `Failed to save AI credential: ${err.message}`));
  }
}

/* ------------------------------------------------------------------ */
/*  Settings — patch model list (reorder / toggle)                     */
/* ------------------------------------------------------------------ */

export async function updateModels(req, res, next) {
  try {
    const provider = String(req.params.provider || '').trim();
    if (!provider) throw new HttpError(400, 'provider param required');

    const { models } = modelsPatchSchema.parse(req.body);

    const existing = await prisma.aiCredential.findUnique({
      where: { userId_provider: { userId: req.userId, provider } },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, 'No credential for that provider');

    const cred = await prisma.aiCredential.update({
      where: { id: existing.id },
      data: { models },
    });

    res.json({ credential: serialize(cred) });
  } catch (err) {
    if (err.name === 'ZodError') return next(err);
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/*  Settings — delete one provider                                     */
/* ------------------------------------------------------------------ */

export async function deleteSettings(req, res, next) {
  try {
    const provider = String(req.params.provider || '').trim();
    if (!provider) throw new HttpError(400, 'provider param required');

    await prisma.aiCredential.deleteMany({
      where: { userId: req.userId, provider },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ */
/*  Test key                                                           */
/* ------------------------------------------------------------------ */

export async function testKey(req, res, next) {
  try {
    const payload = credentialSchema.parse(req.body);
    const meta = getProviderMeta(payload.provider);
    if (!meta) throw new HttpError(400, `Unknown provider: ${payload.provider}`);

    const adapter = getProviderAdapter(payload.provider);

    const testMessages = [
      { role: 'system', content: 'You are a test bot. Respond with exactly "OK".' },
      { role: 'user', content: 'Test' },
    ];

    try {
      await adapter.chat(testMessages, {
        apiKey: payload.apiKey,
        model: payload.model || meta.defaultModel,
        maxTokens: 50, // Increased from 5 for reasoning models
        timeoutMs: 10_000,
      });
      res.json({ ok: true, message: 'Key is valid and working.' });
    } catch (err) {
      let msg = err.message || 'Invalid key or provider error.';

      if (err.status === 401) {
        msg = '401 Unauthorized: The API key was rejected by the provider. Check that you copied it correctly.';
      } else if (err.status === 429) {
        msg = '429 Too Many Requests: This key is valid but has hit its rate limit or has insufficient credits.';
      } else if (msg.toLowerCase().includes('credit balance')) {
        msg = 'Credit balance is too low. You must add funds to your provider dashboard.';
      } else if (msg.toLowerCase().includes('quota')) {
        msg = 'Quota exceeded. You need to add billing details to this API key.';
      }

      throw new HttpError(400, msg);
    }
  } catch (err) {
    next(err);
  }
}