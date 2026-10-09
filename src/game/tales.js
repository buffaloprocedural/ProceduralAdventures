// Procedural Adventures - the tales engine: every new game deals a story.
// Four decks (src/game/tales/*.js): STRUCTURE x SETTING x GENRE x PREMISE. The seed deals one card from each,
// so a seed always tells the same story. Most misfit pairs are dealt again; the few that survive are owned up to
// ("(Somehow)" in the title, a townsperson who remarks on it).
//
// Every tale runs on the same bones, and the cards dress them:
//   the setup  in the passage out of the hamlet (a cave, a crypt, a wood or a marsh), the client beside you: three
//              lines - what's wrong, where the GOAL is, and the TOKENS it takes to get there. Then you play.
//   Act I      collect a handful of tokens from people around the county            (tale step 1)
//              - by talking, answering a question, doing a favour, befriending or battling a creature, or a
//              battle; halfway, a twist, and the Act II card
//   gate       with all the tokens, the keeper lets you through; Act III at dusk     (step 2)
//   climax     at the end of the cave or wood: whoever waits there, then the goal   (step 3)
//   finale     home, the client, the last words, the credits                         (step 4)
// Creature battles are in most stories (src/game/tales/genres.js 'battle' odds); without them, challenges are
// questions, creatures are befriended, and there are no trainers or wild encounters.
// GULLIVER (src/game/mascot.js) starts every story at the head of your party.
// The classic story (the professor, the rival, the villain: src/game/quest.js) is no longer dealt; it is kept
// only so that a game saved in it can be carried on.
// Try a hand with ?story=structure.setting.genre.premise (any part may be *), or one deck at a time:
// ?structure=race&setting=mole. ?battles=0|1 forces battles off or on.
'use strict';
(function (PA) {
  const D = PA.TALES, L = PA.Lines, C = PA.C;
  const KEYS = ['structure', 'setting', 'genre', 'premise'];
  const DECK = { structure: 'structures', setting: 'settings', genre: 'genres', premise: 'premises' };

  // ================================================================= dealing
  // '' fits; 'odd' doesn't, unless the dice insist
  function fits(card, S) {
    const has = (t) => S.tags.includes(t) || S.era === t;
    if (card.needs && !card.needs.some(has)) return 'odd';
    if (card.avoid && card.avoid.some(has)) return 'odd';
    return '';
  }
  function forced() {
    const s = (typeof location !== 'undefined' && location.search) || '';
    if (PA.forceTale) return PA.forceTale === 'classic' ? { classic: true } : Object.assign({}, PA.forceTale);
    const f = {};
    const m = s.match(/[?&]story=([\w.*-]+)/);
    if (m) m[1].split('.').forEach((v, i) => { if (v && v !== '*' && KEYS[i]) f[KEYS[i]] = v; });
    for (const k of KEYS) { const mm = s.match(new RegExp('[?&]' + k + '=(\\w+)')); if (mm) f[k] = mm[1]; }
    const b = s.match(/[?&]battles=([01])/);
    if (b) f.battles = b[1] === '1';
    return f;
  }
  PA.rollTale = function (seed) {
    const f = forced();
    if (f.classic) return { classic: true };
    const r = new PA.RNG(seed + ':tale');
    r.next(); // (this draw once chose the classic story; it stays, so every seed deals the hand it always did)
    const ids = (deck) => Object.keys(D[deck]);
    const t = { classic: false, odd: [] };
    const deal = (key, check, oddKey) => {
      const deck = DECK[key];
      if (f[key] && D[deck][f[key]]) { if (check(D[deck][f[key]]) === 'odd') t.odd.push(oddKey || key); return f[key]; }
      for (let k = 0; k < 40; k++) {
        const id = r.pick(ids(deck)), v = check(D[deck][id]);
        if (v === 'no') continue;
        if (v === 'odd' && r.chance(0.93)) continue; // most misfits go back in the deck
        if (v === 'odd') t.odd.push(oddKey || key);
        return id;
      }
      return ids(deck).find((id) => check(D[deck][id]) === '') || ids(deck)[0];
    };
    const card = (key) => D[DECK[key]][t[key]];
    const tells = (St, P) => !(St.goalKinds && !St.goalKinds.includes(P.goal.kind)); // can this structure tell this premise?
    // One deck leads, dealt straight off the top; the setting is chosen to suit it, and the rest to suit the
    // setting. (Always dealing the setting first would starve the premises that need a beach or a campus.)
    const lead = f.setting ? 'setting' : r.pick(['setting', 'setting', 'premise', 'premise', 'premise', 'genre', 'structure']);
    if (lead !== 'setting') t[lead] = deal(lead, () => '');
    t.setting = deal('setting', (S) => (lead === 'setting' ? '' : fits(card(lead), S)), lead);
    const S = D.settings[t.setting];
    if (!t.premise) t.premise = deal('premise', (c) => (t.structure && !tells(card('structure'), c) ? 'no' : fits(c, S)));
    const P = D.premises[t.premise];
    if (!t.structure) t.structure = deal('structure', (c) => (!tells(c, P) ? 'no' : fits(c, S)));
    if (!t.genre) t.genre = deal('genre', (c) => fits(c, S));
    const St = D.structures[t.structure], G = D.genres[t.genre];
    t.battles = f.battles !== undefined ? f.battles : (P.battles || St.battles) ? true : r.chance(G.battle);
    if (P.battles || St.battles) t.battles = true; // these stories are made of battles
    return t;
  };
  PA.isTale = (w) => { const q = (w || PA.world || {}).quest; return !!(q && q.tale && !q.tale.classic); };
  let building = null; // the quest of the world being generated (PA.world is still the old world then)
  const TQ = () => building || PA.world.quest; // the dealt tale lives on the quest

  // ================================================================= casting (called by PA.genQuest)
  const HERO_NAMES = {
    past: [['EDMUND', 'ARTHUR', 'JACK'], ['ELIZA', 'MAUD', 'JANE']], modern: [['DANNY', 'SAM', 'RAJ'], ['JESS', 'MAYA', 'KIM']],
    future: [['KAI', 'ORION', 'ZED'], ['NOVA', 'LUNA', 'IRIS']], timeless: [['FINN', 'TOM', 'LEO'], ['ROSE', 'MAE', 'ZOE']],
    myth: [['PIP', 'ROOK', 'WREN'], ['SKYE', 'FERN', 'IVY']],
  };
  const PALS = ['cRed', 'cBlue', 'cGreen', 'cBrown', 'cPurple', 'cPink', 'cTeal', 'cGold'];
  PA.taleQuest = function (q, world) {
    const t = q.tale, r = new PA.RNG(world.seed + ':tale-cast');
    const S = D.settings[t.setting], St = D.structures[t.structure], G = D.genres[t.genre], P = D.premises[t.premise];
    q.T = { S, St, G, P };
    q.kind = 'tale'; q.opening = 'tale';
    // places
    const n = world.names;
    n.towns = r.shuffle(S.towns).slice(0, 3); n.region = r.pick(S.regions); n.mount = r.pick(S.caves); n.wood = r.pick(S.woods);
    n.route = S.route; n.glade = r.pick(S.glades);
    if (S.dungeon) q.dungeon = S.dungeon;
    // people
    q.rivalName = r.pick(S.rivals);
    const person = () => r.pick(S.people);
    let client = P.client === 'chief' ? { name: S.chief.name, spr: S.chief.spr } : P.client === 'mother' ? { name: S.mother, spr: 'mother', home: true }
      : { name: P.client.name, spr: P.client.spr || person() };
    q.client = client;
    q.giver = { name: client.name, spr: client.spr, pal: 'cTeal' };
    const names = r.shuffle(S.names);
    q.names = names; // townspeople with parts to play draw from these, in order
    // the goal
    let goal = P.goal.noun;
    if (P.goal.kind === 'creature') { q.goalSpecies = PA.sid(r.pick(P.goal.species)); goal = goal + ' ' + PA.species(q.goalSpecies).n; }
    q.goal = goal; q.item = P.goal.kind === 'item' ? goal : '';
    q.beast = PA.sid('BLIZZPARD'); // the strongest creature in the world (the roster's highest stats)
    // tokens
    const tk = P.tokens || St.token;
    q.token = { one: tk.one, many: tk.many, n: P.tokens ? P.tokens.n : r.int(St.n[0], St.n[1]) };
    q.token.n = Math.min(5, q.token.n);
    // the impostor's three suspects
    if (St.impostor) {
      q.suspects = names.slice(4, 7).map((nm) => ({ name: nm, spr: person() }));
      q.impostor = r.int(0, 2);
    }
    // who waits at the end
    const F = St.foe;
    let foe = { name: F.name, spr: F.spr || person() };
    if (F.name === 'guardian') foe = { name: S.guardian.name, spr: S.guardian.spr };
    if (St.impostor) foe = { name: q.suspects[q.impostor].name, spr: q.suspects[q.impostor].spr };
    q.foe = foe;
    q.vip = S.vip;
    q.lead = { name: St.lead.name, spr: St.lead.spr || person() };
    q.royalSpr = person();
    // titles
    const title = (s) => PA.fmt(s, { G: PA.title(goal), S: PA.title(n.towns[0]) });
    q.episode = title(r.pick(G.titles)) + (t.odd.length ? ' (Somehow)' : '');
    q.acts = G.acts;
    q.act3Journal = 'ACT III. Find the {GOAL} at the end of {DUNGEON}.';
    q.heroNames = HERO_NAMES[S.era] || HERO_NAMES.timeless;
    // your first creature, when there are battles (GULLIVER leads the party either way)
    q.starter = r.int(0, 2);
    // someone in the second town who has noticed, if the hand is odd
    if (t.odd.length) {
      const k = t.odd[0], card = { structure: St, genre: G, premise: P }[k];
      const a = card ? card.short : S.short;
      q.oddChat = PA.fmt(r.pick(X.odd), { a, B: S.in });
    }
  };

  // ================================================================= words for everyone
  const X = D.lines; // what everybody says (src/game/tales/lines.js)
  const TRAINER_LINES = { intro: X.trainerIntro, lose: X.trainerLose, after: X.trainerAfter };
  const TRAINER_NAMES = X.trainerNames, REMEMBER = X.remember, ALIBIS = X.alibis, VIP_CHAT = X.vip;
  const put = (s, k, v) => s.split('{' + k + '}').join(v); // a word only this line knows
  const pick = (a) => PA.rand.pick(a);
  function chatter(rng) { // what a passer-by says
    const q = TQ(), x = rng.next();
    const line = x < 0.42 ? deal(q, 'folk', q.T.S.folk, rng) : x < 0.85 ? deal(q, 'chatter', q.T.G.chatter, rng) : null;
    return line || (rng.chance(0.5) ? deal(q, 'profound', L.PROFOUND, rng, true) : deal(q, 'meta', L.META, rng, true));
  }
  // somebody's creature, out for a wander in town (dealt like the lines below, so no two towns share one)
  const PETS = [['DUSTDASH', 'DUSTDASH: Meep! Meep! (It runs a lap round you, for no reason at all.)'], ['LUMIKIT', 'LUMIKIT: Mew...! (It glows, embarrassed.)'],
    ['PUFFLUKE', 'PUFFLUKE: Arrk! Arrk!'], ['MONOCAT', 'MONOCAT: Hmph.'],
    ['EMBERWREN', 'EMBERWREN: Cheep! (It fluffs its tail. It\'s waiting for you to say it looks lovely.)'],
    ['SUCCESSGOAT', 'SUCCESSGOAT: Hooonk! (It points its big nose at you. You\'re meant to admire it.)'],
    ['POTOOM', 'POTOOM: ... (It\'s pretending to be a tree stump. It\'s very good at it.)'],
    ['PINKADILLO', 'PINKADILLO: Squeak! (It polishes its shell, then checks you noticed.)'],
    ['GLUMPH', 'GLUMPH: Glub. (It knows what it looks like. Please don\'t mention it.)'],
    ['KITEFOX', 'KITEFOX: Yip! (Its ears catch the breeze. It nearly takes off.)'],
    ['SHOWMEER', 'SHOWMEER: Chirr! (It stands on a rock so you can see it standing on a rock.)'],
    ['MOSSAPO', 'MOSSAPO: Mrrp. (It\'s holding very still. It hopes you think it\'s moss.)'],
    ['IRONPURR', 'IRONPURR: Purr-clank. (It peeks at you through the gaps in its armour.)'],
    ['MAGPLATE', 'MAGPLATE: Skree! (It\'s holding a spoon. It says the spoon was a gift.)'],
    ['GLASSPRITE', 'GLASSPRITE: Tink! (You can see its heart beating. It hides behind a leaf.)']];
  // lines are dealt like cards, so nobody in a world says what somebody else already said: a small pile that runs
  // out hands over to the big ones (null), and only those are ever shuffled again
  const piles = new WeakMap();
  function deal(q, k, lines, rng, again) {
    const all = piles.get(q) || {};
    piles.set(q, all);
    let pile = all[k];
    if (pile && !pile.length && !again) return null;
    if (!pile || !pile.length) {
      pile = all[k] = lines.slice();
      for (let i = pile.length - 1; i > 0; i--) { const j = rng.int(0, i); [pile[i], pile[j]] = [pile[j], pile[i]]; }
    }
    return pile.pop();
  }
  PA.taleShelf = function () { // a bookshelf, in this story
    const G = TQ().T.G;
    return PA.rand.chance(0.5) ? pick(G.shelf) : 'A book, open at a page that says:\f"' + pick(G.chatter) + '"';
  };
  PA.taleTownSign = (rng, name, role, world) => name + '\n' + rng.pick(world.quest.T.S.signs[role]);

  // ================================================================= runtime state
  const step = () => (PA.state && PA.state.flags['tale:step']) || 0;
  const setStep = (n) => { if (step() < n) PA.state.flags['tale:step'] = n; };
  const tokCount = () => { let k = 0; for (let i = 0; i < TQ().token.n; i++) if (PA.flag('tok:' + i)) k++; return k; };
  PA.taleStep = step;
  PA.taleVars = function () { // the words the story's text can use (world.vars + these at runtime)
    const s = PA.state || {};
    return { MON: s.taleMon || 'creature' };
  };
  function objective() {
    const q = TQ(), k = step();
    if (k <= 1) return 'Collect ' + q.token.n + ' ' + q.token.many + '. So far: ' + tokCount() + '.';
    if (k === 2) return PA.flag('tale:gate') ? 'Find the {GOAL} at the end of {DUNGEON}.' : 'Show the {TOKENS} to {KEEPER} on the road to {DUNGEON}.';
    return 'Home again, with the {GOAL}.';
  }
  PA.taleObjective = objective;

  // ================================================================= population (called by PA.populateQuest)
  PA.populateTale = function (world, rng) {
    building = world.quest;
    try { populate(world, rng); } finally { building = null; }
  };
  function populate(world, rng) {
    const K = PA.questKit, q = world.quest, { S, St, G, P } = q.T, ow = world.maps.overworld;
    const cells = world.cells, town = (role) => cells.find((c) => c.role === role);
    const home = town('home'), t2 = town('town2'), t3 = town('town3');
    const zoneName = (role) => world.zones[world.zoneTown(role)].name;
    const routeName = (n) => world.zones[world.zoneRoute(n)].name;
    const battles = q.tale.battles;
    world.vars = {
      HOME: zoneName('home'), TOWN2: zoneName('town2'), TOWN3: zoneName('town3'), REGION: world.names.region,
      DUNGEON: q.dungeon === 'cave' ? world.names.mount : world.names.wood, GOAL: q.goal, ITEM: q.item, TYPE: '',
      CLIENT: q.client.name, GIVER: q.client.name, TOKEN: q.token.one, TOKENS: q.token.many, N: q.token.n,
      MOTHER: S.mother, VIP: q.vip.name, ROYAL: S.royal, BEAST: PA.species(q.beast).n, FOE: q.foe.name, BOSS: q.foe.name,
      SP: q.goalSpecies ? PA.species(q.goalSpecies).n : '', KEEPER: S.keeper.name, LEAD: q.lead.name, LEADER: q.lead.name,
      LAB: S.lab, HALL: S.hall, LIB: S.lib, LACKEYS: '', KEY: '', SEED: world.seed, PROF: q.client.name,
      S1: q.suspects ? q.suspects[0].name : '', S2: q.suspects ? q.suspects[1].name : '', S3: q.suspects ? q.suspects[2].name : '',
    };
    // the buildings go by this setting's names
    for (const [id, nm] of [['lab', S.lab], ['hall', S.hall], ['library', S.lib]]) if (world.maps[id]) world.maps[id].name = nm;
    // the world without battles: no wild creatures in the grass or the dark
    if (!battles) {
      for (const z of world.zones) z.enc = null;
      for (const id in world.maps) if (world.maps[id].dungeon) world.maps[id].encounters = null;
    }
    const doorNear = (x, y) => Object.values(world.doors).some((d) => Math.abs(d.x - x) <= 1 && y - d.y >= -1 && y - d.y <= 2);
    const spot = (c, r) => { // a free spot in a town, not in front of a door
      for (let k = 0; k < 12; k++) { const p = K.takeSpot(c, r); if (!p) return null; if (!doorNear(p[0], p[1])) return p; }
      return null;
    };
    let nameI = 0;
    const nextName = () => q.names[nameI++ % q.names.length];
    const tr = rng.sub('tale');

    // ---- the people with parts to play come first (they need the good spots)
    placeLead(world, tr, t2, spot);
    placeTokens(world, tr, { t2, t3, spot, nextName, routeName, battles });
    world.vars.N = q.token.n; // as many as there were places for
    if (St.impostor) q.suspects.forEach((sus, i) => {
      const c = [home, t2, t3][i], p = spot(c, tr) || c.hub;
      K.addNPC(ow, { key: 'suspect' + i, x: p[0], y: p[1], dir: 'down', spr: sus.spr, pal: tr.pick(PALS), move: 'turn',
        cond: () => !(i === q.impostor && PA.flag('tale:gate')), talk: suspectTalk(i) });
    });
    // ---- the genre's host, in every town
    [home, t2, t3].forEach((c, i) => {
      const p = spot(c, tr);
      if (p) K.addNPC(ow, { key: 'host' + i, x: p[0], y: p[1], dir: 'down', spr: G.host.spr, pal: 'cPurple', move: 'turn', talk: hostTalk(i) });
    });
    // ---- someone who has noticed that this hand is odd
    if (q.oddChat) { const p = spot(t2, tr); if (p) K.addNPC(ow, { key: 'oddOne', x: p[0], y: p[1], dir: 'down', spr: tr.pick(S.people), pal: tr.pick(PALS), move: 'turn', text: q.oddChat }); }
    // ---- townsfolk and their creatures
    for (const c of cells.filter((cc) => cc.kind === 'town')) {
      const fr = rng.sub('folk' + c.i);
      for (let i = 0, n = c.role === 'home' ? 2 : 3; i < n; i++) {
        const p = spot(c, fr);
        if (!p) break;
        K.addNPC(ow, { key: 'folk' + c.i + '_' + i, x: p[0], y: p[1], dir: fr.pick(['down', 'left', 'right', 'up']), spr: fr.pick(S.people), pal: fr.pick(PALS), move: fr.chance(0.6) ? 'wander' : 'turn', text: chatter(fr) });
      }
      if (fr.chance(0.6)) {
        const p = spot(c, fr), k = deal(q, 'pets', PETS, fr, true);
        if (p) K.addNPC(ow, { key: 'pet' + c.i, x: p[0], y: p[1], dir: 'down', spr: PA.monSpr(PA.sid(k[0])), move: 'wander', text: k[1], cry: true });
      }
    }
    populateHomeTale(world, rng.sub('home'));
    populateTownsTale(world, rng.sub('towns'), battles);
    populateRoutesTale(world, rng.sub('routes'), battles);
    populateGateTale(world, rng.sub('gate'), battles);
    populateDungeonTale(world, rng.sub('dun'), battles);
    K.populateGlade(world, rng.sub('glade'));
    populateHousesTale(world, rng.sub('houses'));
    world.slots.start = pickStart(world); // last, so nobody is standing on it
  }

  // ---------------------------------------------------------------- where the story starts
  // In the passage out of the hamlet (src/game/worldgen.js deals it from the seed).
  function pickStart(world) {
    return world.slots.passage.start;
  }

  // ---------------------------------------------------------------- the lead in the second town, who knows more
  function placeLead(world, rng, t2, spot) {
    const K = PA.questKit, q = world.quest, ow = world.maps.overworld;
    const p = spot(t2, rng) || t2.hub;
    K.addNPC(ow, { key: 'lead', x: p[0], y: p[1], dir: 'down', spr: q.lead.spr, pal: 'cGold', move: 'turn', talk: function* () {
      const { St, P } = TQ().T;
      if (!PA.flag('tale:lead') && step() < 2) {
        PA.setFlag('tale:lead');
        yield* PA.say(St.lead.lines[0]);
        yield* PA.say('{LEAD}: ' + P.lead);
        yield* PA.say(St.lead.lines[1]);
        return;
      }
      yield* PA.say('{LEAD}: ' + objective());
    } });
  }

  // ---------------------------------------------------------------- the tokens
  function placeTokens(world, rng, o) {
    const K = PA.questKit, q = world.quest, { S, St, G } = q.T, ow = world.maps.overworld;
    const n = q.token.n;
    const r2 = world.cells.filter((c) => c.kind === 'route' && c.routeN === 2);
    const routeCells = world.cells.filter((c) => c.kind === 'route');
    const used = new Set();
    const slots = [];
    const sq2 = o.spot(o.t2, rng), sq3 = o.spot(o.t3, rng);
    if (sq2) slots.push({ map: 'overworld', x: sq2[0], y: sq2[1], near: 1 });
    if (world.maps.hall && n >= 4) slots.push({ map: 'hall', x: 4, y: 1, near: 1 });
    const rs = K.trainerSpot(ow, r2[r2.length - 1], rng, used);
    if (rs) slots.push({ map: 'overworld', x: rs.x, y: rs.y, dir: rs.dir, near: 2 });
    if (sq3) slots.push({ map: 'overworld', x: sq3[0], y: sq3[1], near: 3 });
    if (world.maps.library && n >= 5) slots.push({ map: 'library', x: 5, y: 2, near: 3 });
    // fewer good spots than tokens: take the rest from the other towns' squares
    for (const c of [o.t2, o.t3, o.t2, o.t3]) { if (slots.length >= n) break; const p = o.spot(c, rng); if (p) slots.push({ map: 'overworld', x: p[0], y: p[1], near: c === o.t2 ? 1 : 3 }); }
    q.token.n = Math.min(n, slots.length);
    const kinds = St.kinds.map(([k, w]) => [k, w]);
    let quizI = rng.int(0, 99);
    for (let i = 0; i < q.token.n; i++) {
      const sl = slots[i];
      let kind = rng.pickW(kinds);
      if (kind === 'battle' && !o.battles) kind = 'quiz';
      if (kind === 'creature' && sl.map !== 'overworld') kind = 'talk';
      if (St.impostor && kind === 'favour') kind = 'talk';
      const map = world.maps[sl.map];
      const spec = { key: 'tok' + i, x: sl.x, y: sl.y, dir: sl.dir || 'down', pal: rng.pick(PALS), move: 'turn' };
      const tok = { i, kind, name: o.nextName(), lv: [9, 11, 12, 13, 14][Math.min(4, i)] };
      if (kind === 'creature') {
        tok.sp = rng.pick(PA.POOLS.field.map((e) => e[0]).filter((id) => id !== PA.GULL_ID));
        Object.assign(spec, { spr: PA.monSpr(tok.sp), cond: () => !PA.flag('tok:' + i) });
      } else spec.spr = rng.pick(S.people);
      if (kind === 'quiz') {
        const pool = St.remember ? REMEMBER : G.quiz;
        tok.quiz = pool[quizI++ % pool.length];
      }
      if (kind === 'battle') {
        const [cls, spr, types] = rng.pick(S.trainers);
        tok.cls = cls; spec.spr = spr;
        tok.team = PA.makeTeam(rng, types, rng.int(2, 3), tok.lv - 1, tok.lv + 1);
      }
      if (kind === 'favour') { // the thing they lost is on a nearby road
        tok.lost = S.lost[i % S.lost.length];
        const rc = routeCells.filter((c) => c.routeN === sl.near || c.routeN === sl.near - 1 || (sl.near === 3 && c.routeN === 3));
        let placed = false;
        for (const c of rng.shuffle(rc.length ? rc : routeCells)) {
          const s = K.nookSpot(ow, c, rng, used);
          if (!s) continue;
          ow.items.push({ x: s[0], y: s[1], item: tok.lost, key: 'fav' + i });
          ow.setColl(s[0], s[1], C.SOLID); ow.itemSolid = true;
          tok.where = world.zones[c.zi].name; placed = true; break;
        }
        if (!placed) tok.kind = kind = 'talk';
      }
      spec.talk = tokenTalk(tok);
      K.addNPC(map, spec);
    }
  }
  function tokenTalk(tok) {
    return function* (npc) {
      const q = TQ(), { St, S } = q.T, nm = tok.kind === 'creature' ? PA.species(tok.sp).n : tok.name;
      const say = (s) => PA.say((tok.kind === 'creature' ? '' : nm + ': ') + s);
      if (PA.flag('tok:' + tok.i)) { yield* say(pick(X.tokenDone)); return; }
      if (tok.kind === 'talk') {
        yield* say(St.impostor ? clueLine(tok.i) : pick(St.talk));
      } else if (tok.kind === 'quiz') {
        yield* say(pick(X.quizAsk));
        if (!(yield* quiz(tok.quiz))) return;
        if (St.impostor) yield* say(clueLine(tok.i));
      } else if (tok.kind === 'favour') {
        if (!PA.ow.has(tok.lost)) { yield* say(put(put(pick(X.lostAsk), 'LOST', tok.lost), 'WHERE', tok.where)); return; }
        PA.ow.take(tok.lost);
        yield* PA.say('{PLAYER} handed over the ' + tok.lost + '.');
        yield* say(put(pick(X.lostThanks), 'LOST', tok.lost));
      } else if (tok.kind === 'battle') {
        yield* say(St.battleIntro ? St.battleIntro : pick(X.battleAsk));
        const res = yield* PA.ow.trainerBattle({ cls: tok.cls, name: tok.name, team: tok.team, prize: tok.lv * 60, spr: npc.spr, pal: npc.pal, canLose: true,
          intro: '', lose: pick(TRAINER_LINES.lose), after: pick(TRAINER_LINES.after) });
        if (res !== 'win') { yield* say(pick(X.returnRested)); return; }
        yield* say(pick(TRAINER_LINES.lose) + ' Here: my {TOKEN}.');
      } else if (tok.kind === 'creature') {
        PA.audio.cry(tok.sp);
        if (q.tale.battles) {
          yield* PA.say(put(pick(X.creatureGuard), 'SP', nm));
          const res = yield* PA.ow.wildBattle(tok.sp, tok.lv, { canLose: true });
          if (res === 'lose' || res === 'run') return;
          yield* PA.say(put(pick(X.creatureWon), 'SP', nm));
        } else {
          yield* PA.say(put(pick(X.creatureSniff), 'SP', nm));
          yield* PA.ow.emote(npc, 'smile');
          yield* PA.say(pick(X.creatureGives));
        }
      }
      yield* giveToken(tok.i);
    };
  }
  function clueLine(i) {
    const q = TQ(), innocents = [0, 1, 2].filter((k) => k !== q.impostor), who = q.suspects[innocents[i % 2]].name;
    PA.setFlag('clear:' + innocents[i % 2]);
    return 'I don\'t know who the impostor is. But I know who it ISN\'T: ' + who + ' ' + ALIBIS[i % ALIBIS.length] + '.';
  }
  function* quiz(qq) {
    const opts = PA.rand.shuffle(qq.a);
    const k = yield* PA.choose(qq.q, opts, { cancel: null });
    const right = qq.any || opts[k] === qq.a[0];
    PA.audio.sfx(right ? 'buy' : 'bump');
    yield* PA.say(right ? (qq.any ? '' : 'Right! ') + qq.fact : 'Not quite! ' + qq.fact + '\fCome back and try again.');
    return right;
  }
  PA.taleQuiz = quiz;
  function* giveToken(i) {
    const q = TQ(), { St } = q.T;
    PA.setFlag('tok:' + i);
    yield* PA.ow.give(q.token.one, 1, true);
    const k = tokCount(), n = q.token.n;
    PA.ow.addJournal('Got a {TOKEN}. (' + k + ' of ' + n + ')');
    if (k === Math.ceil(n / 2) && k < n && !PA.flag('tale:twist')) { // halfway: it gets complicated
      PA.setFlag('tale:twist');
      yield* PA.wait(10);
      yield* PA.ow.setAct(2);
      yield* PA.ow.emote('player', 'question');
      for (const l of St.twist) yield* PA.say(l);
    }
    if (k >= n) {
      if (PA.state.act < 2) yield* PA.ow.setAct(2);
      setStep(2);
      yield* PA.say('That\'s all {N} {TOKENS}!\f' + St.gate);
      PA.ow.addJournal(St.gate + ' Show the {TOKENS} to {KEEPER} on the way.');
    }
  }
  function suspectTalk(i) {
    return function* () {
      const q = TQ(), sus = q.suspects[i];
      if (PA.flag('clear:' + i)) { yield* PA.say(sus.name + ': ' + pick(X.cleared)); return; }
      yield* PA.say(sus.name + ': ' + pick(X.suspect));
    };
  }

  // ---------------------------------------------------------------- the genre's host
  function hostTalk(townI) {
    return function* () {
      const G = TQ().T.G, act = (PA.state && PA.state.act) || 1;
      const lines = G.host.lines[Math.min(2, act - 1)];
      PA.state.flags['host:n'] = (PA.state.flags['host:n'] || 0) + 1;
      yield* PA.say(lines[(PA.state.flags['host:n'] + townI) % lines.length]);
    };
  }

  // ---------------------------------------------------------------- home, towns, routes
  function populateHomeTale(world, rng) {
    const K = PA.questKit, q = world.quest, { S } = q.T, ow = world.maps.overworld;
    const h1 = world.maps.home1, h2 = world.maps.home2, lab = world.maps.lab, rh = world.maps.rivalHouse;
    K.addSign(h2, 0, 0, () => PA.ow.sayRnd(L.DESK)); K.addSign(h2, 0, 1, () => PA.ow.sayRnd(L.DESK));
    K.addSign(h2, 3, 4, () => PA.ow.sayRnd(L.GAMES_ALL)); K.addSign(h2, 3, 5, () => PA.ow.sayRnd(L.GAMES_ALL));
    K.addSign(h1, 3, 1, () => PA.ow.sayRnd(L.TV));
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) K.addSign(h1, x, y, () => PA.say(PA.taleShelf()));
    K.addNPC(h1, { key: 'mother', x: 5, y: 4, dir: 'left', spr: 'mother', pal: 'cPink', move: 'turn', talk: function* () {
      if (q.client.home && step() < 3) { yield* PA.say(put(pick(X.motherErrand), 'OBJ', objective())); return; }
      yield* PA.say(pick(X.motherHello));
      yield* PA.ow.heal(true);
      yield* PA.say(pick(step() >= 4 ? X.motherProud : X.motherBye));
    } });
    if (rh) {
      K.addNPC(rh, { key: 'sister', x: 2, y: 3, dir: 'right', spr: 'sister', pal: 'cTeal', move: 'turn', text: rng.pick(X.sibling) });
      for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [7, 0], [7, 1]]) K.addSign(rh, x, y, () => PA.say(PA.taleShelf()));
    }
    if (lab) {
      for (const [x, y] of [[6, 0], [7, 0], [8, 0], [9, 0], [6, 1], [7, 1], [8, 1], [9, 1], [0, 6], [1, 6], [2, 6], [3, 6], [6, 6], [7, 6], [8, 6], [9, 6], [0, 7], [1, 7], [2, 7], [3, 7], [6, 7], [7, 7], [8, 7], [9, 7]]) K.addSign(lab, x, y, () => PA.say(PA.taleShelf()));
      K.addSign(lab, 0, 1, rng.pick(X.lab));
      if (!q.client.home) K.addNPC(lab, { key: 'client', x: 5, y: 2, dir: 'down', spr: q.client.spr, pal: 'cTeal', move: 'turn', talk: function* () {
        if (step() >= 4) { yield* PA.say(pick(X.clientThanks)); return; }
        yield* PA.say('{CLIENT}: ' + pick(X.clientCheck) + '\f' + objective());
      } });
    }
  }
  function populateTownsTale(world, rng, battles) {
    const K = PA.questKit, q = world.quest, { S, G } = q.T, ow = world.maps.overworld;
    // the great hall in the second town
    const hall = world.maps.hall;
    if (hall) {
      const hr = rng.sub('hall');
      [[3, 6, 'right'], [7, 4, 'left']].forEach(([x, y, dir], i) => {
        const [cls, spr, types] = hr.pick(S.trainers);
        if (battles) {
          const def = { spr, pals: PALS, types, intro: TRAINER_LINES.intro, lose: TRAINER_LINES.lose, after: TRAINER_LINES.after };
          const t = K.trainerSpec(hr, cls, 9, 12, 2, { def, clsName: cls, name: hr.pick(TRAINER_NAMES) });
          K.addNPC(hall, { key: 'hallT' + (i + 1), x, y, dir, move: 'still', ...K.trainerFields(t, 'hall' + (i + 1)) });
        } else K.addNPC(hall, { key: 'hallT' + (i + 1), x, y, dir, spr, pal: hr.pick(PALS), move: 'turn', text: chatter(hr) });
      });
      K.addNPC(hall, { key: 'hallGuide', x: 7, y: 11, dir: 'down', spr: hr.pick(S.people), pal: 'cNavy', move: 'still', text: PA.fmt(hr.pick(X.hallGuide), { HALL: S.hall }) + chatter(hr) });
    }
    // the archive in the third town
    const lib = world.maps.library;
    if (lib) {
      K.addSign(lib, 0, 1, rng.pick(X.catalogue));
      for (let y = 0; y < lib.h; y++) for (let x = 0; x < lib.w; x++) if (/bookshelf/.test(PA.roomObject(lib, x, y) || '')) K.addSign(lib, x, y, () => PA.say(PA.taleShelf()));
      K.addNPC(lib, { key: 'librarian', x: 2, y: 9, dir: 'up', spr: rng.pick(S.people), pal: 'cTeal', move: 'still', talk: function* () {
        yield* PA.say('Welcome to the ' + S.lib + '. ' + pick(G.chatter));
        if (!PA.flag('gift:library')) {
          PA.setFlag('gift:library');
          yield* PA.say(pick(X.library));
          yield* PA.ow.give(battles ? 'STRONG TONIC' : 'SUGARED ALMOND', battles ? 2 : 1);
        }
      } });
    }
    // the clinics and the shops
    for (const role of ['town2', 'town3']) {
      if (battles) { K.populateCenterMart(world, role, rng.sub(role)); continue; }
      const clinic = world.maps['clinic_' + role], shopMap = world.maps['shop_' + role];
      if (clinic) {
        K.addNPC(clinic, { key: 'nurse_' + role, x: 3, y: 1, dir: 'down', spr: 'medic', pal: 'cPink', move: 'still', text: deal(q, 'nurse', X.nurse, rng, true) });
        for (const x of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) clinic.signs.push({ x, y: 2, counter: true });
      }
      if (shopMap) K.addNPC(shopMap, { key: 'clerk_' + role, x: 0, y: 5, dir: 'right', spr: 'woman', pal: 'cTeal', move: 'none', text: deal(q, 'clerk', X.clerk, rng, true) });
    }
  }
  const ROUTE_ITEMS = { 1: ['TONIC', 'SMELLING SALTS', 'ANTIDOTE'], 2: ['TONIC', 'ALOE BALM', 'LINIMENT', 'HACKNEY TOKEN', 'LAVENDER WATER'], 3: ['STRONG TONIC', 'BARLEY WATER', 'CORDIAL', 'SUGARED ALMOND', 'PANACEA'] };
  const LV = { 1: [3, 6, 1, 2], 2: [8, 11, 1, 3], 3: [11, 14, 2, 3] };
  function populateRoutesTale(world, rng, battles) {
    const K = PA.questKit, q = world.quest, { S, St } = q.T, ow = world.maps.overworld;
    let rivalPlaced = false;
    for (const c of world.cells.filter((cc) => cc.kind === 'route')) {
      const n = c.routeN, r = rng.sub('route' + c.i), used = new Set();
      for (const sp of ow.npcSpecs || []) if (c.inside(sp.x, sp.y)) used.add(sp.x + ',' + sp.y); // the token-holders already here
      if (battles) {
        const [a, b, mn, mx] = LV[n];
        for (let i = 0, count = c.sub === 0 ? r.int(1, 2) : r.int(1, 3); i < count; i++) {
          const sp = K.trainerSpot(ow, c, r, used);
          if (!sp) break;
          const [cls, spr, types] = r.pick(S.trainers);
          const def = { spr, pals: PALS, types, intro: TRAINER_LINES.intro, lose: TRAINER_LINES.lose, after: TRAINER_LINES.after };
          const t = K.trainerSpec(r, cls, a, b, r.int(mn, mx), { def, clsName: cls, name: r.pick(TRAINER_NAMES) });
          K.addNPC(ow, { key: 'rt' + c.i + '_' + i, x: sp.x, y: sp.y, dir: sp.dir, move: 'still', ...K.trainerFields(t, 'rt' + c.i + '_' + i) });
        }
      }
      for (let i = 0, m = battles ? 1 : 2; i < m; i++) { // passers-by
        if (!r.chance(0.7)) continue;
        const sp = K.trainerSpot(ow, c, r, used);
        if (sp) K.addNPC(ow, { key: 'rnpc' + c.i + '_' + i, x: sp.x, y: sp.y, dir: sp.dir, spr: r.pick(S.people), pal: r.pick(PALS), move: 'turn', text: chatter(r) });
      }
      for (let i = 0, ni = r.int(1, 2); i < ni; i++) {
        const s = K.nookSpot(ow, c, r, used);
        if (!s) break;
        ow.items.push({ x: s[0], y: s[1], item: battles ? r.pick(ROUTE_ITEMS[n]) : r.pick(['SUGARED ALMOND', 'MOONSTONE BROOCH', 'HACKNEY TOKEN']), key: 'ri' + c.i + '_' + i });
        ow.setColl(s[0], s[1], C.SOLID); ow.itemSolid = true;
      }
      // the rival, on the second road, in stories that have one
      if (St.rival && battles && n === 2 && c.sub === 1 && !rivalPlaced && c.path && c.path.length) {
        rivalPlaced = true;
        const p = c.path[Math.floor(c.path.length / 2)];
        ow.triggers.push({ tag: 'taleRival', x: p[0] - 3, y: p[1] - 3, w: 7, h: 7, cond: () => step() >= 1 && !PA.flag('tale:rival'), script: rivalRoad });
      }
    }
  }
  function rivalTeam(lv) {
    const pk = (names) => PA.sid(PA.rand.pick(names));
    return [[pk(['DUSTDASH', 'SUCCESSGOAT', 'SERVOLT', 'HEXKIT', 'PLATYPULSE', 'KITEFOX', 'SHOWMEER']), lv - 2], [pk(['PINKADILLO', 'MONOCAT', 'LORISLURK', 'DUNEKIT', 'PRISMMER', 'IRONPURR', 'MAGPLATE', 'GEMSTOAT', 'COOLCARRION']), lv - 1],
      [PA.state.rivalStarter || PA.sid('RIPTABBY'), lv + 1]];
  }
  function* rivalRoad() {
    PA.setFlag('tale:rival');
    PA.ow.playMusic('rival');
    yield* PA.ow.emote('player', 'exclaim');
    const r = PA.ow.spawnNear({ key: 'rivalRoad', x: 0, y: 0, dir: 'down', spr: 'rival', pal: 'cBlue', move: 'still', temp: true });
    if (r) { PA.ow.faceNPCToPlayer(r); PA.ow.facePlayerTo(r); }
    yield* PA.say(pick(X.rivalMeet));
    const res = yield* PA.ow.trainerBattle({ cls: 'RIVAL', name: '{RIVAL}', team: rivalTeam(12), prize: 400, rival: true, canLose: true, music: 'rival',
      lose: 'Oh, COME ON.', winText: 'Ha! As expected!', spr: 'rival', pal: 'cBlue' });
    yield* PA.say(pick(res === 'win' ? X.rivalWin : X.rivalLose));
    if (r) yield* PA.ow.walkAway(r);
    PA.ow.restoreMusic();
  }

  // ---------------------------------------------------------------- the gate and Act III
  function populateGateTale(world, rng, battles) {
    const K = PA.questKit, q = world.quest, { S } = q.T, ow = world.maps.overworld, b = world.slots.blocker;
    if (b) K.addNPC(ow, { key: 'blocker', x: b.x, y: b.y, dir: K.oppositeSide(b.side), spr: S.keeper.spr, pal: 'cNavy', move: 'still', blocker: true, solidForGen: true,
      cond: () => !PA.flag('tale:gate'), talk: function* () {
        if (step() < 2) { yield* PA.say(put(pick(X.keeperNo), 'HAVE', tokCount())); return; }
        yield* PA.say('{PLAYER} showed the {TOKENS}.');
        yield* PA.say(pick(X.keeperYes));
        PA.setFlag('tale:gate');
        PA.ow.addJournal('The road to {DUNGEON} is open.');
        const g = PA.ow.npc('blocker');
        if (g) yield* PA.ow.walkAway(g);
      } });
    const [gx, gy] = world.slots.gateEntry;
    ow.triggers.push({ tag: 'act3', x: gx - 1, y: gy - 1, w: 3, h: 3, cond: () => PA.flag('tale:gate') && PA.state.act < 3, script: function* () {
      yield* PA.ow.setAct(3);
      yield* PA.say(pick(X.dusk));
    } });
    if (battles) { // someone minding the way in
      const m = world.slots.mouth, gr = rng.sub('guard'), [cls, spr, types] = gr.pick(S.trainers);
      const def = { spr, pals: PALS, types, intro: TRAINER_LINES.intro, lose: TRAINER_LINES.lose, after: TRAINER_LINES.after };
      const t = K.trainerSpec(gr, cls, 13, 14, 2, { def, clsName: cls, name: gr.pick(TRAINER_NAMES) });
      const x = m.front[0] + 1, y = m.front[1] + (m.dir === 'up' ? 1 : -1);
      if (ow.collAt(x, y) === C.WALK) K.addNPC(ow, { key: 'mouthGuard', x, y, dir: 'left', move: 'still', ...K.trainerFields(t, 'mouthGuard') });
    }
  }
  function populateDungeonTale(world, rng, battles) {
    const K = PA.questKit, q = world.quest, { S, St, P } = q.T;
    if (!world.dungeon) return;
    world.dungeon.floors.forEach((f, fi) => {
      const map = f.map, r = rng.sub('floor' + fi), spots = [];
      for (let y = 1; y < map.h - 1; y++) for (let x = 1; x < map.w - 1; x++) {
        const c = map.collAt(x, y);
        if (c !== C.CAVE && c !== C.WALK && c !== C.GRASS) continue;
        if (Math.abs(x - f.entry[0]) + Math.abs(y - f.entry[1]) < 6 || Math.abs(x - f.far[0]) + Math.abs(y - f.far[1]) < 5) continue;
        spots.push([x, y]);
      }
      const roomy = (p) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => PA.walkable(map.collAt(p[0] + dx, p[1] + dy)));
      const used = [];
      for (let i = 0, nT = battles ? (world.dungeon.floors.length === 1 ? 4 : 2) : 0; i < nT; i++) {
        let s = null;
        for (let k = 0; k < 60 && !s; k++) { const p = r.pick(spots); if (!used.some((u) => Math.abs(u[0] - p[0]) + Math.abs(u[1] - p[1]) < 6) && roomy(p)) s = p; }
        if (!s) break;
        used.push(s);
        const [cls, spr, types] = r.pick(S.trainers), lv = fi === 0 ? [12, 15] : [14, 17];
        const def = { spr, pals: PALS, types, intro: TRAINER_LINES.intro, lose: TRAINER_LINES.lose, after: TRAINER_LINES.after };
        const t = K.trainerSpec(r, cls, lv[0], lv[1], r.int(2, 3), { def, clsName: cls, name: r.pick(TRAINER_NAMES) });
        K.addNPC(map, { key: 'dt' + fi + '_' + i, x: s[0], y: s[1], dir: r.pick(['down', 'left', 'right', 'up']), move: 'turn', ...K.trainerFields(t, 'dt' + fi + '_' + i) });
      }
      for (let i = 0; i < 2; i++) {
        const p = r.pick(spots);
        if (used.some((u) => u[0] === p[0] && u[1] === p[1]) || !roomy(p)) continue;
        map.items.push({ x: p[0], y: p[1], item: r.pick(battles ? ['STRONG TONIC', 'PANACEA', 'CORDIAL', 'GRAND TONIC', 'BARLEY WATER'] : ['SUGARED ALMOND', 'MOONSTONE BROOCH']), key: 'di' + fi + '_' + i });
        map.setColl(p[0], p[1], C.SOLID);
      }
    });
    // the climax: whoever waits at the end, and the goal beside them
    const bm = world.maps[world.dungeon.bossMap], [bx, by] = world.dungeon.boss;
    const F = St.foe, br = rng.sub('foe');
    q.foeTeam = F.types === 'rival' ? null : PA.makeTeam(br, F.types, 2, 16, 18).concat(PA.makeTeam(br, F.types, 1, 20, 20));
    q.foeMon = PA.TYPE_SPECIES(br.pick(F.types === 'rival' ? ['STONE'] : F.types))[0] || PA.sid('MONOCAT');
    const foeSpr = F.kind === 'creature' ? PA.monSpr(q.foeMon) : q.foe.spr;
    K.addNPC(bm, { key: 'foe', x: bx, y: by, dir: 'down', spr: foeSpr, pal: 'cPurple', move: 'still', cond: () => !PA.flag('tale:foe'), talk: function* () { yield* climax(); } });
    bm.triggers.push({ tag: 'foeSeen', x: bx - 2, y: by + 1, w: 5, h: 3, cond: () => !PA.flag('tale:foe') && !PA.flag('tale:foeSeen'), script: function* () {
      PA.setFlag('tale:foeSeen');
      const n = PA.ow.npc('foe');
      if (n) { PA.ow.faceNPCToPlayer(n); PA.ow.facePlayerTo(n); }
      yield* PA.ow.emote('player', 'exclaim');
      yield* climax();
    } });
    const gy = by - 1 >= 0 && bm.collAt(bx + 1, by - 1) !== C.SOLID ? by - 1 : by;
    const goalSpr = P.goal.kind === 'creature' ? PA.monSpr(q.goalSpecies) : P.goal.kind === 'person' ? q.royalSpr : 'misc';
    if (P.goal.kind !== 'reach' && P.goal.kind !== 'win') K.addNPC(bm, { key: 'goalThing', x: bx + 1, y: gy, dir: 'down', spr: goalSpr === 'misc' ? PA.SPR.misc : goalSpr, frame: goalSpr === 'misc' ? PA.MISC.paper : undefined, pal: 'cGold', move: 'none',
      cond: () => !PA.flag('tale:goal'), talk: function* () { yield* PA.say(PA.flag('tale:foe') ? 'There it is: the {GOAL}.' : 'It\'s the {GOAL}! But {FOE} is standing right beside it.'); if (PA.flag('tale:foe')) yield* findGoal(); } });
  }

  // ---------------------------------------------------------------- the climax
  function* climax() {
    const q = TQ(), { St, P, G } = q.T, F = St.foe, battles = q.tale.battles;
    if (PA.flag('tale:foe')) return;
    const n = PA.ow.npc('foe');
    if (n) { PA.ow.faceNPCToPlayer(n); PA.ow.facePlayerTo(n); }
    if (!PA.flag('tale:met')) { for (const l of F.meet) yield* PA.say(l); PA.setFlag('tale:met'); } else yield* PA.say('{FOE} is waiting.');
    if (St.impostor) { // name the impostor
      const names = q.suspects.map((s) => s.name);
      const k = yield* PA.choose('Who is the impostor?', names, { cancel: null });
      if (k !== q.impostor) { yield* PA.say(names[k] + '? No... they were somewhere else entirely. Think again.'); return; }
      yield* PA.say('{PLAYER}: It\'s you, ' + names[k] + '!');
    }
    // the challenge
    if (battles && F.kind === 'trainer') {
      const team = q.foeTeam || rivalTeam(18);
      const res = yield* PA.ow.trainerBattle({ cls: F.types === 'rival' ? 'RIVAL' : 'FINAL', name: q.foe.name, team, prize: 2400, rival: F.types === 'rival', spr: q.foe.spr, pal: 'cPurple',
        canLose: true, lose: 'Well fought.', winText: 'Not yet!', music: 'boss' });
      if (res !== 'win') { yield* PA.say('{FOE}: Rest up, then come back. I\'m not going anywhere.'); return; }
    } else if (battles && F.kind === 'creature') {
      PA.audio.cry(q.foeMon);
      const res = yield* PA.ow.wildBattle(q.foeMon, 20, { special: true, canLose: true });
      if (res === 'lose' || res === 'run') { yield* PA.say('It settles down to wait. It is very good at waiting.'); return; }
    } else { // no battles: a challenge of wits
      yield* PA.say(F.kind === 'creature' ? 'It watches {PLAYER}, waiting. It seems to want an answer to something.' : '{FOE}: No creatures needed. Answer me two questions.');
      const pool = St.remember ? REMEMBER : G.quiz;
      const a = PA.rand.int(0, pool.length - 1);
      if (!(yield* quiz(pool[a]))) return;
      if (!(yield* quiz(pool[(a + 1) % pool.length]))) return;
    }
    const keepGoal = P.goal.kind === 'item' || P.goal.kind === 'creature';
    for (const l of F.win) if (keepGoal || !/\{GOAL\}/.test(l)) yield* PA.say(l);
    if (n) yield* PA.ow.walkAway(n);
    PA.setFlag('tale:foe');
    // a rematch, in the story that began with a hopeless one
    if (q.tale.premise === 'weakest') {
      yield* PA.wait(20);
      yield* PA.ow.emote('player', 'exclaim');
      yield* PA.say('The ground shakes. The {BEAST} steps out of the dark. It has been waiting for {PLAYER}. It looks... pleased.');
      for (;;) {
        const res = yield* PA.ow.wildBattle(q.beast, 22, { special: true, canLose: true });
        if (res === 'win' || res === 'befriended') break;
        yield* PA.say('The {BEAST} waits while {PLAYER}\'s team gets its breath back. It wants a fair fight.');
        for (const p of PA.state.party) p.heal();
      }
    }
    yield* findGoal();
  }
  function* findGoal() {
    const q = TQ(), { P } = q.T;
    if (PA.flag('tale:goal')) return;
    PA.setFlag('tale:goal'); PA.setFlag('goal');
    PA.audio.jingle(PA.audio.J.key);
    for (const l of P.find) yield* PA.say(l);
    if (P.goal.kind === 'item') PA.ow.addItem(q.goal, 1);
    setStep(3);
    PA.ow.addJournal('Found the {GOAL}! Time to go home.');
    yield* finale();
  }
  function* finale() {
    const q = TQ(), { S, St, G, P } = q.T;
    const home = q.client.home;
    PA.setFlag('resolving');
    yield* PA.ow.cutTo(home ? 'home1' : 'lab', home ? 5 : 4, 5, 'up', 'LATER, AT ' + PA.world.vars.HOME + '...');
    PA.ow.playMusic('ending');
    const c = PA.ow.npc(home ? 'mother' : 'client');
    if (c) { PA.ow.faceNPCToPlayer(c); PA.ow.facePlayerTo(c); }
    if (P.goal.kind === 'item') { yield* PA.say('{PLAYER} handed over the {GOAL}.'); PA.ow.take(q.goal); }
    if (P.goal.kind === 'creature') {
      const m = PA.ow.spawnNear({ key: 'goalHome', x: 0, y: 0, dir: 'down', spr: PA.monSpr(q.goalSpecies), move: 'still', temp: true });
      if (m) { PA.audio.cry(q.goalSpecies); yield* PA.ow.emote(m, 'smile'); }
    }
    for (const l of P.finale) yield* PA.say(l);
    yield* PA.say(St.finale);
    if (St.vip) yield* PA.say(pick(X.vipThanks));
    yield* PA.say(G.coda[0]);
    yield* PA.say(G.coda[1]);
    if (PA.state.party.some((m) => PA.isMascot(m.id))) yield* PA.say('GULLIVER: ...Nice.');
    setStep(4);
    PA.setFlag('resolved');
    yield* PA.ow.credits();
  }

  // ---------------------------------------------------------------- houses
  function populateHousesTale(world, rng) {
    const K = PA.questKit, { S } = world.quest.T;
    for (const id of Object.keys(world.maps)) {
      if (!id.startsWith('house')) continue;
      const m = world.maps[id], r = rng.sub(id), spots = [];
      for (let y = 2; y < m.h - 1; y++) for (let x = 0; x < m.w; x++) if (m.collAt(x, y) === C.WALK && !(y >= 6 && x >= 1 && x <= 4)) spots.push([x, y]);
      for (let i = 0, n = r.int(1, 2); i < n && spots.length; i++) {
        const p = r.pick(spots), giftKey = 'gift:' + id + i, text = chatter(r);
        const gift = i === 0 && r.chance(0.5) ? r.pick(['TONIC', 'ALOE BALM', 'STRONG TONIC', 'HACKNEY TOKEN', 'MOONSTONE BROOCH', 'SUGARED ALMOND']) : null;
        K.addNPC(m, { key: id + 'n' + i, x: p[0], y: p[1], dir: r.pick(['down', 'left', 'right']), spr: r.pick(S.people), pal: r.pick(PALS), move: r.chance(0.5) ? 'wander' : 'turn', talk: function* () {
          yield* PA.say(text);
          if (gift && !PA.flag(giftKey)) { PA.setFlag(giftKey); yield* PA.say(pick(X.houseGift)); yield* PA.ow.give(gift, 1); }
        } });
        spots.splice(spots.indexOf(p), 1);
      }
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        const o = PA.roomObject(m, x, y) || '';
        if (/bookshelf/.test(o)) K.addSign(m, x, y, () => PA.say(PA.taleShelf()));
        if (o === 'tv_1x2') K.addSign(m, x, y, () => PA.ow.sayRnd(L.TV));
      }
    }
  }

  // ================================================================= who walks behind you
  // GULLIVER, when he's following; otherwise the person you're escorting home
  PA.taleFollower = function () {
    if (!PA.isTale() || !PA.state) return null;
    const q = TQ();
    if (!q.T.St.vip || PA.flag('tale:goal')) return null;
    return { spr: q.vip.spr, chat: function* () { yield* PA.say(pick(VIP_CHAT)); } };
  };

  // ================================================================= the setup
  // who you are, on a plain stage: how you're presenting today, and your name
  function* whoYouAre(seed) {
    const q = TQ();
    PA.audio.play('house', PA.audio.compose(seed + ':intro', 'house'));
    const st = PA.push(new PA.scenesApi.Stage());
    for (let i = 4; i >= 0; i--) { st.fade = i; yield* PA.wait(4); }
    yield* PA.scenesApi.whoAreYou(st, q.heroNames);
    yield* PA.wait(20);
    PA.audio.sfx('swoosh');
    for (let i = 0; i <= 20; i++) { st.shrink = 1 - i / 24; yield; }
    for (let i = 0; i <= 4; i++) { st.fade = i; yield* PA.wait(4); }
    PA.pop(st);
  }
  function setupTale() {
    const w = PA.world, q = w.quest, s = PA.state, t = q.tale, { P } = q.T;
    s.taleKey = { structure: t.structure, setting: t.setting, genre: t.genre, premise: t.premise, battles: t.battles };
    s.lastHeal = { map: 'home1', x: 5, y: 5, dir: 'up' };
    s.visited = s.visited || {};
    s.visited[w.zoneTown('home')] = 1;
    s.bag['WORLD MAP'] = 1;
    // GULLIVER leads the party, in every story
    const g = new PA.Mon(PA.GULL_ID, 5, { ot: 'GULLIVER', nick: 'GULLIVER', goodDV: true });
    s.party.push(g); PA.dexCatch(PA.GULL_ID); PA.setFlag('gullJoined');
    if (t.battles) {
      const pick0 = q.starter || 0, ri = (pick0 + 1) % 3; // the rival has the one that beats yours (BLOOM < KINDLE < TIDE < BLOOM)
      s.starterTaken = pick0; s.rivalTaken = ri; s.rivalStarter = q.starters[ri];
      const m = new PA.Mon(q.starters[pick0], 5, { goodDV: true, ot: s.name });
      s.party.push(m); PA.dexCatch(m.id);
      s.taleMon = m.name;
      s.bag.ALMANAC = 1; s.bag.TONIC = 3;
    }
    PA.vars.MON = s.taleMon || 'creature';
    for (const f of ['coldOpen', 'labIntro', 'profStop', 'starter', 'quest', 'dex', 'act1']) PA.setFlag(f); // the classic story's flags, so nothing of it stirs
    setStep(1);
    PA.ow.addJournal(P.journal);
    PA.ow.addJournal('Collect {N} {TOKENS} from people around {REGION}.');
  }
  PA.playTale = function* () {
    const w = PA.world, q = w.quest, { St, P } = q.T;
    PA.state.rival = q.rivalName; PA.vars.RIVAL = q.rivalName;
    yield* whoYouAre(w.seed);
    setupTale();
    const at = w.slots.start || { x: w.doors['home:playerHouse'].x, y: w.doors['home:playerHouse'].y + 1 };
    PA.push(PA.ow.scene);
    PA.ow.enterMap(at.map || 'overworld', at.x, at.y, 'down');
    const f = { level: 4, colour: '#000000', draw() { PA.gfx.fade(this.level, this.colour); }, update() {} };
    PA.push(f);
    yield* PA.fadeIn(f, 20);
    for (const sc of PA.scenes.slice()) if (sc instanceof PA.Banner) PA.pop(sc);
    yield* PA.wait(12);
    // the client is right here, with three lines: what's wrong, where the GOAL is, and what it takes
    const cl = PA.ow.spawnNear({ key: 'clientOpen', x: 0, y: 0, dir: 'up', spr: q.client.spr, pal: 'cTeal', move: 'still', temp: true });
    if (cl) { PA.ow.faceNPCToPlayer(cl); PA.ow.facePlayerTo(cl); yield* PA.ow.emote(cl, 'exclaim'); }
    for (const l of [P.open[0], P.open[1], St.ask]) yield* PA.say(l);
    if (cl) yield* PA.ow.walkAway(cl);
    PA.ow.placeFollower();
    if (St.vip) PA.ow.addJournal('{VIP} is coming along. Get them home safely.');
  };

  // ================================================================= the credits roll
  PA.taleCredits = function (H, starter) {
    const q = TQ(), { S, St, G, P } = q.T, s = PA.state;
    return [
      H('STARRING'), '', PA.sub('{PLAYER}'), 'as Themself', '',
      'GULLIVER', 'as The Team\'s Coolest Member', '',
      ...(starter && !PA.isMascot(starter.id) ? [starter.name, 'as The Best Friend', ''] : []),
      PA.sub('{CLIENT}'), 'as The Client', '', PA.sub('{RIVAL}'), 'as The Rival', '',
      PA.sub(q.foe.name), 'as ' + (St.foe.kind === 'creature' ? 'The Thing at the End' : 'The Final Challenge'), '',
      ...(St.vip ? [PA.sub('{VIP}'), 'as Someone Very Important', ''] : []),
      G.host.name, 'as Themselves', '',
      '',
      H('TONIGHT\'S CARDS'), '', 'STORY', St.name, '', 'SETTING', S.name, '', 'GENRE', G.name, '', 'PREMISE', P.name, '',
      ...(q.tale.odd.length ? ['(An odd hand.', 'It worked anyway.)', ''] : []), '',
    ];
  };
})(window.PA);
