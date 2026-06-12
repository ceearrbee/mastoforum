import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Browser smoke + accessibility against the running app. Uses a seeded fake
 * session and stubbed API responses, so it needs no real instance or secrets
 * (unlike auth.spec.ts). Exercises the bug fixes from this work — profile
 * routing, the rail-modal portal, search tabs — and runs axe (incl. contrast,
 * which the jsdom unit suite can't check).
 */

const FAKE = 'https://fake.test';

const ACCOUNT = {
  id: 'acc1',
  acct: 'ada@social',
  username: 'ada',
  displayName: 'Ada Lovelace',
  avatar: '',
  note: '<p>First programmer.</p>',
  emojis: [],
  bot: false,
  locked: false,
  createdAt: '2019-03-08T00:00:00.000Z',
  followersCount: 0,
  followingCount: 0,
  statusesCount: 0,
  fields: [],
};

async function seedSession(page: Page) {
  await page.addInitScript((url) => {
    localStorage.setItem('masto_instance', url);
    localStorage.setItem('masto_access_token', 'faketoken');
    localStorage.setItem('masto_client_id', 'fake');
    localStorage.setItem('mastoforum_active_instance', url);
    localStorage.setItem(
      'mastoforum_accounts',
      JSON.stringify({ [url]: { url, token: 'faketoken', clientId: 'fake' } }),
    );
  }, FAKE);
}

async function stubApi(page: Page) {
  // Catch-all empty first; specific overrides registered after (last wins).
  await page.route('**/api/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/v1/accounts/lookup**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACCOUNT) }),
  );
  await page.route('**/api/v2/search**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accounts: [ACCOUNT], statuses: [], hashtags: [{ name: 'linux' }] }),
    }),
  );
}

const axeScan = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);

test('signed-out home renders and passes axe (incl. contrast)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Connect/i })).toBeVisible();
  const { violations } = await axeScan(page).analyze();
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});

test('profile loads at /@handle, and an unknown single-segment 404s', async ({ page }) => {
  await seedSession(page);
  await stubApi(page);
  await page.goto('/@ada@social');
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();

  await page.goto('/totally-not-a-handle');
  await expect(page.getByText(/doesn't match any route/i)).toBeVisible();
});

test('Manage lists opens as a full modal (not clipped in the rail) and Esc closes it', async ({
  page,
}) => {
  await seedSession(page);
  await stubApi(page);
  await page.setViewportSize({ width: 500, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: /open navigation/i }).click();
  await page.getByRole('button', { name: /^Manage$/ }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.width).toBeGreaterThan(300); // not squeezed into the sidebar
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('header search routes to /search with working tabs', async ({ page }) => {
  await seedSession(page);
  await stubApi(page);
  await page.goto('/');
  const search = page.getByPlaceholder(/Search people, posts/i);
  await search.fill('linux');
  await search.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=linux/);
  await page.getByRole('tab', { name: 'Tags' }).click();
  await expect(page).toHaveURL(/type=hashtags/);
});

test('signed-in home passes axe (incl. contrast)', async ({ page }) => {
  await seedSession(page);
  await stubApi(page);
  await page.goto('/');
  await expect(page.getByPlaceholder(/Search people, posts/i)).toBeVisible();
  const { violations } = await axeScan(page).analyze();
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});
