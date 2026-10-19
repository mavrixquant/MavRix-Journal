// packages/shared/src/ai.js
export const MAVE_AI_EMAIL = 'mave-ai@mavrix.internal';
export const MAVE_AI_FIRST_NAME = 'Mave';
export const MAVE_AI_LAST_NAME = 'AI';
export const MAVE_AI_DISPLAY_NAME = 'Mave AI';

export const AI_PROVIDERS = Object.freeze([
  {
    id: 'openai',
    label: 'OpenAI',
    keyPrefix: 'sk-',
    keyDocsUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o'],
    freeTier: false,
    note: 'Requires minimum $5 balance',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    keyPrefix: 'sk-ant-',
    keyDocsUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-3-5-sonnet-latest',
    models: ['claude-3-5-sonnet-latest', 'claude-3-haiku-20240307'],
    freeTier: false,
    note: 'Requires minimum $5 balance',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    keyPrefix: 'AIza',
    keyDocsUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-3.8-flash',
    models: ['gemini-3.8-flash', 'gemini-3.5-flash'],
    freeTier: true,
    freeNote: 'Free tier: 15 req/min, no card required',
  },
  {
    id: 'groq',
    label: 'Groq (GPT-OSS)',
    keyPrefix: 'gsk_',
    keyDocsUrl: 'https://console.groq.com/keys',
    defaultModel: 'openai/gpt-oss-20b',
    models: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'],
    freeTier: true,
    freeNote: 'Free tier: 30 req/min, no card required · very fast',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    keyPrefix: 'sk-',
    keyDocsUrl: 'https://platform.deepseek.com/api_keys',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat'],
    freeTier: false,
    note: 'Requires minimum $2 balance',
  },
]);

export const AI_PROVIDER_IDS = AI_PROVIDERS.map((p) => p.id);

export function getProviderMeta(id) {
  return AI_PROVIDERS.find((p) => p.id === id) || null;
}

export function validateApiKeyFormat(providerId, key) {
  const meta = getProviderMeta(providerId);
  if (!meta) return { ok: false, reason: 'Unknown provider' };
  if (!key || typeof key !== 'string') {
    return { ok: false, reason: 'API key is required' };
  }
  const trimmed = key.trim();
  if (trimmed.length < 10) {
    return { ok: false, reason: 'API key looks too short' };
  }
  if (meta.keyPrefix && !trimmed.startsWith(meta.keyPrefix)) {
    return {
      ok: false,
      reason: `${meta.label} keys should start with "${meta.keyPrefix}"`,
    };
  }
  return { ok: true };
}