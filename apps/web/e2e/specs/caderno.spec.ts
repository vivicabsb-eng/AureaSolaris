import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

async function openSeededCaderno(page: import('@playwright/test').Page) {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Caderno Vivo' }).click();
  const openBtn = page.getByLabel('Abrir caderno Caderno de teste');
  await expect(openBtn.or(page.locator('textarea').first())).toBeVisible({ timeout: 30_000 });
  if (await openBtn.isVisible()) {
    await openBtn.click();
  }
  await expect
    .poll(async () => {
      const values = await page.locator('textarea').evaluateAll((els) =>
        els.map((el) => (el as HTMLTextAreaElement).value),
      );
      return values.includes('Nota A de teste');
    }, { timeout: 30_000 })
    .toBe(true);
}

test('caderno-seeded-board: opens seeded notes', async ({ page }) => {
  await openSeededCaderno(page);
  const values = await page.locator('textarea').evaluateAll((els) =>
    els.map((el) => (el as HTMLTextAreaElement).value),
  );
  expect(values).toEqual(expect.arrayContaining(['Nota A de teste', 'Nota B de teste']));
});

test('caderno-edit-undo: sticky + undo', async ({ page }) => {
  await openSeededCaderno(page);
  const beforeCount = await page.locator('textarea').count();
  await page.getByRole('button', { name: 'Post-it' }).click();
  await page.locator('div.relative.min-w-0.flex-1.overflow-hidden').click({ position: { x: 40, y: 40 }, force: true });
  await expect
    .poll(async () => page.locator('textarea').count(), { timeout: 10_000 })
    .toBeGreaterThan(beforeCount);
  await page.getByTitle('Desfazer (Ctrl+Z)').click();
  await expect
    .poll(async () => page.locator('textarea').count(), { timeout: 10_000 })
    .toBe(beforeCount);
  const values = await page.locator('textarea').evaluateAll((els) =>
    els.map((el) => (el as HTMLTextAreaElement).value),
  );
  expect(values).toEqual(expect.arrayContaining(['Nota A de teste', 'Nota B de teste']));
});

test('caderno-create-study: from Astrologia portal', async ({ page }) => {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Astrologia' }).click();
  await page.getByRole('tab', { name: 'Caderno Vivo' }).click();
  await page.getByLabel(/O que você quer estudar agora/i).fill('Mercurio E2E');
  await page.getByRole('button', { name: 'Criar estudo' }).click();
  await expect(page.getByRole('button', { name: 'Estudo — Mercurio E2E' })).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => {
      const values = await page.locator('textarea').evaluateAll((els) =>
        els.map((el) => (el as HTMLTextAreaElement).value),
      );
      return values.some((value) => value.includes('Mercurio E2E'));
    }, { timeout: 30_000 })
    .toBe(true);
});

test('caderno-reload: notes survive reload', async ({ page }) => {
  await openSeededCaderno(page);
  await page.reload();
  await openSeededCaderno(page);
});
