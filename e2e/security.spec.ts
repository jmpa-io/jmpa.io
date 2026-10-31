import { test, expect } from './fixtures';
import { setColours, toggleScheme } from './helpers/palette-helpers';

for (const path of ['/', '/404.html']) {
  test(`${path}: the CSP forbids inline script/style and nothing in the page trips it`, async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
    await page.goto(path);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toMatch(/unsafe-(inline|eval)/);
    expect(await page.locator('script:not([src])').count()).toBe(0);
    expect(await page.locator('body [style]').count()).toBe(0);

    // the colour picker and the day/night toggle (the only scripted behaviour) still work under it.
    await setColours(page, '#118833', '#aa22cc');
    await toggleScheme(page);
    expect(violations).toEqual([]);
  });
}
