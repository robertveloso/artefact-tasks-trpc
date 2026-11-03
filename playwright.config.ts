import { defineConfig, devices } from '@playwright/test'

const PORT = 3100

// End-to-end tests run against the production build (`next start`), with the default seed of 24
// sample tasks. They share one server and its in-memory data, so they run one at a time.
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // `npm run test:e2e` builds first; CI builds in an earlier step.
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
