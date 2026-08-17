import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';
import { installHermesMocks } from '../helpers/hermesMock';

test('hermes-mocked-proposal: reply stays proposal until review', async ({ page }) => {
  await installHermesMocks(page);
  await waitForShell(page);
  await page.getByRole('button', { name: 'Abrir conversa com Hermes' }).click();
  await page.getByLabel('Provedor do Hermes').selectOption('openai');
  await page.getByText(/Permito enviar esta conversa/i).click();
  await page.getByLabel('Pergunte ao Hermes').fill('Pergunta E2E sobre o mapa');
  await page.getByRole('button', { name: 'Enviar mensagem ao Hermes' }).click();
  await expect(page.getByText('Resposta ficticia de teste do Hermes.')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Propor memória' }).click();
  await expect(page.getByText('Memória Hermes proposta com sucesso.')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Memórias' }).click();
  await expect(page.getByRole('heading', { name: 'Memória do Hermes' })).toBeVisible();
  // Evidence note is unique to a newly proposed memory (not the open Hermes chat bubble).
  const proposedCard = page.locator('div').filter({
    hasText: /Memória proposta a partir da conversa Hermes/,
  }).filter({ hasText: 'Status: proposed' });
  await expect(proposedCard.first()).toBeVisible({ timeout: 30_000 });
});

test('study-loop: map to hermes to caderno and persists after reload', async ({ page }) => {
  await installHermesMocks(page);
  await waitForShell(page);
  await page.getByRole('button', { name: 'Astrologia' }).click();
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });

  await page.getByLabel('Mapa em foco').selectOption({ label: 'Natal: Pessoa Conhecida' });
  await page.getByRole('button', { name: 'Atualizar cálculo do mapa' }).click();
  await expect(page.getByLabel('Proveniência do cálculo')).toBeVisible({ timeout: 60_000 });

  await page.getByRole('button', { name: /Tutor IA/i }).click();
  await page.getByText(/Permito enviar esta conversa/i).click();
  await page.getByLabel('Pergunte ao Hermes').fill('Explique o Sol no mapa de teste');
  await page.getByRole('button', { name: 'Enviar mensagem ao Hermes' }).click();
  await expect(page.getByText('Resposta ficticia de teste do Hermes.').first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Estudar no Caderno/i }).first().click();

  const studyName = 'Estudo — Natal: Pessoa Conhecida';
  await expect(page.getByRole('button', { name: studyName })).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(async () => {
      const values = await page.locator('textarea').evaluateAll((els) =>
        els.map((el) => (el as HTMLTextAreaElement).value),
      );
      return values.some((value) => value.includes('Origem: Natal: Pessoa Conhecida'));
    }, { timeout: 30_000 })
    .toBe(true);

  await page.reload();
  await waitForShell(page);
  await page.getByRole('button', { name: 'Caderno Vivo' }).click();

  const openPersistedStudy = page.getByRole('button', { name: studyName })
    .or(page.getByLabel(`Abrir caderno ${studyName}`));
  await expect(openPersistedStudy.first()).toBeVisible({ timeout: 30_000 });
  const browseButton = page.getByLabel(`Abrir caderno ${studyName}`);
  if (await browseButton.isVisible().catch(() => false)) {
    await browseButton.click();
  }
  await expect
    .poll(async () => {
      const values = await page.locator('textarea').evaluateAll((els) =>
        els.map((el) => (el as HTMLTextAreaElement).value),
      );
      return values.some((value) => value.includes('Origem: Natal: Pessoa Conhecida'));
    }, { timeout: 30_000 })
    .toBe(true);
});
