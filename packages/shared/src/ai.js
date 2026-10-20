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
    // Admin-fallback default only. BYOK uses the discovered model list.
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
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
    defaultModel: 'gemini-1.5-flash',
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
// Used ONLY when live discovery fails at save time AND the failure was NOT
// an auth error (401/403). Auth failures reject the save — the user must
// fix their key. Transient failures (network, timeout, 5xx, 429) fall back
// to this list so the credential isn't blocked by a discovery outage.
//
// STALENESS WARNING:
//   Providers — especially OpenRouter — rotate their free tier constantly.
//   If any model in this list returns "unavailable" or "now paid", the
//   router fails over to the next entry (up to the last one). If every
//   entry in a provider's list is stale, the user re-saves their key to
//   trigger fresh discovery.
//
//   Keep these lists SHORT and CHOOSE THE STABLEST AVAILABLE MODELS. Two
//   entries is plenty — the router handles failover within the list.
// ---------------------------------------------------------------------------

export const fallbackModels = {
  openrouter: [
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-2-9b-it:free',
  ],
  groq: [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
  ],
  gemini: [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ],
  deepseek: [
    'deepseek-chat',
  ],
  openai: [
    'gpt-4o-mini',
  ],
  anthropic: [
    'claude-3-5-haiku-latest',
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