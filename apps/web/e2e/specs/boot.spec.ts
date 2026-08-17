import { test, expect } from '@playwright/test';
import { assertHealthIsTestUser, waitForShell } from '../helpers/app';

test.describe('boot', () => {
  test('boot-health-test-user: /health reports test_user true', async ({ request }) => {
    await assertHealthIsTestUser(request);
  });

  test('boot-local-owner: opens Pessoa Teste without login', async ({ page }) => {
    await waitForShell(page);
    await expect(page.getByText(/Pessoa Teste/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /ENTRAR/i })).toHaveCount(0);
  });
});
