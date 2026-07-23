import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('catnoted-canvas blackbox smoke', () => {
  test('canvas app loads and shows boards or onboarding without JS errors', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (exception) => {
      errors.push(exception);
    });

    await page.goto(BASE);

    // Title match ("catnoted canvas")
    await expect(page).toHaveTitle(/catnoted canvas/i);

    // Verify it shows either boards list or onboarding state (e.g. "No boards yet." or a grid of boards/skeleton loaders)
    // Skeletons are rendered during loading, and if no boards, Card displays "No boards yet."
    const boardsHeader = page.locator('h2', { hasText: /Boards/i });
    await expect(boardsHeader).toBeVisible();

    // Check that we don't have JS errors on load
    expect(errors).toHaveLength(0);
  });

  test('/login renders email and password fields', async ({ page }) => {
    await page.goto(`${BASE}/login`);

    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');

    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
  });

  test('/board/nonexistent shows a clear error state', async ({ page }) => {
    await page.goto(`${BASE}/board/nonexistent`);

    // The page shows "This board does not exist." or "Board not found"
    // Let's look for "This board does not exist." specifically to avoid strict-mode violation
    const errorState = page.locator('text="This board does not exist."');
    await expect(errorState).toBeVisible();

    const backButton = page.locator('a', { hasText: /Back to boards/i });
    await expect(backButton).toBeVisible();
  });
});
