import { test, expect } from './fixtures';
import fs from 'node:fs';

const OUT = 'screenshots';
const VIEWPORTS = { desktop: { width: 1300, height: 800 }, phone: { width: 390, height: 844 } };
const THEMES = 6; // meadow-day, dusk, night, autumn, sunrise, mist: one hero click each.

fs.mkdirSync(OUT, { recursive: true });

for (const [vp, size] of Object.entries(VIEWPORTS)) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`screenshots ${vp} ${scheme}: every wall theme`, async ({ page }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('requestfailed', (r) => {
        if (/^https?:\/\/localhost/.test(r.url())) errors.push(`failed: ${r.url()}`);
      });
      page.on('response', (r) => {
        if (/^https?:\/\/localhost/.test(r.url()) && r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`);
      });

      await page.setViewportSize(size);
      await page.goto('/');
      const html = page.locator('html');
      if (scheme === 'dark') {
        await page.locator('#theme-toggle').click();
        await expect(html).toHaveClass(/dark/);
      } else {
        await expect(html).not.toHaveClass(/dark/);
      }

      const seen = new Set<string>();
      for (let i = 0; i < THEMES; i++) {
        if (i > 0) await page.locator('#hero-btn').click();
        const hero = page.locator('#hero');
        await expect(hero).toBeVisible();
        await expect.poll(() => hero.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
        const theme = ((await hero.getAttribute('src')) ?? '').replace(/^.*\/|\.png$/g, '');
        seen.add(theme);

        // styled: a theme background is applied, and the tile grid is laid out rather than a plain list.
        const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(bg).not.toMatch(/^(rgba\(0, 0, 0, 0\)|rgb\(255, 255, 255\)|rgba\(255, 255, 255, 1\))$/);
        expect(await page.evaluate(() => getComputedStyle(document.querySelector('ul.grid')!).display)).toBe('grid');
        await expect(page.locator('h1')).toBeVisible();

        const file = `${OUT}/${vp}-${scheme}-${theme}.png`;
        const buf = await page.screenshot({ path: file, fullPage: true });
        expect(buf.length).toBeGreaterThan(20_000); // not blank
      }
      expect(seen.size).toBe(THEMES);
      expect(errors).toEqual([]);
    });
  }
}
