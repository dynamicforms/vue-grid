import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 4,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:15173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    // The built docs run Vue's production build and serve precompiled pages; the dev server compiles each page on
    // its first request and runs Vue's development checks, which slows every test down.
    command: 'node_modules/.bin/vitepress build docs && node_modules/.bin/vitepress preview docs --port 15173',
    url: 'http://localhost:15173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
