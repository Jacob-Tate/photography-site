import { test, expect } from '@playwright/test';

test.describe('Portfolio page', () => {
  test('loads photo grid with images', async ({ page }) => {
    await page.goto('/');
    // Wait for at least one image to load in the grid
    const images = page.locator('img[src*="/thumbnail/"]');
    await expect(images.first()).toBeVisible({ timeout: 10000 });
    expect(await images.count()).toBeGreaterThan(0);
  });

  test('clicking a photo opens the lightbox', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img[src*="/thumbnail/"]');
    await expect(images.first()).toBeVisible({ timeout: 10000 });

    await images.first().click();
    // Lightbox should show a full-size image
    const fullImage = page.locator('img[src*="/full/"]');
    await expect(fullImage.first()).toBeVisible({ timeout: 5000 });
  });

  test('Escape closes the lightbox', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img[src*="/thumbnail/"]');
    await expect(images.first()).toBeVisible({ timeout: 10000 });

    await images.first().click();
    const fullImage = page.locator('img[src*="/full/"]');
    await expect(fullImage.first()).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(fullImage.first()).not.toBeVisible({ timeout: 3000 });
  });
});
