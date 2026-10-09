// Mobile layout + bundle smoke test: touch viewport, start a game with on-screen buttons.
const { chromium, devices } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'procedural-adventures.html'));
  await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'shots_ui', 'mobile_title.png') });
  const tap = async (btn) => { await page.locator('[data-btn="' + btn + '"]').dispatchEvent('pointerdown', { pointerId: 1 }); await page.waitForTimeout(60); await page.locator('[data-btn="' + btn + '"]').dispatchEvent('pointerup', { pointerId: 1 }); await page.waitForTimeout(120); };
  await tap('start'); await tap('a'); await page.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) await tap('a');
  await page.screenshot({ path: path.join(__dirname, 'shots_ui', 'mobile_intro.png') });
  const s = await page.evaluate(() => ({ scenes: PA.scenes.map((x) => x.constructor.name), scale: PA.gfx.scale, touch: document.body.classList.contains('touch') }));
  console.log(JSON.stringify(s), errors.length ? errors : 'NO ERRORS');
  await browser.close();
})();
