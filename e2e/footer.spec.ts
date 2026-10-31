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
      for (const el of await page.locator('.jmpa-footer-right > *, .jmpa-footer-left > *, .jmpa-footer-bottom > *').all()) {
        const b = await box(el);
        expect(b.x, 'left edge').toBeGreaterThanOrEqual(f.x - 0.5);
        expect(b.x + b.width, 'right edge').toBeLessThanOrEqual(f.x + f.width + 0.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}

test('footer right side: items share one height and centre line (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const items = await page.locator('.jmpa-footer-right > a').all();
  expect(items.length).toBeGreaterThanOrEqual(7); // 4 site links + 3 icons.
  const boxes = await Promise.all(items.map(box));
  for (const b of boxes) {
    expect(Math.abs(b.height - boxes[0].height)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.y + b.height / 2 - (boxes[0].y + boxes[0].height / 2))).toBeLessThanOrEqual(1);
  }
  // the icons all render at one size.
  for (const svg of await page.locator('.jmpa-footer-icon svg').all()) {
    const s = await box(svg);
    expect([s.width, s.height]).toEqual([16, 16]);
  }
  // icon centres sit on the same line as the text links' centres.
  const icon = await box(page.locator('.jmpa-footer-icon svg').first());
  const text = await box(page.locator('.jmpa-footer-link').first());
  expect(Math.abs(icon.y + icon.height / 2 - (text.y + text.height / 2))).toBeLessThanOrEqual(1);
});

test('footer bottom row: copyright and back-to-top share a centre line, right edge lines up with the icons', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const copy = await box(page.locator('.jmpa-footer-bottom > span'));
  const top = await box(page.locator('.jmpa-back-to-top'));
  expect(Math.abs(copy.y + copy.height / 2 - (top.y + top.height / 2))).toBeLessThanOrEqual(1);
  const lastIcon = await box(page.locator('.jmpa-footer-icon').last());
  expect(Math.abs(lastIcon.x + lastIcon.width - (top.x + top.width))).toBeLessThanOrEqual(1);
});

test('footer wraps inside the container at 390', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const right = await box(page.locator('.jmpa-footer-right'));
  expect(right.x + right.width).toBeLessThanOrEqual(390);
  const ys = new Set((await Promise.all((await page.locator('.jmpa-footer-right > a').all()).map(box))).map((b) => Math.round(b.y)));
  expect(ys.size).toBeGreaterThan(1); // it did wrap, and nothing overflowed (checked above).
});

for (const scheme of ['light', 'dark'] as const) {
  test(`footer text meets AA (${scheme})`, async ({ page }) => {
    await emulateScheme(page, scheme);
    await settleStyles(page);
    await page.goto('/');
    expect(await contrastFailures(page, 4.5, 'footer')).toEqual([]);
  });
}

test('footer social links open in a new tab and github uses the official mark', async ({ page }) => {
  await page.goto('/');
  for (const a of await page.locator('.jmpa-footer-icon[href^="http"]').all()) {
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', /noopener/);
    await expect(a).toHaveAttribute('aria-label', /.+/);
  }
  await expect(page.locator('.jmpa-footer-icon[href*="github.com"] svg[data-icon="github"]')).toBeVisible();
  await expect(page.locator('.jmpa-footer-icon[href^="mailto:"]')).toHaveCount(1);
});
