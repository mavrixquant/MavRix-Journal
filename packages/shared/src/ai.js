
export const AI_PROVIDERS = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    freeTier: true,
    keyPrefix: 'sk-or-v1-',
    keyDocsUrl: 'https://openrouter.ai/keys',
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


export const MAVE_AI_EMAIL      = 'mave-ai@mavrix.local';
export const MAVE_AI_FIRST_NAME = 'Mave';
export const MAVE_AI_LAST_NAME  = 'AI';