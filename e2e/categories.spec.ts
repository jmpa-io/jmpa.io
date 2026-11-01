import { test, expect } from './fixtures';

// data/links.yml drives these. Update EXPECTED when you add or move a link.
const EXPECTED = [
  { id: 'writing', title: 'Writing & CV', links: [['Resume', 'https://jcleal.me/resume'], ['Blog', 'https://jcleal.me']] },
  { id: 'code', title: 'Code', links: [['GitHub', 'https://github.com/jcleal'], ['github.com/jmpa-io', 'https://github.com/jmpa-io']] },
  { id: 'work', title: 'Work & projects', links: [['portfolio.jcleal.me', 'https://portfolio.jcleal.me']] },
  { id: 'art', title: 'Art', links: [['art.jmpa.io', 'https://art.jmpa.io']] },
  { id: 'tools', title: 'Tools', links: [['startpage.jcleal.me', 'https://startpage.jcleal.me']] },
];

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('categories are labelled sections in order, each with its links', async ({ page }) => {
  const sections = page.locator('section.cat');
  await expect(sections).toHaveCount(EXPECTED.length);
  for (const [i, c] of EXPECTED.entries()) {
    const s = sections.nth(i);
    await expect(s).toHaveAttribute('id', c.id);
    await expect(s.getByRole('heading', { level: 2, name: c.title })).toBeVisible();
    const cards = s.locator('a.card');
    await expect(cards).toHaveCount(c.links.length);
    for (const [j, [name, href]] of c.links.entries()) {
      const a = cards.nth(j);
      await expect(a).toHaveAttribute('href', href);
      await expect(a.locator('.card-title')).toHaveText(name);
      await expect(a.locator('.card-desc')).not.toBeEmpty();
      await expect(a).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(a).toHaveAttribute('target', '_blank');
    }
  }
});

test('no category is empty and no link is listed twice', async ({ page }) => {
  for (const s of await page.locator('section.cat').all()) expect(await s.locator('a.card').count()).toBeGreaterThan(0);
  const hrefs = await page.locator('a.card').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
  expect(new Set(hrefs).size).toBe(hrefs.length);
});

test('a11y: one h1, h2 per category after it, every link has a name, the sections are labelled by their heading', async ({ page }) => {
  const levels = await page.locator('h1, h2, h3').evaluateAll((els) => els.map((e) => e.tagName));
  expect(levels).toEqual(['H1', ...EXPECTED.map(() => 'H2')]);
  for (const s of await page.locator('section.cat').all()) {
    const id = await s.getAttribute('aria-labelledby');
    await expect(page.locator(`#${id}`)).toHaveText(await s.locator('h2').innerText());
  }
  for (const a of await page.locator('a[href]').all()) { // includes the keyboard's link keys, named by aria-label
    const name = ((await a.getAttribute('aria-label')) || (await a.innerText()) || (await a.getAttribute('title')) || '').trim();
    expect(name.length, await a.getAttribute('href')).toBeGreaterThan(0);
  }
});

test('footer keeps the social icons (instagram, email)', async ({ page }) => {
  await expect(page.locator('.jmpa-footer-icon')).toHaveCount(2);
  await expect(page.locator('.jmpa-footer-icon[href="https://instagram.com/jmpa.io"]')).toHaveAttribute('rel', /noopener/);
  await expect(page.locator('.jmpa-footer-icon[href="mailto:support@jmpa.io"]')).toHaveCount(1);
});

test('cards are modern monospace UI: Fira Code only, rounded, hover lifts', async ({ page }) => {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Fira Code"'))).toBe(true);
  for (const sel of ['h1', '.card-title', '.card-desc', '.kbd .cap', '.screen']) {
    expect(await page.locator(sel).first().evaluate((e) => getComputedStyle(e).fontFamily), sel).toContain('Fira Code');
  }
  const card = page.locator('a.card').first();
  expect(parseFloat(await card.evaluate((e) => getComputedStyle(e).borderTopLeftRadius))).toBeGreaterThan(6);
  const before = await card.evaluate((e) => getComputedStyle(e).transform);
  await card.hover();
  await expect.poll(() => card.evaluate((e) => getComputedStyle(e).transform)).not.toBe(before);
  const res = await page.request.get('/fonts/FiraCode-OFL.txt');
  expect(res.status()).toBe(200);
});

test('404 page builds and links home', async ({ page }) => {
  const res = await page.goto('/404.html');
  expect(res!.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('Nothing here.');
  await expect(page.locator('a.btn')).toHaveAttribute('href', '/');
});

test('the old pixel room, pixel buttons and Silkscreen are gone', async ({ page }) => {
  expect(await page.locator('svg.room, .room-frame, .px-btn, a.door').count()).toBe(0);
  expect(await page.evaluate(() => [...document.styleSheets].some((s) => /pixel\.css|room\.css/.test(s.href || '')))).toBe(false);
  expect((await page.request.get('/fonts/Silkscreen-OFL.txt')).status()).toBe(404);
});
