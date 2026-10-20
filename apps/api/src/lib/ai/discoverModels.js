// apps/api/src/lib/ai/discoverModels.js
//
// Discovers the list of chat models available to a user's API key.
//
// This is also the AUTHORITATIVE auth check for the Test Key button. If
// /models returns 200, the key is valid — period. We never test a key by
// calling /chat/completions with a specific model, because providers
// deprecate, promote to paid, or rename models constantly, which would make
// the "test" fail for reasons unrelated to the key.
//
// Return shape (unchanged by provider):
//
//   { ok: true,  status: 200, models: string[] }
//   { ok: false, status: <number|0>, error: string }
//
//   status 0      — network error or timeout
//   status 401    — invalid key
//   status 403    — key lacks permission to list models
//   status 429    — rate-limited (key still valid)
//   status 5xx    — provider temporarily down

import { filterChatModels } from '@mavrix/shared';

const TIMEOUT_MS = 10_000;

async function fetchJson(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let body = null;
    if (text) {
      try { body = JSON.parse(text); } catch { body = null; }
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, status: 0, body: null, error: 'Request timed out' };
    }
    return { ok: false, status: 0, body: null, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/*  Per-provider discoverers                                          */
/* ------------------------------------------------------------------ */

async function discoverOpenRouter(apiKey) {
  const r = await fetchJson('https://openrouter.ai/api/v1/models?limit=500', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      error: r.error || r.body?.error?.message || `HTTP ${r.status}`,
    };
  }
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

  const ids = filterChatModels('openrouter', [...free, ...paid]);
  if (ids.length === 0) {
    return { ok: false, status: 200, error: 'Provider returned no chat models for this key' };
  }
  return { ok: true, status: 200, models: ids };
}

async function discoverGroq(apiKey) {
  const r = await fetchJson('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      error: r.error || r.body?.error?.message || `HTTP ${r.status}`,
    };
  }
  const data = Array.isArray(r.body?.data) ? r.body.data : [];
  const ids = filterChatModels('groq', data.map((m) => m?.id).filter(Boolean));
  if (ids.length === 0) {
    return { ok: false, status: 200, error: 'Provider returned no chat models for this key' };
  }
  return { ok: true, status: 200, models: ids };
}

async function discoverGemini(apiKey) {
  const r = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      error: r.error || r.body?.error?.message || `HTTP ${r.status}`,
    };
  }
  const data = Array.isArray(r.body?.models) ? r.body.models : [];
  const ids = filterChatModels(
    'gemini',
    data
      .filter(
        (m) =>
          Array.isArray(m?.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
      )
      .map((m) => String(m.name || '').replace(/^models\//, ''))
      .filter(Boolean)
  );
  if (ids.length === 0) {
    return { ok: false, status: 200, error: 'Provider returned no chat models for this key' };
  }
  return { ok: true, status: 200, models: ids };
}

async function discoverDeepSeek(apiKey) {
  const r = await fetchJson('https://api.deepseek.com/models', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      error: r.error || r.body?.error?.message || `HTTP ${r.status}`,
    };
  }
  const data = Array.isArray(r.body?.data) ? r.body.data : [];
  const ids = filterChatModels('deepseek', data.map((m) => m?.id).filter(Boolean));
  if (ids.length === 0) {
    return { ok: false, status: 200, error: 'Provider returned no chat models for this key' };
  }
  return { ok: true, status: 200, models: ids };
}

async function discoverOpenAI(apiKey) {
  const r = await fetchJson('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      error: r.error || r.body?.error?.message || `HTTP ${r.status}`,
    };
  }
  const data = Array.isArray(r.body?.data) ? r.body.data : [];
  const ids = filterChatModels('openai', data.map((m) => m?.id).filter(Boolean));
  if (ids.length === 0) {
    return { ok: false, status: 200, error: 'Provider returned no chat models for this key' };
  }
  return { ok: true, status: 200, models: ids };
}

async function discoverAnthropic(apiKey) {
  const r = await fetchJson('https://api.anthropic.com/v1/models?limit=1000', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      Accept: 'application/json',
    },
  });
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      error: r.error || r.body?.error?.message || `HTTP ${r.status}`,
    };
  }
  const data = Array.isArray(r.body?.data) ? r.body.data : [];
  const ids = filterChatModels('anthropic', data.map((m) => m?.id).filter(Boolean));
  if (ids.length === 0) {
    return { ok: false, status: 200, error: 'Provider returned no chat models for this key' };
  }
  return { ok: true, status: 200, models: ids };
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                */
/* ------------------------------------------------------------------ */

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
 * Also serves as the auth check for the Test Key button — if this returns
 * `{ ok: true }`, the key is valid.
 *
 * @returns {Promise<
 *   { ok: true,  status: 200, models: string[] } |
 *   { ok: false, status: number, error: string }
 * >}
 */
export async function discoverModels(provider, apiKey) {
  const fn = DISCOVERERS[provider];
  if (!fn || !apiKey) {
    return { ok: false, status: 0, error: 'Invalid provider or empty API key' };
  }
  try {
    return await fn(apiKey);
  } catch (err) {
    return { ok: false, status: 0, error: err.message || 'Unknown error' };
  }
}