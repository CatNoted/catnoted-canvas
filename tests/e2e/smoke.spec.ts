import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('catnoted-canvas blackbox smoke', () => {
  test('canvas app loads', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/catnoted-canvas/i);
  });
});
