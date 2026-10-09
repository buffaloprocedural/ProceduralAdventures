// Twenty curated screenshots for a (hypothetical) press kit: the title, the deal, a spread of settings, genres,
// battles, dungeons, menus and the credits. Saves the native 160x144 frames to tests/shots_press; enlarge them
// with: python3 tools/upscale_shots.py tests/shots_press OUT 6
// usage: node tests/press_shots.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots_press');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 700, height: 700 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto(URL);
  await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.evaluate(() => { PA.audio.muted = true; PA.textSpeed = 3; try { localStorage.clear(); } catch (e) {} });

  const wait = (ms) => page.waitForTimeout(ms);
  const press = async (k, w = 120) => { await page.keyboard.down(k); await wait(40); await page.keyboard.up(k); await wait(w); };
  const shot = async (name, w = 300) => {
    await wait(w);
    const url = await page.evaluate(() => PA.gfx.canvas.toDataURL('image/png'));
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('shot', name);
  };
  const clear = async () => {
    await page.evaluate(() => { PA.scripts.length = 0; PA.replaceAll(PA.ow.scene); PA.ow.musicLock = false; });
    await wait(100);
  };
  // a mid-game world dealt from the given hand, the player standing at (map, x, y)
  const world = (seed, tale, opts) => page.evaluate(([seed, tale, opts]) => {
    opts = opts || {};
    PA.scripts.length = 0;
    PA.forceTale = tale;
    PA.state = PA.newState(seed); PA.genAndInstall(seed);
    PA.forceTale = null;
    const q = PA.world.quest;
    PA.state.name = opts.name || 'ELIZA'; PA.state.femme = opts.femme !== false; PA.state.look = opts.look || (PA.state.femme ? 'femme_3' : 'masc_2');
    PA.state.rival = q.rivalName || 'FITZ';
    PA.state.taleKey = tale === 'classic' ? undefined : tale;
    for (const [n, lv] of opts.party || [['GULLET', 16], ['SERVOLT', 18], ['RIPTABBY', 15], ['PRISMMER', 17], ['LUMIKIT', 12]]) { // GULLIVER leads, as in every story
      const id = PA.sid(n); PA.state.party.push(new PA.Mon(id, lv, PA.isMascot(id) ? { nick: 'GULLIVER', ot: 'GULLIVER' } : {})); PA.dexCatch(id);
    }
    const mon = PA.state.party.find((m) => !PA.isMascot(m.id));
    PA.state.taleMon = mon && mon.name;
    PA.vars = Object.assign({}, PA.world.vars, { PLAYER: PA.state.name, RIVAL: PA.state.rival }, PA.isTale() ? PA.taleVars() : {});
    Object.assign(PA.state.flags, { 'tale:step': 1, act1: true, starter: true, rival1: true, dex: true, quest: true, coldOpen: true, labIntro: true, profStop: true }, opts.flags || {});
    Object.assign(PA.state.bag, { TONIC: 4, 'LAVENDER WATER': 2, 'WORLD MAP': 1, ALMANAC: 1 });
    PA.state.act = opts.act || 1;
    PA.gfx.tod = PA.state.act === 1 ? 'day' : PA.state.act === 2 ? 'noon' : 'dusk'; PA.gfx.clearCache();
    PA.replaceAll(PA.ow.scene);
    let [map, x, y, dir] = opts.atStart ? [PA.world.slots.start.map || 'overworld', PA.world.slots.start.x, PA.world.slots.start.y, 'down'] : opts.at || [];
    if (!map) { const d = PA.world.doors[opts.door || 'home:playerHouse']; map = 'overworld'; x = d.x; y = d.y + (opts.down || 2); dir = 'down'; }
    PA.ow.enterMap(map, x, y, dir);
    for (const s of PA.scenes.slice()) if (s instanceof PA.Banner) PA.pop(s);
    return [q.tale && q.tale.classic ? 'classic' : [q.tale.structure, q.tale.setting, q.tale.genre, q.tale.premise].join('.'), q.episode];
  }, [seed, tale, opts]);
  // walk the player a few steps (real input, so followers follow)
  const walk = async (keys) => { for (const k of keys) { await page.keyboard.down(k); await wait(270); await page.keyboard.up(k); await wait(60); } await wait(300); };
  const say = (text) => page.evaluate((t) => PA.script(PA.say(t)), text);
  const tale = (structure, setting, genre, premise, battles) => ({ structure, setting, genre, premise, battles });

  // 01 the title screen: GULLIVER slides in
  await page.evaluate(() => PA.replaceAll(new PA.Title()));
  await shot('01_title', 2600);

  // 02 a new game: who are you today?
  await page.goto(URL + '?story=race.mall.ocean.lighthouse');
  await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.evaluate(() => { PA.audio.muted = true; PA.textSpeed = 3; PA.script(PA.newGame('PRESSDEAL')); });
  await shot('02_who_are_you', 2400);
  await page.goto(URL); await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.evaluate(() => { PA.audio.muted = true; PA.textSpeed = 3; });

  // 03 Act I card with tonight's episode
  await world('PRESSACT', tale('stolen', 'regency', 'romance', 'ring', true), { atStart: true });
  await page.evaluate(() => { // the setup: out in the open, the client beside you
    const q = PA.world.quest;
    const c = PA.ow.spawnNear({ key: 'clientOpen', x: 0, y: 0, dir: 'up', spr: q.client.spr, pal: 'cTeal', move: 'still', temp: true });
    if (c) { PA.ow.faceNPCToPlayer(c); PA.ow.facePlayerTo(c); }
    PA.script(PA.say(q.T.P.open[0]));
  });
  await shot('03_the_setup', 1800); await clear();

  // 04 Regency: a sunny village
  await world('PRESSREG', tale('newcomer', 'regency', 'manners', 'mayorkey', true), { door: 'town2:clinic', down: 2 });
  await walk(['ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowDown']);
  await shot('04_regency_village');

  // 05 Medieval: market square, with a quiz in progress
  await world('PRESSMED', tale('election', 'medieval', 'solar', 'jester', true), { door: 'town2:shop', down: 2, act: 2 });
  await page.evaluate(() => PA.script(PA.taleQuiz(PA.TALES.genres.solar.quiz[0])));
  for (let i = 0; i < 30 && (await page.evaluate(() => PA.top() && PA.top().constructor.name)) !== 'Menu'; i++) await wait(150);
  await shot('05_medieval_solar_quiz', 300); await clear();

  // 06 a wild creature in the tall grass
  await world('PRESSWILD', tale('crawl', 'forest', 'ocean', 'meteor', true));
  await page.evaluate(() => PA.script(PA.ow.wildBattle(PA.sid('PINKADILLO'), 9)));
  for (let i = 0; i < 40 && (await page.evaluate(() => PA.top() && PA.top().constructor.name)) !== 'BattleMenu'; i++) await press('z', 300);
  await shot('06_wild_battle', 400); await clear();

  // 07 a trainer battle, mid-attack
  await world('PRESSTRN', tale('tournament', 'wildwest', 'sports', 'prizecreature', true));
  await page.evaluate(() => PA.script(PA.ow.trainerBattle({ cls: 'PROSPECTOR', name: 'OLD ZEKE', team: [[PA.sid('IRONPURR'), 16]], prize: 300, spr: 'hiker', pal: 'cBrown', lose: 'Well, I\'ll be!' })));
  for (let i = 0; i < 40 && (await page.evaluate(() => PA.top() && PA.top().constructor.name)) !== 'BattleMenu'; i++) await press('z', 300);
  await press('z', 300); await press('z', 120);
  await shot('07_trainer_battle', 100); await clear();

  // 08 an odd hand: someone in the second town has noticed
  await world('PRESSODD', tale('impostor', 'kingsdungeon', 'videogames', 'arcade', true), { act: 1 });
  await page.evaluate(() => {
    const s = PA.world.maps.overworld.npcSpecs.find((n) => n.key === 'oddOne');
    if (s) { PA.ow.enterMap('overworld', s.x, s.y + 1, 'up'); for (const sc of PA.scenes.slice()) if (sc instanceof PA.Banner) PA.pop(sc); }
    PA.script(PA.say(PA.world.quest.oddChat || 'Funny old week, isn\'t it?'));
  });
  await press('z', 900);
  await shot('08_odd_hand', 600); await clear();

  // 09 the mockumentary crew interviews the townsfolk (1990s grad school)
  await world('PRESSMOCK', tale('newcomer', 'gradschool', 'mockumentary', 'signatures', true), { door: 'town2:clinic', down: 3, act: 2 });
  await say('(to camera) I\'ve been writing my dissertation for six years. It\'s nearly done. The introduction is very nearly started.');
  await shot('09_grad_school_mockumentary', 1300); await clear();

  // 10 escort duty on the space station: the ambassador follows you
  await world('PRESSSPACE', tale('escort', 'space', 'solar', 'ore', false), { party: [] });
  await page.evaluate(() => PA.ow.placeFollower());
  await walk(['ArrowDown', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown']);
  await shot('10_space_station_escort');

  // 11 dusk in the snowbound village (Act III)
  await world('PRESSSNOW', tale('race', 'snowbound', 'comingofage', 'weakest', true), { act: 3, door: 'town3:clinic', down: 3 });
  await walk(['ArrowLeft', 'ArrowLeft', 'ArrowDown']);
  await shot('11_snowbound_dusk');

  // 12 the mole kingdom's crystal caverns (a cave dungeon)
  await world('PRESSMOLE', tale('crawl', 'mole', 'rocks', 'ore', true), { act: 3 });
  await page.evaluate(() => { const f = PA.world.dungeon.floors[0]; PA.ow.enterMap(f.map.id, f.entry[0], f.entry[1] - 2, 'up'); for (const s of PA.scenes.slice()) if (s instanceof PA.Banner) PA.pop(s); });
  await walk(['ArrowUp', 'ArrowUp']);
  await shot('12_mole_kingdom_cave');

  // 13 whoops, all forest: the forest maze
  await world('PRESSWOOD', tale('stranger', 'forest', 'ghost', 'prizecreature', true), { act: 3 });
  await page.evaluate(() => { const f = PA.world.dungeon.floors[f0()]; function f0() { return 0; } PA.ow.enterMap(f.map.id, f.entry[0], f.entry[1] - 3, 'up'); for (const s of PA.scenes.slice()) if (s instanceof PA.Banner) PA.pop(s); });
  await walk(['ArrowUp']);
  await shot('13_forest_maze');

  // 14 the climax: whoever waits at the end
  await world('PRESSFOE', tale('stolen', 'victorian', 'heist', 'ring', true), { act: 3 });
  await page.evaluate(() => {
    const d = PA.world.dungeon, [bx, by] = d.boss, m = PA.world.maps[d.bossMap];
    let y = by + 2; while (y < m.h - 1 && !PA.walkable(m.collAt(bx, y))) y++;
    PA.ow.enterMap(d.bossMap, bx, y, 'up');
    for (const s of PA.scenes.slice()) if (s instanceof PA.Banner) PA.pop(s);
    PA.script(PA.say(PA.world.quest.T.St.foe.meet[1]));
  });
  await shot('14_climax_rival', 1400); await clear();

  // 15 the Wild West saloon (the great hall of that setting)
  await world('PRESSSALOON', tale('tournament', 'wildwest', 'drama', 'beach', true), { at: ['hall', 4, 10, 'up'], act: 2 });
  await walk(['ArrowUp', 'ArrowUp']);
  await shot('15_wild_west_saloon');

  // 16 GULLIVER, leading the team at the travelling circus
  await world('PRESSCIRCUS', tale('homecoming', 'circus', 'manners', 'portrait', true));
  await page.evaluate(() => PA.script(PA.ow.wildBattle(PA.sid('DUSTDASH'), 12)));
  for (let i = 0; i < 40 && (await page.evaluate(() => !(PA.top() && PA.top().constructor.name === 'BattleMenu'))); i++) { await page.keyboard.press('z'); await wait(120); }
  await shot('16_gulliver_battle_circus', 300); await clear();

  // 17 the world map of a seaside resort
  await world('PRESSMAP', tale('sundown', 'victorian', 'slice', 'lighthouse', true));
  await page.evaluate(() => { PA.state.visited = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }; PA.script(PA.menus.worldMap()); });
  await shot('17_world_map', 800); await clear();

  // 18 an ALMANAC entry
  await page.evaluate(() => { PA.dexCatch(PA.sid('HOARFOWL')); PA.script(PA.scenesApi.dexEntry(PA.sid('HOARFOWL'))); });
  await shot('18_almanac_entry', 700); await clear();

  // 19 the team
  await world('PRESSTEAM', tale('storm', 'sky', 'cooking', 'meteor', true), { party: [['GULLET', 21], ['SERVOLT', 22], ['PRISMMER', 19], ['HOARFOWL', 18], ['RIPTABBY', 20], ['LUMIKIT', 17]] });
  await page.evaluate(() => { PA.state.party[0].nick = 'GULLIVER'; PA.script(PA.menus.party()); });
  await shot('19_the_team', 700); await clear();

  // 20 the credits: tonight's cards
  await world('PRESSEND', tale('crawl', 'mole', 'rocks', 'weakest', true), { act: 3 });
  await page.evaluate(() => PA.script(PA.scenesApi.credits()));
  await wait(1500);
  // scroll to the cards
  const idx = await page.evaluate(() => 0);
  await page.keyboard.down('z');
  for (let i = 0; i < 80; i++) {
    await wait(100);
    const ok = await page.evaluate(() => { const sc = PA.top(); return sc && sc.y !== undefined && sc.y < -33 * 10 + 30; });
    if (ok) break;
  }
  await page.keyboard.up('z');
  await shot('20_credits_tonights_cards', 200);

  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
})();
