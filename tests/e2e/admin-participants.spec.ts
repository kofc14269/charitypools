import { test, expect } from '@playwright/test';

test('admin participants: show-all default and add global participant back to active pool', async ({ page }) => {
  await page.goto('/');

  // open Admin and authenticate
  await page.getByRole('button', { name: /admin/i }).click();
  await page.getByPlaceholder('••••••••').fill('admin');
  await page.getByRole('button', { name: /unlock panel/i }).click();

  // Open Add Names (participants) section
  await page.getByRole('button', { name: /Add Names/i }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Add Names/i }).click();

  // Add a participant (this also registers them globally)
  await page.getByRole('button', { name: /add person/i }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /add person/i }).click();
  // wait for the modal/form input to appear and then fill (use placeholder to avoid label mismatch)
  await page.locator('input[placeholder="e.g. John Smith"]').waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('input[placeholder="e.g. John Smith"]').fill('E2E Global');
  await page.getByRole('button', { name: /add to participant list/i }).click();

  // Ensure the participant appears in the table (basic E2E verification)
  await expect(page.locator('table').getByText('E2E Global')).toBeVisible();
  // Confirm "Show all names" toggle is on by default (check the toggle label)
  await expect(page.getByRole('button', { name: /Showing: All/i })).toBeVisible();
});