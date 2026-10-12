import { defineConfig } from '@playwright/test';

export default defineConfig({
  forbidOnly: true,
  outputDir: 'test-results',
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report' }]],
  testDir: 'tests/e2e',
});
