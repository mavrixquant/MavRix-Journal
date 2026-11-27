import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '**/*.config.*', '**/dist/**', 'prisma/**'],
    },
    include: ['src/**/*.test.js', 'src/**/*.spec.js'],
    testTimeout: 30000,
  },
});