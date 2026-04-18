import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start dev server and API for local runs
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'pnpm --filter api start:dev',
          port: 3001,
          reuseExistingServer: true,
          timeout: 30000,
        },
        {
          command: 'pnpm --filter web dev',
          port: 5173,
          reuseExistingServer: true,
          timeout: 30000,
        },
      ],
});
