// ============================================================================
// ESLint — packages/shared
//
// Universal library imported by BOTH apps/web (browser) and apps/api (Node).
// Deliberately does NOT declare browser or node globals — the shared layer
// must be pure ES logic only.
// ============================================================================

import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['node_modules/**', 'dist/**']),
    {
        files: ['**/*.js'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.es2022,
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
            'no-console': 'off',
        },
    },
]);