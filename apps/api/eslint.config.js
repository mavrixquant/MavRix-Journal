// ============================================================================
// ESLint — apps/api (Node ESM)
//
// Flat config. Node globals + modern web-standard globals the API relies on
// (fetch / AbortController / URL, all available in Node 18+).
//
// Ignored:
//   - prisma/migrations/**  (SQL files, Prisma-generated)
//   - backups/**            (JSON snapshots)
// ============================================================================

import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores([
        'node_modules/**',
        'prisma/migrations/**',
        'backups/**',
        'dist/**',
    ]),
    {
        files: ['**/*.{js,mjs}'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                // Node 18+ ships these as globals; some versions of the
                // `globals` package don't list them yet.
                fetch: 'readonly',
                Headers: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                FormData: 'readonly',
                AbortController: 'readonly',
                AbortSignal: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                crypto: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': [
                'error',
                {
                    varsIgnorePattern: '^_',
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            'no-empty': ['error', { allowEmptyCatch: true }],
            // Server code logs a lot; console output is expected here.
            'no-console': 'off',
        },
    },
]);