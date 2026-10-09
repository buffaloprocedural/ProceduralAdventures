// Screenshots of the protagonist sprites everywhere they appear.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots_hero');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  const expect = async (what, fn, want) => { const got = await p.evaluate(fn); if (got !== want) errs.push(what + ': expected ' + JSON.stringify(want) + ', got ' + JSON.stringify(got)); };
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => window.PA && window.PA.booted);
  const shot = async (n, w = 250) => { await p.waitForTimeout(w); await p.locator('#screen').screenshot({ path: path.join(OUT, n + '.png') }); };
  const press = async (k, w = 120) => { await p.keyboard.down(k); await p.waitForTimeout(40); await p.keyboard.up(k); await p.waitForTimeout(w); };
  await shot('01_title', 600);
  await p.evaluate(() => { PA.audio.muted = true; PA.textSpeed = 3; PA.script(PA.newGame('HEROTEST')); });
  for (let i = 0; i < 200; i++) {
    const t = await p.evaluate(() => { const t = PA.top(); return t ? { n: t.constructor.name, items: t.items } : {}; });
    if (t.n === 'Menu' && t.items && t.items[1] === 'FEMME') { await p.evaluate(() => (PA.top().i = 1)); await press('z'); continue; }
    if (t.n === 'Menu' && t.items && t.items[0] === 'NEW NAME') { await press('z', 400); break; }
    if (t.n === 'Naming') break;
    await press('z', 90);
  }
  await shot('02_naming_femme', 300);
  await p.keyboard.type('ELIZA'); await press('Enter', 400);
  await shot('03_intro_femme', 200);
  // finish the setup so the overworld takes input again
  for (let i = 0; i < 300; i++) {
    const t = await p.evaluate(() => ({ busy: PA.scriptBusy(), n: PA.top() && PA.top().constructor.name }));
    if (!t.busy) break;
    await press('z', 80);
  }
  // typed names keep their Zs (Z is also the A button until you start typing)
  await expect('player name', () => PA.state.name, 'ELIZA');
  await expect('chose femme', () => PA.state.femme, true);
  await expect('a femme look was picked', () => /^femme_[1-6]$/.test(PA.state.look) && PA.heroWho() === PA.state.look, true);
  // the look is random, never the same twice running, always of the chosen kind, and all six turn up
  await expect('looks', () => {
    let prev = null; const seen = { masc: new Set(), femme: new Set() };
    for (let i = 0; i < 300; i++) {
      const femme = i % 3 === 0, k = PA.pickLook(femme);
      if (k === prev || !k.startsWith(femme ? 'femme_' : 'masc_')) return 'bad pick ' + k + ' after ' + prev;
      seen[femme ? 'femme' : 'masc'].add(k); prev = k;
    }
    return seen.masc.size + '/' + seen.femme.size;
  }, '6/6');
  await p.evaluate(() => {
    PA.state.party.push(new PA.Mon(PA.sid('EMBERWREN'), 8));
    PA.replaceAll(PA.ow.scene);
    const d = PA.world.doors['home:playerHouse']; PA.ow.enterMap('overworld', d.x, d.y + 2, 'down'); PA.state.flags.act1 = true;
    PA.ow.follower.on = false; // (no one walking behind, to bump into)
  });
  await shot('04_overworld_femme', 300);
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(90); await shot('05_walk_left_mid', 0); await p.waitForTimeout(400); await p.keyboard.up('ArrowLeft');
  await expect('facing after walking left', () => PA.ow.player.dir, 'left');
  await p.keyboard.down('ArrowDown'); await p.waitForTimeout(90); await shot('06_walk_down_mid', 0); await p.waitForTimeout(300); await p.keyboard.up('ArrowDown');
  await p.waitForTimeout(300); // (let the last step finish)
  await press('ArrowUp', 200); await shot('07_face_up', 100);
  await expect('facing after up', () => PA.ow.player.dir, 'up');
  await press('ArrowRight', 200); await shot('08_face_right', 100);
  await expect('facing after right', () => PA.ow.player.dir, 'right');
  // every look, in the overworld
  for (const k of ['masc', 'femme']) for (let i = 1; i <= 6; i++) {
    await p.evaluate((who) => { PA.state.look = who; }, k + '_' + i);
    await shot('08b_look_' + k + '_' + i, 60);
  }
  await p.evaluate(() => { PA.state.femme = false; PA.state.look = PA.pickLook(false); PA.gfx.tod = 'dusk'; PA.gfx.clearCache(); });
  await shot('09_overworld_boy_dusk', 200);
  await p.evaluate(() => { PA.gfx.tod = 'day'; PA.gfx.clearCache(); PA.script(PA.ow.trainerBattle({ cls: 'SCHOOLGIRL', name: 'ANNE', team: [[PA.sid('DUSTDASH'), 5]], prize: 50, spr: PA.SPR.lass, pal: 'cPink', lose: 'Oh!' })); });
  await shot('10_battle_intro_boy', 1100);
  for (let i = 0; i < 40; i++) { const busy = await p.evaluate(() => PA.scriptBusy()); if (!busy) break; await press('z', 120); }
  await p.evaluate(() => { PA.state.femme = true; PA.state.look = PA.pickLook(true); PA.script(PA.menus.card()); });
  await shot('11_trainer_card_femme', 300); await press('z');
  // back to the title with a clean slate: drop scripts still running from the battle/card above,
  // or their text boxes can pop up over the credits page on a slow machine
  await p.evaluate(() => { PA.scripts.length = 0; PA.replaceAll(new PA.Title()); });
  await press('Enter', 300);
  // pick CREDITS from the title menu; wait on game state rather than key timing (slow machines drop presses)
  for (let tries = 0; tries < 4 && !(await p.evaluate(() => !!(PA.top() && PA.top().opaque))); tries++) {
    await p.waitForFunction(() => PA.top() && PA.top().items && PA.top().items.includes('CREDITS'), null, { timeout: 5000 }).catch(() => {});
    await p.evaluate(() => { const t = PA.top(); if (t && t.items) t.i = t.items.indexOf('CREDITS'); });
    await press('z', 200);
    await p.waitForFunction(() => PA.top() && PA.top().opaque, null, { timeout: 3000 }).catch(() => {});
  }
  await p.keyboard.down('ArrowDown'); await p.waitForTimeout(500); await p.keyboard.up('ArrowDown');
  await shot('12_credits', 100);
  await expect('credits page open', () => PA.top() && PA.top().opaque, true);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
