
import { safeFetch, ProviderError } from './base.js';

export async function chat(messages, { apiKey, model, maxTokens, timeoutMs }) {
  const targetModel = model || 'claude-3-5-haiku-latest';
  const url = 'https://api.anthropic.com/v1/messages';

  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const payload = {
    model: targetModel,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  };

  if (systemMsg) {
    payload.system = systemMsg.content;
  }

  const res = await safeFetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    },
    timeoutMs,
    'Anthropic'
  );

  const data = await res.json();
  const text = data?.content?.[0]?.text;

  if (!text) {
    throw new ProviderError('Anthropic returned no text content', { status: 502 });
  }

  return { text, provider: 'anthropic', model: data.model || targetModel };
}