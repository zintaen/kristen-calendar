import { test, expect } from '@playwright/test';

test('master account can log in', async ({ page }) => {
  await page.goto('/login');

  // Fill in the login form
  await page.fill('input[type="text"]', 'kristen');
  await page.fill('input[type="password"]', '1991');

  // Click the submit button
  await page.click('button[type="submit"]');

  // Wait for navigation to home page
  await page.waitForURL('**/');

  // Verify that the user is logged in (e.g. check for the Genie UI)
  await expect(page.locator('text=Genie')).toBeVisible();
});
