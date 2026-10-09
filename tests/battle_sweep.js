// Every attack of the given creatures (default: the ten that joined in October 2026) used in a real battle:
// each creature fights a sturdy opponent, choosing its attacks in turn, until each has been used at least once.
// usage: node tests/battle_sweep.js [NAME ...]
const { chromium } = require('playwright');
const path = require('path');
const NAMES = process.argv.slice(2).length ? process.argv.slice(2) : ['GEMSTOAT', 'KITEFOX', 'DANDYGLIDE', 'MAGPLATE', 'COOLCARRION', 'PETALPOCA', 'MELEEFITE', 'SHOWMEER', 'BURROWL', 'VOLTALOTL'];
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.evaluate(() => {
    PA.audio.muted = true; PA.textSpeed = 3;
    PA.state = PA.newState('SWEEP'); PA.genAndInstall('SWEEP');
    PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'ANNE', RIVAL: 'FITZ' });
    PA.replaceAll(PA.ow.scene);
    const d = PA.world.doors['home:playerHouse']; PA.ow.enterMap('overworld', d.x, d.y + 2, 'down');
    // pick the attacks in turn (the first usable one not yet used, else the next)
    PA.Battle.prototype.chooseAction = function* () {
      const P = this.P;
      if (P.v.charging) return { type: 'fight', move: P.v.charging };
      if (P.v.recharge) return { type: 'fight', move: null };
      this._used = this._used || new Set();
      const mv = this.pm.moves.find((m) => !this._used.has(m.n) && m.pp > 0) || this.pm.moves[(this._k = (this._k || 0) + 1) % this.pm.moves.length];
      this._used.add(mv.n);
      PA._usedMoves.add(mv.n);
      return { type: 'fight', move: mv.n };
    };
  });
  for (const n of NAMES) {
    await page.evaluate((n) => {
      PA.scripts.length = 0; PA.replaceAll(PA.ow.scene);
      PA._usedMoves = new Set();
      const m = new PA.Mon(PA.sid(n), 30); PA.state.party = [m];
      PA._sweep = PA.ow.trainerBattle({ cls: 'TESTER', name: 'DUMMY', team: [[PA.sid('GLUMPH'), 26], [PA.sid('IRONPURR'), 26]], prize: 1, spr: 'hiker', pal: 'cBrown', canLose: true, lose: 'ok' });
      PA.script((function* () { PA._res = yield* PA._sweep; })());
      PA._res = null;
    }, n);
    for (let i = 0; i < 700; i++) {
      const done = await page.evaluate(() => PA._res !== null || !PA.scriptBusy());
      if (done) break;
      await page.keyboard.down('z'); await page.waitForTimeout(25); await page.keyboard.up('z'); await page.waitForTimeout(25);
    }
    const r = await page.evaluate((n) => ({ res: PA._res, used: [...PA._usedMoves], want: PA.species(PA.sid(n)).l.map((x) => x[1]), err: PA.lastError }), n);
    const missing = r.want.filter((m) => !r.used.includes(m));
    console.log(n.padEnd(12), 'result', r.res, 'used', r.used.join(', '), missing.length ? ' MISSING ' + missing.join(', ') : '');
    if (missing.length) errs.push(n + ': never used ' + missing.join(', ')); // (a long battle may still be going: that's fine)
    if (r.err) { errs.push(n + ': ' + r.err); await page.evaluate(() => { PA.lastError = null; }); }
  }
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
