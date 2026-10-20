// ============================================================================
// Model discovery — free-tier aware.
//
// The goal is to NEVER surface a paid model when the user expects free tier:
//   • OpenRouter — strict filter by pricing (prompt = completion = 0)
//   • Groq       — all models are free-tier (rate-limited)
//   • Gemini     — filter to *-flash* models (free tier family)
//   • DeepSeek / OpenAI / Anthropic — no free tier; return all
// ============================================================================

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

// ---------- OpenRouter (pricing-based free filter) ----------
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

  const free = [];
  for (const m of data) {
    if (!m || typeof m.id !== 'string') continue;
    const p = m.pricing || {};
    const isFree =
      String(p.prompt) === '0' && String(p.completion) === '0';
    if (isFree) free.push(m.id);
  }

  const ids = filterChatModels('openrouter', free);
  if (ids.length === 0) {
    return {
      ok: false,
      status: 200,
      error: 'No free chat models returned for this key.',
    };
  }
  return { ok: true, status: 200, models: ids };
}

// ---------- Groq — all models are free tier ----------
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

// ---------- Gemini — free tier = *-flash* family ----------
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
  ).filter((id) => /flash/i.test(id)); // free-tier family

  if (ids.length === 0) {
    return {
      ok: false,
      status: 200,
      error: 'No free-tier (flash) chat models returned for this key.',
    };
  }
  return { ok: true, status: 200, models: ids };
}

// ---------- DeepSeek — no free tier; return all ----------
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

// ---------- OpenAI — no free tier; return all ----------
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

// ---------- Anthropic — no free tier; return all ----------
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

const DISCOVERERS = {
  openrouter: discoverOpenRouter,
  groq:       discoverGroq,
  gemini:     discoverGemini,
  deepseek:   discoverDeepSeek,
  openai:     discoverOpenAI,
  anthropic:  discoverAnthropic,
};

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