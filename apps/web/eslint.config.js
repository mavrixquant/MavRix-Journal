import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/* ──────────────────────────────────────────────────────────────
   Boundary rules — enforced after the feature-folder migration.
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
    'Firebase SDK imports are only allowed inside src/services/**, src/app/providers/**, and src/features/auth/**. Application code should import from @/services/*.service instead.',
};

export default defineConfig([
  globalIgnores(['dist']),

  /* ── Global rules ──────────────────────────────────────────── */
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

      /* ── React 19 / Compiler rules — deferred to a future cleanup ──
         These flag patterns that work today but need refactoring to
         satisfy the compiler. Turn them off globally to keep lint
         actionable. Revisit in a dedicated "React Compiler readiness"
         project later. */
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',

      /* ── Keep these ON — real correctness rules ─────────────── */
      // 'react-hooks/rules-of-hooks': 'error'   (from recommended)
      // 'react-hooks/refs': 'error'             (from recommended)
      // 'no-unused-vars': 'error'               (from js recommended)
      // 'no-empty': 'error'                     (from js recommended)
    },
  },

  /* ── Exemptions: allow Firebase SDK where it's architecturally expected ── */
  {
    files: [
      'src/services/**/*.{js,jsx}',
      'src/app/**/*.{js,jsx}',
      'src/features/auth/**/*.{js,jsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: OLD_PATH_PATTERNS,
      }],
    },
  },
])