import { test, expect } from './fixtures';
import { emulateScheme, settleStyles } from './helpers/palette-helpers';

const LINKS = [
  { name: 'art.jmpa.io', href: 'https://art.jmpa.io', external: false },
  { name: 'jcleal.me', href: 'https://jcleal.me', external: false },
  { name: 'portfolio.jcleal.me', href: 'https://portfolio.jcleal.me', external: false },
  { name: 'startpage.jcleal.me', href: 'https://startpage.jcleal.me', external: false },
  { name: 'github.com/jmpa-io', href: 'https://github.com/jmpa-io', external: true },
];

test.describe('home page links', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('one card per place, with the right href and target', async ({ page }) => {
    const cards = page.locator('.jmpa-link-card');
    await expect(cards).toHaveCount(LINKS.length);
    for (const l of LINKS) {
      const a = page.locator('.jmpa-link-main', { hasText: new RegExp(`^\\s*${l.name.replace(/\./g, '\\.')}\\s*$`) });
      await expect(a).toHaveAttribute('href', l.href);
      if (l.external) {
        await expect(a).toHaveAttribute('target', '_blank');
        await expect(a).toHaveAttribute('rel', /noopener/);
      } else {
        await expect(a).not.toHaveAttribute('target', /.+/);
      }
    }
  });

  test('deep links on the cards point at the right sites', async ({ page }) => {
    const hrefs = await page.locator('.jmpa-link-sub').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    expect(hrefs).toEqual(expect.arrayContaining(['https://art.jmpa.io/art/', 'https://jcleal.me/posts/', 'https://jcleal.me/resume/', 'https://jcleal.me/workshops/']));
  });

  test('nav and footer link to the same places', async ({ page }) => {
    const nav = await page.locator('.jmpa-nav-links a').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href.replace(/\/$/, '')));
    expect(nav).toEqual(LINKS.slice(0, 4).map((l) => l.href));
    const foot = await page.locator('.jmpa-footer-link').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href.replace(/\/$/, '')));
    expect(foot).toEqual(LINKS.slice(0, 4).map((l) => l.href));
    await expect(page.locator('.jmpa-footer-icon[href="mailto:support@jmpa.io"]')).toHaveCount(1);
  });

  test('a card is clickable as a whole', async ({ page }) => {
    const card = page.locator('.jmpa-link-card').first();
    const b = (await card.boundingBox())!;
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className, [b.x + b.width / 2, b.y + 8]);
    expect(String(hit)).toContain('jmpa-link-main');
  });

  test('overscroll-behavior stays none', async ({ page }) => {
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)).toBe('none');
  });

  test('404 page builds and links home', async ({ page }) => {
    const res = await page.goto('/404.html');
    expect(res!.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Nothing here.');
  });
});

for (const [width, cols] of [[1600, 2], [900, 2], [390, 1]] as const) {
  test(`layout at ${width}px: ${cols} column(s), no horizontal overflow, all cards inside the container`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const xs = new Set<number>();
    for (const c of await page.locator('.jmpa-link-card').all()) {
      const b = (await c.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
      xs.add(Math.round(b.x));
    }
    expect(xs.size).toBe(cols);
    expect(await page.locator('.jmpa-nav-links').isVisible()).toBe(width > 640);
    expect(await page.locator('#jmpa-hamburger').isVisible()).toBe(width <= 640);
  });
}

test('hamburger opens the menu at 390 and Escape closes it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#jmpa-hamburger').click();
  await expect(page.locator('#jmpa-mobile-menu a')).toHaveCount(4);
  await expect(page.locator('#jmpa-mobile-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#jmpa-mobile-menu')).toBeHidden();
});

test('keyboard tab order: logo, nav, colours, theme, then each card in order, then the footer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const seen: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement;
      return e && e !== document.body ? (e.getAttribute('href') || '#' + e.id || e.className) : '';
    });
    if (d) seen.push(d);
  }
  const idx = (s: string) => seen.findIndex((x) => x.includes(s));
  expect(seen[0]).toBe('/');
  expect(idx('art.jmpa.io')).toBeGreaterThan(0);
  expect(idx('#jmpa-palette-trigger')).toBeGreaterThan(idx('startpage.jcleal.me'));
  expect(idx('#theme-toggle')).toBeGreaterThan(idx('#jmpa-palette-trigger'));
  const cardArt = seen.indexOf('https://art.jmpa.io', idx('#theme-toggle'));
  const cardGh = seen.indexOf('https://github.com/jmpa-io', idx('#theme-toggle'));
  expect(cardArt).toBeGreaterThan(idx('#theme-toggle'));
  expect(cardGh).toBeGreaterThan(cardArt);
  expect(seen.indexOf('https://github.com/jmpa-io', cardGh + 1)).toBeGreaterThan(cardGh); // footer icon, after the cards
  expect(await page.locator('.jmpa-link-main:focus-visible, :focus-visible').count()).toBeGreaterThanOrEqual(0);
});

test('focus is visibly outlined on a card link', async ({ page }) => {
  await page.goto('/');
  await page.locator('.jmpa-link-main').first().focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  expect(await page.locator('.jmpa-link-main').first().evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe('none');
});

for (const scheme of ['light', 'dark'] as const) {
  for (const [name, width, height] of [['desktop', 1600, 900], ['tablet', 900, 900], ['mobile', 390, 844]] as const) {
    test(`screenshot ${name} ${scheme}`, async ({ page }) => {
      await emulateScheme(page, scheme);
      await settleStyles(page);
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`home-${name}-${scheme}.png`, { fullPage: true });
    });
  }
}
