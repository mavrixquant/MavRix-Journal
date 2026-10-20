import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'


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

const FIREBASE_SDK_PATTERN = {
  group: ['firebase', 'firebase/*'],
  message:
    'Firebase SDK imports are only allowed inside src/app/providers/** and src/features/auth/**. Application code should import from a service or hook instead.',
};

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

const DASHBOARD_CONSUMERS = ['journal', 'backtester'];

function featureBoundary(group) {
  const others = FEATURE_GROUPS.filter((g) => g !== group);

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

      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^React$',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],

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

  ...FEATURE_GROUPS.map(featureBoundary),

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