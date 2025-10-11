import { test, expect } from "@playwright/test";

test.describe("App smoke", () => {
  test("renders sign-in screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Recall Prototype")).toBeVisible();
    await expect(page.getByText("API Base URL")).toBeVisible();
    await expect(page.getByRole("button", { name: /view docs/i })).toBeVisible();
  });
});
