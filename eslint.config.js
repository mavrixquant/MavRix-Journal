import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/* ──────────────────────────────────────────────────────────────
   Boundary rules — enforced after the feature-folder migration.

   These paths used to exist but no longer do:
     @/components/*   → moved to features/ and shared/
     @/utils/*        → moved to features/dashboard/utils, features/simulator/utils, shared/utils
     @/hooks/*        → moved to features/dashboard/hooks, shared/hooks
     @/context/*      → moved to app/providers
     @/firebase/*     → moved to services/
     @/pages/*        → moved to features/auth, features/landing

   Application code must go through the services layer for anything
   Firebase-related. Only src/services/** may import the SDK directly.
   ────────────────────────────────────────────────────────────── */
const OLD_PATH_PATTERNS = [
  {
    group: [
      '@/components/*',
      '@/utils/*',
      '@/hooks/*',
      '@/context/*',
      '@/firebase/*',
      '@/pages/*',
    ],
    message:
      'This path no longer exists after the migration. Use @/features/..., @/shared/..., @/app/..., or @/services/... instead.',
  },
];

const FIREBASE_SDK_PATTERN = {
  group: ['firebase', 'firebase/*'],
  message:
    'Firebase SDK imports are only allowed inside src/services/**. Application code should import from @/services/*.service instead.',
};

export default defineConfig([
  globalIgnores(['dist']),

  /* ── Global: block old paths + Firebase SDK ───────────────── */
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [...OLD_PATH_PATTERNS, FIREBASE_SDK_PATTERN],
      }],
    },
  },

  /* ── Override: allow Firebase SDK inside src/services/** ──── */
  {
    files: ['src/services/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: OLD_PATH_PATTERNS,
      }],
    },
  },
])