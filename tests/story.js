// Story bot: plays a seed from new game to credits through the real UI (keypresses), teleporting
// between story beats. Verifies the setup, the tokens, the three acts and the finale run without script errors.
// usage: node tests/story.js SEED [--shots] [--story=structure.setting.genre.premise] [--battles=0|1]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const SEED = process.argv[2] || 'PEMBERLEY';
const SHOTS = process.argv.includes('--shots');
// a dealt story (src/game/tales.js): --story=structure.setting.genre.premise (parts may be *), --battles=0|1
const STORY = (process.argv.find((a) => a.startsWith('--story=')) || '').slice(8);
const BATTLES = (process.argv.find((a) => a.startsWith('--battles=')) || '').slice(10);
const QS = [STORY && 'story=' + STORY, BATTLES && 'battles=' + BATTLES].filter(Boolean).join('&');
const OUT = path.join(__dirname, 'story_shots', SEED);
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  if (process.env.DBGSAY) await page.addInitScript(() => { window.DBGSAY = 1; });
  await page.goto('file://' + path.join(__dirname, '..', 'index.html') + (QS ? '?' + QS : ''));
  await page.waitForFunction(() => window.PA && window.PA.booted);
  let shotN = 0;
  const shot = async (name) => { if (SHOTS) await page.locator('#screen').screenshot({ path: path.join(OUT, String(++shotN).padStart(2, '0') + '_' + name + '.png') }); };
  const press = async (key, wait = 40) => { await page.keyboard.down(key); await page.waitForTimeout(34); await page.keyboard.up(key); await page.waitForTimeout(wait); };
  const st = () => page.evaluate(() => {
    const top = PA.top();
    const name = top ? (top.constructor && top.constructor.name) : null;
    return { busy: PA.scriptBusy(), top: name, items: top && top.items ? top.items.map((x) => (typeof x === 'string' ? x : x.label)) : null,
      battle: PA.scenes.some((s) => s instanceof PA.Battle), bkind: (PA.scenes.find((s) => s instanceof PA.Battle) || {}).kind, map: PA.ow.mapId, err: PA.lastError, flags: PA.state ? PA.state.flags : {}, act: PA.state && PA.state.act };
  });
  let wantFriend = false;
  // drive: keep pressing the right buttons until no script runs and the overworld is on top
  const drive = async (label, max = 1500) => {
    for (let i = 0; i < max; i++) {
      const s = await st();
      if (s.err) { errors.push('[' + label + '] script error: ' + s.err); await page.evaluate(() => (PA.lastError = null)); }
      if (process.env.DBGDRIVE && label.includes(process.env.DBGDRIVE) && i % 5 === 0) console.log(label, i, s.top, s.bkind, JSON.stringify(await page.evaluate(() => { const b = PA.scenes.find((x) => x instanceof PA.Battle); return b ? [b.pm && b.pm.name, b.pm && b.pm.hp, b.pm && b.pm.moves.map((m) => m.n + ':' + m.pp), b.em && b.em.name, b.em && b.em.hp] : null; })));
      if (!s.busy && (s.top === 'Object' || s.top === 'Banner')) return true;
      if (s.top === 'Naming') { await press('Enter'); continue; }
      if (s.top === 'Menu' && s.items && s.items.length === 3) { // naming the impostor: the clues cleared the other two
        const want = await page.evaluate((items) => { const q = PA.world.quest; return q.suspects && items.every((x, i) => x === q.suspects[i].name) ? q.impostor : -1; }, s.items);
        if (want >= 0) { const i = await page.evaluate(() => PA.top().i); await press(i === want ? 'z' : i < want ? 'ArrowDown' : 'ArrowUp'); continue; }
      }
      if (s.top === 'Menu' && s.items) {
        if (s.items.includes('STAY')) { await press('z'); continue; }
        if (s.items.includes('NEW NAME')) { await press('ArrowDown'); await press('z'); continue; }
        if (s.items[0] === 'YES' && wantFriend) { await press('ArrowDown'); await press('z'); continue; } // no nicknames while befriending
      }
      if (s.top === 'MoveMenu') {
        const want = await page.evaluate(() => { const t = PA.top(); const b = t.b; let best = 0, bv = -1; b.pm.moves.forEach((mv, i) => { const d = PA.moveData(mv.n); const v = mv.pp > 0 ? d.power * PA.typeEff(d.type, b.E.types) : -1; if (v > bv) { bv = v; best = i; } }); return (best - t.i + 4) % 4 % Math.max(1, b.pm.moves.length); });
        for (let k = 0; k < want; k++) await press('ArrowDown');
        await press('z'); continue;
      }
      if (s.top === 'PartyScreen' || (s.top === 'Menu' && s.items && s.items[0] === 'SWITCH')) {
        // a forced switch (our lead fainted) can't be cancelled: send out the first healthy one
        const forced = await page.evaluate(() => { const B = PA.scenes.find((x) => x instanceof PA.Battle); return !!(B && B.pm && B.pm.hp <= 0); });
        if (!forced) { await press('x'); continue; }
        if (s.top === 'PartyScreen') {
          const [i, want] = await page.evaluate(() => [PA.top().i, PA.state.party.findIndex((m) => m.hp > 0)]);
          await press(i === want ? 'z' : i < want ? 'ArrowDown' : 'ArrowUp'); continue;
        }
        await press('z'); continue;
      }
      if (s.busy && s.flags.resolving && s.top === 'Object' && !s.battle) {
        // the end credits: hold A to fast-scroll them, as a player would
        await page.keyboard.down('z'); await page.waitForTimeout(600); await page.keyboard.up('z'); continue;
      }
      if (s.top === 'BattleMenu') {
        // BEFRIEND (1) when making friends with a wild one, otherwise ATTACK (0); the menu remembers its last place
        const want = wantFriend && s.bkind === 'wild' && !(await page.evaluate(() => PA.top().b.E.v.hurt)) ? 1 : 0;
        const i = await page.evaluate(() => PA.top().i);
        await press(i === want ? 'z' : i < want ? 'ArrowDown' : 'ArrowUp'); continue;
      }
      if (s.top === 'ApproachMenu') { await press('z'); continue; } // any approach: PA.testFriendAlways
      await press('z', 30);
    }
    errors.push('[' + label + '] drive timeout: ' + JSON.stringify(await st()));
    return false;
  };
  const talk = async (key, mapId, max) => {
    const ok = await page.evaluate(([key, mapId]) => {
      if (mapId && PA.ow.mapId !== mapId) {
        const m = PA.world.maps[mapId];
        const spec = (m.npcSpecs || []).find((n) => n.key === key);
        PA.ow.enterMap(mapId, spec.x, spec.y + 1, 'up');
      }
      const n = PA.ow.npcs.find((x) => x.key === key && x.visible());
      if (!n) return 'missing npc ' + key;
      const m = PA.ow.map;
      for (const [dx, dy, dir] of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) {
        const x = n.x + dx, y = n.y + dy;
        if (m.inb(x, y) && PA.walkable(m.collAt(x, y)) && m.collAt(x, y) !== PA.C.DOOR && !PA.ow.npcAt(x, y)) {
          PA.ow.player.x = x; PA.ow.player.y = y; PA.ow.player.dir = dir;
          PA.ow.follower.x = x; PA.ow.follower.y = y; // (anyone walking behind you, tucked out of the way)
          return true;
        }
      }
      // across a counter
      for (const [dx, dy, dir] of [[0, 2, 'up']]) { const x = n.x + dx, y = n.y + dy; if (m.inb(x, y) && PA.walkable(m.collAt(x, y))) { PA.ow.player.x = x; PA.ow.player.y = y; PA.ow.player.dir = dir; return true; } }
      return 'no spot near ' + key;
    }, [key, mapId]);
    if (ok !== true) { errors.push(ok); return false; }
    await page.waitForTimeout(60);
    await press('z', 80);
    return drive('talk ' + key, max);
  };
  const trigger = async (tag, mapId) => {
    const ok = await page.evaluate(([tag, mapId]) => {
      const m = PA.world.maps[mapId];
      const t = m.triggers.find((t) => t.tag === tag);
      if (!t) return 'no trigger ' + tag;
      // find a walkable tile adjacent to the trigger area that lets us step in
      for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) {
        if (!PA.walkable(m.collAt(x, y)) || m.collAt(x, y) === PA.C.DOOR) continue;
        for (const [dx, dy, dir] of [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']]) {
          const sx = x + dx, sy = y + dy;
          if (sx >= t.x && sx < t.x + t.w && sy >= t.y && sy < t.y + t.h) continue;
          if (!m.inb(sx, sy) || !PA.walkable(m.collAt(sx, sy)) || m.collAt(sx, sy) === PA.C.DOOR) continue;
          PA.ow.enterMap(mapId, sx, sy, dir);
          if (PA.ow.npcAt(x, y)) continue;
          return dir;
        }
      }
      return 'no entry for ' + tag;
    }, [tag, mapId]);
    if (!['up', 'down', 'left', 'right'].includes(ok)) { errors.push(ok); return false; }
    await drive('pre ' + tag);
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[ok];
    await page.keyboard.down(key); await page.waitForTimeout(300); await page.keyboard.up(key);
    await page.waitForTimeout(200);
    return drive('trigger ' + tag);
  };
  const flag = async (k) => (await st()).flags[k];
  const check = async (k, label) => { if (!(await flag(k))) errors.push('flag not set after ' + label + ': ' + k); };

  await page.evaluate((seed) => {
    PA.audio.muted = true; PA.textSpeed = 3; PA.script(PA.newGame(seed));
    PA._log = [];
    const ow = PA.ow.whiteout; PA.ow.whiteout = function* () { PA._log.push('WHITEOUT at ' + PA.ow.mapId + ' party ' + PA.state.party.map((m) => m.name + ':' + m.level + ':' + m.hp).join(',')); yield* ow(); };
    const tb = PA.ow.trainerBattle; PA.ow.trainerBattle = function* (t) { const r = yield* tb(t); PA._log.push('trainer ' + t.name + ' -> ' + r); return r; };
    if (window.DBGSAY) { const sy = PA.say; PA.say = function (t, o) { PA._log.push('SAY ' + PA.sub(String(t)).slice(0, 90)); return sy.call(this, t, o); }; }
    const wb = PA.ow.wildBattle; PA.ow.wildBattle = function* (id, lv, o) { const r = yield* wb(id, lv, o); PA._log.push('wild ' + id + ' L' + lv + ' -> ' + r); return r; };
  }, SEED);
  await page.waitForTimeout(800);
  await drive('intro');
  await playTale();
  async function finish() {
  await check('goal', 'goal'); await check('resolved', 'resolved');
  await shot('end');
  const fin = await st();
  console.log(SEED, 'final map', fin.map, 'act', fin.act, 'resolved', !!fin.flags.resolved);
  console.log((await page.evaluate(() => PA._log)).join('\n'));
  if (errors.length) { console.log('ERRORS (' + errors.length + '):\n' + errors.slice(0, 12).join('\n')); process.exitCode = 1; }
  else console.log(SEED, 'STORY OK');
  await browser.close();
  }

  // ---------------------------------------------------------------- a dealt story, beat by beat
  async function playTale() {
    const T = await page.evaluate(() => { const q = PA.world.quest, t = q.tale; return { cards: [t.structure, t.setting, t.genre, t.premise].join('.'), battles: t.battles, odd: t.odd, n: q.token.n, ep: q.episode, gull: q.gull, bossMap: PA.world.dungeon.bossMap }; });
    console.log(SEED, 'TALE', JSON.stringify(T));
    await shot('setup');
    // the setup: out in the open, the story under way, GULLIVER at the head of the party, the map in the bag
    const S0 = await page.evaluate(() => ({ map: PA.ow.mapId, step: PA.state.flags['tale:step'], act: PA.state.act, lead: PA.state.party[0] && PA.state.party[0].id === PA.GULL_ID,
      map2: PA.state.bag['WORLD MAP'], journal: (PA.state.journal || []).length, start: PA.world.slots.start, femme: typeof PA.state.femme }));
    console.log(SEED, 'SETUP', JSON.stringify(S0));
    if (S0.map !== (S0.start.map || 'overworld')) errors.push('the story starts in ' + S0.map + ', not in the passage out of the hamlet');
    if (S0.step !== 1) errors.push('the setup leaves the story at step ' + S0.step);
    if (S0.act !== 1) errors.push('the setup leaves act ' + S0.act);
    if (!S0.lead) errors.push('GULLIVER is not at the head of the party');
    if (!S0.map2) errors.push('no WORLD MAP in the bag');
    if (!S0.journal) errors.push('no journal entry after the setup');
    if (S0.femme !== 'boolean') errors.push('no presentation chosen');
    if (T.battles) await page.evaluate(() => { for (const m of PA.state.party) { m.level = 70; m.exp = PA.expAt(m.id, 70); m.recalc(); m.hp = m.maxhp; m.moves = m.defaultMoves().map((x) => ({ n: x.n, pp: 99, max: 99 })); } });
    // the lead in the second town, who knows more
    await talk('lead', 'overworld'); await check('tale:lead', 'lead');
    // Act II: every token (questions can be answered wrong; ask again)
    for (let i = 0; i < T.n; i++) {
      const where = await page.evaluate((i) => { for (const id in PA.world.maps) { const s = (PA.world.maps[id].npcSpecs || []).find((n) => n.key === 'tok' + i); if (s) return id; } return null; }, i);
      if (!where) { errors.push('no token-holder ' + i); continue; }
      // a favour: fetch the lost thing first (as if walking to it)
      await page.evaluate((i) => { const it = PA.world.maps.overworld.items.find((x) => x.key === 'fav' + i); if (it && !PA.flag('item:' + it.key)) { PA.setFlag('item:' + it.key); PA.ow.addItem(it.item, 1); } }, i);
      for (let k = 0; k < 12 && !(await flag('tok:' + i)); k++) await talk('tok' + i, where);
      await check('tok:' + i, 'token ' + i);
    }
    await shot('tokens');
    if ((await st()).act !== 2) errors.push('act 2 not reached by the end of the tokens');
    if ((await st()).flags['tale:step'] !== 2) errors.push('all tokens, but step is ' + (await st()).flags['tale:step']);
    // the gate, Act III
    await page.evaluate(() => { PA.ow.enterMap('overworld', PA.world.slots.blocker.x, PA.world.slots.blocker.y, 'down'); });
    await talk('blocker', 'overworld'); await check('tale:gate', 'keeper');
    await trigger('act3', 'overworld');
    if ((await st()).act !== 3) errors.push('act 3 not reached');
    await shot('act3');
    // the climax (a wrong accusation or answer: try again)
    await page.evaluate(() => { PA.testFriendAlways = false; });
    await trigger('foeSeen', T.bossMap);
    for (let k = 0; k < 40 && !(await flag('tale:foe')); k++) await talk('foe', T.bossMap, 3000);
    await check('tale:foe', 'climax');
    for (let k = 0; k < 4 && !(await flag('resolved')); k++) { if (await flag('tale:goal')) await drive('finale', 4000); else await talk('goalThing', T.bossMap, 4000); }
    await check('tale:goal', 'goal'); await check('resolved', 'finale');
    await shot('end');
    await finish();
  }
})();
