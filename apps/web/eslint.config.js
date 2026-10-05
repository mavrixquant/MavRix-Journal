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

   Feature groups:
     auth        — sign-in / sign-up / verify / reset
     dashboard   — shared dashboard subsystem (panels, charts,
                   filters, hooks, layout). Consumed by journal
                   and backtester only. Leaf — imports nothing
                   from other feature groups.
     charts      — TradingView market-chart feature. Leaf —
                   imports nothing from other feature groups.
     journal     — trade-log side of the app. MAY import dashboard.
     backtester  — Monte Carlo side of the app. MAY import dashboard.
     manage      — accounts, strategies
     utilities   — GEX levels, calculators. Leaf — imports nothing
                   from other feature groups.
     personal    — discussion, chats

   Rules:
     1. Paths that no longer exist after the revamp are hard errors.
     2. A feature group may import within itself freely, but not from
        any OTHER feature group — with the single sanctioned exception
        that journal/ and backtester/ may import from dashboard/.
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

// Every top-level feature group. Each group forbids the others,
// subject to the DASHBOARD_CONSUMERS exception below.
const FEATURE_GROUPS = [
  'auth',
  'dashboard',
  'charts',
  'journal',
  'backtester',
  'manage',
  'utilities',
  'personal',
];

// Groups that are allowed to import from features/dashboard/.
// The direction is one-way: these two may import dashboard/,
// but dashboard/ may NOT import them.
const DASHBOARD_CONSUMERS = ['journal', 'backtester'];

/** Build a per-group override that forbids the *other* feature groups,
 *  honouring the single sanctioned consumer → dashboard exception. */
function featureBoundary(group) {
  const others = FEATURE_GROUPS.filter((g) => g !== group);

  // If this group is a sanctioned consumer of dashboard/, remove
  // 'dashboard' from its forbidden list. dashboard itself is NOT a
  // consumer, so the reverse direction (dashboard → journal, etc.)
  // stays forbidden.
  const forbidden = DASHBOARD_CONSUMERS.includes(group)
    ? others.filter((g) => g !== 'dashboard')
    : others;

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
              group: forbidden.map((g) => `@/features/${g}/*`),
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