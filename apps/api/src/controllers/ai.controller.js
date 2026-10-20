// apps/api/src/controllers/ai.controller.js
//
// BYOK credential management for Mave AI.
//
// One credential per (userId, provider). The router walks them in LRU order
// at chat time; the UI shows one card per saved provider.
//
// Test Key design:
//   Tests validate the API key via the provider's /models endpoint. We
//   NEVER call /chat/completions with a specific model from this endpoint,
//   because providers deprecate, promote to paid, or rename models without
//   warning — a model pin would make the test falsely fail on a perfectly
//   good key. If /models returns 200, the key is valid.
//
// Save Key design:
//   Discovery runs at save time.
//     - 401 / 403 → REJECT save (bad key)
//     - other failures → save with fallbackModels[provider] so the key is
//       at least available if the discovery endpoint recovers later
//     - success → save the discovered list

import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { encryptKey } from '../lib/ai/crypto.js';
import { discoverModels } from '../lib/ai/discoverModels.js';
import { AI_PROVIDERS, getProviderMeta, fallbackModels } from '@mavrix/shared';

const credentialSchema = z.object({
  provider: z.enum(['openrouter', 'openai', 'anthropic', 'gemini', 'groq', 'deepseek']),
  apiKey: z.string().trim().min(10).max(500),
  // Retained for backward-compat callers; ignored by testKey since 20261023.
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
    // This doubles as the key validity check. Auth failures (401/403) are
    // REJECTED — the user must fix their key. Transient failures (network,
    // 5xx, rate limit) fall back to the curated list so the key isn't
    // blocked by a temporary outage of the discovery endpoint.
    const discovery = await discoverModels(payload.provider, payload.apiKey);

    if (!discovery.ok && (discovery.status === 401 || discovery.status === 403)) {
      throw new HttpError(
        400,
        discovery.status === 401
          ? '401 Unauthorized: The API key was rejected by the provider. Check that you copied it correctly.'
          : '403 Forbidden: This key is not permitted to list models on the provider.'
      );
    }

    const usingFallback = !discovery.ok;
    const models =
      discovery.ok && discovery.models.length > 0
        ? discovery.models
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
      discovered: !usingFallback,
      discoveryError: usingFallback ? (discovery.error || 'Discovery failed') : null,
    });
  } catch (err) {
    if (err.name === 'ZodError') return next(err);
    if (err instanceof HttpError) return next(err);
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
/*  Test key — verifies the key via /models, NEVER via chat           */
/* ------------------------------------------------------------------ */

export async function testKey(req, res, next) {
  try {
    const payload = credentialSchema.parse(req.body);
    const meta = getProviderMeta(payload.provider);
    if (!meta) throw new HttpError(400, `Unknown provider: ${payload.provider}`);

    const result = await discoverModels(payload.provider, payload.apiKey);

    if (result.ok) {
      const count = result.models?.length ?? 0;
      return res.json({
        ok: true,
        message: `Key is valid · ${count} model${count === 1 ? '' : 's'} available.`,
        modelCount: count,
        sampleModels: (result.models || []).slice(0, 5),
      });
    }

    // Map the provider's status code to a friendly message. The raw
    // error text from the provider is preserved when nothing better exists.
    let msg = result.error || 'Invalid key or provider error.';
    if (result.status === 401) {
      msg = '401 Unauthorized: The API key was rejected by the provider. Check that you copied it correctly.';
    } else if (result.status === 403) {
      msg = '403 Forbidden: This key is not permitted to list models on the provider.';
    } else if (result.status === 429) {
      msg = "429 Too Many Requests: The key is valid but has hit the provider's rate limit.";
    } else if (result.status === 0) {
      msg = result.error === 'Request timed out'
        ? 'Request timed out. Check your network connection.'
        : `Network error: ${msg}`;
    }

    throw new HttpError(400, msg);
  } catch (err) {
    next(err);
  }
}