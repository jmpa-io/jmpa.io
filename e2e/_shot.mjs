import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const out = process.env.OUT;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
for (const scheme of ['light', 'dark']) {
  for (const [name, w, h] of [['desktop', 1600, 900], ['tablet', 900, 900], ['mobile', 390, 844]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
    const p = await c.newPage();
    await p.goto('http://localhost:4172/');
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${name}-${scheme}.png`, fullPage: true });
    await c.close();
  }
}
await b.close();
