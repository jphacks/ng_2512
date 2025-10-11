import { defineConfig } from "@playwright/test";

const expoPort = Number(process.env.EXPO_WEB_PORT ?? 19006);
const apiBase =
  process.env.E2E_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }]
  ],
  use: {
    baseURL: `http://127.0.0.1:${expoPort}`,
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 720 }
  },
  webServer: {
    command: `npx expo start --web --non-interactive --clear --port ${expoPort}`,
    url: `http://127.0.0.1:${expoPort}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      BROWSER: "none",
      EXPO_PUBLIC_API_BASE_URL: apiBase,
      E2E_API_BASE_URL: apiBase,
      EXPO_NO_TELEMETRY: "1",
      NODE_ENV: "test"
    }
  },
  outputDir: "playwright-results"
});
