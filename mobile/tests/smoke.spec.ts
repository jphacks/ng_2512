import { test, expect } from '@playwright/test';

test('loads home and shows tabs', async ({ page }) => {
  await page.goto('/');

  // Wait for the Expo web app to boot
  await page.waitForLoadState('domcontentloaded');

  // Basic smoke checks: tab labels rendered
  await expect(page.getByText('提案')).toBeVisible();
  await expect(page.getByText('チャット')).toBeVisible();
  await expect(page.getByText('アルバム')).toBeVisible();
  await expect(page.getByText('フレンド')).toBeVisible();
  await expect(page.getByText('設定')).toBeVisible();
});

