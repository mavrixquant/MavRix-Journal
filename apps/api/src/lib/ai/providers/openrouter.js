
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