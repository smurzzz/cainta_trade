import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/.next/**', 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
})