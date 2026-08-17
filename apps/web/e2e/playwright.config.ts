import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.AUREA_E2E_URL;
if (!baseURL) {
  throw new Error('AUREA_E2E_URL is required (set by tools/run_e2e.py or the aurea-e2e skill).');
}

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  // Specs mutate one shared isolated runtime. A retry would reuse dirty state.
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  outputDir: 'test-results',
});
