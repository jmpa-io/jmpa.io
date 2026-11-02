import { test, expect, external } from './fixtures';

const LINKS: [string, string][] = [
  ['Resume', 'https://jcleal.me/resume'],
  ['Blog', 'https://jcleal.me'],
  ['GitHub', 'https://github.com/jcleal'],
  ['github.com/jmpa-io', 'https://github.com/jmpa-io'],
  ['portfolio.jcleal.me', 'https://portfolio.jcleal.me'],
  ['art.jmpa.io', 'https://art.jmpa.io'],
  ['startpage.jcleal.me', 'https://startpage.jcleal.me'],
  ['Instagram', 'https://instagram.com/jmpa.io'],
];

test.describe('jmpa.io simple page', () => {
  test('shows the programming gif and every link as a button', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('img.hero.day');
    await expect(hero).toBeVisible();
    expect(await hero.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    for (const [name, href] of LINKS) {
      const a = page.getByRole('link', { name, exact: true });
      await expect(a).toHaveAttribute('href', href);
      await expect(a).toHaveAttribute('rel', /noopener/);
    }
    await expect(page.getByRole('link', { name: 'Email', exact: true })).toHaveAttribute('href', /^mailto:/);
    await expect(page.locator('li a')).toHaveCount(LINKS.length + 1);
  });

  test('the list is centred', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const box = await page.locator('ul').boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.x + box!.width / 2 - 640)).toBeLessThan(2);
  });

  test('day/night toggle swaps the symbol and the colours', async ({ page }) => {
    await page.goto('/');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const day = await bg();
    await expect(page.locator('.mode .moon')).toBeVisible();
    await expect(page.locator('.mode .sun')).toBeHidden();
    await expect(page.locator('img.hero.day')).toBeVisible();
    await expect(page.locator('img.hero.night')).toBeHidden();
    await page.locator('label.mode').click();
    await expect(page.locator('.mode .sun')).toBeVisible();
    await expect(page.locator('.mode .moon')).toBeHidden();
    expect(await bg()).not.toBe(day);
    await expect(page.locator('img.hero.night')).toBeVisible();
    await expect(page.locator('img.hero.day')).toBeHidden();
    expect(await page.locator('img.hero.night').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  });

  test('ships no scripts, forbids them in the CSP and makes no external requests', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('script')).toHaveCount(0);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /script-src 'none'/);
    expect(external(page)).toEqual([]);
  });

  test('links are reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // the hidden theme checkbox
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Resume', exact: true })).toBeFocused();
  });

  test('does not scroll sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('every layout option loads with all the links', async ({ page }) => {
    await page.goto('/designs/');
    const slugs = await page.locator('li a').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    expect(slugs.length).toBe(6);
    for (const s of slugs) {
      await page.goto(`/designs/${s}`);
      await expect(page.locator('li a')).toHaveCount(LINKS.length + 1);
      await expect(page.locator('img.hero.day')).toBeVisible();
    }
  });
});
