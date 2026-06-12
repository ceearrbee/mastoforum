import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the auth smoke test (Phase 6.7).
 *
 * Requires dev deps and env that are NOT part of the default install:
 *   npm i -D @playwright/test && npx playwright install --with-deps chromium
 *
 * Env (set as CI secrets — see .github/workflows/e2e.yml):
 *   E2E_BASE_URL       app URL under test (defaults to the local dev server)
 *   E2E_INSTANCE_URL   Mastodon instance to authenticate against
 *   E2E_ACCESS_TOKEN   a pre-provisioned access token for that instance
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
