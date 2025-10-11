import { test, expect } from "@playwright/test";

const apiBase =
  process.env.E2E_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000";

test.describe("API integration", () => {
  test("responds to healthz", async ({ request }) => {
    const response = await request.get(`${apiBase}/healthz`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe("ok");
  });
});
