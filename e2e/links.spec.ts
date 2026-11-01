import { test, expect } from './fixtures';
import { emulateScheme, settleStyles } from './helpers/palette-helpers';

const LINKS = [
  { name: 'art.jmpa.io', href: 'https://art.jmpa.io', external: false },
  { name: 'jcleal.me', href: 'https://jcleal.me', external: false },
  { name: 'portfolio.jcleal.me', href: 'https://portfolio.jcleal.me', external: false },
  { name: 'startpage.jcleal.me', href: 'https://startpage.jcleal.me', external: false },
  { name: 'github.com/jmpa-io', href: 'https://github.com/jmpa-io', external: true },
];

test.describe('home page', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('each place is one pixel button with the right href and target', async ({ page }) => {
    await expect(page.locator('a.door')).toHaveCount(LINKS.length);
    for (const l of LINKS) {
      const a = page.locator('a.door', { hasText: new RegExp(`^\\s*${l.name.replace(/\./g, '\\.')}\\s*$`) });
      await expect(a).toHaveAttribute('href', l.href);
      if (l.external) {
        await expect(a).toHaveAttribute('target', '_blank');
        await expect(a).toHaveAttribute('rel', /noopener/);
      } else {
        await expect(a).not.toHaveAttribute('target', /.+/);
      }
    }
  });

  test('no place is listed twice (no header nav, no footer repeats)', async ({ page }) => {
    const hrefs = await page.locator('a[href^="http"]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href.replace(/\/$/, '')));
    const places = hrefs.filter((h) => LINKS.some((l) => l.href === h));
    expect(places.sort()).toEqual(LINKS.map((l) => l.href).sort());
    await expect(page.locator('header a, header button').and(page.locator(':not(#jmpa-palette-popup *)'))).toHaveCount(3); // logo, colours, theme (the popup's own controls are covered in modal.spec).
  });

  test('header is minimal: logo + the two toggles', async ({ page }) => {
    await expect(page.locator('header.bar > a.logo')).toHaveAttribute('href', '/');
    await expect(page.locator('header.bar > .palette-wrap #jmpa-palette-trigger')).toBeVisible();
    await expect(page.locator('header.bar > #theme-toggle')).toBeVisible();
    await expect(page.locator('nav.jmpa-nav, .jmpa-blob, #jmpa-hamburger')).toHaveCount(0);
  });

  test('buttons are chunky: hard border, stepped shadow, no blur, no radius; hover presses down', async ({ page }) => {
    const door = page.locator('a.door').first();
    const st = await door.evaluate((e) => { const c = getComputedStyle(e); return { bw: c.borderTopWidth, r: c.borderTopLeftRadius, sh: c.boxShadow, tr: c.transform }; });
    expect(parseFloat(st.bw)).toBeGreaterThanOrEqual(3);
    expect(st.r).toBe('0px');
    expect(st.sh.split(/0px,\s/).length).toBeGreaterThanOrEqual(2); // stepped
    expect(st.sh).not.toMatch(/\s[1-9]\d*px\s[1-9]\d*px\s[1-9]\d*px/); // offsets only, zero blur.
    await door.hover();
    expect(await door.evaluate((e) => getComputedStyle(e).transform)).not.toBe(st.tr);
  });

  test('overscroll-behavior stays none', async ({ page }) => {
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)).toBe('none');
  });

  test('pixel font is self-hosted (no external requests)', async ({ page }) => {
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('16px Silkscreen'))).toBe(true);
    expect(await page.locator('h1').evaluate((e) => getComputedStyle(e).fontFamily)).toContain('Silkscreen');
    const res = await page.request.get('/fonts/Silkscreen-OFL.txt');
    expect(res.status()).toBe(200);
  });

  test('404 page builds and links home', async ({ page }) => {
    const res = await page.goto('/404.html');
    expect(res!.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Nothing here.');
    await expect(page.locator('a.door')).toHaveAttribute('href', '/');
  });
});

for (const [width, scale] of [[1600, 7], [900, 7], [390, 3]] as const) {
  test(`layout at ${width}px: scene at ${scale}x, no horizontal overflow, everything inside the viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const scene = (await page.locator('svg.room').boundingBox())!;
    expect([scene.width, scene.height]).toEqual([96 * scale, 60 * scale]);
    for (const el of await page.locator('a.door, svg.room, .room-frame, header.bar > *, .jmpa-footer-inner').all()) {
      const b = (await el.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
    // the five buttons stay a single column.
    const xs = new Set((await Promise.all((await page.locator('a.door').all()).map((a) => a.boundingBox()))).map((b) => Math.round(b!.x)));
    expect(xs.size).toBe(1);
  });
}

test('at 1600 the scene sits beside the buttons; at 900 and 390 it stacks above them', async ({ page }) => {
  for (const [w, beside] of [[1600, true], [900, false], [390, false]] as const) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto('/');
    const scene = (await page.locator('.room-frame').boundingBox())!;
    const door = (await page.locator('a.door').first().boundingBox())!;
    expect(door.x >= scene.x + scene.width).toBe(beside);
    if (!beside) expect(door.y).toBeGreaterThan(scene.y + scene.height);
  }
});

test('keyboard tab order: logo, colours, theme, then the five buttons in order, then the footer icons', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const seen: string[] = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement;
      return e && e !== document.body ? (e.getAttribute('href') || '#' + e.id || e.className) : '';
    });
    if (d) seen.push(d);
  }
  expect(seen.slice(0, 8)).toEqual([
    '/', '#jmpa-palette-trigger', '#theme-toggle',
    'https://art.jmpa.io', 'https://jcleal.me', 'https://portfolio.jcleal.me', 'https://startpage.jcleal.me', 'https://github.com/jmpa-io',
  ]);
  expect(seen.slice(8, 10)).toEqual(['https://instagram.com/jmpa.io', 'mailto:support@jmpa.io']);
});

test('focus is visibly outlined on a button', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const a = page.locator('a.door').first();
  await expect(a).toBeFocused();
  expect(await a.evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe('none');
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
