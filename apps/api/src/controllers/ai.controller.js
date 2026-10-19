// apps/api/src/controllers/ai.controller.js
//
// BYOK Settings endpoints.
// All routes require authentication (mounted in ai.routes.js).
//
// Security notes:
//   - The plaintext API key is NEVER returned to the client.
//   - On GET, we return `{ provider, model, hasKey: true, updatedAt }`.
//   - Keys are encrypted via lib/ai/crypto.js before hitting the DB.

import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { encryptKey } from '../lib/ai/crypto.js';
import { getProviderAdapter } from '../lib/ai/registry.js';
import { AI_PROVIDERS, getProviderMeta } from '@mavrix/shared';

const credentialSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini', 'groq', 'deepseek']),
  apiKey: z.string().trim().min(10).max(500),
  model: z.string().trim().max(100).optional().nullable(),
});

/* ------------------------------------------------------------------ */
/*  GET /api/ai/providers                                              */
/* ------------------------------------------------------------------ */
// Returns the static list of supported providers.

export async function listProviders(_req, res) {
  res.json({ providers: AI_PROVIDERS });
}

/* ------------------------------------------------------------------ */
/*  GET /api/ai/settings                                               */
/* ------------------------------------------------------------------ */
// Returns the user's current BYOK setup. Never returns the key.

export async function getSettings(req, res, next) {
  try {
    const cred = await prisma.aiCredential.findUnique({
      where: { userId: req.userId },
      select: {
        provider: true,
        model: true,
        updatedAt: true,
      },
    });

    if (!cred) {
      return res.json({ credential: null });
    }

    res.json({
      credential: {
        provider: cred.provider,
        model: cred.model,
        hasKey: true,
        updatedAt: cred.updatedAt,
      },
    });
  } catch (err) { next(err); }
}

/* ------------------------------------------------------------------ */
/*  POST /api/ai/settings                                              */
/* ------------------------------------------------------------------ */
// Encrypts and saves (upserts) the user's API key.

export async function saveSettings(req, res, next) {
  try {
    const payload = credentialSchema.parse(req.body);

    // Encrypt the plaintext key
    const { encryptedKey, keyIv, keyTag } = encryptKey(payload.apiKey);

    const cred = await prisma.aiCredential.upsert({
      where: { userId: req.userId },
      create: {
        userId: req.userId,
        provider: payload.provider,
        encryptedKey,
        keyIv,
        keyTag,
        model: payload.model || null,
      },
      update: {
        provider: payload.provider,
        encryptedKey,
        keyIv,
        keyTag,
        model: payload.model || null,
      },
      select: {
        provider: true,
        model: true,
        updatedAt: true,
      },
    });

    res.json({
      credential: {
        provider: cred.provider,
        model: cred.model,
        hasKey: true,
        updatedAt: cred.updatedAt,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') return next(err);
    next(new HttpError(500, `Failed to save AI credential: ${err.message}`));
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/ai/settings                                            */
/* ------------------------------------------------------------------ */
// Deletes the user's BYOK credential. Falls back to admin providers.

export async function deleteSettings(req, res, next) {
  try {
    await prisma.aiCredential.deleteMany({
      where: { userId: req.userId },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

/* ------------------------------------------------------------------ */
/*  POST /api/ai/test                                                  */
/* ------------------------------------------------------------------ */
// Tests an API key before the user saves it.
// Creates a minimal chat request to verify the key works.

export async function testKey(req, res, next) {
  try {
    const payload = credentialSchema.parse(req.body);
    const meta = getProviderMeta(payload.provider);
    
    if (!meta) {
      throw new HttpError(400, `Unknown provider: ${payload.provider}`);
    }

    const adapter = getProviderAdapter(payload.provider);
    
    const testMessages = [
      { role: 'system', content: 'You are a test bot. Respond with exactly "OK".' },
      { role: 'user', content: 'Test' }
    ];

    try {
      await adapter.chat(testMessages, {
        apiKey: payload.apiKey,
        model: payload.model || meta.defaultModel,
        maxTokens: 5,
        timeoutMs: 10_000, // short timeout for testing
      });
      
      res.json({ ok: true, message: 'Key is valid and working.' });
    } catch (err) {
      let msg = 'Invalid key or provider error.';
      
      if (err.status === 401) {
        msg = 'This API key was rejected by the provider (401 Unauthorized).';
      } else if (err.status === 429) {
        msg = 'This key is valid but has hit its rate limit (429 Too Many Requests).';
      } else if (err.status === 400) {
        msg = `The provider rejected the request: ${err.message}`;
      } else if (err.status === 504) {
        msg = 'The request to the provider timed out.';
      }

      throw new HttpError(400, msg);
    }
  } catch (err) { next(err); }
}