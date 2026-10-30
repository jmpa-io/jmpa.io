import { test, expect, external } from './fixtures';

const gotoDesktop = async (page) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.icon-img svg').first()).toBeAttached();
};

test.describe('desktop pointer', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop pointer only');

  test('loads without console errors and icons are drawn', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
    await gotoDesktop(page);
    expect(errors).toEqual([]);
    for (const icon of await page.locator('.icons .icon').all()) {
      expect(await icon.locator('svg rect').count()).toBeGreaterThan(30);
    }
    await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
    await expect(page.locator('h1.sr-only')).toHaveText('jmpa');
  });

  test('every icon map row is exactly 16 chars', async ({ page, request }) => {
    const src = await (await request.get('/js/desktop.js')).text();
    const block = src.slice(src.indexOf('var MAPS'), src.indexOf('function svg'));
    const rows = [...block.matchAll(/'([.a-z]+)'/g)].map((m) => m[1]);
    expect(rows.length).toBe(6 * 16);
    expect(rows.filter((r) => r.length !== 16)).toEqual([]);
  });

  test('page does not scroll', async ({ page }) => {
    await gotoDesktop(page);
    expect(await page.evaluate(() => [document.documentElement.scrollHeight <= innerHeight, document.documentElement.scrollWidth <= innerWidth])).toEqual([true, true]);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow + getComputedStyle(document.body).overscrollBehaviorY)).toBe('hiddennone');
  });

  test('hidden things are hidden', async ({ page }) => {
    await gotoDesktop(page);
    for (const sel of ['#win-room', '#start-menu', '#start-backdrop']) await expect(page.locator(sel)).toBeHidden();
    await expect(page.locator('#tasks .task')).toHaveCount(0);
  });

  test('single click selects without navigating, double click opens', async ({ page }) => {
    await gotoDesktop(page);
    const art = page.getByRole('link', { name: 'art.exe' });
    await art.click();
    await expect(art).toHaveClass(/selected/);
    await page.waitForTimeout(600);
    expect(external(page)).toEqual([]);
    expect(page.url()).toBe('http://localhost:4172/');
    await art.dblclick().catch(() => {});
    await expect.poll(() => external(page)).toContain('https://art.jmpa.io/');
  });

  test('links keep real hrefs; github opens a new tab, others same tab', async ({ page }) => {
    await gotoDesktop(page);
    const hrefs = await page.locator('.icons a').evaluateAll((as: HTMLAnchorElement[]) => as.map((a) => [a.textContent, a.href, a.target, a.rel]));
    expect(hrefs).toEqual([
      ['art.exe', 'https://art.jmpa.io/', '', ''],
      ['blog', 'https://jcleal.me/', '', ''],
      ['portfolio.exe', 'https://portfolio.jcleal.me/', '', ''],
      ['startpage', 'https://startpage.jcleal.me/', '', ''],
      ['github', 'https://github.com/jmpa-io', '_blank', 'noopener'],
    ]);
    const popup = page.context().waitForEvent('page');
    await page.getByRole('link', { name: 'github' }).dblclick();
    await popup;
    await expect.poll(() => external(page)).toContain('https://github.com/jmpa-io');
    expect(page.url()).toBe('http://localhost:4172/');
  });

  test('keyboard: Enter and Space open programs', async ({ page }) => {
    await gotoDesktop(page);
    await page.getByRole('button', { name: 'room.exe' }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#win-room')).toBeVisible();
    await page.getByRole('link', { name: 'blog' }).focus();
    await page.keyboard.press('Space');
    await expect.poll(() => external(page)).toContain('https://jcleal.me/');
    const second = await page.context().newPage();
    await gotoDesktop(second);
    await second.getByRole('link', { name: 'startpage' }).focus();
    await second.keyboard.press('Enter');
    await expect.poll(() => external(page)).toContain('https://startpage.jcleal.me/');
  });

  test('start menu opens, closes (Escape, backdrop), keyboard nav, aria-expanded', async ({ page }) => {
    await gotoDesktop(page);
    const start = page.locator('#start-btn');
    await expect(start).toHaveAttribute('aria-expanded', 'false');
    await start.click();
    await expect(page.locator('#start-menu')).toBeVisible();
    await expect(start).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#start-menu a, #start-menu button').first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#start-menu .start-items > *').nth(1)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#start-menu .start-items > *').last()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#start-menu')).toBeHidden();
    await expect(start).toBeFocused();
    await expect(start).toHaveAttribute('aria-expanded', 'false');
    await start.click();
    await page.mouse.click(900, 300);
    await expect(page.locator('#start-menu')).toBeHidden();
    await expect(page.locator('#start-backdrop')).toBeHidden();
  });

  test('start menu items navigate or open room.exe', async ({ page }) => {
    await gotoDesktop(page);
    await page.locator('#start-btn').click();
    await page.locator('#start-menu').getByText('room.exe').click();
    await expect(page.locator('#win-room')).toBeVisible();
    await expect(page.locator('#start-menu')).toBeHidden();
    await page.locator('#start-btn').click();
    await page.locator('#start-menu').getByText('portfolio.exe').click();
    await expect.poll(() => external(page)).toContain('https://portfolio.jcleal.me/');
  });

  test('room.exe: canvas animates, opens twice with one task, min/restore/close', async ({ page }) => {
    await gotoDesktop(page);
    const win = page.locator('#win-room');
    await page.getByRole('button', { name: 'room.exe' }).first().dblclick();
    await expect(win).toBeVisible();
    await page.locator('#start-btn').click();
    await page.locator('#start-menu').getByText('room.exe').click();
    await expect(page.locator('#tasks .task')).toHaveCount(1);
    await expect(win).toHaveClass(/focused/);
    const bar = await win.locator('.win-bar').evaluate((e) => getComputedStyle(e).backgroundImage);
    expect(bar).toContain('oklch(0.48');

    await win.getByRole('button', { name: 'Minimise' }).click();
    await expect(win).toBeHidden();
    const task = page.locator('#tasks .task');
    await expect(task).toBeVisible();
    await expect(task).not.toHaveClass(/down/);
    await task.click();
    await expect(win).toBeVisible();
    await expect(task).toHaveClass(/down/);
    await task.click();
    await expect(win).toBeHidden();
    await task.click();
    await win.getByRole('button', { name: 'Close' }).click();
    await expect(win).toBeHidden();
    await expect(task).toBeHidden();
  });

  test('room.exe drags by title bar and stays inside the desktop', async ({ page }) => {
    await gotoDesktop(page);
    await page.getByRole('button', { name: 'room.exe' }).first().dblclick();
    const win = page.locator('#win-room');
    const before = (await win.boundingBox())!;
    await page.mouse.move(before.x + 200, before.y + 14);
    await page.mouse.down();
    await page.mouse.move(before.x + 260, before.y + 74, { steps: 5 });
    await page.mouse.up();
    const moved = (await win.boundingBox())!;
    expect(Math.round(moved.x - before.x)).toBe(60);
    expect(Math.round(moved.y - before.y)).toBe(60);

    await page.mouse.move(moved.x + 200, moved.y + 14);
    await page.mouse.down();
    await page.mouse.move(5000, 5000, { steps: 5 });
    await page.mouse.up();
    const far = (await win.boundingBox())!;
    const desk = (await page.locator('#desktop').boundingBox())!;
    expect(far.x + far.width).toBeLessThanOrEqual(desk.x + desk.width + 0.5);
    expect(far.y + far.height).toBeLessThanOrEqual(desk.y + desk.height + 0.5);
  });

  test('CRT toggle persists, aria-pressed, overlay never blocks pointer events', async ({ page }) => {
    await gotoDesktop(page);
    const btn = page.locator('#crt-btn');
    const crt = () => page.locator('#screen').evaluate((e) => e.style.getPropertyValue('--crt'));
    expect(await crt()).toBe('0.6');
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(await page.locator('.crt').evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
    await btn.click();
    expect(await crt()).toBe('0');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    expect(await crt()).toBe('0');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await btn.click();
    await page.reload();
    expect(await crt()).toBe('0.6');
  });

  test('reduced motion stops the CRT animations', async ({ page }) => {
    await gotoDesktop(page);
    expect(await page.locator('.crt').evaluate((e) => [getComputedStyle(e, '::before').animationName, getComputedStyle(e, '::after').animationName])).toEqual(['none', 'none']);
  });
});

test.describe('room animation', () => {
  test.use({ reducedMotion: 'no-preference' });
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('room.exe canvas is drawn and animates', async ({ page }) => {
    await gotoDesktop(page);
    await page.getByRole('button', { name: 'room.exe' }).first().dblclick();
    const sample = () => page.evaluate(() => (document.getElementById('room') as HTMLCanvasElement).toDataURL());
    const first = await sample();
    expect(first.length).toBeGreaterThan(2000);
    await expect.poll(sample, { timeout: 6000 }).not.toBe(first);
  });
});

test.describe('touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('tap opens programs immediately; layout fits the screen', async ({ page }) => {
    await gotoDesktop(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const tasks = (await page.locator('.taskbar').evaluate((e) => [e.scrollWidth, e.clientWidth]));
    expect(tasks[0]).toBeLessThanOrEqual(tasks[1]);

    await page.getByRole('button', { name: 'room.exe' }).first().tap();
    const win = page.locator('#win-room');
    await expect(win).toBeVisible();
    const box = (await win.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390.5);
    expect(box.y + box.height).toBeLessThanOrEqual(844);

    await page.locator('#start-btn').tap();
    const menu = (await page.locator('#start-menu').boundingBox())!;
    expect(menu.x + menu.width).toBeLessThanOrEqual(390);
    expect(menu.y).toBeGreaterThanOrEqual(0);
    await page.locator('#start-menu').getByText('art.exe').tap();
    await expect.poll(() => external(page)).toContain('https://art.jmpa.io/');
  });
});
