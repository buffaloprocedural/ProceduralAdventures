// A quick check (a few seconds) after any change: the game boots, two worlds generate, the title, a wild battle,
// a trainer battle and the main menus all run and draw without a script or page error.
// usage: node tests/smoke.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.waitForTimeout(300); // the title screen draws
  const press = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.down(k); await page.waitForTimeout(20); await page.keyboard.up(k); await page.waitForTimeout(20); } };
  const settle = async (max = 400) => { for (let i = 0; i < max; i++) { if (!(await page.evaluate(() => PA.scriptBusy()))) return; await press('z'); } };
  for (const seed of ['SMOKEA', 'SMOKEB']) {
    await page.evaluate((seed) => {
      PA.audio.muted = true; PA.textSpeed = 3;
      PA.state = PA.newState(seed); PA.genAndInstall(seed);
      PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'ANNE', RIVAL: 'FITZ' });
      PA.replaceAll(PA.ow.scene);
      const d = PA.world.doors['home:playerHouse']; PA.ow.enterMap('overworld', d.x, d.y + 2, 'down');
      PA.state.party = [new PA.Mon(PA.sid('KITEFOX'), 40), new PA.Mon(PA.sid('GLUMPH'), 12)];
      PA.script(PA.ow.wildBattle(PA.sid('MONOCAT'), 5));
    }, seed);
    await settle();
    await page.evaluate(() => PA.script(PA.ow.trainerBattle({ cls: 'TESTER', name: 'DUMMY', team: [[PA.sid('IRONPURR'), 4]], prize: 1, spr: 'hiker', pal: 'cBrown', canLose: true, lose: 'ok' })));
    await settle();
  }
  // the menus: team, stats, bag, almanac, diary, card, options
  await page.evaluate(() => { for (const id of [1, 2, 3]) PA.dexCatch(id); });
  for (const keys of [['Enter', 'ArrowDown', 'z', 'z', 'z', 'x', 'x', 'x', 'x'], ['Enter', 'z', 'z', 'x', 'x', 'x'], ['Enter', 'ArrowDown', 'ArrowDown', 'z', 'x', 'x']]) {
    for (const k of keys) await press(k);
    await page.waitForTimeout(100);
    await settle(30);
  }
  const lastErr = await page.evaluate(() => PA.lastError);
  if (lastErr) errs.push('script: ' + lastErr);
  console.log(errs.length ? 'SMOKE ERRORS\n' + errs.join('\n') : 'SMOKE OK');
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
