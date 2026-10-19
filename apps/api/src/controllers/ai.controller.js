// apps/api/src/controllers/ai.controller.js
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

export async function listProviders(_req, res) {
  res.json({ providers: AI_PROVIDERS });
}

export async function getSettings(req, res, next) {
  try {
    const cred = await prisma.aiCredential.findUnique({
      where: { userId: req.userId },
      select: { provider: true, model: true, updatedAt: true },
    });
    if (!cred) return res.json({ credential: null });
    res.json({ credential: { ...cred, hasKey: true } });
  } catch (err) { next(err); }
}

export async function saveSettings(req, res, next) {
  try {
    const payload = credentialSchema.parse(req.body);
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
      select: { provider: true, model: true, updatedAt: true },
    });

    res.json({ credential: { ...cred, hasKey: true } });
  } catch (err) {
    if (err.name === 'ZodError') return next(err);
    next(new HttpError(500, `Failed to save AI credential: ${err.message}`));
  }
}

export async function deleteSettings(req, res, next) {
  try {
    await prisma.aiCredential.deleteMany({ where: { userId: req.userId } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function testKey(req, res, next) {
  try {
    const payload = credentialSchema.parse(req.body);
    const meta = getProviderMeta(payload.provider);
    if (!meta) throw new HttpError(400, `Unknown provider: ${payload.provider}`);

    const adapter = getProviderAdapter(payload.provider);
    
    const testMessages = [
      { role: 'system', content: 'You are a test bot. Respond with exactly "OK".' },
      { role: 'user', content: 'Test' }
    ];

    try {
      await adapter.chat(testMessages, {
        apiKey: payload.apiKey,
        model: payload.model || meta.defaultModel,
        maxTokens: 50, // <--- Increased from 5 to 50 for reasoning models
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
  } catch (err) { next(err); }
}