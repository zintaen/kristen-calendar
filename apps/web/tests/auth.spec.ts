import { test, expect, type Page } from '@playwright/test';

// CORS headers so the stubbed cross-origin Supabase responses satisfy the browser preflight.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
};

// Stub the Supabase gotrue password-grant endpoint so login succeeds without a real backend.
async function stubSupabaseAuth(page: Page) {
  const session = {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'test-refresh-token',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'kristen@master.com',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
  await page.route('**/auth/v1/token**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS });
    }
    return route.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(session),
    });
  });
  await page.route('**/auth/v1/user**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS });
    }
    return route.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(session.user),
    });
  });
}

// Pre-seed consent so the first-visit ConsentGate modal (role=dialog, aria-modal) never renders
// and intercepts clicks. Gate passes when consentedAt is set and policyVersion matches "1.0.0".
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

test('master account can log in', async ({ page }) => {
  await stubSupabaseAuth(page);
  await seedConsent(page);

  await page.goto('/login');
  await page.fill('input[type="text"]', 'kristen');
  await page.fill('input[type="password"]', '1991');
  await page.click('button[type="submit"]');

  // On success the app routes to home. Assert on home-only content (the lunar card label)
  // rather than the URL, since trailingSlash makes URL matching ambiguous.
  await expect(page.getByText('Âm Lịch')).toBeVisible();
});
