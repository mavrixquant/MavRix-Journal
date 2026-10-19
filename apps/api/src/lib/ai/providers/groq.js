// apps/api/src/lib/ai/providers/groq.js
//
// Groq adapter (OpenAI-compatible endpoint).
// Docs: https://console.groq.com/docs/api-reference#chat-create

import { safeFetch, ProviderError } from './base.js';

export async function chat(messages, { apiKey, model, maxTokens, timeoutMs }) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const res = await safeFetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    },
    timeoutMs,
    'Groq'
  );

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new ProviderError('Groq returned no text content', { status: 502 });
  }

  return { text, provider: 'groq', model: data.model || model };
}