import { test, expect } from '@playwright/test';
import path from 'path';

test('admin logo upload (upload + preview) and URL fallback', async ({ page }) => {
  await page.goto('/');
  // open Admin and authenticate
  await page.getByRole('button', { name: /admin/i }).click();
  await page.getByPlaceholder('••••••••').fill('admin');
  await page.getByRole('button', { name: /unlock panel/i }).click();
  // open Global section (wait for it to be visible)
  await page.getByRole('button', { name: /organization/i }).click();

  // Upload a local image file (avoid __dirname in ESM)
  const filePath = path.resolve(process.cwd(), 'tests', 'e2e', 'fixtures', 'logo-small.png');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('button:has-text("Upload")').first().click()
  ]);
  await fileChooser.setFiles(filePath);

  // preview appears (img with alt Team A)
  await expect(page.locator('img[alt="Team A"]')).toBeVisible();

  // paste a bad url then cancel validation
  await page.locator('input[placeholder="https://.../logo.png"]').first().fill('https://example.com/bad.png');
  await page.locator('input[placeholder="https://.../logo.png"]').first().blur();
  // if a confirm appears Playwright will auto-dismiss; ensure no img added
  await expect(page.locator('img[alt="Team A"]')).toBeVisible();
});
