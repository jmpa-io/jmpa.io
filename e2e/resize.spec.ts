import { test, expect } from './fixtures';

const MIN_W = 220;
const MIN_H = 120;

const open = async (page, crt = 0) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((n) => document.getElementById('screen')!.style.setProperty('--crt', String(n)), crt);
  await page.locator('.icons .icon', { hasText: 'room.exe' }).click({ clickCount: 2, force: true });
  await expect(page.locator('#win-room')).toBeVisible();
};
const box = async (loc) => (await loc.boundingBox())!;
const centre = async (page, loc) => {
  const b = await box(loc);
  return page.evaluate(([x, y]) => (window as any).jmpaCrt.toVisual(x, y), [b.x + b.width / 2, b.y + b.height / 2]) as Promise<{ x: number; y: number }>;
};
const drag = async (page, loc, dx: number, dy: number) => {
  const p = await centre(page, loc);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + dx, p.y + dy, { steps: 6 });
  await page.mouse.up();
};
const near = (a: number, b: number, tol = 2) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

test.describe('resizable windows', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  const cases: Array<[string, number, number, (b0, b1) => void]> = [
    ['e', 60, 0, (b0, b1) => { near(b1.width, b0.width + 60); near(b1.x, b0.x); near(b1.height, b0.height); }],
    ['w', -60, 0, (b0, b1) => { near(b1.width, b0.width + 60); near(b1.x, b0.x - 60); near(b1.y, b0.y); }],
    ['s', 0, 40, (b0, b1) => { near(b1.height, b0.height + 40); near(b1.y, b0.y); near(b1.width, b0.width); }],
    ['n', 0, -30, (b0, b1) => { near(b1.height, b0.height + 30); near(b1.y, b0.y - 30); near(b1.x, b0.x); }],
    ['se', 50, 40, (b0, b1) => { near(b1.width, b0.width + 50); near(b1.height, b0.height + 40); near(b1.x, b0.x); near(b1.y, b0.y); }],
    ['sw', -50, 40, (b0, b1) => { near(b1.width, b0.width + 50); near(b1.height, b0.height + 40); near(b1.x, b0.x - 50); near(b1.y, b0.y); }],
    ['ne', 50, -30, (b0, b1) => { near(b1.width, b0.width + 50); near(b1.height, b0.height + 30); near(b1.x, b0.x); near(b1.y, b0.y - 30); }],
    ['nw', -50, -30, (b0, b1) => { near(b1.width, b0.width + 50); near(b1.height, b0.height + 30); near(b1.x, b0.x - 50); near(b1.y, b0.y - 30); }],
  ];
  for (const [dir, dx, dy, check] of cases) {
    test(`${dir} handle resizes in the right direction`, async ({ page }) => {
      await open(page);
      const win = page.locator('#win-room');
      const b0 = await box(win);
      await drag(page, win.locator(`.rz-${dir}`), dx, dy);
      check(b0, await box(win));
    });
  }

  test('handles carry resize cursors', async ({ page }) => {
    await open(page);
    const want = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };
    for (const [d, c] of Object.entries(want)) await expect(page.locator(`#win-room .rz-${d}`)).toHaveCSS('cursor', c);
  });

  test('minimum size is enforced and the opposite edges stay put', async ({ page }) => {
    await open(page);
    const win = page.locator('#win-room');
    const b0 = await box(win);
    await drag(page, win.locator('.rz-nw'), 2000, 2000);
    const b1 = await box(win);
    near(b1.width, MIN_W);
    near(b1.height, MIN_H);
    near(b1.x + b1.width, b0.x + b0.width);
    near(b1.y + b1.height, b0.y + b0.height);
  });

  test('size is clamped to the desktop', async ({ page }) => {
    await open(page);
    const win = page.locator('#win-room');
    const d = await box(page.locator('#desktop'));
    await drag(page, win.locator('.rz-se'), 3000, 3000);
    let b = await box(win);
    near(b.x + b.width, d.x + d.width);
    near(b.y + b.height, d.y + d.height);
    await drag(page, win.locator('.rz-nw'), -3000, -3000);
    b = await box(win);
    near(b.x, d.x);
    near(b.y, d.y);
  });

  test('fast drags past the window do not lose the handle', async ({ page }) => {
    await open(page);
    const win = page.locator('#win-room');
    const b0 = await box(win);
    const p = await centre(page, win.locator('.rz-e'));
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 200, p.y + 300);
    await page.mouse.up();
    near((await box(win)).width, b0.width + 200);
  });

  test('double-clicking the title bar maximises and restores the old bounds', async ({ page }) => {
    await open(page);
    const win = page.locator('#win-room');
    await drag(page, win.locator('.rz-se'), 30, 20);
    const b0 = await box(win);
    const d = await box(page.locator('#desktop'));
    await win.locator('.win-bar').dblclick({ position: { x: 150, y: 8 } });
    await expect(win).toHaveClass(/max/);
    const m = await box(win);
    near(m.width, d.width);
    near(m.height, d.height);
    await expect(win.locator('.rz-se')).toBeHidden();
    // maximised windows are not resizable or draggable
    await drag(page, win.locator('.win-bar'), 80, 80);
    near((await box(win)).x, d.x);
    await win.locator('.win-bar').dblclick({ position: { x: 150, y: 8 } });
    await expect(win).not.toHaveClass(/max/);
    const b1 = await box(win);
    near(b1.x, b0.x);
    near(b1.y, b0.y);
    near(b1.width, b0.width);
    near(b1.height, b0.height);
  });

  test('maximise button works and geometry survives a reload', async ({ page }) => {
    await open(page);
    const win = page.locator('#win-room');
    await drag(page, win.locator('.rz-se'), 40, 20);
    const b0 = await box(win);
    await page.reload();
    await page.evaluate(() => document.getElementById('screen')!.style.setProperty('--crt', '0'));
    await page.locator('.icons .icon', { hasText: 'room.exe' }).click({ clickCount: 2, force: true });
    const b1 = await box(win);
    near(b1.width, b0.width);
    near(b1.height, b0.height);
    await win.getByRole('button', { name: 'Maximise' }).click();
    await expect(win).toHaveClass(/max/);
    await win.getByRole('button', { name: 'Restore' }).click();
    await expect(win).not.toHaveClass(/max/);
  });

  test('room.exe canvas re-fits crisply and still draws after resizing', async ({ page }) => {
    await open(page);
    const win = page.locator('#win-room');
    const cv = win.locator('canvas');
    const size = async () => (await box(cv));
    const s0 = await size();
    expect(s0.width % 192).toBe(0);
    await drag(page, win.locator('.rz-se'), 230, 150);
    await page.waitForTimeout(150);
    const s1 = await size();
    expect(s1.width).toBeGreaterThan(s0.width);
    expect(s1.width % 192).toBe(0);
    expect(s1.height % 108).toBe(0);
    await expect(cv).toHaveCSS('image-rendering', /pixelated|crisp-edges/);
    const lit = await page.evaluate(() => {
      const c = document.getElementById('room') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) n++;
      return n;
    });
    expect(lit).toBeGreaterThan(500);
    await expect(page).toHaveScreenshot('room-resized.png');
  });

  test('drag-to-move still works and focus raises the window', async ({ page }) => {
    await open(page);
    const win = page.locator('#win-room');
    const b0 = await box(win);
    await drag(page, win.locator('.win-bar'), 100, 60);
    const b1 = await box(win);
    near(b1.x, b0.x + 100);
    near(b1.y, b0.y + 60);
    await expect(win).toHaveClass(/focused/);
  });

  test('resizing works near the corners with the curved screen on', async ({ page }) => {
    await open(page, 1);
    const win = page.locator('#win-room');
    const b0 = await box(win);
    await drag(page, win.locator('.rz-se'), 60, 40);
    const b1 = await box(win);
    expect(b1.width).toBeGreaterThan(b0.width + 40);
    expect(b1.height).toBeGreaterThan(b0.height + 25);
  });
});

test.describe('small screens', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('windows stay full width with no resize handles', async ({ page }) => {
    await page.goto('/');
    await page.locator('.icons .icon', { hasText: 'room.exe' }).click();
    const win = page.locator('#win-room');
    await expect(win).toBeVisible();
    await expect(win.locator('.rz-se')).toBeHidden();
    const w = await box(win);
    expect(w.width).toBeGreaterThanOrEqual(388);
    await expect(page.locator('#win-room canvas')).toBeVisible();
  });
});
