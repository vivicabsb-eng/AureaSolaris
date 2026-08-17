import type { Page } from '@playwright/test';

/** Deterministic Hermes replies; no outbound provider calls. */
export async function installHermesMocks(page: Page): Promise<void> {
  await page.route('**/chat', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Resposta ficticia de teste do Hermes.',
          provider: 'mock',
        }),
      });
      return;
    }
    await route.fallback();
  });

  await page.route('**/chat/stream', async (route) => {
    if (route.request().method() === 'POST') {
      // chat.ts SSE parser reads JSON chunks with a `content` field.
      const chunk = 'data: {"content":"Resposta ficticia de teste do Hermes."}\n\n';
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: chunk + 'data: [DONE]\n\n',
      });
      return;
    }
    await route.fallback();
  });
}
