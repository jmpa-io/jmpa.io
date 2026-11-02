import { test, expect } from './fixtures';

const gotoDesktop = async (page) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.icon-img svg').first()).toBeAttached();
  await page.mouse.move(640, 790); // keep the pointer off the icons.
};

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('default', async ({ page }) => {
    await gotoDesktop(page);
    await expect(page).toHaveScreenshot('default.png');
  });

  test('start menu open', async ({ page }) => {
    await gotoDesktop(page);
    await page.locator('#start-btn').click();
    await expect(page).toHaveScreenshot('start-menu.png');
  });

  test('room.exe open', async ({ page }) => {
    await gotoDesktop(page);
    await page.getByRole('button', { name: 'room.exe' }).first().dblclick();
    await expect(page.locator('#win-room')).toBeVisible();
    await expect(page).toHaveScreenshot('room-open.png', { mask: [page.locator('#room')] });
  });

  test('CRT off', async ({ page }) => {
    await gotoDesktop(page);
    await page.locator('#crt-btn').click();
    await expect(page).toHaveScreenshot('crt-off.png');
  });
});

test('mobile default', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await gotoDesktop(page);
  await expect(page).toHaveScreenshot('mobile-default.png');
});
