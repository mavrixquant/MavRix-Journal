import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Vite 8 defaults to lightningcss, which ships platform-specific native
    // binaries and breaks on Netlify CI (npm optional-dependency bug).
    // esbuild is pure Go — no native bindings — and works everywhere.
    cssMinify: 'esbuild',
  },
})