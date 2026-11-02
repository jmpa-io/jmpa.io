// Contrast of the interactive states (hover, keyboard focus) on the link cards, across the sweep pairs and both schemes.
import { test, expect } from './fixtures';
import { SWEEP, ensureScheme, seedColours, settleStyles, type Scheme } from './helpers/palette-helpers';

const TEXT_MIN = 4.5; // hovered label vs its hovered face
const UI_MIN = 3; // focus ring vs the page (WCAG 1.4.11)

const measure = (selector: string, state: 'hover' | 'focus') => async (page: import('@playwright/test').Page) => {
  const el = page.locator(selector).first();
  if (state === 'hover') await el.hover();
  else {
    await page.keyboard.press('Tab'); // enter the document, then walk to the target
    for (let i = 0; i < 20 && !(await el.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(el).toBeFocused();
  }
  return el.evaluate((e) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const rgb = (css: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
    };
    const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a: number[], b: number[]) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const st = getComputedStyle(e);
    const page = rgb(getComputedStyle(document.body).backgroundColor);
    return {
      text: ratio(rgb(st.color), rgb(st.backgroundColor)),
      ring: ratio(rgb(st.outlineColor), page),
      ringDrawn: st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) > 0,
      face: ratio(rgb(st.backgroundColor), page),
    };
  });
};

for (const scheme of ['light', 'dark'] as Scheme[]) {
  for (const [p, s] of SWEEP) {
    test(`hover and focus states stay legible: ${p}/${s} ${scheme}`, async ({ page }) => {
      await settleStyles(page);
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/');
      await seedColours(page, p, s);
      await ensureScheme(page, scheme);

      for (const sel of ['a.card', '#theme-toggle', '.jmpa-footer-icon']) {
        const hovered = await measure(sel, 'hover')(page);
        expect(hovered.text, `${sel} hover label`).toBeGreaterThanOrEqual(TEXT_MIN);
        await page.mouse.move(0, 0);
      }
      const focused = await measure('a.card', 'focus')(page);
      expect(focused.ringDrawn).toBe(true);
      expect(focused.ring, 'card focus ring vs page').toBeGreaterThanOrEqual(UI_MIN);
      expect(focused.text, 'card focus label').toBeGreaterThanOrEqual(TEXT_MIN);
    });
  }
}
