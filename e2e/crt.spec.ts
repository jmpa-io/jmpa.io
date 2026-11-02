import { test, expect } from './fixtures';

const boot = async (page) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.icon-img svg').first()).toBeAttached();
};
const setCrt = (page, v: number) =>
  page.evaluate((n) => {
    document.getElementById('screen')!.style.setProperty('--crt', String(n));
  }, v);

// Playwright aims at layout boxes; the curved screen draws them elsewhere, so aim at where they are drawn.
const visualCentre = async (page, loc) => {
  const b = (await loc.boundingBox())!;
  return page.evaluate(
    ([x, y]) => (window as any).jmpaCrt.toVisual(x, y),
    [b.x + b.width / 2, b.y + b.height / 2],
  ) as Promise<{ x: number; y: number }>;
};
const vclick = async (page, loc, opts = {}) => {
  const p = await visualCentre(page, loc);
  await page.mouse.click(p.x, p.y, opts);
};

test.describe('CRT', () => {
  test.skip(({ isMobile }) => isMobile, 'curvature is desktop only');

  test('curvature 0 vs 100 render differently, and are baselined', async ({ page }) => {
    await boot(page);
    await setCrt(page, 0);
    await expect(page.locator('#screen')).not.toHaveClass(/crt-curved/);
    await page.waitForTimeout(100);
    const flat = await page.screenshot();
    await expect(page).toHaveScreenshot('crt-0.png');
    await setCrt(page, 1);
    await expect(page.locator('#screen')).toHaveClass(/crt-curved/);
    await page.waitForTimeout(100);
    const curved = await page.screenshot();
    await expect(page).toHaveScreenshot('crt-100.png');
    expect(flat.equals(curved)).toBe(false);
    await expect(page.locator('#crt-content')).toHaveCSS('filter', /url/);
  });

  test('CRT toggle off is completely flat', async ({ page }) => {
    await boot(page);
    await page.click('#crt-btn');
    await expect(page.locator('#crt-content')).toHaveCSS('filter', 'none');
    await expect(page.locator('#screen')).not.toHaveClass(/crt-curved/);
  });

  test('overlays never intercept the pointer', async ({ page }) => {
    await boot(page);
    for (const sel of ['.crt', '.crt-grain', '.crt-flicker', '.crt-flash']) {
      await expect(page.locator(sel)).toHaveCSS('pointer-events', 'none');
    }
  });

  test('clicks near the corners land on what is drawn there', async ({ page }) => {
    await boot(page);
    await vclick(page, page.locator('#start-btn'));
    await expect(page.locator('#start-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await vclick(page, page.locator('#display-btn'));
    await expect(page.locator('#display-dlg')).toBeVisible();
  });

  test('double-click opens a program and the title bar drag tracks the cursor', async ({ page }) => {
    await boot(page);
    await vclick(page, page.locator('.icons .icon', { hasText: 'room.exe' }), { clickCount: 2 });
    const win = page.locator('#win-room');
    await expect(win).toBeVisible();
    const bar = win.locator('.win-bar');
    const from = await visualCentre(page, bar);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 150, from.y + 90, { steps: 8 });
    await page.mouse.up();
    const to = await visualCentre(page, bar);
    expect(Math.abs(to.x - from.x - 150)).toBeLessThan(6);
    expect(Math.abs(to.y - from.y - 90)).toBeLessThan(6);
  });

  test('Shut Down powers the screen off and a click powers it back on', async ({ page }) => {
    await boot(page);
    await vclick(page, page.locator('#start-btn'));
    await vclick(page, page.locator('#shutdown'));
    const standby = page.locator('.crt-standby');
    await expect(standby).toBeVisible();
    await expect(page.locator('#screen')).toHaveClass(/crt-off/);
    await standby.click({ force: true });
    await expect(standby).toBeHidden();
    await expect(page.locator('#screen')).not.toHaveClass(/crt-off/);
    await expect(page.locator('#start-btn')).toBeVisible();
  });

  test('prefers-reduced-motion disables the animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await boot(page);
    const names = () =>
      page.evaluate(() => ({
        drift: getComputedStyle(document.querySelector('.crt')!, '::before').animationName,
        roll: getComputedStyle(document.querySelector('.crt')!, '::after').animationName,
        grain: getComputedStyle(document.querySelector('.crt-grain')!).animationName,
        flicker: getComputedStyle(document.querySelector('.crt-flicker')!).animationName,
      }));
    const on = await names();
    expect(Object.values(on).every((n) => n !== 'none')).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const off = await names();
    expect(Object.values(off).every((n) => n === 'none')).toBe(true);
  });

  test('frame times stay low with curvature and animation on', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await boot(page);
    await page.waitForTimeout(500);
    const r = await page.evaluate(
      () =>
        new Promise<{ avg: number; p95: number }>((resolve) => {
          const t: number[] = [];
          let last = performance.now();
          const step = (now: number) => {
            t.push(now - last);
            last = now;
            if (t.length < 180) requestAnimationFrame(step);
            else {
              const s = t.slice(5).sort((a, b) => a - b);
              resolve({ avg: s.reduce((a, b) => a + b, 0) / s.length, p95: s[Math.floor(s.length * 0.95)] });
            }
          };
          requestAnimationFrame(step);
        }),
    );
    info.annotations.push({ type: 'perf', description: `avg ${r.avg.toFixed(1)}ms p95 ${r.p95.toFixed(1)}ms` });
    console.log(`jmpa.io frame time curvature on: avg ${r.avg.toFixed(1)}ms p95 ${r.p95.toFixed(1)}ms`);
    expect(r.p95).toBeLessThan(20);
  });
});

test.describe('CRT on small screens', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('curvature and bezel are off', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#crt-content')).toHaveCSS('filter', 'none');
    await expect(page.locator('#screen')).toHaveCSS('padding-top', '0px');
  });
});
