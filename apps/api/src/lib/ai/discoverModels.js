// apps/api/src/lib/ai/discoverModels.js
//
// Discovers the list of chat models available to a user's API key.
//
// Called once per credential at save time (POST /api/ai/settings).
// On success  → the returned list is stored on the credential's `models`
//               column and drives round-robin failover inside that provider.
// On failure  → returns null; the caller persists fallbackModels[provider]
//               from @mavrix/shared so the save still succeeds.

import { filterChatModels } from '@mavrix/shared';

const TIMEOUT_MS = 10_000;

async function fetchJson(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, body: await res.json() };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Per-provider normalizers
// ---------------------------------------------------------------------------

async function discoverOpenRouter(apiKey) {
  const r = await fetchJson('https://openrouter.ai/api/v1/models?limit=500', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!r.ok) return null;
  const data = Array.isArray(r.body?.data) ? r.body.data : [];

  // Free models first, then paid — the router's linear scan then prefers
  // the free tier automatically.
  const free = [];
  const paid = [];
  for (const m of data) {
    if (!m || typeof m.id !== 'string') continue;
    const p = m.pricing || {};
    const isFree = String(p.prompt) === '0' && String(p.completion) === '0';
    (isFree ? free : paid).push(m.id);
  }

  const ids = [...free, ...paid];
  return ids.length > 0 ? filterChatModels('openrouter', ids) : null;
}

async function discoverGroq(apiKey) {
  const r = await fetchJson('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!r.ok) return null;
  const data = Array.isArray(r.body?.data) ? r.body.data : [];
  const ids = data.map((m) => m?.id).filter(Boolean);
  return ids.length > 0 ? filterChatModels('groq', ids) : null;
}

async function discoverGemini(apiKey) {
  const r = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!r.ok) return null;
  const data = Array.isArray(r.body?.models) ? r.body.models : [];
  const ids = data
    .filter(
      (m) =>
        Array.isArray(m?.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
    )
    .map((m) => String(m.name || '').replace(/^models\//, ''))
    .filter(Boolean);
  return ids.length > 0 ? filterChatModels('gemini', ids) : null;
}

async function discoverDeepSeek(apiKey) {
  const r = await fetchJson('https://api.deepseek.com/models', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!r.ok) return null;
  const data = Array.isArray(r.body?.data) ? r.body.data : [];
  const ids = data.map((m) => m?.id).filter(Boolean);
  return ids.length > 0 ? filterChatModels('deepseek', ids) : null;
}

async function discoverOpenAI(apiKey) {
  const r = await fetchJson('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!r.ok) return null;
  const data = Array.isArray(r.body?.data) ? r.body.data : [];
  const ids = data.map((m) => m?.id).filter(Boolean);
  const filtered = filterChatModels('openai', ids);
  return filtered.length > 0 ? filtered : null;
}

async function discoverAnthropic(apiKey) {
  const r = await fetchJson('https://api.anthropic.com/v1/models?limit=1000', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      Accept: 'application/json',
    },
  });
  if (!r.ok) return null;
  const data = Array.isArray(r.body?.data) ? r.body.data : [];
  const ids = data.map((m) => m?.id).filter(Boolean);
  return ids.length > 0 ? filterChatModels('anthropic', ids) : null;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

const DISCOVERERS = {
  openrouter: discoverOpenRouter,
  groq:       discoverGroq,
  gemini:     discoverGemini,
  deepseek:   discoverDeepSeek,
  openai:     discoverOpenAI,
  anthropic:  discoverAnthropic,
};

/**
 * Discover available chat models for a (provider, apiKey) pair.
 *
 * @returns {Promise<string[] | null>}
 *   - string[]  — discovered model ids (filtered, ordered)
 *   - null      — discovery failed; caller should fall back to
 *                 fallbackModels[provider] from @mavrix/shared
 */
export async function discoverModels(provider, apiKey) {
  const fn = DISCOVERERS[provider];
  if (!fn || !apiKey) return null;
  try {
    return await fn(apiKey);
  } catch {
    return null;
  }
}