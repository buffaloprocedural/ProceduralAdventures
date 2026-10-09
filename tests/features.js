// Exercises less-travelled paths: save/continue, run, potion in battle, learn-a-5th-move, evolution, PC.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message + ' | ' + (e.stack || '').split('\n')[1]));
  const url = 'file://' + path.join(__dirname, '..', 'index.html');
  await page.goto(url);
  await page.waitForFunction(() => window.PA && window.PA.booted);
  const press = async (k, w = 50) => { await page.keyboard.down(k); await page.waitForTimeout(34); await page.keyboard.up(k); await page.waitForTimeout(w); };
  const run = async (fnSrc, keys) => {
    await page.evaluate(fnSrc);
    for (let i = 0; i < 500; i++) {
      const s = await page.evaluate(() => ({ busy: PA.scriptBusy(), top: PA.top() && PA.top().constructor.name, items: PA.top() && PA.top().items, i: PA.top() && PA.top().i, err: PA.lastError }));
      if (s.err) { errors.push('script: ' + s.err); await page.evaluate(() => (PA.lastError = null)); }
      if (!s.busy) return;
      if (process.env.DBG) console.log(JSON.stringify(s));
      if (s.top === 'Naming') { await press('Enter'); continue; }
      const k = keys ? keys(s) : 'z';
      await press(k);
    }
    errors.push('timeout in ' + fnSrc.slice(0, 60));
  };
  const log = [];
  await page.evaluate(() => {
    PA.audio.muted = true; PA.textSpeed = 3;
    PA.state = PA.newState('FEATURES'); PA.genAndInstall('FEATURES');
    PA.state.name = 'ANNE'; PA.state.rival = 'FITZ';
    PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'ANNE', RIVAL: 'FITZ' });
    PA.replaceAll(PA.ow.scene);
    const d = PA.world.doors['home:playerHouse']; PA.ow.enterMap('overworld', d.x, d.y + 2, 'down');
    PA.state.flags.act1 = true;
    const a = new PA.Mon(PA.sid('EMBERWREN'), 15); a.hp = 5; PA.state.party.push(a); // low HP
    const b = new PA.Mon(PA.sid('MARGLEAF'), 8); PA.state.party.push(b);  // about to learn its signature
    Object.assign(PA.state.bag, { TONIC: 3 });
  });
  // 1) a tonic in battle, then leave
  let step = 0;
  await run(`PA.script(PA.ow.wildBattle(PA.sid('DUSTDASH'), 3))`, (s) => {
    if (s.top === 'BattleMenu') {
      step++;
      if (step === 1) return s.i === 3 ? 'z' : 'ArrowDown';   // BAG
      if (step === 2 && s.i === 3) return 'z';
      // then LEAVE: the last command
      return s.i === 4 ? 'z' : 'ArrowDown';
    }
    return 'z';
  });
  log.push('after potion/run: hp=' + (await page.evaluate(() => PA.state.party[0].hp)));
  // 2) MARGLEAF reaches level 9 and learns VERDANT VOGUE; a full moveset learns a 5th move
  await page.evaluate(() => { const b = PA.state.party[1]; b.exp = PA.expAt(b.id, 9) - 5; });
  await run(`(function(){ PA.state.party.reverse(); PA.script(PA.ow.wildBattle(PA.sid('DUNEKIT'), 2)); })()`, (s) => (s.top === 'BattleMenu' ? 'z' : 'z'));
  log.push('levelled: ' + (await page.evaluate(() => PA.state.party.map((m) => m.name + ':' + m.level + ':' + m.moves.map((x) => x.n).join('/')).join(','))));
  await page.evaluate(() => { const m = PA.state.party.find((x) => x.id === PA.sid('EMBERWREN')); m.moves = ['TAIL TORCH', 'HOT GOSSIP', 'CURTAIN OF SPARKS', 'TUFT FLARE'].map((n) => ({ n, pp: 5, max: 5 })); PA.script(PA.menus.learnMove(m, 'COAL POUNCE')); });
  for (let i = 0; i < 40; i++) { const busy = await page.evaluate(() => PA.scriptBusy()); if (!busy) break; await press('z'); }
  log.push('moves: ' + (await page.evaluate(() => PA.state.party.find((x) => x.id === PA.sid('EMBERWREN')).moves.map((x) => x.n).join(','))));
  // 3) PC deposit
  await run(`PA.script(PA.ow.lodgings())`, (s) => (s.items && s.items[0] === 'COLLECT' && s.i === 0 ? 'ArrowDown' : 'z'));
  log.push('party/box: ' + (await page.evaluate(() => PA.state.party.length + '/' + PA.state.box.length)));
  // 4) save, reload, continue
  await page.evaluate(() => PA.saveGame());
  await page.reload();
  await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.evaluate(() => { PA.audio.muted = true; });
  await press('Enter', 300); await press('z', 300);
  for (let i = 0; i < 60; i++) { const s = await page.evaluate(() => ({ busy: PA.scriptBusy(), map: PA.ow.mapId })); if (!s.busy && s.map) break; await press('z', 120); }
  log.push('continued: ' + (await page.evaluate(() => PA.ow.mapId + ' ' + PA.state.name + ' party=' + PA.state.party.map((m) => m.name).join(','))));
  console.log(log.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
