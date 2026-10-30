import { test, expect } from './fixtures';
import { site } from './site';
import {
  SWEEP, NAMED, contrast, contrastFailures, setColours, openPopup, resetColours, toggleScheme, ensureScheme, isDark,
  emulateScheme, storedColours, storedScheme, seedColours, recordEarly, settleStyles,
} from './helpers/palette-helpers';

const S = site.sel;
// Coarse pointers open on a single tap; mouse needs a double-click.
const openRoom = async (page) => {
  if (await page.locator('#win-room').isVisible()) return;
  const icon = page.getByRole('button', { name: 'room.exe' }).first();
  if (test.info().project.name === 'mobile') await icon.click();
  else await icon.dblclick();
  await expect(page.locator('#win-room')).toBeVisible();
};
const css = (page, sel: string, p: string) => page.locator(sel).first().evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), p);

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => { throw e; });
  await settleStyles(page);
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.icon-img svg').first()).toBeAttached();
});

test.describe('Display dialog (colour picker)', () => {
  test('two inputs + reset; Escape and outside click close it', async ({ page }) => {
    await openPopup(page);
    await expect(page.locator(S.primary)).toHaveValue('#c04828');
    await expect(page.locator(S.secondary)).toHaveValue('#2f7fae');
    await expect(page.locator(S.trigger)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator(S.popup)).not.toHaveClass(/open/);
    await openPopup(page);
    await page.mouse.click(400, 300);
    await expect(page.locator(S.popup)).not.toHaveClass(/open/);
  });

  test('interacting with the colour inputs keeps it open', async ({ page }) => {
    await openPopup(page);
    await page.locator(S.primary).click({ force: true });
    await page.locator('.dlg-body').click({ position: { x: 4, y: 4 } });
    await expect(page.locator(S.popup)).toHaveClass(/open/);
  });

  test('primary drives title bars + selection, secondary tints the desktop; both schemes', async ({ page }) => {
    for (const scheme of ['light', 'dark'] as const) {
      await ensureScheme(page, scheme);
      await openRoom(page);
      const read = async () => ({
        bar: await css(page, '#win-room .win-bar', 'background-image'),
        tint: await css(page, '.desktop', '--pal-desk'),
        swatch: await css(page, '.swatch', 'background-image'),
      });
      const before = await read();
      await setColours(page, '#118833', '#aa22cc');
      const after = await read();
      for (const k of Object.keys(before) as (keyof typeof before)[]) expect(after[k], `${scheme} ${k}`).not.toBe(before[k]);
      await resetColours(page);
    }
  });

  test('persists, applied before DOMContentLoaded, inputs reflect it', async ({ page }) => {
    await setColours(page, '#118833', '#aa22cc');
    expect(JSON.parse((await storedColours(page))!)).toEqual({ primary: '#118833', secondary: '#aa22cc' });
    await recordEarly(page, 'colour');
    await page.reload();
    expect(await page.evaluate(() => (window as any).__early)).toBe('#118833');
    await expect(page.locator(S.primary)).toHaveValue('#118833');
  });

  test('old `palette` key migrates once and is deleted', async ({ page }) => {
    await page.evaluate(() => { localStorage.setItem('palette', 'teal'); localStorage.removeItem('palette-custom'); });
    await page.reload();
    expect(JSON.parse((await storedColours(page))!)).toEqual({ primary: '#007c6e', secondary: '#cf386b' });
    expect(await page.evaluate(() => localStorage.getItem('palette'))).toBeNull();
  });

  test('Reset restores defaults and clears storage', async ({ page }) => {
    await setColours(page, '#118833', '#aa22cc');
    await resetColours(page);
    expect(await storedColours(page)).toBeNull();
    await expect(page.locator(S.primary)).toHaveValue('#c04828');
  });

  for (const bad of ['{"primary":"red;}"}', '{"primary":"#12345","secondary":"#aa22cc"}', 'not json']) {
    test(`corrupt storage ignored: ${bad}`, async ({ page }) => {
      await page.evaluate((v) => localStorage.setItem('palette-custom', v), bad);
      await page.reload();
      await expect(page.locator(S.primary)).toHaveValue('#c04828');
      expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--pal-primary'))).toBe('#c04828');
    });
  }

  test('note appears only when a pick had to be adjusted', async ({ page }) => {
    await setColours(page, '#fffde0', '#fffde0');
    await expect(page.locator(S.note)).not.toBeEmpty();
    await setColours(page, '#8a3a20', '#2a6590');
    await expect(page.locator(S.note)).toBeEmpty();
  });

  test('dialog fits the viewport', async ({ page }) => {
    await openPopup(page);
    const box = (await page.locator(S.popup).boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
  });
});

test.describe('contrast AA across picks (taskbar, dialog, window, start menu)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const [p, s] of SWEEP) {
      test(`${p}/${s} (${scheme})`, async ({ page }) => {
        await ensureScheme(page, scheme);
        await openRoom(page);
        await setColours(page, p, s);
        // gradient title bars/banner are checked separately below (the walker only sees flat backgrounds).
        const flat = (f) => f.filter((x) => !/win-title|^SPAN\.$/.test(x.tag));
        const bad = flat([...(await contrastFailures(page, 4.5, '.taskbar')), ...(await contrastFailures(page, 4.5, '#win-room'))]);
        const bar = await page.evaluate(() => {
          const d = document.createElement('div');
          d.style.color = 'var(--pal-title-a)';
          document.body.appendChild(d);
          const c = document.createElement('canvas').getContext('2d')!;
          c.fillStyle = getComputedStyle(d).color;
          c.fillRect(0, 0, 1, 1);
          d.remove();
          return Array.from(c.getImageData(0, 0, 1, 1).data.slice(0, 3));
        });
        expect(contrast([255, 255, 255], bar), 'white title text on the title bar').toBeGreaterThanOrEqual(4.5);
        await page.locator('#display-btn').click(); // close dialog, then audit the Start menu
        await page.locator('#start-btn').click();
        bad.push(...flat(await contrastFailures(page, 4.5, '#start-menu')));
        expect(bad, JSON.stringify(bad.slice(0, 5))).toEqual([]);
      });
    }
  }
});

test.describe('day/night scheme', () => {
  for (const os of ['light', 'dark'] as const) {
    test(`defaults to the OS (${os}) with no stored choice`, async ({ page }) => {
      await emulateScheme(page, os);
      await page.evaluate(() => localStorage.removeItem('scheme'));
      await page.reload();
      expect(await isDark(page)).toBe(os === 'dark');
    });
  }

  test('applied before first paint', async ({ page }) => {
    await emulateScheme(page, 'dark');
    await recordEarly(page, 'dark');
    await page.reload();
    expect(await page.evaluate(() => (window as any).__early)).toBe(true);
  });

  test('toggle persists under `scheme` across reload, with aria-pressed', async ({ page }) => {
    await emulateScheme(page, 'light');
    await page.reload();
    await expect(page.locator(S.toggle)).toHaveAttribute('aria-pressed', 'false');
    await toggleScheme(page);
    expect(await storedScheme(page)).toBe('dark');
    await expect(page.locator(S.toggle)).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    expect(await isDark(page)).toBe(true);
  });

  test('dark Win98: dark faces, title bar unchanged', async ({ page }) => {
    await emulateScheme(page, 'light');
    await page.reload();
    const face = () => css(page, '.taskbar', 'background-color');
    const lightFace = await face();
    await toggleScheme(page);
    expect(await face()).not.toBe(lightFace);
    await openRoom(page);
    expect(await css(page, '#win-room .win-bar', 'background-image')).toContain('oklch');
  });

  test('OS change live-updates only while there is no explicit choice', async ({ page }) => {
    await emulateScheme(page, 'light');
    await page.evaluate(() => localStorage.removeItem('scheme'));
    await page.reload();
    await emulateScheme(page, 'dark');
    await expect.poll(() => isDark(page)).toBe(true);
    await toggleScheme(page); // explicit choice: light
    await emulateScheme(page, 'light');
    await emulateScheme(page, 'dark');
    await page.waitForTimeout(200);
    expect(await isDark(page)).toBe(false);
  });
});

test.describe('screenshots: custom colours', () => {
  for (const [name, [p, s]] of Object.entries(NAMED)) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`${name} ${scheme}`, async ({ page }) => {
        await emulateScheme(page, scheme);
        await seedColours(page, p, s);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('.icon-img svg').first()).toBeAttached();
        await openRoom(page);
        await page.mouse.move(640, 790);
        await expect(page).toHaveScreenshot(`colours-${name}-${scheme}.png`, { mask: [page.locator('#room'), page.locator('#clock')] });
      });
    }
  }

  test('Display dialog open (teal/pink dark)', async ({ page }) => {
    await emulateScheme(page, 'dark');
    await page.reload();
    await setColours(page, '#008080', '#ff69b4');
    await expect(page).toHaveScreenshot('display-dialog-teal-pink-dark.png', { mask: [page.locator('#clock')] });
  });
});
