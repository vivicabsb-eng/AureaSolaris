import { test, expect } from '@playwright/test';
import { waitForShell } from '../helpers/app';

test('agenda-task-event: create, complete/delete task and delete event', async ({ page }) => {
  await waitForShell(page);
  await page.getByRole('button', { name: 'Agenda Preditiva' }).click();
  await expect(page.getByText('Revisar mandala de teste')).toBeVisible();

  await page.getByRole('button', { name: '+ Nova Tarefa' }).click();
  await page.getByRole('textbox', { name: 'Tarefa' }).fill('Tarefa E2E');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Tarefa criada com sucesso.')).toBeVisible();
  await page.getByRole('button', { name: 'Concluído' }).click();

  const taskText = page.getByText('Tarefa E2E', { exact: true });
  await expect(taskText).toBeVisible();
  const taskRow = taskText.locator('..');
  await taskRow.getByRole('button', { name: 'Concluir tarefa Tarefa E2E' }).click();
  await expect(taskRow.getByRole('button', { name: 'Reabrir tarefa Tarefa E2E' })).toHaveAttribute('aria-pressed', 'true');
  await taskRow.getByRole('button').nth(1).click();
  await expect(taskText).toHaveCount(0);

  await page.getByRole('button', { name: '+ Novo Compromisso' }).click();
  await page.getByLabel('Título').fill('Evento E2E');
  await page.getByLabel('Horário local').fill('15:30');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Compromisso criado com sucesso.')).toBeVisible();
  await page.getByRole('button', { name: 'Concluído' }).click();

  const eventText = page.getByText('Evento E2E', { exact: true });
  await expect(eventText).toBeVisible();
  await page.getByRole('button', { name: 'Excluir compromisso Evento E2E' }).click();
  await expect(eventText).toHaveCount(0);
});
