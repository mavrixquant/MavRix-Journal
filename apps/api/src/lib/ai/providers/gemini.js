// apps/api/src/lib/ai/providers/gemini.js
//
// Google Gemini adapter.
// Docs: https://ai.google.dev/api/rest/v1beta/models/generateContent
//
// Gemini has a slightly different request/response format:
//   - system prompt is a separate top-level field, not a message role
//   - messages use { role: 'user'|'model', parts: [{ text }] }
//   - API key is passed as a query parameter, not a header

import { safeFetch, ProviderError } from './base.js';

export async function chat(messages, { apiKey, model, maxTokens, timeoutMs }) {
  const targetModel = model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

  // Split out the system prompt
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  const contents = chatMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    },
  };

  if (systemMsg) {
    payload.systemInstruction = {
      parts: [{ text: systemMsg.content }],
    };
  }

  const res = await safeFetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    timeoutMs,
    'Gemini'
  );

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    // Sometimes Gemini fails silently due to safety filters
    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new ProviderError(`Gemini blocked the response: ${blockReason}`, {
        status: 400,
      });
    }
    throw new ProviderError('Gemini returned no text content', { status: 502 });
  }

  return { text, provider: 'gemini', model: targetModel };
}