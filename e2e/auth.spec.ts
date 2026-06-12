import { test, expect } from '@playwright/test';

/**
 * Auth smoke (Phase 6.7).
 *
 * The app authenticates via PKCE OAuth, which can't be driven headlessly
 * without scripting the instance's login page. For CI we instead seed a
 * pre-provisioned access token straight into localStorage (the same keys
 * `auth.ts` writes after a real round-trip), then exercise the authenticated
 * UI. Requires E2E_INSTANCE_URL + E2E_ACCESS_TOKEN to be set.
 */

const INSTANCE_URL = process.env.E2E_INSTANCE_URL;
const ACCESS_TOKEN = process.env.E2E_ACCESS_TOKEN;

test.skip(!INSTANCE_URL || !ACCESS_TOKEN, 'E2E_INSTANCE_URL / E2E_ACCESS_TOKEN not set');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([url, token]) => {
      // Mirror what auth.ts persists for an active account.
      localStorage.setItem('masto_instance', url);
      localStorage.setItem('masto_access_token', token);
      localStorage.setItem('masto_client_id', 'e2e');
      localStorage.setItem('mastoforum_active_instance', url);
      localStorage.setItem(
        'mastoforum_accounts',
        JSON.stringify({ [url]: { url, token, clientId: 'e2e' } }),
      );
    },
    [INSTANCE_URL!, ACCESS_TOKEN!],
  );
});

test('signed-in user lands on an authenticated Home', async ({ page }) => {
  await page.goto('/');
  // The header search only renders when signed in.
  await expect(page.getByPlaceholder(/Search people, posts/i)).toBeVisible();
  // The account overflow menu is present for authenticated users.
  await expect(page.getByRole('button', { name: /Account menu/i })).toBeVisible();
});

test('can open a tag board from search', async ({ page }) => {
  await page.goto('/');
  const search = page.getByPlaceholder(/Search people, posts/i);
  await search.fill('#fediverse');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/(board\/fediverse|search)/);
});
