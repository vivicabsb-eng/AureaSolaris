import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

test('saude-preview-upload: seed preview and explicit PDF upload', async ({ page }) => {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Saúde & Vitalidade' }).click();
  await expect(page.getByText(/preview-teste/i)).toBeVisible({ timeout: 30_000 });
  // UI accepts PDF only (`accept="application/pdf,.pdf"`).
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Registrar PDF' }).click(),
  ]);
  await fileChooser.setFiles('apps/web/e2e/fixtures/health-e2e.pdf');
  await expect(page.getByText(/Documento registrado no histórico privado/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /health-e2e/i })).toBeVisible();
  await expect(page.getByText(/não é diagnóstico nem prescrição/i)).toBeVisible();
});