// Procedural Adventures - quest generation, world population and the three-act story scripts
'use strict';
(function (PA) {
  const C = PA.C, T = PA.T, L = PA.Lines, S = PA.SPR;

  // ---------------------------------------------------------------- state helpers
  PA.state = null;
  PA.flag = (k) => !!(PA.state && PA.state.flags[k]);
  PA.setFlag = (k, v) => { if (PA.state) PA.state.flags[k] = v === undefined ? true : v; };

  // ---------------------------------------------------------------- quest
  // The three on PROF. BENNET's table: one from each type of the HEARTH ring (src/game/roster.js), so that
  // whichever you take, there is one that beats it - and that is the one your rival takes.
  const STARTER_TYPES = ['BLOOM', 'KINDLE', 'TIDE'];
  const STARTERS = {
    BLOOM: [['MARGLEAF', 6], ['MOSSAPO', 3]],
    KINDLE: [['EMBERWREN', 6], ['PYRACAL', 3], ['FOSSIRE', 2]],
    TIDE: [['RIPTABBY', 6], ['PUFFLUKE', 3], ['YAMMERS', 2], ['GLUMPH', 1]],
  };
  PA.genQuest = function (rng, world) {
    const q = {};
    q.starters = STARTER_TYPES.map((t) => rng.pickW(STARTERS[t].map(([n, w]) => [PA.sid(n), w])));
    const starterTypes = new Set();
    q.starters.forEach((id) => PA.species(id).t.forEach((t) => starterTypes.add(t)));
    q.kind = rng.chance(0.55) ? 'item' : 'type';
    if (q.kind === 'item') {
      const it = rng.pick(L.ITEMS);
      Object.assign(q, it);
      q.goal = it.item;
    } else {
      const types = Object.keys(L.TYPES).filter((t) => !starterTypes.has(t) && PA.TYPE_SPECIES(t).length >= 1);
      q.type = rng.pick(types);
      q.goal = q.type + '-TYPE';
    }
    q.giver = rng.pick(L.GIVERS);
    // GULLIVER is in the party in every story (src/game/mascot.js)
    q.gull = 'party';
    q.opening = 'classic';
    q.rivalStyle = rng.pick(['proud', 'pompous', 'flighty']);
    q.villain = rng.pick(['charmer', 'dame', 'syndicate']);
    q.V = L.VILLAIN[q.villain];
    q.dungeon = rng.chance(0.55) ? 'cave' : 'forest';
    q.blocker = rng.chance(0.5) ? 'sulker' : 'guard';
    q.key = q.blocker === 'sulker' ? 'MUSIC BOX' : 'INVITATION';
    q.leader = rng.pick([
      { name: 'MR. LONG', spr: 'gentleman', pal: 'cGold', types: ['BREEZE', 'CHROME'] },
      { name: 'LADY LUCAS', spr: 'lady', pal: 'cPink', types: ['GLAM', 'HUSH'] },
      { name: 'COL. FORSTER', spr: 'cooltrainer', pal: 'cRed', types: ['STONE', 'CURRENT'] },
      { name: 'MRS. HURST', spr: 'beauty', pal: 'cPurple', types: ['TIDE', 'FROST'] },
      { name: 'MR. KING', spr: 'squire', pal: 'cBrown', types: ['STONE', 'LOAM'] },
    ]);
    q.prof = L.PROF;
    q.episode = L.episode(rng, q);
    q.acts = rng.chance(0.5) ? L.ACTS : L.ACTS_ALT;
    q.coldOpen = rng.pick([
      '{PLAYER} woke up.\fIt was a truth universally acknowledged that today was going to be important.',
      '{PLAYER} woke up.\fSomewhere, a world finished generating itself, and stretched.',
      '{PLAYER} woke up.\fThe sun was shining, the tall grass was rustling, and somebody downstairs was having a crisis.',
    ]);
    q.ending = rng.pick([
      'PROF. BENNET: Well, {PLAYER}. A whole county, conjured out of nothing but a number, and you walked across it as if it had always been there.\fPerhaps that is all any of us ever do.',
      'PROF. BENNET: Every adventure must end, {PLAYER}, so that the next one has somewhere to begin.\fI shall be in my study. Do knock. Or don\'t. I\'ll know.',
      'PROF. BENNET: I have read a great many books, {PLAYER}, and the best of them are the ones in which somebody is kind for no particular reason.\fYours was one of those.',
    ]);
    // Every new game deals a story from the four decks instead (src/game/tales.js). The classic story above is
    // kept only to carry on a game saved in it; the deal uses the seed alone, so it draws what it always drew.
    q.tale = PA.rollTale ? PA.rollTale(world.seed) : { classic: true };
    if (!q.tale.classic) PA.taleQuest(q, world);
    return q;
  };

  // ---------------------------------------------------------------- population helpers
  function addNPC(map, spec) {
    map.npcSpecs = map.npcSpecs || [];
    spec.map = map.id;
    if (spec.solidForGen === undefined) spec.solidForGen = spec.move !== 'wander';
    map.npcSpecs.push(spec);
    return spec;
  }
  PA.addNPC = addNPC;
  function addSign(map, x, y, textOrScript) {
    map.signs.push(typeof textOrScript === 'function' ? { x, y, script: textOrScript } : { x, y, text: textOrScript });
  }
  const dirFrom = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));

  // A trainer class's sprite. Some classes list several (Team Prejudice grunts are men and women);
  // the choice hashes a stable key rather than drawing from the world RNG, so layouts don't shift.
  function sprFor(D, key) {
    if (!Array.isArray(D.spr)) return S[D.spr];
    let h = 0;
    for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return S[D.spr[h % D.spr.length]];
  }
  // Some characters have their own lines (L.voiceOf: the surfers, the goths). Picked by hashing the NPC's
  // key rather than drawing from the world RNG, so no layout shifts.
  function voiced(spr, key, text) {
    const bank = L[L.voiceOf[spr]];
    if (!bank) return text;
    let h = 0;
    for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return bank[h % bank.length];
  }
  function trainerSpec(rng, cls, lvA, lvB, n, opts) {
    opts = opts || {};
    const D = opts.def || L.TRAINERS[cls] || L.TRAINERS.SCHOOLBOY;
    const team = PA.makeTeam(rng, D.types, n, lvA, lvB, opts.pool);
    const prize = Math.round(team.reduce((a, t) => a + t[1], 0) * (opts.rich ? 30 : 15));
    return {
      cls: opts.clsName || cls, name: opts.name || L.trainerName(rng, opts.nameKey || cls), team, prize,
      intro: opts.intro || rng.pick(D.intro), lose: opts.lose || rng.pick(D.lose), after: opts.after || rng.pick(D.after),
      spr: sprFor(D, cls), pal: rng.pick(D.pals), sight: opts.sight || rng.int(3, 4),
    };
  }

  // ---------------------------------------------------------------- populate
  PA.populateQuest = function (world, rng) {
    if (PA.isTale && PA.isTale(world)) { PA.populateTale(world, rng); return; } // a dealt story (src/game/tales.js)
    const q = world.quest, ow = world.maps.overworld;
    const cells = world.cells;
    const home = cells.find((c) => c.role === 'home');
    const t2 = cells.find((c) => c.role === 'town2');
    const t3 = cells.find((c) => c.role === 'town3');
    const zoneName = (role) => world.zones[world.zoneTown(role)].name;
    world.vars = {
      HOME: zoneName('home'), TOWN2: zoneName('town2'), TOWN3: zoneName('town3'),
      DUNGEON: q.dungeon === 'cave' ? world.names.mount : world.names.wood, REGION: world.names.region,
      GOAL: q.goal, ITEM: q.item || '', TYPE: q.type || '', GIVER: q.giver.name, BOSS: q.V.name, LACKEYS: q.V.title,
      KEY: q.key, LEADER: q.leader.name, SEED: world.seed, PROF: q.prof.name,
    };
    // ---- generic town folk
    for (const c of cells.filter((cc) => cc.kind === 'town')) {
      const tr = rng.sub('folk' + c.i);
      const n = c.role === 'home' ? 2 : 3;
      const roles = ['lady', 'oldman', 'girl', 'youngster', 'gentleman', 'maid', 'kid', 'farmer', 'granny', 'scholar', 'lass', 'woman', 'chef', 'milkmaid', 'mechanic', 'scarlet_goth', 'violet_goth'];
      for (let i = 0; i < n; i++) {
        const spot = takeSpot(c, tr);
        if (!spot) break;
        const r = tr.next();
        const text = r < 0.15 ? L.quoteNPC(tr) : L.townsfolk(tr);
        const key = 'folk' + c.i + '_' + i, dir = tr.pick(['down', 'left', 'right', 'up']), spr = S[tr.pick(roles)]; // drawn in their old order
        addNPC(ow, { key, x: spot[0], y: spot[1], dir, spr, pal: tr.pick(['cRed', 'cBlue', 'cGreen', 'cBrown', 'cPurple', 'cPink', 'cTeal', 'cGold']), move: tr.chance(0.6) ? 'wander' : 'turn', text: voiced(spr, key, text) });
      }
      // a creature wandering about town
      if (tr.chance(0.6)) {
        const spot = takeSpot(c, tr);
        const kinds = [['DUSTDASH', 'DUSTDASH: Meep! Meep!'], ['LUMIKIT', 'LUMIKIT: Mew...! (It glows, embarrassed.)'], ['PUFFLUKE', 'PUFFLUKE: Arrk! Arrk!'], ['MONOCAT', 'MONOCAT: Hmph.']];
        const k = tr.pick(kinds);
        if (spot) addNPC(ow, { key: 'pet' + c.i, x: spot[0], y: spot[1], dir: 'down', spr: PA.monSpr(PA.sid(k[0])), move: 'wander', text: k[1], cry: true });
      }
    }
    // ---- HOME TOWN
    populateHome(world, rng.sub('home'), home);
    populateTown2(world, rng.sub('t2'), t2);
    populateTown3(world, rng.sub('t3'), t3);
    populateRoutes(world, rng.sub('routes'));
    populateGate(world, rng.sub('gate'));
    populateDungeon(world, rng.sub('dun'));
    populateGlade(world, rng.sub('glade'));
    populateHouses(world, rng.sub('houses'));
  };
  function takeSpot(c, rng) {
    if (!c.free || !c.free.length) return null;
    for (let t = 0; t < 30; t++) {
      const i = rng.int(0, c.free.length - 1);
      const p = c.free[i];
      if (c.taken && c.taken.has(p[0] + ',' + p[1])) continue;
      c.taken = c.taken || new Set();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c.taken.add((p[0] + dx) + ',' + (p[1] + dy));
      return p;
    }
    return null;
  }

  // ================================================================= HOME
  function populateHome(world, rng, c) {
    const q = world.quest, ow = world.maps.overworld;
    const h1 = world.maps.home1, h2 = world.maps.home2, lab = world.maps.lab, rh = world.maps.rivalHouse;
    // bedroom furniture
    addSign(h2, 0, 0, () => PA.ow.sayRnd(L.DESK));
    addSign(h2, 0, 1, () => PA.ow.sayRnd(L.DESK));
    addSign(h2, 3, 4, L.GAMES);
    addSign(h2, 3, 5, L.GAMES);
    h2.onEnter = function* () {
      if (!PA.flag('coldOpen')) { PA.setFlag('coldOpen'); yield* PA.say(q.coldOpen); }
    };
    // living room
    addSign(h1, 3, 1, () => PA.ow.sayRnd(L.TV));
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) addSign(h1, x, y, () => PA.say(L.bookshelf(PA.rand)));
    addNPC(h1, { key: 'mother', x: 5, y: 4, dir: 'left', spr: S.mother, pal: 'cPink', move: 'turn', talk: function* () {
      if (!PA.flag('starter')) {
        yield* PA.say('MOTHER: Oh, {PLAYER}! There you are! PROF. BENNET has been asking for you all morning.\fSomething about {GIVER} and a tremendous fuss. Do go and see him at his laboratory, there\'s a dear.\fAnd mind the tall grass! It\'s very... tall.');
      } else if (!PA.flag('goal')) {
        yield* PA.say(rng.pick(['MOTHER: {PLAYER}! You look exhausted. Have a little rest.', 'MOTHER: Oh, my nerves! An adventure! In MY family! Sit down, sit down.', 'MOTHER: You should rest a little. Heroes need naps too.']));
        yield* PA.ow.heal(true);
        yield* PA.say('MOTHER: There! Now off you go. And do write.');
      } else {
        yield* PA.say('MOTHER: My {PLAYER}, a hero! I always said so. Well, I said it once. Quietly.');
        yield* PA.ow.heal(true);
      }
    } });
    // rival's house: sister gives a WORLD MAP
    addNPC(rh, { key: 'sister', x: 2, y: 3, dir: 'right', spr: S.sister, pal: 'cTeal', move: 'turn', talk: function* () {
      if (!PA.flag('townMap')) {
        yield* PA.say('{RIVAL}\'s SISTER: Hello, {PLAYER}. My sibling has gone off to the laboratory, in a mood. They\'re always in a mood. It\'s their hobby.');
        if (PA.flag('starter')) {
          yield* PA.say('{RIVAL}\'s SISTER: Oh, you\'re going on an adventure? Then you\'ll want this. It\'s a map of the whole county. I drew it myself, this morning, very quickly.');
          yield* PA.ow.give('WORLD MAP');
          PA.setFlag('townMap');
          yield* PA.say('{RIVAL}\'s SISTER: Press START and look in your ITEMS to use it.');
        }
      } else yield* PA.say(L.townsfolk(PA.rand));
    } });
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [7, 0], [7, 1]]) addSign(rh, x, y, () => PA.say(L.bookshelf(PA.rand)));
    // laboratory
    for (const [x, y] of [[6, 0], [7, 0], [8, 0], [9, 0], [6, 1], [7, 1], [8, 1], [9, 1], [0, 6], [1, 6], [2, 6], [3, 6], [6, 6], [7, 6], [8, 6], [9, 6], [0, 7], [1, 7], [2, 7], [3, 7], [6, 7], [7, 7], [8, 7], [9, 7]]) addSign(lab, x, y, () => PA.say(L.bookshelf(PA.rand)));
    addSign(lab, 0, 1, 'An enormous computer. The screen says: "WORLD GENERATED. SEED {SEED}. PLEASE ENJOY RESPONSIBLY."');
    addSign(lab, 2, 1, () => PA.say('A research notebook. It reads:\f"The creatures appear to be made of the same stuff as everything else here: chance, and a great deal of care."'));
    addSign(lab, 3, 1, () => PA.say('A research notebook. It reads:\f"' + L.quote(PA.rand) + '"'));
    addNPC(lab, { key: 'prof', x: 5, y: 2, dir: 'down', spr: S.prof, pal: 'cGrey', move: 'still', talk: profTalk(world) });
    addNPC(lab, { key: 'labRival', x: 4, y: 3, dir: 'up', spr: S.rival, pal: 'cBlue', move: 'still', cond: () => !PA.flag('rival1'),
      talk: function* () { yield* PA.say(PA.flag('starter') ? '{RIVAL}: Hmph. Choose more carefully next time.' : L.RIVAL[q.rivalStyle].lab); } });
    addNPC(lab, { key: 'giverLab', x: 4, y: 6, dir: 'up', spr: S[q.giver.spr], pal: q.giver.pal, move: 'turn', cond: () => PA.flag('quest'), talk: function* () {
      if (PA.flag('goal')) yield* PA.say('{GIVER}: Thank you again, {PLAYER}. Truly.');
      else yield* PA.say(q.kind === 'item' ? '{GIVER}: Please hurry, {PLAYER}! ' + PA.title(q.stakes.split(',')[0]) + '!' : '{GIVER}: A {TYPE}-type, {PLAYER}! I\'m counting on you!');
    } });
    // the three starters, sitting on the counter
    q.starters.forEach((id, i) => {
      addNPC(lab, { key: 'starter' + i, x: 6 + i, y: 3, dir: 'down', spr: 'mon:' + id, move: 'none', cond: () => PA.state.starterTaken === undefined || (PA.state.starterTaken !== i && PA.state.rivalTaken !== i), talk: pickStarter(world, i) });
    });
    lab.onEnter = function* () { if (!PA.flag('labIntro')) yield* labIntro(world); };
    // leaving the lab before battling the rival
    lab.triggers.push({ tag: 'rivalLab', x: 0, y: 9, w: 10, h: 2, cond: () => PA.flag('starter') && !PA.flag('rival1'), script: () => rivalLabBattle(world) });
    // stop at the town exit before having a creature
    for (const o of c.open) {
      const zone = o.side;
      const tiles = [];
      for (let k = 0; k < o.w; k++) {
        if (zone === 'left') tiles.push([c.x0 + 2, c.y0 + o.pos + k]);
        if (zone === 'right') tiles.push([c.x0 + PA.CELL.CW - 3, c.y0 + o.pos + k]);
        if (zone === 'up') tiles.push([c.x0 + o.pos + k, c.y0 + 2]);
        if (zone === 'down') tiles.push([c.x0 + o.pos + k, c.y0 + PA.CELL.CH - 3]);
      }
      for (const [x, y] of tiles) ow.triggers.push({ tag: 'profStop', x, y, w: 1, h: 1, cond: () => !PA.flag('starter'), script: () => profStop(world) });
    }
    // Act I card upon first leaving the house
    ow.triggers.push({ tag: 'act1', x: world.doors['home:playerHouse'].x, y: world.doors['home:playerHouse'].y + 1, w: 1, h: 1, cond: () => !PA.flag('act1'), script: function* () {
      PA.setFlag('act1'); yield* PA.ow.setAct(1);
    } });
    // GULLIVER joins the party outside the lab, once the first rival battle is over (in a game saved before he
    // led every party)
    const labDoor = world.doors['home:lab'];
    if (q.gull === 'party' && labDoor) ow.triggers.push({ tag: 'gullJoin', x: labDoor.x - 1, y: labDoor.y + 1, w: 3, h: 2, cond: () => PA.flag('rival1') && !PA.flag('gullJoined'), script: () => PA.gullJoin() });
  }
  function profTalk(world) {
    const q = world.quest;
    return function* () {
      if (!PA.flag('starter')) { yield* PA.say(q.prof.intro); return; }
      if (!PA.flag('rival1')) { yield* PA.say('PROF. BENNET: {RIVAL} seems to want a word with you on your way out. They have that look. The one with eyebrows.'); return; }
      if (PA.flag('goal')) { yield* PA.say(q.ending); return; }
      yield* PA.say(PA.rand.pick(q.prof.idle));
    };
  }
  function* labIntro(world) {
    const q = world.quest;
    PA.setFlag('labIntro');
    PA.setFlag('profStop');
    yield* PA.say(L.RIVAL[q.rivalStyle].lab);
    yield* PA.say('PROF. BENNET: Ah, {PLAYER}, and {RIVAL}. Both of you at once. How very efficient of the universe.');
    yield* PA.say(q.prof.intro);
    yield* PA.say('{RIVAL}: Hey! What about me?');
    yield* PA.say('PROF. BENNET: Be patient, {RIVAL}. {PLAYER} chooses first. It is in the script.');
  }
  function pickStarter(world, i) {
    const q = world.quest;
    return function* () {
      if (PA.flag('starter')) {
        if (PA.state.starterTaken !== i) yield* PA.say('That\'s PROF. BENNET\'s last creature. It looks content to stay on the table.');
        return;
      }
      if (!PA.flag('labIntro')) { yield* labIntro(world); }
      const id = q.starters[i];
      const sp = PA.species(id);
      yield* PA.ow.showMon(id);
      const yes = yield* PA.yesno('Be friends with ' + sp.n + ', the ' + sp.t[0] + '-type?');
      PA.ow.hideMon();
      if (!yes) return;
      PA.state.starterTaken = i;
      PA.setFlag('starter');
      yield* PA.say('A fine choice. It seems very taken with you already.');
      yield* PA.ow.giveMon(id, 5, { starter: true });
      // rival picks the one strong against yours
      const beatenBy = { BLOOM: 'KINDLE', KINDLE: 'TIDE', TIDE: 'BLOOM' };
      const ri = STARTER_TYPES.indexOf(beatenBy[STARTER_TYPES[i]]);
      PA.state.rivalTaken = ri;
      PA.state.rivalStarter = q.starters[ri];
      const rv = PA.ow.npc('labRival');
      if (rv) {
        // walk around the table: down to row 5, across, then up in front of the creature
        yield* PA.ow.walkNPC(rv, ['down', 'down']);
        const steps = (6 + ri) - rv.x;
        for (let k = 0; k < Math.abs(steps); k++) yield* PA.ow.walkNPC(rv, [steps > 0 ? 'right' : 'left']);
        yield* PA.ow.walkNPC(rv, ['up']);
        PA.ow.face(rv, 'up');
        yield* PA.wait(10);
      }
      yield* PA.say(L.RIVAL[q.rivalStyle].pick);
      yield* PA.say('{RIVAL} received a ' + PA.species(q.starters[ri]).n + '!');
      PA.ow.refreshNPCs();
      // the quest giver bursts in
      yield* PA.wait(20);
      yield* giverArrives(world);
    };
  }
  PA.giverArrives = (world) => giverArrives(world); // the 'errand' opening starts here
  function* giverArrives(world) {
    const q = world.quest;
    PA.audio.sfx('door');
    PA.setFlag('quest');
    PA.ow.refreshNPCs();
    const g = PA.ow.npc('giverLab');
    if (g) { g.y = 10; g.x = 4; yield* PA.ow.walkNPC(g, ['up', 'up', 'up', 'up']); }
    yield* PA.ow.emote('player', 'exclaim');
    yield* PA.say(L.giverAsk(q));
    yield* PA.say('PROF. BENNET: Well, {PLAYER}. It seems you have your first errand. Adventures usually begin as errands; it is only afterwards that anyone calls them adventures.');
    yield* PA.say(L.RIVAL[q.rivalStyle].town2);
    PA.ow.addJournal('{GIVER} needs ' + (q.kind === 'item' ? 'the ' + q.item + '.' : 'a ' + q.type + '-type creature.'));
  }
  function* rivalLabBattle(world) {
    const q = world.quest;
    const rv = PA.ow.npc('labRival');
    yield* PA.say('{RIVAL}: Wait, {PLAYER}! Let\'s see whose creature is better!');
    if (rv) {
      const p = PA.ow.player;
      // walk rival to stand above the player
      for (let k = 0; k < 12 && (rv.x !== p.x || rv.y !== p.y - 1); k++) {
        if (rv.y < p.y - 1 && PA.ow.free(rv.x, rv.y + 1)) yield* PA.ow.walkNPC(rv, ['down']);
        else if (rv.x < p.x && PA.ow.free(rv.x + 1, rv.y)) yield* PA.ow.walkNPC(rv, ['right']);
        else if (rv.x > p.x && PA.ow.free(rv.x - 1, rv.y)) yield* PA.ow.walkNPC(rv, ['left']);
        else if (PA.ow.free(rv.x, rv.y + 1)) yield* PA.ow.walkNPC(rv, ['down']);
        else break;
      }
      PA.ow.face(rv, 'down'); PA.ow.facePlayer('up');
    }
    yield* PA.say(L.RIVAL[q.rivalStyle].battle);
    const res = yield* PA.ow.trainerBattle({ cls: 'RIVAL', name: '{RIVAL}', team: [[PA.state.rivalStarter, 5]], prize: 175, rival: true,
      lose: L.RIVAL[q.rivalStyle].lose, winText: L.RIVAL[q.rivalStyle].win, spr: S.rival, pal: 'cBlue', canLose: true, music: 'rival' });
    PA.setFlag('rival1');
    yield* PA.say(res === 'win' ? '{RIVAL}: Hmph. Fine. Good day to you.' : '{RIVAL}: Do try harder next time. I find it dull to win so easily.');
    if (rv) { const dir = rv.x <= 4 ? 'down' : 'down'; for (let k = 0; k < 4; k++) if (PA.ow.free(rv.x, rv.y + 1)) yield* PA.ow.walkNPC(rv, [dir]); }
    PA.ow.refreshNPCs();
    yield* PA.ow.heal(false);
    yield* PA.say('PROF. BENNET: Oh, {PLAYER}! Before you go.');
    yield* PA.say(q.prof.dex);
    yield* PA.ow.give('ALMANAC', 1, true);
    PA.setFlag('dex');
    yield* PA.say(q.prof.advice);
    yield* PA.say(q.prof.after);
    PA.ow.addJournal('Head through ' + world.zones[world.zoneRoute(1)].name + ' to {TOWN2}.');
  }
  function* profStop(world) {
    PA.setFlag('profStop');
    yield* PA.ow.emote('player', 'exclaim');
    yield* PA.say(world.quest.prof.stop);
    yield* PA.ow.cutTo('lab', 4, 4, 'up', 'MEANWHILE, AT THE LAB...');
  }

  // ================================================================= TOWN 2
  function populateTown2(world, rng, c) {
    const q = world.quest, ow = world.maps.overworld;
    // gossip (clue 1)
    const spot = takeSpot(c, rng) || c.hub;
    addNPC(ow, { key: 'gossip', x: spot[0], y: spot[1], dir: 'down', spr: S.lady2, pal: 'cPurple', move: 'turn', talk: function* () {
      yield* PA.say('MRS. PHILLIPS: Oh, my dear! You must be {PLAYER}. Everybody is talking about you. Well, I am.');
      yield* PA.say('MRS. PHILLIPS: ' + q.V.rumor);
      yield* PA.say('MRS. PHILLIPS: You might ask {LEADER} at the ASSEMBLY ROOMS. Nothing happens in this town without the Master of Ceremonies knowing. Except gossip. That\'s me.');
      if (!PA.flag('clue1')) {
        PA.setFlag('clue1');
        PA.ow.addJournal('Rumour: ' + (q.villain === 'charmer' ? 'a charming officer' : q.villain === 'dame' ? 'a grand lady' : 'THE HAUGHTY HUNDRED') + ' has the {GOAL}. Ask at the ASSEMBLY ROOMS.');
        if (PA.state.act < 2) yield* PA.ow.setAct(2);
      }
    } });
    // rival confrontation when entering the town
    const entry = c.open.find((o) => o.to < c.i);
    if (entry) {
      const [ix, iy] = innerPoint(c, entry, 3);
      ow.triggers.push({ tag: 'rival2', x: ix - 3, y: iy - 3, w: 7, h: 7, cond: () => PA.flag('rival1') && !PA.flag('rival2'), script: function* () {
        PA.setFlag('rival2');
        PA.ow.playMusic('rival');
        yield* PA.ow.emote('player', 'exclaim');
        const p = PA.ow.player;
        const spec = { key: 'rivalT2', x: p.x, y: p.y, dir: 'down', spr: S.rival, pal: 'cBlue', move: 'still', temp: true };
        const r = PA.ow.spawnNear(spec);
        if (r) { PA.ow.faceNPCToPlayer(r); PA.ow.facePlayerTo(r); }
        yield* PA.say(L.RIVAL[q.rivalStyle].route);
        yield* PA.say('{RIVAL}: I heard someone in this very town knows where the {GOAL} went. I shall find them first. Do try to keep up.');
        if (r) yield* PA.ow.walkAway(r);
        PA.ow.restoreMusic();
      } });
    }
    // hall
    const hall = world.maps.hall;
    const ld = q.leader;
    const leaderTeam = PA.makeTeam(rng, ld.types, 2, 11, 13).concat(PA.makeTeam(rng, ld.types, 1, 14, 14));
    addNPC(hall, { key: 'leader', x: 4, y: 1, dir: 'down', spr: S[ld.spr], pal: ld.pal, move: 'still', talk: function* () {
      if (!PA.flag('hallWon')) {
        yield* PA.say(ld.name + ': Welcome to the ASSEMBLY ROOMS! I am the Master of Ceremonies.\fNo one passes through here without a dance, and here, we dance with creatures.');
        yield* PA.say(ld.name + ': You want to know about the {GOAL}? Then you must first earn my good opinion. Shall we?');
        const res = yield* PA.ow.trainerBattle({ cls: 'M.C.', name: ld.name, team: leaderTeam, prize: 900, spr: S[ld.spr], pal: ld.pal, lose: 'Splendid footwork! I am quite out of breath.', music: 'boss' });
        if (res !== 'win') return;
        PA.setFlag('hallWon');
        yield* PA.say(ld.name + ': Very well done! You have earned this.');
        yield* PA.ow.give(q.key, 1, true);
        yield* PA.say(q.key === 'INVITATION'
          ? ld.name + ': An INVITATION, signed by me. The gentleman guarding the road to {DUNGEON} will let you pass with it. He is very particular.'
          : ld.name + ': A MUSIC BOX! I hear a MONOCAT is sulking across the road to {DUNGEON}, and will not budge. Nothing cheers a MONOCAT like a tune.');
        yield* PA.say(ld.name + ': As for the {GOAL}... ' + (q.villain === 'charmer' ? 'a certain officer danced with everyone and left with it.' : q.villain === 'dame' ? 'Her Ladyship swept through, disapproving of everything.' : 'some rude people in matching outfits judged my chandeliers and left.') + '\fThey went on toward {TOWN3}. Do be careful.');
        PA.ow.addJournal('Got the {KEY}. Follow the trail to {TOWN3}.');
        if (PA.state.act < 2) yield* PA.ow.setAct(2);
      } else yield* PA.say(ld.name + ': The music has quite stopped, but I find I am still dancing inside.');
    } });
    const hr = rng.sub('hallTrainers');
    addNPC(hall, { key: 'hallT1', x: 3, y: 6, dir: 'right', move: 'still', ...trainerFields(trainerSpec(hr, 'DEBUTANTE', 9, 11, 2), 'hall1') });
    addNPC(hall, { key: 'hallT2', x: 7, y: 4, dir: 'left', move: 'still', ...trainerFields(trainerSpec(hr, 'GENTLEMAN', 10, 12, 2), 'hall2') });
    addNPC(hall, { key: 'hallGuide', x: 7, y: 11, dir: 'down', spr: S.sailor, pal: 'cNavy', move: 'still', text: 'Hey! A future champion! The Master of Ceremonies favours ' + ld.types[0] + '-type creatures. Plan accordingly, and do mind your manners.' });
    // clinic + shop
    populateCenterMart(world, 'town2', rng);
  }
  function innerPoint(c, o, depth) {
    const mid = Math.floor((o.w - 1) / 2);
    if (o.side === 'left') return [c.x0 + depth, c.y0 + o.pos + mid];
    if (o.side === 'right') return [c.x0 + PA.CELL.CW - 1 - depth, c.y0 + o.pos + mid];
    if (o.side === 'up') return [c.x0 + o.pos + mid, c.y0 + depth];
    return [c.x0 + o.pos + mid, c.y0 + PA.CELL.CH - 1 - depth];
  }
  function trainerFields(t, key) {
    return { spr: t.spr, pal: t.pal, trainer: Object.assign(t, { key }), sight: t.sight };
  }
  // each town's clinic and shop draw from their own half of a pool, so the two towns never say the same thing
  const half = (lines, role) => lines.filter((l, i) => i % 2 === (role === 'town3' ? 1 : 0));
  function populateCenterMart(world, role, rng) {
    const clinic = world.maps['clinic_' + role], shopMap = world.maps['shop_' + role];
    if (clinic) {
      addNPC(clinic, { key: 'nurse_' + role, x: 3, y: 1, dir: 'down', spr: S.nurse, pal: 'cPink', move: 'still', talk: function* () { yield* PA.ow.nurse(); } });
      addNPC(clinic, { key: 'cfolk_' + role, x: 9, y: 5, dir: 'left', spr: S[rng.pick(['gentleman', 'lass', 'oldman', 'girl'])], pal: rng.pick(['cBlue', 'cGreen', 'cBrown']), move: 'wander', text: rng.pick(half(L.HINTS, role)) });
      addSign(clinic, 13, 3, function* () { yield* PA.ow.lodgings(); });
      addSign(clinic, 13, 4, function* () { yield* PA.ow.lodgings(); });
      for (const x of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) clinic.signs.push({ x, y: 2, counter: true });
      clinic.healPoint = true;
    }
    if (shopMap) {
      const stock = role === 'town2' ? ['TONIC', 'ANTIDOTE', 'LINIMENT', 'SMELLING SALTS', 'ALOE BALM', 'HACKNEY TOKEN', 'LAVENDER WATER']
        : ['TONIC', 'STRONG TONIC', 'PANACEA', 'CORDIAL', 'BARLEY WATER', 'HACKNEY TOKEN', 'LAVENDER WATER'];
      addNPC(shopMap, { key: 'clerk_' + role, x: 0, y: 5, dir: 'right', spr: S.woman, pal: 'cTeal', move: 'none', talk: function* () { yield* PA.ow.shop(stock); } });
      addNPC(shopMap, { key: 'mfolk_' + role, x: 5, y: 6, dir: 'up', spr: S[rng.pick(['youngster', 'woman', 'farmer', 'kid'])], pal: rng.pick(['cRed', 'cTeal', 'cGold']), move: 'wander', text: rng.pick(half(L.SHOPPERS, role)) });
    }
  }

  // ================================================================= TOWN 3
  function populateTown3(world, rng, c) {
    const q = world.quest, ow = world.maps.overworld;
    // the false lead / twist character near the exit toward route 3
    const exit = c.open.find((o) => o.to > c.i && world.cells[o.to].kind !== 'glade');
    let spot = exit ? innerPoint(c, exit, 4) : c.hub;
    if (!PA.walkable(ow.collAt(spot[0], spot[1])) || ow.collAt(spot[0], spot[1]) === C.DOOR) spot = takeSpot(c, rng) || c.hub;
    // shift sideways so the twist NPC doesn't block the path
    const cand = [[spot[0] + 1, spot[1]], [spot[0] - 1, spot[1]], [spot[0], spot[1] + 1], [spot[0], spot[1] - 1], spot];
    const sp = cand.find(([x, y]) => ow.collAt(x, y) === C.WALK && !ow.signs.some((s) => s.x === x && s.y === y)) || spot;
    const lead = q.villain === 'charmer' ? { n: 'MISS KING', s: 'beauty', p: 'cGold' } : q.villain === 'dame' ? { n: 'MRS. JENKINSON', s: 'granny', p: 'cGrey' } : { n: 'MR. ROBINSON', s: 'gentleman', p: 'cBrown' };
    addNPC(ow, { key: 'twist', x: sp[0], y: sp[1], dir: 'down', spr: S[lead.s], pal: lead.p, move: 'turn', talk: function* () {
      yield* PA.say(lead.n + ': The {GOAL}? Oh dear. Oh dear, oh dear.');
      yield* PA.say(lead.n + ': ' + q.V.twist);
      yield* PA.say(lead.n + ': The road to {DUNGEON} is beyond ' + world.zones[world.zoneRoute(3)].name + '. ' + (q.blocker === 'sulker' ? 'But a MONOCAT is sulking across it, and it is so heavy that nobody can shift it.' : 'But a terribly particular gentleman guards it, and he admits no one without an INVITATION.'));
      if (!PA.ow.has(q.key)) yield* PA.say(lead.n + ': They say the Master of Ceremonies at {TOWN2}\'s ASSEMBLY ROOMS can help with that.');
      if (!PA.flag('clue2')) {
        PA.setFlag('clue2');
        PA.ow.addJournal('The {GOAL} is at {DUNGEON}, past ' + world.zones[world.zoneRoute(3)].name + '.');
        if (PA.state.act < 2) yield* PA.ow.setAct(2);
      }
    } });
    // a messenger with a letter from the giver (comic pressure)
    const ms = takeSpot(c, rng);
    if (ms) addNPC(ow, { key: 'messenger', x: ms[0], y: ms[1], dir: 'down', spr: S.youngster2, pal: 'cGold', move: 'wander', talk: function* () {
      if (!PA.flag('letter')) {
        PA.setFlag('letter');
        yield* PA.say('MESSENGER: Are you {PLAYER}? Letter for you! I ran all the way. Well, I walked briskly.');
        yield* PA.say('The letter reads:\f"Dear {PLAYER}, do hurry. ' + (q.kind === 'item' ? PA.cap(q.stakes) : 'I have told everyone you are bringing a ' + q.type + '-type and now I cannot un-tell them') + '. Yours, in great distress, {GIVER}.\fP.S. No pressure."');
      } else yield* PA.say('MESSENGER: I\'d deliver a reply, but I\'ve only just sat down.');
    } });
    // library
    const lib = world.maps.library;
    if (lib) {
      addSign(lib, 0, 1, 'A catalogue. Every book in it is marked "on loan". The borrower is listed as "the reader".');
      for (let y = 0; y < lib.h; y++) for (let x = 0; x < lib.w; x++) {
        if (/bookshelf/.test(PA.roomObject(lib, x, y) || '')) addSign(lib, x, y, () => PA.say(L.bookshelf(PA.rand)));
      }
      addNPC(lib, { key: 'librarian', x: 5, y: 2, dir: 'down', spr: S.scholar, pal: 'cTeal', move: 'still', talk: function* () {
        yield* PA.say('LIBRARIAN: Shh. Welcome to the CIRCULATING LIBRARY. Every book here is the same book, really. It just opens to a different page each time.');
        yield* PA.say('LIBRARIAN: ' + PA.rand.pick(L.FAMOUS));
        if (!PA.flag('gift:library')) {
          PA.setFlag('gift:library');
          yield* PA.say('LIBRARIAN: You look like someone who will need this more than a book. Don\'t tell the committee.');
          yield* PA.ow.give('STRONG TONIC', 3);
        }
      } });
      addNPC(lib, { key: 'reader', x: 2, y: 9, dir: 'up', spr: S.maid, pal: 'cPurple', move: 'still', text: '"I declare after all there is no enjoyment like reading!" ...Is what I\'d say, if I could finish a chapter without being interrupted. By you. Now.' });
    }
    populateCenterMart(world, 'town3', rng);
  }

  // ================================================================= ROUTES
  const ROUTE_CLASSES = {
    1: ['SCHOOLBOY', 'SCHOOLGIRL', 'BEETLER', 'FARMER'],
    2: ['SCHOOLGIRL', 'GENTLEMAN', 'POET', 'CURATE', 'BEETLER', 'GOVERNESS', 'NATURALIST'],
    3: ['RAMBLER', 'DEBUTANTE', 'CHAPERONE', 'MIDSHIPMAN', 'NATURALIST', 'GENTLEMAN', 'OFFICER'],
  };
  const LV = { 1: [3, 6, 1, 2], 2: [8, 11, 1, 3], 3: [11, 14, 2, 3] };
  const ITEMS_BY_ROUTE = { 1: ['TONIC', 'SMELLING SALTS', 'ANTIDOTE'], 2: ['TONIC', 'ALOE BALM', 'LINIMENT', 'HACKNEY TOKEN', 'MOONSTONE BROOCH', 'LAVENDER WATER'], 3: ['STRONG TONIC', 'BARLEY WATER', 'CORDIAL', 'SUGARED ALMOND', 'GRAND TONIC', 'PANACEA', 'BARLEY WATER'] };
  function populateRoutes(world, rng) {
    const ow = world.maps.overworld, q = world.quest;
    const routeCells = world.cells.filter((c) => c.kind === 'route');
    let rivalPlaced = false;
    for (const c of routeCells) {
      const n = c.routeN;
      const r = rng.sub('route' + c.i);
      const cls = ROUTE_CLASSES[n];
      const [a, b, mn, mx] = LV[n];
      const count = c.sub === 0 ? r.int(1, 2) : r.int(1, 3);
      const used = new Set();
      for (let i = 0; i < count; i++) {
        const spot = trainerSpot(ow, c, r, used);
        if (!spot) break;
        const clsName = r.pick(cls);
        const t = trainerSpec(r, clsName, a, b, r.int(mn, mx));
        addNPC(ow, { key: 'rt' + c.i + '_' + i, x: spot.x, y: spot.y, dir: spot.dir, move: 'still', ...trainerFields(t, 'rt' + c.i + '_' + i) });
      }
      // a non-trainer passer-by
      if (r.chance(0.6)) {
        const spot = trainerSpot(ow, c, r, used);
        if (spot) {
          const spr = S[r.pick(['oldman2', 'farmer', 'girl', 'scholar2', 'granny', 'angler', 'milkmaid', 'kai_surfer', 'sunny_surfer'])];
          addNPC(ow, { key: 'rnpc' + c.i, x: spot.x, y: spot.y, dir: spot.dir, spr, pal: r.pick(['cGreen', 'cBrown', 'cTeal', 'cPurple']), move: 'turn',
            text: voiced(spr, 'rnpc' + c.i, r.chance(0.5) ? r.pick(L.PROFOUND) : r.chance(0.5) ? L.quoteNPC(r) : r.pick(L.META)) });
        }
      }
      // items
      const nItems = r.int(1, 2);
      for (let i = 0; i < nItems; i++) {
        const s = nookSpot(ow, c, r, used);
        if (!s) break;
        const it = r.pick(ITEMS_BY_ROUTE[n]);
        ow.items.push({ x: s[0], y: s[1], item: it, key: 'ri' + c.i + '_' + i });
        ow.setColl(s[0], s[1], C.SOLID);
        ow.itemSolid = true;
      }
      // rival battle on route 2 (second cell)
      if (n === 2 && c.sub === 1 && !rivalPlaced) {
        rivalPlaced = true;
        const spot = c.path && c.path.length ? c.path[Math.floor(c.path.length / 2)] : null;
        if (spot) {
          ow.triggers.push({ tag: 'rival3', x: spot[0] - 3, y: spot[1] - 3, w: 7, h: 7, cond: () => PA.flag('rival1') && !PA.flag('rival3'), script: () => rivalRouteBattle(world) });
        }
      }
    }
  }
  function trainerSpot(ow, c, rng, used) {
    if (!c.path || !c.path.length) return null;
    for (let t = 0; t < 80; t++) {
      const [px, py] = rng.pick(c.path);
      const d = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      for (let off = 2; off <= 3; off++) {
        const x = px + d[0] * off, y = py + d[1] * off;
        if (!c.inside(x, y)) continue;
        if (ow.collAt(x, y) !== C.WALK) continue;
        if (c.prot.get(x + ',' + y) === 1) continue;
        if (used.has(x + ',' + y) || ow.signAt(x, y)) continue;
        // don't block: all 4 neighbours shouldn't all be path
        let bad = false;
        for (const u of used) { const [ux, uy] = u.split(',').map(Number); if (Math.abs(ux - x) + Math.abs(uy - y) < 5) bad = true; }
        if (bad) continue;
        used.add(x + ',' + y);
        return { x, y, dir: dirFrom(-d[0], -d[1]) };
      }
    }
    return null;
  }
  function nookSpot(ow, c, rng, used) {
    for (let t = 0; t < 80; t++) {
      const x = rng.int(c.I.x0, c.I.x1), y = rng.int(c.I.y0, c.I.y1);
      if (ow.collAt(x, y) !== C.WALK || c.prot.get(x + ',' + y) === 1 || used.has(x + ',' + y)) continue;
      let solidN = 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (!PA.walkable(ow.collAt(nx, ny))) solidN++;
      if (solidN < 1 || solidN > 2) continue;
      used.add(x + ',' + y);
      return [x, y];
    }
    return null;
  }
  function* rivalRouteBattle(world) {
    const q = world.quest, R = L.RIVAL[q.rivalStyle];
    PA.setFlag('rival3');
    PA.ow.playMusic('rival');
    yield* PA.ow.emote('player', 'exclaim');
    const r = PA.ow.spawnNear({ key: 'rivalR2', x: 0, y: 0, dir: 'down', spr: S.rival, pal: 'cBlue', move: 'still', temp: true });
    if (r) { PA.ow.faceNPCToPlayer(r); PA.ow.facePlayerTo(r); }
    yield* PA.say(R.route2);
    const lv = 12;
    const rs = PA.state.rivalStarter;
    const pick = (names) => PA.sid(PA.rand.pick(names));
    const team = [[pick(['DUSTDASH', 'SUCCESSGOAT', 'SERVOLT', 'HEXKIT', 'PLATYPULSE', 'KITEFOX', 'SHOWMEER']), lv - 2], [pick(['PINKADILLO', 'MONOCAT', 'LORISLURK', 'DUNEKIT', 'PRISMMER', 'IRONPURR', 'MAGPLATE', 'GEMSTOAT', 'COOLCARRION']), lv - 1], [rs, lv + 1]];
    const res = yield* PA.ow.trainerBattle({ cls: 'RIVAL', name: '{RIVAL}', team, prize: 400, rival: true, lose: R.routeLose, winText: R.routeWin, spr: S.rival, pal: 'cBlue', canLose: true, music: 'rival' });
    yield* PA.say('{RIVAL}: By the way. I heard ' + (q.villain === 'charmer' ? 'that officer' : q.villain === 'dame' ? 'Her Ladyship' : 'those HAUGHTY HUNDRED people') + ' passed through {TOWN3}. Someone there knows more. Not that I need your help. Obviously.');
    if (r) yield* PA.ow.walkAway(r);
    PA.ow.restoreMusic();
  }

  // ================================================================= GATE + BLOCKER
  function populateGate(world, rng) {
    const q = world.quest, ow = world.maps.overworld, b = world.slots.blocker;
    if (!b) return;
    const cleared = () => PA.flag('blockerGone');
    if (q.blocker === 'sulker') {
      // a MONOCAT, sulking across the road (its sulks are so heavy they leave dents); a tune cheers it up
      addNPC(ow, { key: 'blocker', x: b.x, y: b.y, dir: 'down', spr: PA.monSpr(PA.sid('MONOCAT')), sleepy: true, move: 'none', blocker: true, solidForGen: true, cond: () => !cleared(), talk: function* () {
        yield* PA.say('A MONOCAT is sulking across the road. It is permanently unimpressed, and very, very heavy.');
        if (!PA.ow.has('MUSIC BOX')) { yield* PA.say('It will not budge. Perhaps some music would lift its spirits...\fSomeone at the ASSEMBLY ROOMS in {TOWN2} might know a tune.'); return; }
        const play = yield* PA.yesno('Wind up the MUSIC BOX?');
        if (!play) return;
        yield* PA.ow.flute();
        yield* PA.say('MONOCAT stopped sulking! Now it is merely cross. It wants a word with you.');
        const res = yield* PA.ow.wildBattle(PA.sid('MONOCAT'), 16, { noRunText: false });
        if (res === 'lose') return;
        PA.setFlag('blockerGone');
        PA.ow.refreshNPCs();
        if (res !== 'befriended') yield* PA.say('MONOCAT stomped off to sulk somewhere quieter. The way is clear!');
      } });
    } else {
      addNPC(ow, { key: 'blocker', x: b.x, y: b.y, dir: oppositeSide(b.side), spr: S.knight, pal: 'cNavy', move: 'still', blocker: true, solidForGen: true, cond: () => !cleared(), talk: function* () {
        yield* PA.say('GATEKEEPER: Halt. The road to {DUNGEON} is private. Nobody passes without an INVITATION.');
        if (!PA.ow.has('INVITATION')) { yield* PA.say('GATEKEEPER: The Master of Ceremonies at {TOWN2} issues them. I don\'t make the rules. I merely enjoy them enormously.'); return; }
        yield* PA.say('{PLAYER} showed the INVITATION.');
        yield* PA.say('GATEKEEPER: ...Signed by {LEADER}. Everything is in order. How disappointing. Do mind the {LACKEYS}.');
        PA.setFlag('blockerGone');
        const g = PA.ow.npc('blocker');
        if (g) yield* PA.ow.walkAway(g);
        PA.ow.refreshNPCs();
      } });
    }
    // Act III begins on entering the gate area
    const [gx, gy] = world.slots.gateEntry;
    ow.triggers.push({ tag: 'act3', x: gx - 1, y: gy - 1, w: 3, h: 3, cond: () => cleared() && PA.state.act < 3, script: function* () {
      yield* PA.ow.setAct(3);
      yield* PA.say('The sun is getting low over {DUNGEON}. Whatever happens next, it will happen at dusk. Things always do.');
    } });
    // a grunt guarding the mouth
    const m = world.slots.mouth;
    const gr = rng.sub('guard');
    const V = q.V;
    const D = q.villain === 'dame' ? L.STEWARD : q.villain === 'syndicate' ? L.LACKEY : L.TRAINERS.OFFICER;
    const t = trainerSpec(gr, V.grunts, 13, 14, 2, { def: D, nameKey: V.grunts, clsName: V.grunts });
    t.spr = sprFor(D, 'mouthGuard');
    const gx2 = m.front[0] + 1, gy2 = m.front[1] + (m.dir === 'up' ? 1 : -1);
    if (ow.collAt(gx2, gy2) === C.WALK) addNPC(ow, { key: 'mouthGuard', x: gx2, y: gy2, dir: 'left', move: 'still', ...trainerFields(t, 'mouthGuard') });
  }
  function oppositeSide(s) { return { left: 'right', right: 'left', up: 'down', down: 'up' }[s]; }

  // the pieces src/game/tales.js builds its stories from
  PA.questKit = { addNPC, addSign, takeSpot, trainerSpec, trainerFields, innerPoint, trainerSpot, nookSpot, oppositeSide,
    populateCenterMart: (...a) => populateCenterMart(...a), populateGlade: (...a) => populateGlade(...a) };

  // ================================================================= DUNGEON
  function populateDungeon(world, rng) {
    const q = world.quest, V = q.V;
    const D = q.villain === 'dame' ? L.STEWARD : q.villain === 'syndicate' ? L.LACKEY : L.TRAINERS.OFFICER;
    const floors = world.dungeon ? world.dungeon.floors : [];
    floors.forEach((f, fi) => {
      const map = f.map;
      const r = rng.sub('floor' + fi);
      const spots = [];
      for (let y = 1; y < map.h - 1; y++) for (let x = 1; x < map.w - 1; x++) {
        const c = map.collAt(x, y);
        if (c !== C.CAVE && c !== C.WALK && c !== C.GRASS) continue;
        if (Math.abs(x - f.entry[0]) + Math.abs(y - f.entry[1]) < 6) continue;
        if (Math.abs(x - f.far[0]) + Math.abs(y - f.far[1]) < 5) continue;
        spots.push([x, y]);
      }
      const nT = floors.length === 1 ? 5 : 3;
      const used = [];
      for (let i = 0; i < nT; i++) {
        let s = null;
        for (let t = 0; t < 60 && !s; t++) {
          const p = r.pick(spots);
          if (used.some((u) => Math.abs(u[0] - p[0]) + Math.abs(u[1] - p[1]) < 6)) continue;
          // need at least 3 open neighbours (not blocking a corridor)
          let open = 0;
          for (const [nx, ny] of [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]]) if (PA.walkable(map.collAt(nx, ny))) open++;
          if (open < 4) continue;
          s = p;
        }
        if (!s) break;
        used.push(s);
        const isGrunt = r.chance(0.6);
        const lv = fi === 0 ? [12, 15] : [14, 17];
        const t = isGrunt ? trainerSpec(r, V.grunts, lv[0], lv[1], r.int(2, 3), { def: D, nameKey: V.grunts, clsName: V.grunts })
          : trainerSpec(r, q.dungeon === 'cave' ? 'RAMBLER' : r.pick(['BEETLER', 'NATURALIST']), lv[0], lv[1], r.int(2, 3));
        if (isGrunt) t.spr = sprFor(D, 'dt' + fi + '_' + i);
        addNPC(map, { key: 'dt' + fi + '_' + i, x: s[0], y: s[1], dir: r.pick(['down', 'left', 'right', 'up']), move: 'turn', ...trainerFields(t, 'dt' + fi + '_' + i) });
      }
      for (let i = 0; i < 2; i++) {
        const p = r.pick(spots);
        if (used.some((u) => u[0] === p[0] && u[1] === p[1])) continue;
        let open = 0;
        for (const [nx, ny] of [[p[0] + 1, p[1]], [p[0] - 1, p[1]], [p[0], p[1] + 1], [p[0], p[1] - 1]]) if (PA.walkable(map.collAt(nx, ny))) open++;
        if (open < 4) continue;
        map.items.push({ x: p[0], y: p[1], item: r.pick(['STRONG TONIC', 'PANACEA', 'CORDIAL', 'GRAND TONIC', 'BARLEY WATER', 'SUGARED ALMOND']), key: 'di' + fi + '_' + i });
        map.setColl(p[0], p[1], C.SOLID);
      }
    });
    if (!world.dungeon) return;
    // the boss
    const bm = world.maps[world.dungeon.bossMap];
    const [bx, by] = world.dungeon.boss;
    const br = rng.sub('boss');
    const bossTypes = q.kind === 'type' ? [q.type, q.type, 'HUSH'] : ['BLIGHT', 'HUSH', 'CHROME', 'GLAM'];
    const bossTeam = PA.makeTeam(br, bossTypes, 2, 16, 18).concat(PA.makeTeam(br, bossTypes, 1, 20, 20));
    addNPC(bm, { key: 'boss', x: bx, y: by, dir: 'down', spr: S[V.spr], pal: V.pal, move: 'still', cond: () => !PA.flag('bossWon'), talk: function* () { yield* bossScene(world, bossTeam); } });
    bm.triggers.push({ tag: 'bossSeen', x: bx - 2, y: by + 1, w: 5, h: 3, cond: () => !PA.flag('bossWon') && !PA.flag('bossSeen'), script: function* () {
      PA.setFlag('bossSeen');
      const b = PA.ow.npc('boss');
      if (b) { PA.ow.faceNPCToPlayer(b); PA.ow.facePlayerTo(b); }
      yield* PA.ow.emote('player', 'exclaim');
      yield* PA.say('There, at the end of {DUNGEON}, waits {BOSS}.');
    } });
    if (q.kind === 'item') {
      addNPC(bm, { key: 'goalItem', x: bx + 1, y: by - 1 >= 0 && bm.collAt(bx + 1, by - 1) !== C.SOLID ? by - 1 : by, dir: 'down', spr: S.misc, frame: PA.MISC.paper, pal: 'cGold', move: 'none', cond: () => !PA.flag('bossWon'), text: 'It\'s the {GOAL}! But {BOSS} is watching it very closely.' });
    }
  }
  function* bossScene(world, team) {
    const q = world.quest, V = q.V;
    yield* PA.say(PA.sub(V.meet));
    yield* PA.say(V.battle);
    const res = yield* PA.ow.trainerBattle({ cls: V.title === 'MILITIA' ? 'LT.' : V.title === 'STEWARDS' ? 'LADY' : 'BOSS', name: V.name.replace(/^LT\. /, '').replace(/^LADY /, ''), team, prize: 2400, spr: PA.SPR[V.spr], pal: V.pal, lose: V.lose, music: 'boss' });
    if (res !== 'win') return;
    PA.setFlag('bossWon');
    PA.ow.refreshNPCs();
    yield* PA.say(V.after);
    if (q.kind === 'item') {
      yield* PA.say('{PLAYER} recovered the {GOAL}!');
      yield* PA.ow.give(q.item, 1, true, true);
      PA.setFlag('goal');
    } else {
      if (PA.ow.partyHasType(q.type)) PA.setFlag('goal');
      else {
        yield* PA.say('Something stirs in the shadows of {DUNGEON}. A {TYPE}-type creature, freed from ' + (q.villain === 'syndicate' ? 'THE HAUGHTY HUNDRED' : q.villain === 'dame' ? 'Her Ladyship\'s collection' : 'the officer\'s keeping') + ', peers out at you...');
        const opts = PA.TYPE_SPECIES(q.type);
        const id = opts[0];
        const r2 = yield* PA.ow.wildBattle(id, 16, { special: true });
        if (r2 === 'befriended') PA.setFlag('goal');
      }
    }
    yield* rivalConfess(world);
    if (PA.flag('goal')) yield* resolution(world);
    else {
      yield* PA.say('{RIVAL}: There are more {TYPE}-types about in {DUNGEON}, I expect. Make friends with one, and we shall all go home. I shall wait. Impatiently.');
      PA.ow.addJournal('Catch a {TYPE}-type creature in {DUNGEON}.');
    }
  }
  function* rivalConfess(world) {
    const q = world.quest;
    PA.ow.playMusic('dusk');
    yield* PA.wait(20);
    const r = PA.ow.spawnNear({ key: 'rivalEnd', x: 0, y: 0, dir: 'up', spr: S.rival, pal: 'cBlue', move: 'still', temp: true });
    if (r) { PA.ow.faceNPCToPlayer(r); PA.ow.facePlayerTo(r); }
    yield* PA.say('{RIVAL}: {PLAYER}! I... came as quickly as I could. Which was not very quickly. I stopped to fix my hair.');
    yield* PA.say(L.RIVAL[q.rivalStyle].confess);
    yield* PA.ow.give('SUGARED ALMOND', 1);
    PA.setFlag('confessed');
  }
  // called after any capture, in case it completes a type quest
  PA.questAfterFriend = function* (mon) {
    const q = PA.world.quest;
    if (q.kind !== 'type' || PA.flag('goal')) return;
    if (!mon.types.includes(q.type)) return;
    PA.setFlag('goal');
    if (PA.flag('bossWon')) {
      yield* PA.say('That\'s a {TYPE}-type! {GIVER} will be delighted.');
      if (!PA.flag('confessed')) yield* rivalConfess(PA.world);
      yield* resolution(PA.world);
    } else yield* PA.say('That\'s a {TYPE}-type! Now all that remains is {BOSS}...');
  };
  function* resolution(world) {
    const q = world.quest;
    PA.setFlag('resolving');
    yield* PA.ow.cutTo('lab', 4, 5, 'up', 'LATER, AT ' + world.vars.HOME + '...');
    PA.ow.playMusic('ending');
    const g = PA.ow.npc('giverLab');
    if (g) { PA.ow.faceNPCToPlayer(g); PA.ow.facePlayerTo(g); }
    if (q.kind === 'item') {
      yield* PA.say('{PLAYER} handed over the {GOAL}.');
      PA.ow.take(q.item);
    } else yield* PA.say('{PLAYER} showed {GIVER} the {TYPE}-type creature.');
    yield* PA.say(L.giverThanks(q));
    yield* PA.say('{GIVER}: Please, take this. It isn\'t much. Well, it is quite a lot, actually.');
    yield* PA.ow.giveMoney(3000);
    const prof = PA.ow.npc('prof');
    if (prof) { PA.ow.faceNPCToPlayer(prof); PA.ow.facePlayerTo(prof); }
    yield* PA.say('PROF. BENNET: Well! It appears the tremendous fuss has been resolved, and I did not have to leave my chair once. A perfect day.');
    yield* PA.say('MOTHER: {PLAYER}!! Oh, my nerves! My clever, wonderful {PLAYER}!', {});
    yield* PA.say('{RIVAL}: ' + L.RIVAL[q.rivalStyle].end.replace('{RIVAL}: ', ''));
    PA.ow.facePlayerTo(prof || g);
    yield* PA.say(q.ending);
    PA.setFlag('resolved');
    yield* PA.ow.credits();
  }

  // ================================================================= GLADE + HOUSES
  function populateGlade(world, rng) {
    const s = world.slots.glade;
    if (!s) return;
    const ow = world.maps.overworld;
    let x = s.x, y = s.y;
    if (!PA.walkable(ow.collAt(x, y))) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2]]) if (ow.collAt(x + dx, y + dy) === C.WALK) { x += dx; y += dy; break; }
    }
    const lines = [
      'THE NARRATOR: Oh! You found me. I don\'t usually appear in the story. I mostly just... describe it.',
      'THE NARRATOR: Do you know, I have watched a great many worlds be generated and forgotten. This one is rather nice. You chose well. Or the seed did.',
      'THE NARRATOR: A secret, since you came all this way: the meaning was never in the {GOAL}. It was in the walking. I know, I know. But it\'s true.',
    ];
    addNPC(ow, { key: 'narrator', x, y, dir: 'down', spr: S.sage, pal: 'cPurple', move: 'still', talk: function* () {
      for (const l of lines) yield* PA.say(l);
      if (!PA.flag('gift:narrator')) {
        PA.setFlag('gift:narrator');
        yield* PA.say('THE NARRATOR: Here. Every story should have one unexpected gift in it.');
        yield* PA.ow.give(rng.pick(['SUGARED ALMOND', 'GRAND TONIC', 'MOONSTONE BROOCH']), 1);
      } else yield* PA.say('THE NARRATOR: Go on. The story\'s that way. I\'ll catch up.');
    } });
  }
  function populateHouses(world, rng) {
    for (const id of Object.keys(world.maps)) {
      if (!id.startsWith('house')) continue;
      const m = world.maps[id];
      const r = rng.sub(id);
      const n = r.int(1, 2);
      const spots = [];
      for (let y = 2; y < m.h - 1; y++) for (let x = 0; x < m.w; x++) if (m.collAt(x, y) === C.WALK && !(y >= 6 && x >= 1 && x <= 4)) spots.push([x, y]);
      for (let i = 0; i < n && spots.length; i++) {
        const p = r.pick(spots);
        const giftKey = 'gift:' + id + i;
        const gift = i === 0 && r.chance(0.5) ? r.pick(['TONIC', 'ALOE BALM', 'ANTIDOTE', 'STRONG TONIC', 'HACKNEY TOKEN', 'MOONSTONE BROOCH', 'WARMING PAN']) : null;
        const text = r.chance(0.3) ? L.quoteNPC(r) : L.townsfolk(r);
        addNPC(m, { key: id + 'n' + i, x: p[0], y: p[1], dir: r.pick(['down', 'left', 'right']), spr: S[r.pick(['lady', 'oldman', 'girl', 'gentleman', 'maid', 'kid', 'granny', 'woman', 'scholar', 'lady2', 'oldman2', 'chef', 'butler', 'scarlet_goth', 'violet_goth'])], pal: r.pick(['cRed', 'cBlue', 'cGreen', 'cBrown', 'cPurple', 'cPink', 'cTeal']), move: r.chance(0.5) ? 'wander' : 'turn', talk: function* (n) {
          yield* PA.say(voiced(n.spr, n.key, text));
          if (gift && !PA.flag(giftKey)) {
            PA.setFlag(giftKey);
            yield* PA.say(r.pick(['Here, take this. I\'ve been holding on to it for someone exactly like you.', 'You look like you need this more than I do.', 'Oh! Take this. I insist. I always insist.']));
            yield* PA.ow.give(gift, 1);
          }
        } });
        spots.splice(spots.indexOf(p), 1);
      }
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { // the furniture you can read or watch (src/game/rooms.js)
        const o = PA.roomObject(m, x, y) || '';
        if (/bookshelf/.test(o)) addSign(m, x, y, () => PA.say(L.bookshelf(PA.rand)));
        if (o === 'tv_1x2') addSign(m, x, y, () => PA.ow.sayRnd(L.TV));
      }
    }
  }
})(window.PA);
