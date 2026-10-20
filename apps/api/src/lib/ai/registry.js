
import * as openrouter from './providers/openrouter.js';
import * as groq from './providers/groq.js';
import * as gemini from './providers/gemini.js';
import * as deepseek from './providers/deepseek.js';
import * as openai from './providers/openai.js';
import * as anthropic from './providers/anthropic.js';

const ADAPTERS = {
  openrouter,
  groq,
  gemini,
  deepseek,
  openai,
  anthropic,
};

export function getProviderAdapter(providerId) {
  const adapter = ADAPTERS[providerId];
  if (!adapter) {
    throw new Error(`No AI adapter registered for provider: "${providerId}"`);
  }
  return adapter;
}