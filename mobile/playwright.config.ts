import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 10 * 60 * 1000,
  expect: {
    timeout: 15_000,
  },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.APP_BASE_URL || 'http://localhost:19006',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx expo start --web --port 19006 --non-interactive',
    url: 'http://localhost:19006',
    timeout: 3 * 60 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      EXPO_WEB_PORT: '19006',
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || process.env.E2E_API_BASE_URL || 'http://127.0.0.1:8000',
    },
  },
});

