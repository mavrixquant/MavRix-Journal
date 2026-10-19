// apps/api/src/lib/ai/providers/openrouter.js
//
// OpenRouter adapter (OpenAI-compatible endpoint).
// Docs: https://openrouter.ai/docs/quickstart
//
// OpenRouter proxies many upstream models behind a single OpenAI-shaped
// API. The model is chosen by the caller (router.js walks the credential's
// `models[]` list). We do not attempt model fallback here — that is the
// router's job. If this request fails, the router tries the next model.

import { safeFetch, ProviderError } from './base.js';

export async function chat(messages, { apiKey, model, maxTokens, timeoutMs }) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const res = await safeFetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // Optional but recommended by OpenRouter — shows up on their
        // rankings page and helps them attribute traffic.
        'HTTP-Referer': 'https://mavrix-journal.app',
        'X-Title': 'MavRix Journal',
      },
      body: JSON.stringify({
        model: model || 'meta-llama/llama-3.3-70b-instruct:free',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    },
    timeoutMs,
    'OpenRouter'
  );

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new ProviderError('OpenRouter returned no text content', { status: 502 });
  }

  return { text, provider: 'openrouter', model: data.model || model };
}