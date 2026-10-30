import { defineConfig } from '@playwright/test';

const port = 4172;

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  snapshotPathTemplate: '{testDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' } },
  use: {
    baseURL: `http://localhost:${port}`,
    channel: 'chrome', // system Chrome: no browser download needed.
    reducedMotion: 'reduce',
    timezoneId: 'Australia/Melbourne',
    locale: 'en-AU',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
  ],
  webServer: {
    // Serves the already-built site: `hugo --baseURL http://localhost:4172/` then SITE_DIR=<dir> to override.
    command: 'node server.mjs',
    env: { PORT: String(port), SITE_DIR: process.env.SITE_DIR || '../public' },
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
  },
});
