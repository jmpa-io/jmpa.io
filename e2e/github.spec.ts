import { test, expect } from './fixtures';

// The GitHub link carries the official mark (inline, currentColor, aria-hidden) and an accessible name; it appears once.
test('the github link uses the GitHub mark', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('a[href*="github.com"]');
  expect(await links.count()).toBe(1);
  const a = links.first();
  await expect(a).toBeVisible();
  const svg = a.locator('svg[data-icon="github"]');
  await expect(svg).toHaveCount(1);
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute('aria-hidden', 'true');
  await expect(svg).toHaveAttribute('fill', 'currentColor');
  expect(((await a.getAttribute('aria-label')) || (await a.innerText())).trim().length).toBeGreaterThan(0);
  await expect(a).toHaveAttribute('target', '_blank');
  await expect(a).toHaveAttribute('rel', /noopener/);
});
