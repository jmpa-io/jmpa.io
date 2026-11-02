import { test, expect } from './fixtures';

// Every GitHub link carries the official mark (inline, currentColor, aria-hidden) and an accessible name.
test('the github links use the GitHub mark', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('a.card[href*="github.com"]');
  expect(await links.count()).toBe(2);
  for (const a of await links.all()) {
    const svg = a.locator('svg[data-icon="github"]');
    await expect(svg).toHaveCount(1);
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute('aria-hidden', 'true');
    await expect(svg).toHaveAttribute('fill', 'currentColor');
    expect(((await a.getAttribute('aria-label')) || (await a.innerText())).trim().length).toBeGreaterThan(0);
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', /noopener/);
  }
});
