import { test, expect } from './fixtures';
import { contrastFailures, settleStyles } from './helpers/palette-helpers';
import type { Page } from '@playwright/test';

const key = (code: string) => `.kbd .k[data-key="${code}"]`;
const isDown = (page: Page, code: string) => page.locator(key(code)).evaluate((e) => e.classList.contains('down'));

const REQUIRED = [
  'Backquote', 'Digit1', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Tab', 'KeyQ', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash',
  'CapsLock', 'KeyA', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'ShiftLeft', 'KeyZ', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'ControlLeft', 'AltLeft',
];

const LINK_KEYS: [string, string][] = [
  ['F1', 'https://jcleal.me/resume'], ['F2', 'https://jcleal.me'], ['F3', 'https://github.com/jcleal'], ['F4', 'https://github.com/jmpa-io'],
  ['F5', 'https://portfolio.jcleal.me'], ['F6', 'https://art.jmpa.io'], ['F7', 'https://startpage.jcleal.me'],
];

const edge = (page: Page, code: string) => page.locator(`${key(code)} .cap`).evaluate((e) => {
  const s = getComputedStyle(e);
  return { transform: s.transform, shadow: s.boxShadow };
});

test.describe('keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.locator('#kbd-dock')).toBeVisible();
  });

  test('renders every ANSI key plus letters a-z and digits', async ({ page }) => {
    for (const c of REQUIRED) await expect(page.locator(key(c)), c).toHaveCount(1);
    for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') await expect(page.locator(key(`Key${l}`))).toHaveCount(1);
    for (let d = 0; d <= 9; d++) await expect(page.locator(key(`Digit${d}`))).toHaveCount(1);
    expect(await page.locator('.kbd .k').count()).toBeGreaterThanOrEqual(60);
  });

  test('keys are 3D: body with a bottom edge, wide keys and a row stagger', async ({ page }) => {
    const rest = await edge(page, 'KeyA');
    expect(rest.shadow).toMatch(/0px 3px 0px/);
    const face = await page.locator(`${key('KeyA')} .face`).evaluate((e) => getComputedStyle(e).backgroundImage);
    expect(face).toContain('gradient');
    const w = async (c: string) => (await page.locator(key(c)).boundingBox())!;
    const [a, space, shift, tab, q, caps] = await Promise.all(['KeyA', 'Space', 'ShiftLeft', 'Tab', 'KeyQ', 'CapsLock'].map(w));
    expect(space.width).toBeGreaterThan(a.width * 5);
    expect(shift.width).toBeGreaterThan(a.width * 1.8);
    expect(tab.width).toBeGreaterThan(a.width * 1.3);
    expect(caps.width).toBeGreaterThan(tab.width);
    expect(a.x).toBeGreaterThan(q.x);
  });

  test('a pointer press depresses the key (translate + shorter edge) and pointerup lifts it', async ({ page }) => {
    const rest = await edge(page, 'KeyG');
    const box = (await page.locator(key('KeyG')).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(() => isDown(page, 'KeyG')).toBe(true);
    const down = await edge(page, 'KeyG');
    expect(down.transform).not.toBe(rest.transform);
    expect(down.shadow).not.toBe(rest.shadow);
    await page.mouse.up();
    await expect.poll(() => isDown(page, 'KeyG')).toBe(false);
  });

  test('the physical keyboard is ignored: no listeners, no preventDefault, no navigation, no state change', async ({ page }) => {
    const snapshot = () => page.evaluate(() => JSON.stringify({
      url: location.href, cls: document.documentElement.className, attrs: [...document.documentElement.attributes].map((a) => a.name + a.value).join(),
      body: document.querySelector('.scr-body')!.textContent, echo: document.getElementById('echo')!.textContent,
      down: document.querySelectorAll('.k.down').length, go: document.getElementById('budgie-fly')!.className, ls: JSON.stringify(localStorage),
    }));
    await page.evaluate(() => {
      (window as any).__prevented = [];
      window.addEventListener('keydown', (e) => (window as any).__prevented.push(e.defaultPrevented), { capture: false });
      document.addEventListener('keydown', (e) => (window as any).__prevented.push(e.defaultPrevented));
    });
    const before = await snapshot();
    for (const k of ['a', 'k', 'Z', ' ', 'Enter', '/', '?', 't', 'b', 'h', 'ArrowDown']) {
      await page.keyboard.down(k);
      expect(await page.locator('.k.down').count(), k).toBe(0);
      await page.keyboard.up(k);
    }
    await page.keyboard.type('hello world /?');
    expect(await snapshot()).toBe(before);
    const prevented = await page.evaluate(() => (window as any).__prevented as boolean[]);
    expect(prevented.length).toBeGreaterThan(0);
    expect(prevented.every((p) => p === false)).toBe(true);
    expect(await page.evaluate(() => (document.activeElement || document.body).tagName)).toBe('BODY');
  });

  test('keyboard access is the browser default: Tab focuses a key, Enter and Space activate it', async ({ page }) => {
    await page.locator(key('ActHelp')).focus();
    await expect(page.locator(key('ActHelp'))).toBeFocused();
    expect(await page.locator(key('ActHelp')).evaluate((e) => getComputedStyle(e).outlineStyle + getComputedStyle(e.querySelector('.cap')!).outlineStyle + getComputedStyle(e.querySelector('.face')!).outlineStyle + getComputedStyle(e).boxShadow)).not.toBe('nonenonenone');
    await page.keyboard.press('Enter');
    await expect(page.locator('.pg[data-pg="help"]')).toBeVisible();
    await page.keyboard.press(' ');
    await expect(page.locator('.pg[data-pg="about"]')).toBeVisible();
  });

  test('no typing engine or key-event code remains', async ({ page }) => {
    expect(await page.evaluate(() => typeof (window as any).JmpaTyping + typeof (window as any).JmpaKeyboard)).toBe('undefinedundefined');
    expect((await page.request.get('/js/typing.js')).status()).toBe(404);
    const js = await (await page.request.get('/js/keyboard.js')).text();
    expect(js).not.toMatch(/keydown|keyup|keypress|preventDefault/);
  });

  test('link keys carry the right hrefs, open off-site safely, and echo when pressed', async ({ page }) => {
    for (const [code, href] of LINK_KEYS) {
      const a = page.locator(key(code));
      await expect(a).toHaveAttribute('href', href);
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      expect(((await a.getAttribute('aria-label')) || '').length).toBeGreaterThan(0);
    }
    const popup = page.waitForEvent('popup');
    await page.locator(key('F2')).click();
    await popup;
    await expect(page.locator('#echo')).toHaveText(/opening Blog/);
  });

  test('theme key toggles dark/light', async ({ page }) => {
    const dark = () => page.locator('html').evaluate((e) => e.classList.contains('dark'));
    const was = await dark();
    await page.locator(key('ActTheme')).click();
    await expect.poll(dark).toBe(!was);
    await page.locator(key('ActTheme')).click();
    await expect.poll(dark).toBe(was);
  });

  test('page, help and esc keys switch the screen content', async ({ page }) => {
    const pg = (n: string) => page.locator(`.pg[data-pg="${n}"]`);
    await expect(pg('about')).toBeVisible();
    await page.locator(key('ActPage')).click();
    await expect(pg('links')).toBeVisible();
    await expect(pg('about')).toBeHidden();
    await page.locator(key('ActPage')).click();
    await expect(pg('help')).toBeVisible();
    await page.locator(key('ActPage')).click();
    await expect(pg('about')).toBeVisible();
    await page.locator(key('ActHelp')).click();
    await expect(pg('help')).toBeVisible();
    await page.locator(key('ActHelp')).click();
    await expect(pg('about')).toBeVisible();
    await page.locator(key('ActHelp')).click();
    await page.locator(key('Escape')).click();
    await expect(pg('about')).toBeVisible();
  });

  test('budgie key says so and does nothing under reduced motion', async ({ page }) => {
    await page.locator(key('ActBird')).click();
    await expect(page.locator('#echo')).toHaveText(/reduced motion/);
    await expect(page.locator('#budgie-fly')).not.toHaveClass(/go/);
  });

  test('keyboard hides and the choice is remembered', async ({ page }) => {
    await page.locator('#kb-toggle').click();
    await expect(page.locator('#kbd-dock')).toBeHidden();
    await page.reload();
    await expect(page.locator('#kbd-dock')).toBeHidden();
    await page.locator('#kb-toggle').click();
    await expect(page.locator('#kbd-dock')).toBeVisible();
  });
});

test.describe('motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('budgie key sends the flyer across, then it lands back', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.locator(key('ActBird')).click();
    await expect(page.locator('#budgie-fly')).toHaveClass(/go/);
    await expect(page.locator('#echo')).toHaveText(/budgie/);
    await expect(page.locator('#budgie-fly')).not.toHaveClass(/go/, { timeout: 9000 });
  });

  test('screen text does not change by itself', async ({ page }) => {
    await page.goto('/');
    const before = await page.locator('.scr-body').innerText();
    await page.waitForTimeout(2500);
    expect(await page.locator('.scr-body').innerText()).toBe(before);
  });

  test('sprites animate with stepped timing', async ({ page }) => {
    await page.goto('/');
    for (const sel of ['.spr.person', '.spr.bird.perch', '.spr.prop.mug']) {
      const s = await page.locator(sel).evaluate((e) => { const c = getComputedStyle(e); return { n: c.animationName, t: c.animationTimingFunction }; });
      expect(s.n, sel).not.toBe('none');
      expect(s.t, sel).toMatch(/steps/);
    }
  });

  test('animations pause while the tab is hidden', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('html')).toHaveClass(/is-hidden/);
    expect(await page.locator('.flyer').evaluate((e) => getComputedStyle(e).animationPlayState)).toBe('paused');
  });
});

test.describe('pixel-art scene', () => {
  test('person, props and both budgies are pixelated PNG sprite divs, never svg', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('.sprites svg, .sprites img, .sprites canvas').count()).toBe(0);
    expect(await page.locator('svg.bird, .bird svg, svg[class*="budgie"]').count()).toBe(0);
    const sprites = page.locator('.sprites .spr');
    expect(await sprites.count()).toBeGreaterThanOrEqual(5);
    for (const el of await sprites.all()) {
      const s = await el.evaluate((e) => { const c = getComputedStyle(e); return { ir: c.imageRendering, bg: c.backgroundImage }; });
      expect(['pixelated', 'crisp-edges']).toContain(s.ir);
      expect(s.bg).toMatch(/\/img\/.*\.png/);
    }
    expect(await page.locator('.spr.bird').count()).toBe(3);
    for (const el of await page.locator('.spr.bird').all()) {
      expect(await el.evaluate((e) => getComputedStyle(e).imageRendering)).toBe('pixelated');
    }
    for (const f of ['person', 'budgie-green', 'budgie-blue', 'props']) expect((await page.request.get(`/img/${f}.png`)).status(), f).toBe(200);
  });

  test('sprites are upscaled by whole-number factors', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    for (const sel of ['.spr.person', '.spr.bird.perch', '.spr.prop.mug']) {
      const w = await page.locator(sel).evaluate((e) => e.getBoundingClientRect().width);
      expect(Number.isInteger(w), `${sel} ${w}`).toBe(true);
    }
  });

  test('reduced motion: static frames, no animation, flyer hidden', async ({ page }) => {
    await page.goto('/');
    for (const sel of ['.spr.person', '.spr.bird.perch', '.spr.prop.mug', '.flyer']) {
      expect(await page.locator(sel).first().evaluate((e) => getComputedStyle(e).animationName), sel).toBe('none');
    }
    await expect(page.locator('#budgie-fly')).toBeHidden();
    await expect(page.locator('.spr.bird.static')).toBeVisible();
  });
});

for (const width of [390, 768, 1280, 1600]) {
  test(`no horizontal overflow, dock and links clear of each other at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const el of await page.locator('.screen, .spr, .kbd, .card, header.bar > *').all()) {
      if (!(await el.isVisible())) continue;
      const b = (await el.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(-0.5);
      expect(b.x + b.width).toBeLessThanOrEqual(width + 0.5);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const dock = (await page.locator('#kbd-dock').boundingBox())!;
    const copy = (await page.locator('.jmpa-footer-copy').boundingBox())!;
    expect(copy.y + copy.height).toBeLessThanOrEqual(dock.y + 1);
  });
}

for (const scheme of ['dark', 'light'] as const) {
  test(`text contrast >= 4.5:1 across the page, screen and keyboard (${scheme})`, async ({ page }) => {
    await settleStyles(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.evaluate((s) => localStorage.setItem('scheme', s), scheme);
    await page.reload();
    const bad = await contrastFailures(page, 4.5);
    expect(bad, JSON.stringify(bad.slice(0, 6))).toEqual([]);
  });
}

test('no CSP violations, no inline script or style, no external requests', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto('/');
  await page.locator('#kb-toggle').click();
  await page.locator('#kb-toggle').click();
  expect(problems).toEqual([]);
  expect(await page.locator('script:not([src]), [style]:not(html)').count()).toBe(0);
});
