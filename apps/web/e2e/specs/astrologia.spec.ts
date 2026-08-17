import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';
import { installHermesMocks } from '../helpers/hermesMock';

async function openAstrologia(page: import('@playwright/test').Page) {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Astrologia' }).click();
  await expect(page.getByRole('tab', { name: 'Mandala visual' })).toBeVisible();
}

async function readInputHash(page: import('@playwright/test').Page): Promise<string> {
  const label = page.getByText(/Hash da entrada:/);
  if (!(await label.isVisible().catch(() => false))) {
    await page.getByText('Ver recibo técnico').click();
  }
  const hashRow = page.getByText(/Hash da entrada:/).locator('..');
  await expect(hashRow).toBeVisible({ timeout: 60_000 });
  await expect(hashRow).not.toContainText('não declarado');
  return (await hashRow.textContent())?.replace(/\s+/g, ' ').trim() ?? '';
}

test('astrologia-seeded-natal: receipt shows UTC, IANA, hash', async ({ page }) => {
  await openAstrologia(page);
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
  await page.getByText('Ver recibo técnico').click();
  await expect(page.getByText(/Instante UTC:/)).toBeVisible();
  await expect(page.getByText(/Fuso IANA:/)).toBeVisible();
  await expect(page.locator('dd').filter({ hasText: /America\/Sao_Paulo|UTC/ }).first()).toBeVisible();
  await expect(page.getByText(/Hash da entrada:/)).toBeVisible();
  const hashRow = page.locator('dl').getByText(/Hash da entrada:/).locator('..');
  await expect(hashRow).not.toContainText('não declarado');
});

test('astrologia-recalculate: switch maps changes calculation receipt', async ({ page }) => {
  await openAstrologia(page);
  const referenceHash = await readInputHash(page);
  expect(referenceHash).not.toBe('');

  await page.getByLabel('Mapa em foco').selectOption({ label: 'Natal: Pessoa Conhecida' });
  await page.getByRole('button', { name: 'Atualizar cálculo do mapa' }).click();
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
  await expect
    .poll(() => readInputHash(page), { timeout: 60_000 })
    .not.toBe(referenceHash);

  await page.getByLabel('Mapa em foco').selectOption({ label: 'Natal: Mapa de referencia' });
  await page.getByRole('button', { name: 'Atualizar cálculo do mapa' }).click();
  await expect
    .poll(() => readInputHash(page), { timeout: 60_000 })
    .toBe(referenceHash);
});

test('astrologia-incomplete-birth: no invented chart', async ({ page }) => {
  await openAstrologia(page);
  await page.getByRole('button', { name: /Adicionar mapa/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Nome').fill('Mapa incompleto E2E');
  // Leave date/time/location empty — form must error, not invent values.
  await dialog.getByRole('button', { name: /Salvar dados/i }).click();
  await expect(dialog.getByRole('alert')).toContainText(/DD\/MM\/AAAA|hora|local|latitude|fuso/i);
  await expect(dialog.getByRole('alert')).toBeVisible();
  // Still on the dialog: no silent save of an incomplete map into the selector.
  await expect(page.getByLabel('Mapa em foco').locator('option', { hasText: 'Mapa incompleto E2E' })).toHaveCount(0);
});

test('astrologia-open-caderno: Estudar no Caderno', async ({ page }) => {
  await openAstrologia(page);
  await page.getByRole('button', { name: /Estudar no Caderno/i }).click();
  // Destination-only landmarks: opened study board, not the sidebar/source button text.
  await expect(page.getByRole('button', { name: /Estudo —/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Boards' })).toBeVisible();
});

test('astrologia-open-hermes: Tutor IA', async ({ page }) => {
  await installHermesMocks(page);
  await openAstrologia(page);
  await page.getByRole('button', { name: /Tutor IA/i }).click();
  await expect(page.getByLabel('Pergunte ao Hermes')).toBeVisible();
});

test('astrologia-second-map: add map using Pessoa Conhecida fixture values', async ({ page }) => {
  await openAstrologia(page);
  await page.getByRole('button', { name: /Adicionar mapa/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Nome').fill('Mapa E2E Extra');
  await dialog.getByLabel('Data de nascimento').fill('15/06/1990');
  await dialog.getByLabel('Hora exata').fill('09:00');
  await dialog.getByLabel('Cidade ou local').selectOption('São Paulo, SP');
  await dialog.getByRole('button', { name: /Salvar dados/i }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel('Mapa em foco').selectOption({ label: 'Natal: Mapa E2E Extra' });
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });
});
