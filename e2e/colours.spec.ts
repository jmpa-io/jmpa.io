import { test, expect } from './fixtures';
import { site } from './site';
import {
  DEFAULT_PAIR, SWEEP, contrastFailures, setColours, openPopup, resetColours, toggleScheme, ensureScheme, isDark,
  emulateScheme, storedColours, storedScheme, seedColours, recordEarly, settleStyles,
} from './helpers/palette-helpers';
import type { Page } from '@playwright/test';

const S = site.sel;
const css = (page: Page, sel: string, p: string) => page.locator(sel).first().evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), p);
const palVar = (page: Page, v = '--pal-primary') => page.evaluate((v) => document.documentElement.style.getPropertyValue(v), v);

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await settleStyles(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
});

test.describe('midnight default', () => {
  test('first load is #4f8cff / #22d3ee with nothing stored', async ({ page }) => {
    expect(DEFAULT_PAIR).toEqual(['#4f8cff', '#22d3ee']);
    expect(await storedColours(page)).toBeNull();
    expect(await palVar(page)).toBe('#4f8cff');
    expect(await palVar(page, '--pal-secondary')).toBe('#22d3ee');
    await openPopup(page);
    await expect(page.locator(S.primary)).toHaveValue('#4f8cff');
    await expect(page.locator(S.secondary)).toHaveValue('#22d3ee');
  });

  test('Reset returns to the variant default and clears storage', async ({ page }) => {
    await setColours(page, '#118833', '#aa22cc');
    expect(await palVar(page)).toBe('#118833');
    await resetColours(page);
    expect(await storedColours(page)).toBeNull();
    await expect(page.locator(S.primary)).toHaveValue('#4f8cff');
    expect(await palVar(page)).toBe('#4f8cff');
  });

  for (const bad of ['{"primary":"red;}"}', '{"primary":"#12345","secondary":"#aa22cc"}', 'not json']) {
    test(`corrupt storage falls back to the default: ${bad}`, async ({ page }) => {
      await page.evaluate((v) => localStorage.setItem('palette-custom', v), bad);
      await page.reload();
      expect(await palVar(page)).toBe('#4f8cff');
    });
  }

  test('no sunset anywhere in the rendered page', async ({ page }) => {
    expect((await page.content()).toLowerCase()).not.toContain('c04828');
  });
});

test.describe('colour picker', () => {
  test('two inputs + reset; Escape and outside click close it', async ({ page }) => {
    await openPopup(page);
    await expect(page.locator(S.trigger)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator(S.popup)).not.toHaveClass(/open/);
    await openPopup(page);
    await page.mouse.click(20, 500);
    await expect(page.locator(S.popup)).not.toHaveClass(/open/);
  });

  test('colours drive page bg, cards, title, and buttons, in both schemes', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      const read = async () => ({
        bg: await css(page, 'body', 'background-color'),
        card: await css(page, '.card', 'border-color'),
        title: await css(page, 'h1', 'color'),
        btn: await css(page, '.btn', 'background-color'),
      });
      await page.evaluate(() => localStorage.removeItem('palette-custom'));
      await page.reload();
      await ensureScheme(page, scheme);
      const before = await read();
      await setColours(page, '#118833', '#aa22cc');
      const after = await read();
      for (const k of Object.keys(before) as (keyof typeof before)[]) expect(after[k], `${scheme} ${k}`).not.toBe(before[k]);
    }
  });

  test('persists, applied before DOMContentLoaded', async ({ page }) => {
    await setColours(page, '#118833', '#aa22cc');
    expect(JSON.parse((await storedColours(page))!)).toEqual({ primary: '#118833', secondary: '#aa22cc' });
    await recordEarly(page, 'colour');
    await page.reload();
    expect(await page.evaluate(() => (window as any).__early)).toBe('#118833');
    await expect(page.locator(S.primary)).toHaveValue('#118833');
  });

  test('note appears only when a pick had to be adjusted', async ({ page }) => {
    await setColours(page, '#fffde0', '#fffde0');
    await expect(page.locator(S.note)).not.toBeEmpty();
    await seedColours(page, '#7cc4ff', '#6ee7b7');
    await openPopup(page);
    await expect(page.locator(S.note)).toBeEmpty();
  });

  test('popup fits the viewport at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await openPopup(page);
    const box = (await page.locator(S.popup).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });
});

test.describe('contrast AA across picks (whole page)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const [p, s] of SWEEP) {
      test(`${p}/${s} (${scheme})`, async ({ page }) => {
        await ensureScheme(page, scheme);
        await setColours(page, p, s);
        const bad = await contrastFailures(page, 4.5);
        expect(bad, JSON.stringify(bad.slice(0, 5))).toEqual([]);
        expect(await page.evaluate(() => (window as any).__auditCount)).toBeGreaterThan(10);
      });
    }
  }
});

test.describe('day/night scheme', () => {
  for (const os of ['light', 'dark'] as const) {
    test(`dark is the default whatever the OS says (${os}) with no stored choice`, async ({ page }) => {
      await emulateScheme(page, os);
      await page.evaluate(() => localStorage.removeItem('scheme'));
      await page.reload();
      expect(await isDark(page)).toBe(true);
    });
  }

  test('applied before first paint', async ({ page }) => {
    await emulateScheme(page, 'dark');
    await recordEarly(page, 'dark');
    await page.reload();
    expect(await page.evaluate(() => (window as any).__early)).toBe(true);
  });

  test('toggle shows a visible sun/moon icon in both schemes', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await page.evaluate((s) => localStorage.setItem('scheme', s), scheme);
      await page.reload();
      const svg = page.locator(S.toggle + ' svg');
      await expect(svg).toBeVisible();
      expect(await svg.locator('path, circle').count()).toBeGreaterThan(0);
    }
  });

  test('toggle persists under `scheme` across reload', async ({ page }) => {
    await toggleScheme(page);
    expect(await storedScheme(page)).toBe('light');
    await page.reload();
    expect(await isDark(page)).toBe(false);
    await toggleScheme(page);
    expect(await storedScheme(page)).toBe('dark');
  });
});
