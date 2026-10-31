// Site-specific settings for the shared e2e master (playwright.config.ts + helpers/palette-helpers.ts).
import type { Page, PlaywrightTestConfig } from '@playwright/test';

export const site: {
  name: string;
  port: number;
  siteDir: string;
  defaults?: [string, string]; // [primary, secondary] default pair when it differs from sunset.
  snapshotTemplate?: string;
  projects: NonNullable<PlaywrightTestConfig['projects']>;
  sel: { trigger: string; popup: string; primary: string; secondary: string; reset: string; note: string; toggle: string };
  openPicker?: (page: Page) => Promise<void>;
} = {
  name: 'jmpa.io',
  port: Number(process.env.E2E_PORT || 4172), // E2E_PORT lets a second checkout/worktree run beside the first.
  siteDir: '../public',
  defaults: ['#0a2a6b', '#2f7fae'], // deep navy
  snapshotTemplate: '{testDir}/{testFileName}-snapshots/{arg}{ext}',
  projects: [{ name: 'chrome', use: { viewport: { width: 1280, height: 800 } } }], // each test sets the viewport it needs.
  sel: {
    trigger: '#jmpa-palette-trigger',
    popup: '#jmpa-palette-popup',
    primary: '#jmpa-custom-primary',
    secondary: '#jmpa-custom-secondary',
    reset: '#jmpa-custom-reset',
    note: '#jmpa-custom-note',
    toggle: '#theme-toggle',
  },
};
