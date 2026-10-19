// packages/shared/src/ai.js
//
// Mave AI — shared constants used by both API and web.
//
// Everything here is a plain const / pure function so it can be imported
// from either side without pulling in any Node-specific or browser-specific
// dependency.

/* ------------------------------------------------------------------ */
/*  Mave AI sentinel identity                                          */
/* ------------------------------------------------------------------ */

// The reserved email that identifies the built-in Mave AI user row.
// `User.isAi === true` is the authoritative flag; this email is just for
// human debugging and logs.
export const MAVE_AI_EMAIL = 'mave-ai@mavrix.internal';

export const MAVE_AI_FIRST_NAME = 'Mave';
export const MAVE_AI_LAST_NAME = 'AI';
export const MAVE_AI_DISPLAY_NAME = 'Mave AI';

/* ------------------------------------------------------------------ */
/*  Provider catalog                                                   */
/* ------------------------------------------------------------------ */
//
// `freeTier: true`   → the provider is available on the app's admin keys
//                       with no charge to the user.
// `freeNote`         → shown to the user as a hint in the settings panel.
// `keyPrefix`        → used for light client-side validation so we can
//                       reject obviously-wrong pastes before a round trip.
// `defaultModel`     → sent to the provider when the user does not pick
//                       a model explicitly.

export const AI_PROVIDERS = Object.freeze([
  {
    id: 'openai',
    label: 'OpenAI',
    keyPrefix: 'sk-',
    keyDocsUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    freeTier: false,
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    keyPrefix: 'sk-ant-',
    keyDocsUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-3-5-haiku-latest',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest'],
    freeTier: false,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    keyPrefix: 'AIza',
    keyDocsUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
    freeTier: true,
    freeNote: 'Free tier includes 15 req/min',
  },
  {
    id: 'groq',
    label: 'Groq (Llama)',
    keyPrefix: 'gsk_',
    keyDocsUrl: 'https://console.groq.com/keys',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    freeTier: true,
    freeNote: 'Free tier includes 30 req/min · fastest provider',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    keyPrefix: 'sk-',
    keyDocsUrl: 'https://platform.deepseek.com/api_keys',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    freeTier: false,
    cheapNote: '~$0.14 per 1M tokens',
  },
]);

export const AI_PROVIDER_IDS = AI_PROVIDERS.map((p) => p.id);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getProviderMeta(id) {
  return AI_PROVIDERS.find((p) => p.id === id) || null;
}

/**
 * Cheap client-side validation. The real validation happens in the API
 * when we actually try the key (Phase 2 test endpoint), but this catches
 * typos before they take a round trip.
 */
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