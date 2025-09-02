import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = dirname(fileURLToPath(new URL('./', import.meta.url)))

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  // Prevent Vitest/Vite from trying to load PostCSS/Tailwind config during tests
  css: { postcss: {} },
  resolve: {
    alias: {
      '@': resolve(rootDir, '.'),
    },
  },
})