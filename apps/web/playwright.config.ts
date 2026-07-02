import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Only *.spec.ts are Playwright e2e tests. tests/ also holds vitest unit files (e.g. good-day.test.ts)
  // which are run by vitest, not Playwright - scope Playwright to .spec.ts so it does not pick them up.
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },
  // Boot the app for e2e. The specs stub Supabase auth and /api/genie via page.route, so no
  // external services are needed. First cold compile can be slow, hence the generous start timeout.
  webServer: {
    command: 'pnpm exec next dev --port 8080',
    url: 'http://localhost:8080/login',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
