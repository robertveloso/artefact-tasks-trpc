import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // e2e/ holds the Playwright tests, which run with `npm run test:e2e`.
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
})
