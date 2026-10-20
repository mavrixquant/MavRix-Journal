
import { safeFetch, ProviderError } from './base.js';

export async function chat(messages, { apiKey, model, maxTokens, timeoutMs }) {
  const url = 'https://api.deepseek.com/chat/completions';

  const res = await safeFetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    },
    timeoutMs,
    'DeepSeek'
  );

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new ProviderError('DeepSeek returned no text content', { status: 502 });
  }

  return { text, provider: 'deepseek', model: data.model || model };
}