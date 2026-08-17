import { test, expect, type Page } from '@playwright/test';

const unexpectedServerErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, request }) => {
  const baseUrl = process.env.AUREA_E2E_URL;
  if (!baseUrl) throw new Error('AUREA_E2E_URL is required for E2E server-error checks.');

  // Fail closed before any page navigation or mutation can occur. A test-user
  // runtime with the expected browser contract is a prerequisite for every spec.
  await assertHealthIsTestUser(request);

  const expectedOrigin = new URL(baseUrl).origin;
  const errors: string[] = [];
  unexpectedServerErrors.set(page, errors);

  page.on('response', (response) => {
    if (response.status() < 500) return;
    try {
      if (new URL(response.url()).origin !== expectedOrigin) return;
    } catch {
      return;
    }
    errors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
  });
});

test.afterEach(async ({ page }) => {
  const errors = unexpectedServerErrors.get(page) ?? [];
  expect(errors, `Unexpected same-origin HTTP 5xx responses:\n${errors.join('\n')}`).toEqual([]);
});

/** Wait until local-owner shell is visible (no login). */
export async function waitForShell(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aurea Solaris' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Astrologia' })).toBeVisible();
}

export async function assertHealthIsTestUser(request: import('@playwright/test').APIRequestContext): Promise<void> {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.test_user).toBe(true);
  expect(body.browser_contract_version).toBe(2);
}
