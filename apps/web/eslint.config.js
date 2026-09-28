// apps/web/eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/* ──────────────────────────────────────────────────────────────
   Boundary rules — enforce the post-Phase-10 architecture.

   Layers (top → bottom):
     app/       bootstraps the app: providers, router, layout
     features/  one folder per sidebar group, self-contained
     shared/    cross-cutting primitives

   Rules:
     1. Paths that no longer exist after the revamp are hard errors.
     2. A feature group may import within itself freely, but not from
        any other feature group.
     3. shared/ may not import from app/ or features/.
   ────────────────────────────────────────────────────────────── */

// Paths removed during the revamp. Any import from these is a bug.
const DEAD_PATHS = {
  group: [
    '@/lib/*',
    '@/components/*',
    '@/services/*',
    '@/utils/*',
    '@/context/*',
    '@/firebase/*',
    '@/pages/*',
    '@/app/shell/*',
    '@/features/dashboard/*',
    '@/features/simulator/*',
    '@/features/accounts/*',
    '@/features/strategies/*',
    '@/features/journal/components/*',
    '@/features/backtester/components/*',
    '@/features/personal/components/*',
    '@/shared/utils/*',
    '@/shared/utils/chartConfig',
  ],
  message:
    'This path does not exist after the frontend revamp. Check the new structure — features/* now match the sidebar groups.',
};

// Firebase SDK stays scoped to its sanctioned homes.
const FIREBASE_SDK_PATTERN = {
  group: ['firebase', 'firebase/*'],
  message:
    'Firebase SDK imports are only allowed inside src/app/providers/** and src/features/auth/**. Application code should import from a service or hook instead.',
};

// Every top-level feature group. Each group forbids the others.
const FEATURE_GROUPS = ['auth', 'journal', 'backtester', 'manage', 'personal'];

/** Build a per-group override that forbids the *other* feature groups. */
function featureBoundary(group) {
  const others = FEATURE_GROUPS.filter((g) => g !== group);
  return {
    files: [`src/features/${group}/**/*.{js,jsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            DEAD_PATHS,
            FIREBASE_SDK_PATTERN,
            {
              group: others.map((g) => `@/features/${g}/*`),
              message: `${group}/ cannot import from another feature group. Lift the shared piece into shared/ instead.`,
            },
          ],
        },
      ],
    },
  };
}

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
      'no-restricted-imports': [
        'error',
        {
          patterns: [DEAD_PATHS, FIREBASE_SDK_PATTERN],
        },
      ],

      // Allow React default/namespace imports (shadcn pattern) and
      // underscore-prefixed args. ignoreRestSiblings covers the
      // `const { drop, ...rest } = obj` idiom.
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^React$',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      /* ── React 19 / Compiler rules — deferred to a future
         "React Compiler readiness" project. These flag patterns
         that work today but need refactoring. */
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',
    },
  },

  /* ── Features: forbid cross-group imports ─────────────────── */
  ...FEATURE_GROUPS.map(featureBoundary),

  /* ── Shared: may not reach into app/ or features/ ──────────── */
  {
    files: ['src/shared/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            DEAD_PATHS,
            FIREBASE_SDK_PATTERN,
            {
              group: ['@/app/*', '@/features/*'],
              message:
                'shared/ must not depend on app/ or features/. Move the shared piece into shared/ or invert the dependency.',
            },
          ],
        },
      ],
    },
  },

  /* ── Firebase exemptions ───────────────────────────────────── */
  {
    files: [
      'src/app/providers/**/*.{js,jsx}',
      'src/features/auth/**/*.{js,jsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [DEAD_PATHS],
        },
      ],
    },
  },
])