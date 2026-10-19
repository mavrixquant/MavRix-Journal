// packages/shared/src/ai.js
//
// Provider registry shared by the API (router, discovery, controllers) and
// the web client (Settings → Mave AI panel, BYOK form).
//
// ORDER MATTERS:
//   • AI_PROVIDERS[] order drives the Settings dropdown AND the default
//     admin provider chain (env.ai.providerPriority).
//   • Adding a provider here immediately makes it selectable in the UI.
//     The API needs a matching adapter in apps/api/src/lib/ai/providers/.

export const AI_PROVIDERS = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    freeTier: true,
    keyPrefix: 'sk-or-v1-',
    keyDocsUrl: 'https://openrouter.ai/keys',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
  },
  {
    id: 'groq',
    label: 'Groq',
    freeTier: true,
    keyPrefix: 'gsk_',
    keyDocsUrl: 'https://console.groq.com/keys',
    defaultModel: 'openai/gpt-oss-20b',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    freeTier: true,
    keyPrefix: 'AIza',
    keyDocsUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-3.8-flash',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    freeTier: false,
    keyPrefix: 'sk-',
    keyDocsUrl: 'https://platform.deepseek.com/api_keys',
    defaultModel: 'deepseek-chat',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    freeTier: false,
    keyPrefix: 'sk-',
    keyDocsUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    freeTier: false,
    keyPrefix: 'sk-ant-',
    keyDocsUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-3-5-haiku-latest',
  },
];

const PROVIDER_MAP = Object.fromEntries(AI_PROVIDERS.map((p) => [p.id, p]));

export function getProviderMeta(id) {
  return PROVIDER_MAP[id] || null;
}

// ---------------------------------------------------------------------------
// Curated fallback model lists.
//
// Used ONLY when live model discovery fails at save time (network error,
// /models returns 403/404, provider temporarily down). The key save still
// succeeds — the credential just gets a smaller default rotation instead of
// the full live list. The user can re-save to retry discovery, or toggle
// individual models in Settings → Mave AI.
//
// Ordered by preference. The router tries models[] in order.
// ---------------------------------------------------------------------------

export const fallbackModels = {
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemini-2.0-flash-exp:free',
    'deepseek/deepseek-r1:free',
    'qwen/qwen-2.5-72b-instruct:free',
    'mistralai/mistral-small-24b-instruct-2501:free',
  ],
  groq: [
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
  ],
  gemini: [
    'gemini-3.8-flash',
    'gemini-3.8-pro',
  ],
  deepseek: [
    'deepseek-chat',
    'deepseek-reasoner',
  ],
  openai: [
    'gpt-4o-mini',
    'gpt-4o',
  ],
  anthropic: [
    'claude-3-5-haiku-latest',
    'claude-3-5-sonnet-latest',
  ],
};

// ---------------------------------------------------------------------------
// Chat-model filter — drops embedding / TTS / image / moderation models
// that some providers return alongside chat models.
// ---------------------------------------------------------------------------

const OPENAI_EXCLUDE_PREFIXES = [
  'text-embedding-', 'text-moderation-', 'whisper-', 'tts-',
  'dall-e-', 'omni-moderation-', 'sora-',
];

const OPENAI_KEEP_PREFIXES = [
  'gpt-', 'o1', 'o3', 'o4', 'chatgpt-',
];

export function filterChatModels(provider, ids) {
  if (!Array.isArray(ids)) return [];
  const unique = [...new Set(ids.map((s) => String(s).trim()).filter(Boolean))];

  if (provider === 'openai') {
    return unique.filter((id) => {
      if (OPENAI_EXCLUDE_PREFIXES.some((p) => id.startsWith(p))) return false;
      return OPENAI_KEEP_PREFIXES.some((p) => id.startsWith(p));
    });
  }

  return unique;
}
// ---------------------------------------------------------------------------
// Built-in Mave AI sentinel identity.
//
// Used by apps/api/src/services/maveAiBootstrap.js when CREATING the AI user
// on a fresh database. On databases where the AI user already exists (the
// normal case), these values are never applied — the bootstrap does
// `findFirst({ where: { isAi: true } })` first and short-circuits.
//
// If you want to match your EXISTING AI user's email exactly (check with
// `npx prisma studio` → users → filter isAi=true), update MAVE_AI_EMAIL to
// the value you see there. Otherwise the defaults below are fine for a
// future fresh deploy.
// ---------------------------------------------------------------------------

export const MAVE_AI_EMAIL      = 'mave-ai@mavrix.local';
export const MAVE_AI_FIRST_NAME = 'Mave';
export const MAVE_AI_LAST_NAME  = 'AI';
