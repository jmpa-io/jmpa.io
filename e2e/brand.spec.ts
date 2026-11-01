import { test, expect } from './fixtures';

const ASSETS = ['/favicon.ico', '/favicon-32x32.png', '/favicon-64x64.png', '/apple-touch-icon.png', '/logo-64.png', '/og-image.png'];

test('hoodie favicon, apple-touch-icon, header logo and share image resolve as images', async ({ page, request }) => {
  for (const a of ASSETS) {
    const r = await request.get(a);
    expect(r.status(), a).toBe(200);
    expect(r.headers()['content-type'], a).toMatch(/^image\//);
  }
  await page.goto('/');
  for (const sel of ['link[rel="icon"][href="/favicon.ico"]', 'link[rel="icon"][sizes="32x32"]', 'link[rel="apple-touch-icon"][href="/apple-touch-icon.png"]']) {
    await expect(page.locator(sel)).toHaveCount(1);
  }
});

// The page carries its own CSP meta (img-src 'self' data:), so a blocked logo shows up as a console violation.
test('header logo loads under the page CSP with no violations and does not overflow at 390px', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const logo = page.locator('.logo-img');
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(problems).toEqual([]);
});

test('share image meta is absolute and points at an existing image', async ({ page, request }) => {
  await page.goto('/');
  for (const sel of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    const url = await page.locator(sel).first().getAttribute('content');
    expect(url, sel).toMatch(/^https?:\/\/[^/]+\/og-image\.png$/);
    const r = await request.get(new URL(url!).pathname);
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toMatch(/^image\//);
  }
});
