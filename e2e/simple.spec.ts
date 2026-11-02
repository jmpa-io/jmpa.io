import { test, expect, external } from './fixtures';
import type { Page } from '@playwright/test';

const link = (page: Page, name: string) => page.locator('a', { has: page.locator('b', { hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) });

const LINKS: [string, string][] = [
  ['Resume & Blog', 'https://jcleal.me'],
  ['github.com/jcleal', 'https://github.com/jcleal'],
  ['github.com/jmpa-io', 'https://github.com/jmpa-io'],
  ['portfolio.jcleal.me', 'https://portfolio.jcleal.me'],
  ['art.jmpa.io', 'https://art.jmpa.io'],
  ['startpage.jcleal.me', 'https://startpage.jcleal.me'],
  ['Instagram', 'https://instagram.com/jmpa.io'],
];

test.describe('jmpa.io simple page', () => {
  test('shows the programming gif and every link as a button', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('#hero');
    await expect(hero).toBeVisible();
    expect(await hero.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    for (const [name, href] of LINKS) {
      const a = link(page, name);
      await expect(a).toHaveAttribute('href', href);
      await expect(a).toHaveAttribute('rel', /noopener/);
    }
    await expect(link(page, 'Email')).toHaveAttribute('href', /^mailto:/);
    await expect(page.locator('li a')).toHaveCount(LINKS.length + 1);
  });

  test('the list is centred', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const box = await page.locator('ul.grid').first().boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.x + box!.width / 2 - 640)).toBeLessThan(2);
  });

  test('day/night toggle swaps the symbol, the colours and the scene, and is remembered', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#theme-toggle');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const day = await bg();
    const moon = await toggle.innerHTML();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(page.locator('#logo')).toHaveAttribute('src', /meadow-day-192/);
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await toggle.innerHTML()).not.toBe(moon);
    expect(await bg()).not.toBe(day);
    await expect(page.locator('#logo')).toHaveAttribute('src', /night-192/);
    await expect(page.locator('#hero')).toHaveAttribute('src', '/walls/night.png');
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('the colour picker recolours the page, is remembered and resets', async ({ page }) => {
    await page.goto('/');
    const tile = () => page.evaluate(() => getComputedStyle(document.querySelector('a.k0')!).backgroundColor);
    const before = await tile();
    await page.locator('#jmpa-palette-trigger').click();
    await expect(page.locator('#jmpa-palette-popup')).toBeVisible();
    await page.locator('#jmpa-custom-primary').fill('#2288dd');
    await expect.poll(tile).not.toBe(before);
    const picked = await tile();
    await page.reload();
    expect(await tile()).toBe(picked);
    await page.locator('#jmpa-palette-trigger').click();
    await page.locator('#jmpa-custom-reset').click();
    await expect.poll(tile).toBe(before);
    await page.keyboard.press('Escape');
    await expect(page.locator('#jmpa-palette-popup')).toBeHidden();
  });

  test('clicking the logo steps through the themes: logo, favicon and scene change together, and is remembered', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('#logo');
    const hero = page.locator('#hero');
    const favicon = page.locator('link[rel="icon"][type="image/png"][sizes="32x32"]');
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push((await logo.getAttribute('src'))!);
      const theme = seen[i].match(/logos\/(.+)-192/)![1];
      await expect(hero).toHaveAttribute('src', `/walls/${theme}.png`);
      await page.locator('#logo-btn').click();
    }
    expect(new Set(seen).size).toBe(6);
    expect(await logo.getAttribute('src')).toBe(seen[0]); // wrapped around
    await page.locator('#logo-btn').click();
    const second = await logo.getAttribute('src');
    expect(second).toBe(seen[1]);
    await expect(favicon).toHaveAttribute('href', second!.replace('-192', '-32'));
    await page.locator('#hero-btn').click(); // the big scene cycles too
    await expect(logo).not.toHaveAttribute('src', second!);
    await page.locator('#logo-btn').click();
    await page.locator('#logo-btn').click();
    await page.locator('#logo-btn').click();
    await page.locator('#logo-btn').click();
    await page.locator('#logo-btn').click();
    await expect(logo).toHaveAttribute('src', second!);
    await page.reload();
    await expect(logo).toHaveAttribute('src', second!);
    expect(await hero.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  });

  test('the colour and day/night buttons sit within the content column', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/');
    const tools = await page.locator('.tools').boundingBox();
    const list = await page.locator('ul.grid').first().boundingBox();
    expect(tools!.x + tools!.width).toBeLessThanOrEqual(list!.x + list!.width + 2);
  });

  test('links sit in two columns on desktop and one on a phone, each with an icon', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const xs = await page.locator('ul.grid li a').evaluateAll((as) => [...new Set(as.map((a) => Math.round(a.getBoundingClientRect().x)))]);
    expect(xs.length).toBe(2);
    await expect(page.locator('li a .ico svg')).toHaveCount(LINKS.length + 1);
    await page.setViewportSize({ width: 390, height: 800 });
    const xs2 = await page.locator('ul.grid li a').evaluateAll((as) => [...new Set(as.map((a) => Math.round(a.getBoundingClientRect().x)))]);
    expect(xs2.length).toBe(1);
  });

  test('only same-origin scripts, no inline script, and no external requests', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(await page.locator('script:not([src])').count()).toBe(0);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /script-src 'self';/);
    expect(external(page)).toEqual([]);
  });

  test('links are reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // colours
    await page.keyboard.press('Tab'); // day / night
    await page.keyboard.press('Tab'); // logo
    await page.keyboard.press('Tab');
    await expect(link(page, 'Instagram')).toBeFocused();
  });

  test('Instagram and Email sit under the tagline, and the jmpa.io links come first with art first', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const tag = await page.locator('header p').boundingBox();
    const ig = await link(page, 'Instagram').boundingBox();
    const mail = await link(page, 'Email').boundingBox();
    const hero = await page.locator('#hero').boundingBox();
    expect(ig!.y).toBeGreaterThanOrEqual(tag!.y + tag!.height);
    expect(Math.abs(ig!.y - mail!.y)).toBeLessThan(2);
    expect(mail!.y + mail!.height).toBeLessThanOrEqual(hero!.y);
    await expect(page.locator('section h2')).toHaveText(['Sites', 'Me']);
    const order = await page.locator('ul.grid li a b').allTextContents();
    expect(order).toEqual(['art.jmpa.io', 'github.com/jmpa-io', 'portfolio.jcleal.me', 'startpage.jcleal.me', 'Resume & Blog', 'github.com/jcleal']);
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
      await expect(page.locator('li a')).toHaveCount(9);
      await expect(page.locator('img.hero.day')).toBeVisible();
    }
  });
});
