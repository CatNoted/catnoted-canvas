import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('catnoted-canvas blackbox smoke', () => {
  test('canvas app loads', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/catnoted canvas/i);
  });

  test('login page fields are visible', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('empty boards list state', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText('No boards yet.')).toBeVisible();
    await expect(page.getByText('Create your first board to start drawing.')).toBeVisible();
  });

  test('invalid board ID behavior', async ({ page }) => {
    await page.goto(`${BASE}/board/invalid-non-existent-id`);
    await expect(page.getByText('This board does not exist.')).toBeVisible();
    await expect(page.locator('a', { hasText: 'Back to boards' })).toBeVisible();
  });
});
