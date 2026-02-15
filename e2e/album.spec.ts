import { test, expect } from '@playwright/test';

test.describe('Album navigation', () => {
  test('albums page shows album cards', async ({ page }) => {
    await page.goto('/albums');
    // Wait for album cards to load (links to individual albums)
    const albumLinks = page.locator('a[href*="/albums/"]');
    await expect(albumLinks.first()).toBeVisible({ timeout: 10000 });
    expect(await albumLinks.count()).toBeGreaterThan(0);
  });

  test('clicking an album navigates to detail with images', async ({ page }) => {
    await page.goto('/albums');
    const albumLinks = page.locator('a[href*="/albums/"]');
    await expect(albumLinks.first()).toBeVisible({ timeout: 10000 });

    await albumLinks.first().click();
    await page.waitForURL(/\/albums\//);

    // Album detail should show thumbnail images
    const images = page.locator('img[src*="/thumbnail/"]');
    await expect(images.first()).toBeVisible({ timeout: 10000 });
    expect(await images.count()).toBeGreaterThan(0);
  });
});

test.describe('Album default sort', () => {
  test('photostream album uses date-asc sort from sort.txt', async ({ page }) => {
    // The API should return defaultSort: 'date-asc' for this album
    const apiResponse = await page.request.get('/api/albums/samples/photostream');
    const data = await apiResponse.json();
    expect(data.defaultSort).toBe('date-asc');
  });

  test('sort selector reflects the album default sort', async ({ page }) => {
    await page.goto('/albums/samples/photostream');
    const images = page.locator('img[src*="/thumbnail/"]');
    await expect(images.first()).toBeVisible({ timeout: 10000 });

    // The sort dropdown/selector should show date-asc as active
    const sortSelect = page.locator('select');
    if (await sortSelect.count() > 0) {
      await expect(sortSelect).toHaveValue('date-asc');
    }
  });
});

test.describe('Share link with custom sort', () => {
  test('?image= opens lightbox to the correct image regardless of sort order', async ({ page }) => {
    // Navigate directly via share link to a specific image in a sorted album
    await page.goto('/albums/samples/photostream?image=DSCF9948.jpg');

    // Lightbox should open automatically
    const fullImage = page.locator('img[src*="/full/"]');
    await expect(fullImage.first()).toBeVisible({ timeout: 10000 });

    // The displayed image src should contain the correct filename
    const src = await fullImage.first().getAttribute('src');
    expect(src).toContain('DSCF9948');
  });

  test('lightbox navigation works correctly after opening via share link', async ({ page }) => {
    await page.goto('/albums/samples/photostream?image=DSCF9948.jpg');

    const fullImage = page.locator('img[src*="/full/"]');
    await expect(fullImage.first()).toBeVisible({ timeout: 10000 });

    // Verify the initial image is correct
    const initialSrc = await fullImage.first().getAttribute('src');
    expect(initialSrc).toContain('DSCF9948');

    // Navigate to next image and verify it changed
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const nextSrc = await fullImage.first().getAttribute('src');
    expect(nextSrc).not.toContain('DSCF9948');

    // Navigate back and verify we return to the original
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    const backSrc = await fullImage.first().getAttribute('src');
    expect(backSrc).toContain('DSCF9948');
  });
});
