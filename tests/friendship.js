// Befriending (docs/FRIENDSHIP_PLAN.md) in real battles: the actions are scripted (as tests/battle_sweep.js does),
// everything else - turns, hearts, retaliation, leaving, joining - runs as in the game.
// usage: node tests/friendship.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();
  const errs = [];
  const check = (name, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); if (!ok) errs.push(name); };
  page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.evaluate(() => {
    PA.audio.muted = true; PA.textSpeed = 3;
    PA.state = PA.newState('FRIENDS'); PA.genAndInstall('FRIENDS');
    PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'ANNE', RIVAL: 'FITZ' });
    PA.replaceAll(PA.ow.scene);
    const d = PA.world.doors['home:playerHouse']; PA.ow.enterMap('overworld', d.x, d.y + 2, 'down');
    // scripted actions; before each one, a snapshot of the befriending state
    PA.Battle.prototype.chooseAction = function* () {
      PA._snaps.push({ hurt: !!this.E.v.hurt, hearts: this.E.v.hearts || 0, pHp: this.pm.hp, eHp: this.em.hp });
      const a = PA._acts.shift();
      if (!a) return { type: 'run' };
      if (a.type === 'fight' && !a.move) return { type: 'fight', move: this.pm.moves.find((m) => PA.moveData(m.n).power > 0).n };
      return a;
    };
  });
  // one battle: set up the team, script the actions, press B through every message (B answers NO to nicknames)
  const battle = async (opts) => {
    await page.evaluate((o) => {
      PA.scripts.length = 0; PA.replaceAll(PA.ow.scene);
      PA.state.party = o.party.map(([n, lv, moves]) => { const m = new PA.Mon(PA.sid(n), lv); if (moves) m.moves = moves.map((x) => ({ n: x, pp: 20, max: 20 })); return m; });
      PA._acts = o.acts; PA._snaps = []; PA._res = null; PA.testFriendAlways = !!o.always;
      const g = o.trainer ? PA.ow.trainerBattle({ cls: 'TESTER', name: 'MARY', team: [[PA.sid(o.foe), o.lv]], prize: 1, spr: 'hiker', pal: 'cBrown', canLose: true, lose: 'ok' })
        : PA.ow.wildBattle(PA.sid(o.foe), o.lv, { special: !!o.special, canLose: true });
      PA.script((function* () { PA._res = yield* g; })());
    }, opts);
    for (let i = 0; i < (opts.max || 900); i++) {
      if (await page.evaluate(() => PA._res !== null || !PA.scriptBusy())) break;
      await page.keyboard.down('x'); await page.waitForTimeout(16); await page.keyboard.up('x'); await page.waitForTimeout(16);
    }
    return page.evaluate(() => ({ res: PA._res, snaps: PA._snaps, party: PA.state.party.map((m) => m.sp.n), box: PA.state.box.map((m) => m.sp.n), likes: PA.state.likes || {} }));
  };
  const id = (n) => page.evaluate((n) => PA.sid(n), n);

  // 1. success: it joins the team and the almanac, and the lead gains EXP
  await page.evaluate(() => { PA.state.box = []; PA.state.caught = {}; });
  let r = await battle({ party: [['IRONPURR', 30]], foe: 'KITEFOX', lv: 4, always: true, acts: [{ type: 'befriend', approach: 'COMPLIMENT' }] });
  const exp1 = await page.evaluate(() => PA.state.party[0].exp - PA.expAt(PA.state.party[0].id, 30));
  check('a friend joins the team', r.res === 'befriended' && r.party.includes('KITEFOX'), JSON.stringify(r.res) + ' ' + r.party);
  check('...and the almanac', await page.evaluate((i) => !!PA.state.caught[i], await id('KITEFOX')));
  check('...and the lead gains EXP', exp1 > 0, 'exp ' + exp1);

  // 2. a damaging hit closes befriending; afterwards BEFRIEND does nothing
  // (PETALPOCA has no move that dodges, so the first hit lands unless the 1-in-256 miss strikes; a miss doesn't count)
  r = await battle({ party: [['IRONPURR', 30]], foe: 'PETALPOCA', lv: 30, acts: [{ type: 'fight' }, { type: 'fight' }, { type: 'befriend', approach: 'PET' }] });
  const hit = r.snaps.findIndex((s, i) => i > 0 && s.eHp < r.snaps[0].eHp);
  check('a hit closes befriending', hit > 0 && r.snaps[hit].hurt === true, JSON.stringify(r.snaps));
  check('...and BEFRIEND then adds nothing', r.snaps.every((s) => s.hearts === 0) && r.res !== 'befriended');

  // 3. a status move that lands on it closes it too; a self-boost does not
  r = await battle({ party: [['MELEEFITE', 30, ['POTTED']]], foe: 'KITEFOX', lv: 30, acts: [{ type: 'fight', move: 'POTTED' }] });
  check('a self-boost leaves befriending open', r.snaps[1] && r.snaps[1].hurt === false, JSON.stringify(r.snaps[1]));
  r = await battle({ party: [['POTOOM', 30, ['WIDE-EYE STARE']]], foe: 'KITEFOX', lv: 30, acts: [{ type: 'fight', move: 'WIDE-EYE STARE' }] });
  check('a status move on it closes befriending', r.snaps[1] && r.snaps[1].hurt === true, JSON.stringify(r.snaps[1]));

  // 4. a trainer's creature already has its person
  r = await battle({ trainer: true, party: [['IRONPURR', 40]], foe: 'KITEFOX', lv: 3, always: true, acts: [{ type: 'befriend', approach: 'COMPLIMENT' }, { type: 'fight' }, { type: 'fight' }, { type: 'fight' }] });
  check('a trainer\'s creature can\'t be befriended', r.res === 'win' && !r.party.includes('KITEFOX'), r.res + ' ' + r.party);

  // 5. petting one that hates it: it bites back at once (your lead is hurt, it is not), and the almanac learns
  r = await battle({ party: [['GLUMPH', 30]], foe: 'MONOCAT', lv: 30, acts: [{ type: 'befriend', approach: 'PET' }] });
  const monocat = await id('MONOCAT');
  check('petting one that hates it: it retaliates', r.snaps[1] && r.snaps[1].pHp < r.snaps[0].pHp && r.snaps[1].eHp === r.snaps[0].eHp, JSON.stringify(r.snaps.slice(0, 2)));
  check('...befriending stays open', r.snaps[1] && r.snaps[1].hurt === false);
  check('...and the almanac remembers', (r.likes[monocat] || {}).pet === 'hates', JSON.stringify(r.likes[monocat]));

  // 6. the wrong food changes nothing; the right one (its favourite, for MONOCAT) can win hearts
  r = await battle({ party: [['GLUMPH', 60]], foe: 'MONOCAT', lv: 5, acts: [{ type: 'befriend', approach: 'FEED', food: 'SEEDS' }] });
  check('the wrong food changes nothing', r.snaps[1] && r.snaps[1].hearts === 0 && !(r.likes[monocat] || {}).diet, JSON.stringify(r.snaps[1]));
  r = await battle({ party: [['GLUMPH', 60]], foe: 'MONOCAT', lv: 5, acts: Array(10).fill({ type: 'befriend', approach: 'FEED', food: 'TREATS' }) });
  check('the right food wins hearts', r.res === 'befriended' || r.snaps.some((s) => s.hearts > 0), r.res + ' ' + JSON.stringify(r.snaps.map((s) => s.hearts)));
  check('...and the almanac learns its diet', (r.likes[monocat] || {}).diet === 'treats');

  // 7. a disliked approach can make it leave (a Shy One, often); a special creature never leaves
  r = await battle({ party: [['GLUMPH', 60]], foe: 'DANDYGLIDE', lv: 5, acts: Array(12).fill({ type: 'befriend', approach: 'COMPLIMENT' }) });
  check('a disliked approach can make it leave', r.res === 'run', r.res + ' after ' + r.snaps.length + ' tries');
  r = await battle({ party: [['GLUMPH', 60]], foe: 'DANDYGLIDE', lv: 5, special: true, max: 2500, acts: Array(6).fill({ type: 'befriend', approach: 'COMPLIMENT' }).concat(Array(6).fill({ type: 'fight' })) });
  check('a special creature never leaves', r.res === 'win' && r.snaps.length >= 7, r.res + ' after ' + r.snaps.length);

  // 8. a full team: the new friend goes to the lodgings
  await page.evaluate(() => { PA.state.box = []; });
  r = await battle({ party: [['IRONPURR', 30], ['GLUMPH', 30], ['KITEFOX', 30], ['LUMIKIT', 30], ['SERVOLT', 30], ['POTOOM', 30]], foe: 'PETALPOCA', lv: 4, always: true, acts: [{ type: 'befriend', approach: 'PET' }] });
  check('a full team sends it to the lodgings', r.res === 'befriended' && r.box.includes('PETALPOCA'), r.res + ' box ' + r.box);

  // 9. saved games keep it
  const saved = await page.evaluate(() => { PA.saveGame(); const d = PA.loadSaveData(); return d && JSON.stringify(d).includes('"box"') && (d.box || []).length; });
  check('saving keeps the new friend', saved === 1, 'box in save: ' + saved);

  // 10. the type quest's goal is met by befriending one of the type
  await page.evaluate(() => { const q = PA.world.quest; q.kind = 'type'; q.type = 'BREEZE'; PA.state.flags.goal = false; PA.state.flags.bossWon = false; });
  await page.evaluate(() => { PA.state.box = []; });
  r = await battle({ party: [['IRONPURR', 30]], foe: 'DANDYGLIDE', lv: 4, always: true, acts: [{ type: 'befriend', approach: 'WAIT' }] });
  check('befriending one of the type meets the quest goal', r.res === 'befriended' && (await page.evaluate(() => !!PA.flag('goal'))), r.res);

  // 11. every creature has a care row
  const missing = await page.evaluate(() => PA.ROSTER_NAMES.filter((n) => !PA.CARE[n]));
  check('every creature has a PA.CARE row', !missing.length, missing.join(', '));
  const lastErr = await page.evaluate(() => PA.lastError);
  if (lastErr) errs.push('script: ' + lastErr);
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
