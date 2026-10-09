const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.evaluate(() => {
    PA.audio.muted = true;
    PA.state = PA.newState('DBG'); PA.genAndInstall('S1');
    PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'BOT', RIVAL: 'RIV' });
    PA.replaceAll(PA.ow.scene); PA.ow.enterMap('lab', 4, 6, 'up');
    const m = new PA.Mon(PA.sid('PYRACAL'), 70); m.moves = m.moves.map((x) => ({ n: x.n, pp: 99, max: 99 })); PA.state.party.push(m);
    PA._lines = [];
    const say = PA.say; PA.say = function* (t, o) { PA._lines.push(PA.sub(t)); yield* say(t, o); };
    PA.script(PA.ow.trainerBattle({ cls: 'LT.', name: 'WICKHAM', team: [[PA.sid('MONOCAT'),16],[PA.sid('LORISLURK'),17],[PA.sid('HEXKIT'),19]], prize: 2400, spr: 'redcoat', pal: 'cRed', lose: 'x' }));
  });
  for (let i = 0; i < 600; i++) {
    const busy = await page.evaluate(() => PA.scriptBusy());
    if (!busy) break;
    const want = await page.evaluate(() => { const t = PA.top(); if (!t || t.constructor.name !== 'MoveMenu') return -1; const b = t.b; let best = 0, bv = -1; b.pm.moves.forEach((mv, i) => { const d = PA.moveData(mv.n); const v = mv.pp > 0 ? d.power * PA.typeEff(d.type, b.E.types) : -1; if (v > bv) { bv = v; best = i; } }); return (best - t.i + 4) % 4 % Math.max(1, b.pm.moves.length); });
    for (let k = 0; k < want; k++) { await page.keyboard.down('ArrowDown'); await page.waitForTimeout(30); await page.keyboard.up('ArrowDown'); await page.waitForTimeout(30); }
    await page.keyboard.down('z'); await page.waitForTimeout(30); await page.keyboard.up('z'); await page.waitForTimeout(30);
  }
  console.log((await page.evaluate(() => PA._lines)).join('\n'));
  console.log(await page.evaluate(() => JSON.stringify(PA.state.party.map((m) => [m.name, m.level, m.hp, m.maxhp, m.atk, m.moves.map((x) => x.n)]))));
  await browser.close();
})();
