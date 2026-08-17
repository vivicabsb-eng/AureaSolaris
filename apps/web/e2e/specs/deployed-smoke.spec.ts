import { test, expect, type Page } from '@playwright/test';

const deploymentUrl = process.env.AUREA_E2E_URL;
if (!deploymentUrl) {
  throw new Error('AUREA_E2E_URL is required for deployed smoke validation.');
}

const deploymentOrigin = new URL(deploymentUrl).origin;
const criticalResourceTypes = new Set(['document', 'script', 'stylesheet']);

function isCriticalSameOriginRequest(url: string, resourceType: string): boolean {
  if (!criticalResourceTypes.has(resourceType)) return false;
  try {
    return new URL(url).origin === deploymentOrigin;
  } catch {
    return false;
  }
}

function collectCriticalNetworkFailures(page: Page): string[] {
  const criticalFailures: string[] = [];

  page.on('requestfailed', (request) => {
    const resourceType = request.resourceType();
    if (!isCriticalSameOriginRequest(request.url(), resourceType)) return;

    criticalFailures.push(
      `${resourceType}: ${request.url()} (${request.failure()?.errorText ?? 'network failure'})`,
    );
  });

  page.on('response', (response) => {
    const request = response.request();
    const resourceType = request.resourceType();
    if (!isCriticalSameOriginRequest(response.url(), resourceType)) return;
    if (response.status() >= 200 && response.status() < 300) return;

    criticalFailures.push(`${resourceType}: ${response.url()} (HTTP ${response.status()})`);
  });

  return criticalFailures;
}

test('deployed-smoke: built web shell boots without critical static failures', async ({ page }) => {
  const pageErrors: string[] = [];
  const criticalFailures = collectCriticalNetworkFailures(page);

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response, 'root document should return an HTTP response').not.toBeNull();
  expect(response?.ok(), `root document returned ${response?.status()}`).toBe(true);

  await expect(page).toHaveTitle(/Aurea Solaris/i);
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 15_000 });

  // Let bootstrap promises and lazy static resources surface deterministic failures.
  await page.waitForTimeout(750);

  expect(pageErrors, `uncaught browser errors:\n${pageErrors.join('\n')}`).toEqual([]);
  expect(
    criticalFailures,
    `same-origin document/script/stylesheet failures:\n${criticalFailures.join('\n')}`,
  ).toEqual([]);
});

test('deployed-smoke detector treats real critical HTTP 404 responses as failures', async ({ page }) => {
  const criticalFailures = collectCriticalNetworkFailures(page);
  const missingStylesheet = `${deploymentOrigin}/__deployed-smoke-missing.css`;

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const missingResponse = page.waitForResponse((response) => response.url() === missingStylesheet);
  await page.evaluate((href) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, missingStylesheet);

  const response = await missingResponse;
  expect(response.status()).toBe(404);
  expect(criticalFailures).toHaveLength(1);
  expect(criticalFailures[0]).toContain('stylesheet:');
  expect(criticalFailures[0]).toContain('HTTP 404');
});
