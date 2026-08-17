import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

function memoryCard(page: import('@playwright/test').Page, content: string) {
  return page.getByText(content, { exact: true })
    .locator('xpath=ancestor::div[.//button[normalize-space()="Aprovar"]][1]');
}

test('memorias-review: approve revoke forget lifecycle', async ({ page }) => {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Memórias' }).click();
  await expect(page.getByText('Memoria proposta de teste.', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Memoria aprovada de teste.', { exact: true })).toBeVisible();

  const card = memoryCard(page, 'Memoria proposta de teste.');
  await expect(card).toContainText('Status: proposed');

  await card.getByRole('button', { name: 'Aprovar' }).click();
  await expect(card).toContainText('Status: approved', { timeout: 30_000 });

  await card.getByRole('button', { name: 'Revogar' }).click();
  await expect(card).toContainText('Status: revoked', { timeout: 30_000 });

  await card.getByRole('button', { name: 'Aprovar' }).click();
  await expect(card).toContainText('Status: approved', { timeout: 30_000 });

  await card.getByRole('button', { name: 'Esquecer' }).click();
  await expect(page.getByText('Memoria proposta de teste.', { exact: true })).toHaveCount(0, { timeout: 30_000 });
});

test('memorias-open-caderno: Estudar no Caderno from approved memory', async ({ page }) => {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Memórias' }).click();
  await expect(page.getByRole('heading', { name: 'Memória do Hermes' })).toBeVisible();
  await page.getByRole('button', { name: 'Estudar no Caderno' }).first().click();
  // Left Memórias and opened a Caderno study seeded from the approved memory.
  await expect(page.getByRole('heading', { name: 'Memória do Hermes' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Boards' })).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => {
      const values = await page.locator('textarea').evaluateAll((els) =>
        els.map((el) => (el as HTMLTextAreaElement).value),
      );
      return values.some((value) => value.includes('Memória Hermes aprovada'));
    }, { timeout: 30_000 })
    .toBe(true);
});
