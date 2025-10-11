import { test, expect } from "@playwright/test";

test.describe("Firebase bootstrap", () => {
  test("exposes initialization info to window", async ({ page }) => {
    await page.goto("/");
    const info = await page.evaluate(() => window.__APP_TEST_INFO);
    expect(info).toBeTruthy();
    expect(info?.firebaseStatus).toBeTruthy();
    expect(info?.apiBaseUrl).toBeTruthy();
    if (process.env.E2E_API_BASE_URL) {
      expect(info?.apiBaseUrl).toBe(process.env.E2E_API_BASE_URL);
    }
    expect(info?.timestamp).toBeTruthy();
  });
});
