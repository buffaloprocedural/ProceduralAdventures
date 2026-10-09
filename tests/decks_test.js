// Node harness: every card in the four story decks (src/game/tales/), checked on paper and then dealt for real.
//   node tests/decks_test.js            check every card, then deal each one in a world of its own
//   node tests/decks_test.js --quick    check the cards only
const PA = require('./headless.js');
const D = PA.TALES;
let fails = 0;
const bad = (where, m) => { fails++; console.log('FAIL ' + where + ': ' + m); };

// ---------------------------------------------------------------- what a card may name
const people = new Set(Object.keys(global.PA_PEOPLE.chars));
const TYPES = new Set(['KINDLE', 'FROST', 'TIDE', 'BLOOM', 'LOAM', 'STONE', 'CURRENT', 'BREEZE', 'CHROME', 'HUSH', 'GLAM', 'BLIGHT']);
const species = new Set();
for (let i = 0; i < 400; i++) { try { const s = PA.species(i); if (s && s.n) species.add(s.n); } catch (e) { /* past the roster */ } }
const TAGS = new Set(['land', 'sea', 'sky', 'space', 'town', 'genteel', 'royal', 'warm', 'cold', 'indoor', 'wild', 'under', 'tech', 'mountain', 'silly',
  'forest', 'arcade', 'ancient', 'academic', 'desert', 'water', 'rural', 'city', 'spooky', 'sport', 'food', 'art', 'music', 'science', 'magic', 'nautical', 'industrial', 'holiday', 'small']);
const ERAS = new Set(['past', 'modern', 'future', 'timeless', 'myth']);
const VARS = new Set(['PLAYER', 'RIVAL', 'MON', 'HOME', 'TOWN2', 'TOWN3', 'REGION', 'DUNGEON', 'GOAL', 'ITEM', 'CLIENT', 'GIVER', 'TOKEN', 'TOKENS', 'N', 'MOTHER',
  'VIP', 'ROYAL', 'BEAST', 'FOE', 'BOSS', 'SP', 'KEEPER', 'LEAD', 'LEADER', 'LAB', 'HALL', 'LIB', 'SEED', 'S1', 'S2', 'S3', 'G', 'S']);
const GOAL_KINDS = new Set(['item', 'creature', 'person', 'win', 'reach']);
const KINDS = new Set(['talk', 'quiz', 'favour', 'battle', 'creature']);
const W = (s) => PA.gfx.textWidth(s);

const str = (w, v, what) => { if (typeof v !== 'string' || !v.trim()) { bad(w, what + ' is missing'); return false; } return true; };
const strs = (w, v, what, min) => {
  if (!Array.isArray(v) || v.length < (min || 1)) { bad(w, what + ' needs ' + (min || 1) + '+ lines'); return; }
  v.forEach((s, i) => str(w, s, what + '[' + i + ']'));
};
const person = (w, spr, what, nullOk) => { if (spr === null && nullOk) return; if (!people.has(spr)) bad(w, what + ' names a missing NPC sheet ' + spr); };
const tags = (w, c) => { for (const k of ['needs', 'avoid']) for (const t of c[k] || []) if (!TAGS.has(t) && !ERAS.has(t)) bad(w, k + ' names an unknown tag ' + t); };
function quizzes(w, list) {
  if (!Array.isArray(list) || list.length < 3) { bad(w, 'needs 3+ quiz questions'); return; }
  for (const q of list) {
    if (!str(w, q.q, 'a question')) continue;
    if (!Array.isArray(q.a) || q.a.length !== 3) bad(w, 'the question "' + q.q + '" needs three answers');
    else for (const a of q.a) if (W(a) > 128) bad(w, 'the answer "' + a + '" is too wide for the menu');
    str(w, q.fact, 'the answer to "' + q.q + '"');
    if (q.a && new Set(q.a).size !== q.a.length) bad(w, 'the question "' + q.q + '" repeats an answer');
  }
}
// every {WORD} in a card is one the game fills in
function placeholders(w, card) {
  const walk = (v, at) => {
    if (typeof v === 'string') { for (const m of v.matchAll(/\{(\w+)\}/g)) if (!VARS.has(m[1])) bad(w, 'unknown placeholder {' + m[1] + '} in ' + at); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, at + '[' + i + ']'));
    else if (v && typeof v === 'object') for (const k in v) walk(v[k], at + '.' + k);
  };
  walk(card, '');
}

// ---------------------------------------------------------------- on paper
const seenText = new Map(); // the same line in two cards is a copy, not new content
function unique(w, card) {
  const walk = (v) => {
    if (typeof v === 'string') { if (v.length > 40) { const o = seenText.get(v); if (o && o !== w) bad(w, 'repeats a line from ' + o + ': "' + v.slice(0, 50) + '..."'); else seenText.set(v, w); } }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') for (const k in v) if (k !== 'people' && k !== 'trainers') walk(v[k]);
  };
  walk(card);
}
for (const [id, P] of Object.entries(D.premises)) {
  const w = 'premise ' + id;
  str(w, P.name, 'name'); str(w, P.short, 'short');
  if (P.client !== 'chief' && P.client !== 'mother') { if (!P.client || !str(w, P.client.name, 'client.name')) continue; if (P.client.spr) person(w, P.client.spr, 'client'); }
  if (!P.goal || !str(w, P.goal.noun, 'goal.noun') || !GOAL_KINDS.has(P.goal.kind)) bad(w, 'the goal needs a noun and a kind');
  if (P.goal && P.goal.kind === 'creature') { if (!(P.goal.species || []).length) bad(w, 'a creature goal needs species'); for (const s of P.goal.species || []) if (!species.has(s)) bad(w, 'unknown species ' + s); }
  if (!Array.isArray(P.open) || P.open.length !== 2 || P.open.some((l) => !l.startsWith('{CLIENT}: '))) bad(w, 'open is two lines the client says');
  else if (P.open.join(' ').length > 250) bad(w, 'open is ' + P.open.join(' ').length + ' letters (250 at most)');
  str(w, P.journal, 'journal'); str(w, P.lead, 'lead'); strs(w, P.find, 'find'); strs(w, P.finale, 'finale');
  if (P.tokens && (!P.tokens.one || !P.tokens.many || !(P.tokens.n >= 3 && P.tokens.n <= 5))) bad(w, 'tokens need one, many and n (3-5)');
  if (P.tokens && W(P.tokens.one) > 128) bad(w, 'the token ' + P.tokens.one + ' is too wide for the bag');
  if (P.goal && P.goal.kind === 'item' && W(P.goal.noun) > 128) bad(w, 'the goal ' + P.goal.noun + ' is too wide for the bag');
  tags(w, P); placeholders(w, P); unique(w, P);
}
for (const [id, St] of Object.entries(D.structures)) {
  const w = 'structure ' + id;
  str(w, St.name, 'name'); str(w, St.short, 'short');
  if (str(w, St.ask, 'ask')) {
    if (!St.ask.startsWith('{CLIENT}: ')) bad(w, 'the ask is not the client\'s');
    if (!/\{N\} \{TOKENS\}/.test(St.ask)) bad(w, 'the ask does not name the {N} {TOKENS}');
    if (St.ask.length > 160) bad(w, 'the ask is ' + St.ask.length + ' letters (160 at most)');
  }
  if (!St.lead || !str(w, St.lead.name, 'lead.name')) continue;
  person(w, St.lead.spr, 'lead', true); strs(w, St.lead.lines, 'lead.lines', 2);
  if (!St.token || !St.token.one || !St.token.many) bad(w, 'token needs one and many');
  else if (W(St.token.one) > 128) bad(w, 'the token ' + St.token.one + ' is too wide for the bag');
  if (!Array.isArray(St.n) || !(St.n[0] >= 3 && St.n[1] <= 5 && St.n[0] <= St.n[1])) bad(w, 'n is [low, high] within 3-5');
  if (!Array.isArray(St.kinds) || !St.kinds.length || St.kinds.some(([k, x]) => !KINDS.has(k) || !(x > 0))) bad(w, 'kinds are [talk|quiz|favour|battle|creature, weight]');
  if (!St.impostor) strs(w, St.talk, 'talk', St.kinds && St.kinds.some(([k]) => k === 'talk') ? 3 : 1); // (a favour or a creature indoors falls back to talk)
  strs(w, St.twist, 'twist'); str(w, St.gate, 'gate'); str(w, St.finale, 'finale');
  const F = St.foe;
  if (!F || !str(w, F.name, 'foe.name') || !['trainer', 'creature', 'talk'].includes(F.kind)) bad(w, 'the foe needs a name and a kind');
  else {
    if (F.spr) person(w, F.spr, 'foe');
    if (F.types !== 'rival' && (!Array.isArray(F.types) || F.types.some((t) => !TYPES.has(t)))) bad(w, 'foe.types are creature types, or \'rival\'');
    strs(w, F.meet, 'foe.meet'); strs(w, F.win, 'foe.win');
    if (Array.isArray(F.win) && F.win.every((l) => /\{GOAL\}/.test(l))) bad(w, 'every foe.win line names the {GOAL} (they are skipped when the goal is a person, a place or a win)');
  }
  for (const k of St.goalKinds || []) if (!GOAL_KINDS.has(k)) bad(w, 'unknown goal kind ' + k);
  tags(w, St); placeholders(w, St); unique(w, St);
}
for (const [id, G] of Object.entries(D.genres)) {
  const w = 'genre ' + id;
  str(w, G.name, 'name'); str(w, G.short, 'short');
  if (!(G.battle >= 0 && G.battle <= 1)) bad(w, 'battle is a chance, 0-1');
  if (!G.host || !str(w, G.host.name, 'host.name')) continue;
  person(w, G.host.spr, 'host');
  if (!Array.isArray(G.host.lines) || G.host.lines.length !== 3) bad(w, 'host.lines are three acts of lines');
  else G.host.lines.forEach((a, i) => strs(w, a, 'host.lines[' + i + ']', 2));
  strs(w, G.chatter, 'chatter', 8);
  if (!Array.isArray(G.acts) || G.acts.length !== 3 || G.acts.some((a) => !Array.isArray(a) || a.length !== 2)) bad(w, 'acts are three [line, line] titles');
  else for (const a of G.acts) for (const l of a) if (W(l) > 152) bad(w, 'the act title line "' + l + '" is too wide');
  strs(w, G.titles, 'titles', 3);
  for (const t of G.titles || []) if (!/\{[GS]\}/.test(t)) bad(w, 'the title "' + t + '" names neither the {G} nor the town {S}');
  strs(w, G.coda, 'coda', 2); strs(w, G.shelf, 'shelf');
  quizzes(w, G.quiz);
  tags(w, G); placeholders(w, G); unique(w, G);
}
for (const [id, S] of Object.entries(D.settings)) {
  const w = 'setting ' + id;
  for (const k of ['name', 'short', 'in', 'route', 'lab', 'hall', 'lib', 'mother', 'royal']) str(w, S[k], k);
  if (!ERAS.has(S.era)) bad(w, 'unknown era ' + S.era);
  if (!Array.isArray(S.tags) || !S.tags.length) bad(w, 'tags are missing'); else for (const t of S.tags) if (!TAGS.has(t)) bad(w, 'unknown tag ' + t);
  if (!Array.isArray(S.towns) || new Set(S.towns).size < 6) bad(w, 'needs 6+ different town names');
  for (const k of ['regions', 'caves', 'woods', 'glades']) strs(w, S[k], k);
  for (const k of ['towns', 'caves', 'woods', 'glades']) for (const n of S[k] || []) if (W(n) > 136) bad(w, 'the name ' + n + ' is too wide for a banner');
  if (S.dungeon !== null && S.dungeon !== 'cave' && S.dungeon !== 'forest') bad(w, 'dungeon is cave, forest or null');
  for (const k of ['chief', 'vip', 'keeper', 'guardian']) { if (!S[k] || !str(w, S[k].name, k + '.name')) continue; person(w, S[k].spr, k); }
  strs(w, S.rivals, 'rivals'); strs(w, S.names, 'names', 7);
  if (!Array.isArray(S.people) || S.people.length < 4) bad(w, 'needs 4+ people'); else for (const p of S.people) person(w, p, 'people');
  if (!Array.isArray(S.trainers) || S.trainers.length < 3) bad(w, 'needs 3+ trainers');
  else for (const [cls, spr, ty] of S.trainers) { str(w, cls, 'a trainer class'); person(w, spr, 'trainer ' + cls); if (!Array.isArray(ty) || !ty.length || ty.some((t) => !TYPES.has(t))) bad(w, 'trainer ' + cls + ' has unknown types'); }
  strs(w, S.lost, 'lost', 5);
  for (const l of S.lost || []) if (W(l) > 128) bad(w, 'the lost thing ' + l + ' is too wide for the bag');
  strs(w, S.folk, 'folk', 8);
  if (!S.signs) bad(w, 'signs are missing'); else for (const k of ['home', 'town2', 'town3']) strs(w, S.signs[k], 'signs.' + k);
  tags(w, S); placeholders(w, S); unique(w, S);
}
// the word the Society retired (see the hamlet commit) stays retired, in every card and every shared line
if (/spooky/i.test(JSON.stringify(D) + JSON.stringify(PA.Lines))) bad('the decks', 'say "spooky"');
const count = (k) => Object.keys(D[k]).length;
console.log('cards: structures', count('structures'), 'settings', count('settings'), 'genres', count('genres'), 'premises', count('premises'),
  '- hands', (count('structures') * count('settings') * count('genres') * count('premises')).toLocaleString());

// ---------------------------------------------------------------- dealt for real: each card in a world of its own
if (!process.argv.includes('--quick')) {
  const t0 = Date.now();
  let n = 0;
  for (const [key, deck] of [['structure', 'structures'], ['setting', 'settings'], ['genre', 'genres'], ['premise', 'premises']]) {
    for (const id of Object.keys(D[deck])) {
      const w = key + ' ' + id;
      PA.forceTale = { [key]: id };
      try {
        const world = PA.genWorld('DECK:' + key + ':' + id);
        n++;
        const q = world.quest, all = [];
        if (!q.tale || q.tale[key] !== id) { bad(w, 'was not dealt'); continue; }
        for (const m in world.maps) for (const sp of world.maps[m].npcSpecs || []) all.push(sp);
        const has = (k) => all.some((sp) => sp.key === k);
        for (let i = 0; i < q.token.n; i++) if (!has('tok' + i)) bad(w, 'no token-holder ' + i);
        for (const k of ['lead', 'blocker', 'foe', 'mother']) if (!has(k)) bad(w, 'no ' + k);
        const vars = Object.assign({}, world.vars, { PLAYER: 'EDMUND', RIVAL: q.rivalName, MON: 'EMBERWREN' });
        const setup = q.T.P.open.concat([q.T.St.ask]).map((l) => PA.fmt(l, vars)).join(' ');
        if (setup.length > 440) bad(w, 'the setup is ' + setup.length + ' letters long');
        const S = q.T.S;
        for (const nm of [q.client.name, q.foe.name, q.lead.name, S.keeper.name]) if (!nm) bad(w, 'someone has no name');
      } catch (e) { bad(w, e.message); }
    }
  }
  PA.forceTale = null;
  console.log('dealt', n, 'cards in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
console.log(fails ? fails + ' FAILURES' : 'DECKS OK');
if (fails) process.exitCode = 1;
