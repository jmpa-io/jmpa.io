import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel: 'chrome' });
for (const [n, scheme, w, h, open] of [['l',  'light',1280,800,0],['d','dark',1280,800,1],['m','dark',390,844,1]]) {
  const p = await (await b.newContext({ viewport:{width:w,height:h}, colorScheme:scheme, reducedMotion:'reduce' })).newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:4172/'); await p.waitForTimeout(500);
  if (open) { await p.click('#display-btn'); await p.dblclick('.icon[data-window]'); }
  await p.screenshot({ path: `shot-${n}.png` });
}
await b.close();
