import { test, expect } from '@playwright/test';

test('chat with Genie', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[type="text"]', 'kristen');
  await page.fill('input[type="password"]', '1991');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');

  // Open Genie Chat
  // Depending on the UI, you might need to click a FAB button to open chat
  // Assuming there's a button or input directly accessible
  const input = page.getByPlaceholder(/Hỏi Genie/i);
  await expect(input).toBeVisible();

  await input.fill('Tạo một cuộc bình chọn đi chơi Vũng Tàu thứ 7 này');
  await input.press('Enter');

  // Wait for Genie's response (assuming the messages are rendered in a list)
  const response = page.locator('.message.assistant').last();
  await expect(response).toBeVisible({ timeout: 15000 });
});
