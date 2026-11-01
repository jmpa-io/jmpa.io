import { test, expect } from './fixtures';
import { emulateScheme, contrastFailures, settleStyles } from './helpers/palette-helpers';

const WIDTHS = [1600, 1280, 900, 640, 390];
const box = async (loc: import('@playwright/test').Locator) => (await loc.boundingBox())!;

for (const scheme of ['light', 'dark'] as const) {
  for (const width of WIDTHS) {
    test(`footer ${scheme} ${width}`, async ({ page }) => {
      await emulateScheme(page, scheme);
      await settleStyles(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const footer = page.locator('footer.jmpa-footer');
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toHaveScreenshot(`footer-${scheme}-${width}.png`);

      // nothing is clipped or pushed outside the footer container / viewport.
      const f = await box(footer);
      for (const el of await page.locator('.jmpa-footer-right > *, .jmpa-footer-left > *, .jmpa-footer-copy').all()) {
        const b = await box(el);
        expect(b.x, 'left edge').toBeGreaterThanOrEqual(f.x - 0.5);
        expect(b.x + b.width, 'right edge').toBeLessThanOrEqual(f.x + f.width + 0.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}

test('footer is slim: brand, tagline, two icons and the copyright', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.locator('.jmpa-footer-icon')).toHaveCount(2);
  await expect(page.locator('.jmpa-footer-link, .jmpa-back-to-top')).toHaveCount(0);
  expect((await box(page.locator('footer.jmpa-footer'))).height).toBeLessThan(160);
  const items = await Promise.all((await page.locator('.jmpa-footer-icon').all()).map(box));
  for (const b of items) {
    expect(Math.abs(b.height - items[0].height)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.y - items[0].y)).toBeLessThanOrEqual(1);
  }
  for (const svg of await page.locator('.jmpa-footer-icon svg').all()) {
    const s = await box(svg);
    expect([s.width, s.height]).toEqual([16, 16]);
  }
});

test('footer wraps inside the container at 390', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const right = await box(page.locator('.jmpa-footer-right'));
  expect(right.x + right.width).toBeLessThanOrEqual(390);
  const left = await box(page.locator('.jmpa-footer-left'));
  expect(right.y).toBeGreaterThan(left.y); // stacked under the brand.
});

for (const scheme of ['light', 'dark'] as const) {
  test(`footer text meets AA (${scheme})`, async ({ page }) => {
    await emulateScheme(page, scheme);
    await settleStyles(page);
    await page.goto('/');
    expect(await contrastFailures(page, 4.5, 'footer')).toEqual([]);
  });
}

test('footer social links open in a new tab', async ({ page }) => {
  await page.goto('/');
  const insta = page.locator('.jmpa-footer-icon[href^="https://instagram.com"]');
  await expect(insta).toHaveAttribute('target', '_blank');
  await expect(insta).toHaveAttribute('rel', /noopener/);
  for (const a of await page.locator('.jmpa-footer-icon').all()) await expect(a).toHaveAttribute('aria-label', /.+/);
  await expect(page.locator('.jmpa-footer-icon[href^="mailto:"]')).toHaveCount(1);
});
