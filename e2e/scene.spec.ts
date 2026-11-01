import { test, expect } from './fixtures';
import { ensureScheme, setColours } from './helpers/palette-helpers';
import { site } from './site';

const fills = (page: import('@playwright/test').Page, sels: string[]) =>
  page.evaluate((sels) => sels.map((s) => getComputedStyle(document.querySelector(s)!).fill), sels);

test.describe('pixel room scene', () => {
  test('is a labelled image, rendered pixelated on a crisp grid', async ({ page }) => {
    await page.goto('/');
    const svg = page.locator('svg.room');
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute('role', 'img');
    expect(((await svg.getAttribute('aria-label')) || '').length).toBeGreaterThan(40);
    expect(await svg.getAttribute('aria-label')).toMatch(/typing/i);
    await expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
    expect(await svg.evaluate((e) => getComputedStyle(e).imageRendering)).toBe('pixelated');
    expect(await page.locator('svg.room path').count()).toBeGreaterThan(100);
    // integer scale: every grid unit is a whole number of CSS pixels.
    const b = (await svg.boundingBox())!;
    expect(b.width % 108).toBe(0);
    expect(b.height % 68).toBe(0);
    expect(b.width / 108).toBe(b.height / 68);
  });

  test('has the guy, the monitor, the cursor and the mug', async ({ page }) => {
    await page.goto('/');
    for (const s of ['.guy', '.head', '.hp', '.monitor .sc', '.cursor', '.mug .steam .st', '.window', '.cat', '.lamp', '.plant', '.notes']) {
      expect(await page.locator(`svg.room ${s}`).count(), s).toBeGreaterThan(0);
    }
  });

  test('follows the colour picker, in both schemes', async ({ page }) => {
    const sels = ['.wl', '.fl', '.rg', '.sc', '.bk1'];
    for (const scheme of ['light', 'dark'] as const) {
      await page.goto('/');
      await page.evaluate(() => localStorage.removeItem('palette-custom'));
      await page.reload();
      await ensureScheme(page, scheme);
      const before = await fills(page, sels.map((s) => `svg.room ${s}`));
      await setColours(page, '#118833', '#aa22cc');
      const after = await fills(page, sels.map((s) => `svg.room ${s}`));
      for (let i = 0; i < sels.length; i++) expect(after[i], `${scheme} ${sels[i]}`).not.toBe(before[i]);
    }
  });

  test('day shows the sun, night shows the moon and a dark room with the monitor glow', async ({ page }) => {
    await page.goto('/');
    await ensureScheme(page, 'light');
    await expect(page.locator('svg.room .by-day')).toBeVisible();
    await expect(page.locator('svg.room .by-night')).toBeHidden();
    const day = await fills(page, ['svg.room .wl']);
    expect(await page.locator('svg.room .glow path').first().evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
    await ensureScheme(page, 'dark');
    await expect(page.locator('svg.room .by-night')).toBeVisible();
    await expect(page.locator('svg.room .by-day')).toBeHidden();
    expect(await fills(page, ['svg.room .wl'])).not.toEqual(day);
    expect(Number(await page.locator('svg.room .glow path').first().evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0);
  });

  test('animates with motion allowed (typing, scrolling code, cursor, steam, build flash, cat, RGB)', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'no-preference', baseURL: `http://localhost:${site.port}` });
    const page = await ctx.newPage();
    await page.goto('/');
    const names = await page.evaluate(() => document.getAnimations().map((a) => (a as CSSAnimation).animationName));
    for (const n of ['hand-a', 'hand-b', 'hand-c', 'grow', 'advance', 'blink', 'rise', 'scroll', 'toast', 'cat-blink', 'tail-a', 'rgb', 'drift']) expect(names, n).toContain(n);
    const a = page.locator('svg.room .h-a');
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) { seen.add(await a.evaluate((e) => getComputedStyle(e).opacity)); await page.waitForTimeout(90); }
    expect(seen.size).toBeGreaterThan(1); // the hands alternate.
    await ctx.close();
  });

  test('respects prefers-reduced-motion: no animations, a complete still frame', async ({ page }) => {
    await page.goto('/'); // the shared config already emulates reduce.
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator('svg.room .h-a')).toBeVisible();
    await expect(page.locator('svg.room .h-b')).toBeHidden();
    await expect(page.locator('svg.room .h-c')).toBeHidden();
    await expect(page.locator('svg.room .cursor')).toBeVisible();
  });
});
