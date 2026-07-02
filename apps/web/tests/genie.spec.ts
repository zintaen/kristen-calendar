import { test, expect, type Page } from '@playwright/test';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};

// Stub the Genie proxy so the chat flow is deterministic and needs no backend or API key.
async function stubGenieApi(page: Page) {
  const reply = {
    answer: 'Day la cau tra loi thu nghiem tu Genie.',
    questionType: 'phong_tuc_hoi_dap',
    requestId: '11111111-1111-1111-1111-111111111111',
    tokenUsage: { inputTokens: 10, outputTokens: 5 },
  };
  await page.route('**/api/genie**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS });
    }
    return route.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(reply),
    });
  });
}

// Pre-seed consent so the first-visit ConsentGate modal (role=dialog, aria-modal) never renders
// and intercepts the FAB click.
async function seedConsent(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'genie_amlich_consent',
      JSON.stringify({
        cloudSync: true,
        genieAI: true,
        znsReminder: false,
        analyticsUsage: true,
        consentedAt: '2026-01-01T00:00:00.000Z',
        policyVersion: '1.0.0',
      }),
    );
  });
}

test('chat with Genie', async ({ page }) => {
  await stubGenieApi(page);
  await seedConsent(page);

  // Home is not auth-gated and the Genie FAB lives in the root layout, so open it directly.
  await page.goto('/');
  await page.getByTestId('genie-fab').click();

  const input = page.getByTestId('genie-input');
  await expect(input).toBeVisible();
  await input.fill('Tao mot cuoc binh chon di choi Vung Tau thu 7 nay');
  await input.press('Enter');

  // The stubbed assistant reply renders as the last genie message.
  const reply = page.getByTestId('genie-message').last();
  await expect(reply).toBeVisible({ timeout: 15_000 });
  await expect(reply).toContainText('thu nghiem');
});
