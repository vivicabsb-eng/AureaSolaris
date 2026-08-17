import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

test('diario-edit-reload: edit survives reload', async ({ page }) => {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Histórico & Notas' }).click();
  await page.getByRole('button', { name: 'Notas pessoais' }).click();
  await page.getByRole('button', { name: 'Estudo', exact: true }).click();
  await page.getByRole('button', { name: /Primeira anotacao de teste/i }).first().click();
  const editor = page.getByLabel('Texto da nota');
  await editor.click();
  await editor.fill('Anotacao ficticia para testes do Caderno Vivo e do diario. - E2E');
  await expect(page.getByText('Salvo no Diário')).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await waitForShell(page);
  await page.getByRole('button', { name: 'Histórico & Notas' }).click();
  await page.getByRole('button', { name: 'Notas pessoais' }).click();
  await page.getByRole('button', { name: 'Estudo', exact: true }).click();
  await page.getByRole('button', { name: /Primeira anotacao de teste/i }).first().click();
  await expect(page.getByLabel('Texto da nota')).toHaveValue(/E2E/, { timeout: 30_000 });
});
