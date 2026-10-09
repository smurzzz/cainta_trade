import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// The shell exports PORT=0, which makes `next start` bind a random port.
// Rebuild the env for the web server with a pinned port (and no undefineds).
const serverEnv: Record<string, string> = Object.fromEntries(
  Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined),
)
serverEnv.PORT = new URL(baseURL).port || '3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-tardown.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: baseURL,
    env: serverEnv,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
