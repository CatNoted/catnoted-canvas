import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('catnoted-canvas blackbox smoke', () => {
  test('canvas app loads', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/catnoted[- ]canvas/i);
  });

  test('handles invalid board ID gracefully', async ({ page }) => {
    await page.goto(`${BASE}/board/does-not-exist`);
    await expect(page.locator('text=Board not found')).toBeVisible();
    await expect(page.locator('text=This board does not exist.')).toBeVisible();
    // Verify that the AI Sidebar floating button is NOT present
    await expect(page.locator('button[aria-label="Toggle AI Helper Panel"]')).not.toBeVisible();
  });
});
