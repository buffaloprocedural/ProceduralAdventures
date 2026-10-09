// Node harness: generate many worlds and check invariants.
const PA = require('./headless.js');
const N = +(process.argv[2] || 200);
// a numeric sprite is a row of the small object sheet; a string names an original NPC sheet
const rows = global.PA_ASSETS.charRows;
const badRow = (v) => typeof v === 'number' && !(v >= 0 && v < rows);
const people = Object.assign({}, global.PA_PEOPLE.chars, global.PA_MASCOT.overworld.chars); // + GULLIVER
for (const k in PA.SPR) {
  if (badRow(PA.SPR[k])) { console.log('FAIL PA.SPR.' + k + ' is row ' + PA.SPR[k] + ', but the sheet has ' + rows); process.exitCode = 1; }
  if (PA.isPerson(PA.SPR[k]) && !people[PA.SPR[k]]) { console.log('FAIL PA.SPR.' + k + ' names a missing NPC sheet ' + PA.SPR[k]); process.exitCode = 1; }
}
const seenPeople = new Set();
let fails = 0, totalAttempts = 0, maxAttempts = 0, t0 = Date.now();
const kinds = {}, starts = {}, tales = [];
// a dealt story (src/game/tales.js): every part it needs is in the world
function checkTale(seed, w) {
  const q = w.quest, t = q.tale, ow = w.maps.overworld, all = [];
  for (const id in w.maps) for (const n of w.maps[id].npcSpecs || []) all.push(n);
  const has = (k) => all.some((n) => n.key === k);
  const bad = (m) => { console.log('FAIL ' + seed + ' (' + [t.structure, t.setting, t.genre, t.premise].join('.') + '): ' + m); process.exitCode = 1; };
  for (let i = 0; i < q.token.n; i++) if (!has('tok' + i)) bad('no token-holder ' + i);
  if (q.token.n < 3) bad('only ' + q.token.n + ' tokens');
  for (const k of ['lead', 'blocker', 'foe', 'mother']) if (!has(k)) bad('no ' + k);
  if (!q.client.home && !has('client')) bad('no client');
  // the story starts out in the open, on a clear tile with room for the client beside you
  const st = w.slots.start;
  if (!st) bad('no start');
  else {
    starts[st.kind] = (starts[st.kind] || 0) + 1;
    const sm = w.maps[st.map || 'overworld'];
    if (!PA.walkable(sm.collAt(st.x, st.y)) || [PA.C.WARP, PA.C.DOOR].includes(sm.collAt(st.x, st.y))) bad('the start is not open ground');
    if ((sm.npcSpecs || []).some((n) => n.x === st.x && n.y === st.y)) bad('someone is standing on the start');
  }
  // no battles: nothing to fight
  if (!t.battles) {
    if (all.some((n) => n.trainer)) bad('a trainer in a story without battles');
    if (w.zones.some((z) => z.enc)) bad('wild encounters in a story without battles');
  }
  // the setup is three lines from the client: the premise's two, and the structure's ask (which names the tokens)
  if (q.T.P.open.length !== 2 || !q.T.St.ask) bad('the setup is not three lines');
  if (!/\{N\} \{TOKENS\}/.test(q.T.St.ask)) bad('the ask does not name the tokens');
  if (q.T.P.open.concat([q.T.St.ask]).some((l) => !l.startsWith('{CLIENT}: '))) bad('a setup line the client does not say');
  // ...and a few seconds of reading
  const vars = Object.assign({}, w.vars, { PLAYER: 'EDMUND', RIVAL: q.rivalName, MON: 'EMBERWREN' });
  const words = q.T.P.open.concat([q.T.St.ask]).map((l) => PA.fmt(l, vars)).join(' ');
  if (words.length > 420) bad('the setup is ' + words.length + ' letters long');
  if (/\{[A-Z0-9]+\}/.test(words)) bad('a placeholder in the setup: ' + words.match(/\{[A-Z0-9]+\}/)[0]);
  return t;
}
for (let i = 0; i < N; i++) {
  const seed = 'TEST' + i;
  try {
    const w = PA.genWorld(seed);
    totalAttempts += w.attempt; maxAttempts = Math.max(maxAttempts, w.attempt);
    const q = w.quest;
    const k = q.kind + '/' + q.dungeon + '/' + q.blocker;
    kinds[k] = (kinds[k] || 0) + 1;
    if (q.tale && !q.tale.classic) tales.push(checkTale(seed, w));
    else { fails++; console.log('FAIL', seed, 'dealt the classic story'); }
    // invariants
    const must = ['overworld', 'home1', 'home2', 'lab', 'rivalHouse', 'hall', 'clinic_town2', 'shop_town2', 'clinic_town3', 'shop_town3', 'library', 'dungeon1'];
    for (const m of must) if (!w.maps[m]) throw new Error('missing map ' + m);
    for (const id in w.maps) {
      const m = w.maps[id];
      for (const wp of m.warps) {
        const dst = w.maps[wp.to];
        if (!dst) throw new Error('warp to missing ' + wp.to);
        if (!dst.inb(wp.tx, wp.ty)) throw new Error('warp target OOB ' + id + '->' + wp.to);
        const c = dst.collAt(wp.tx, wp.ty);
        if (!PA.walkable(c)) throw new Error('warp target not walkable ' + id + '->' + wp.to + ' at ' + wp.tx + ',' + wp.ty + ' c=' + c);
      }
      // outdoor maps are dressed in the new tileset (src/game/dress.js): every cell, every building
      if (id === 'overworld' || m.dungeon) {
        if (!m.vq) throw new Error('map not dressed ' + id);
        if (m.vqMissing.length) throw new Error('no new tile for old tile(s) ' + m.vqMissing.join(',') + ' on ' + id);
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
          const [a, k] = PA.vqAt(m, x, y);
          for (let q = 0; q < 4; q++) if (a[k + q] === PA.VQ_VOID && m.tiles[m.i(x, y)] !== PA.T.black) throw new Error('undressed quarter at ' + id + ' ' + x + ',' + y);
        }
        const doorTiles = new Set(PA.DOOR_PIECES.map((n) => global.PA_WORLD_TILES.names[n]));
        for (const b of m.buildings) {
          const [a, k] = PA.vqAt(m, b.door.x, b.door.y);
          if (!doorTiles.has(a[k] >> 2)) throw new Error('building ' + b.name + ' has no door piece on its door at ' + b.door.x + ',' + b.door.y);
        }
      }
      // rooms are laid out in the interior tileset (src/game/rooms.js): furniture on every solid cell, none in the way
      if (m.indoor && !m.dungeon) {
        if (!m.vq || !m.vo || m.vqSheet !== 'interior') throw new Error('room not furnished ' + id);
        if (m.roomProblems.length) throw new Error('room ' + id + ': ' + m.roomProblems.join('; '));
        for (const n of (m.npcSpecs || [])) if (!PA.walkable(m.collAt(n.x, n.y)) && !/clerk|mother|sister|nurse|leader|starter/.test(n.key) && n.frame === undefined)
          throw new Error('room ' + id + ': ' + n.key + ' stands inside the furniture at ' + n.x + ',' + n.y);
      }
      for (const n of (m.npcSpecs || [])) {
        if (!m.inb(n.x, n.y)) throw new Error('npc OOB ' + n.key);
        if (n.spr === undefined || n.spr === null) throw new Error('npc without a sprite (unknown PA.SPR role?) ' + n.key);
        if (badRow(n.spr) && n.spr !== -1) throw new Error('npc uses missing sprite row ' + n.spr + ': ' + n.key);
        if (PA.isPerson(n.spr)) { if (!people[n.spr]) throw new Error('npc uses missing NPC sheet ' + n.spr + ': ' + n.key); seenPeople.add(n.spr); }
      }
    }
  } catch (e) {
    fails++;
    console.log('FAIL', seed, e.message);
  }
}
console.log('worlds', N, 'fails', fails, 'avg attempts', (totalAttempts / N).toFixed(2), 'max', maxAttempts, 'ms/world', ((Date.now() - t0) / N).toFixed(1));
console.log(kinds);
// every world deals a story from the four decks (src/game/tales.js)
console.log('dealt stories', tales.length, 'with battles', tales.filter((t) => t.battles).length, 'odd hands', tales.filter((t) => t.odd.length).length, 'starts', starts);
if (N >= 100 && Object.keys(starts).filter((k) => k !== 'home').length < 3) { console.log('FAIL the stories start in too few places: ' + JSON.stringify(starts)); process.exitCode = 1; }
if (N >= 200) {
  const b = tales.filter((t) => t.battles).length / tales.length, o = tales.filter((t) => t.odd.length).length / tales.length;
  if (b < 0.65 || b > 0.88) { console.log('FAIL battles in ' + Math.round(b * 100) + '% of stories (want about 70-80%)'); process.exitCode = 1; }
  if (o < 0.02 || o > 0.25) { console.log('FAIL odd hands in ' + Math.round(o * 100) + '% of stories (want uncommon)'); process.exitCode = 1; }
  for (const k of ['structure', 'setting', 'genre', 'premise']) {
    const seen = new Set(tales.map((t) => t[k]));
    const deck = Object.keys(PA.TALES[k === 'premise' ? 'premises' : k + 's']); // (tests/decks_test.js deals every card)
    if (seen.size < Math.min(deck.length, N / 8)) { console.log('FAIL only ' + seen.size + ' ' + k + ' cards dealt in ' + N + ' worlds'); process.exitCode = 1; }
  }
}
console.log(PA.genStats);
// every NPC sheet should turn up somewhere across the generated worlds
// ready but not always placed (art/npcs/*/meta.json); GULLIVER is in your party, not on the map; the villain and
// her lackey belong to the classic story, which is only carried on from old saves
const reserve = new Set((global.PA_PEOPLE.reserve || []).concat(['gulliver', 'prejudice_boss', 'grunt_f']));
const unused = Object.keys(people).filter((k) => !seenPeople.has(k) && !reserve.has(k));
if (N >= 50 && unused.length) { console.log('FAIL NPC sheets never placed: ' + unused.join(', ')); process.exitCode = 1; }
// a tile changed after generation is re-dressed (GameMap.set marks the map; OW.draw calls PA.redress)
{
  const m = PA.genWorld('REDRESS').maps.overworld;
  let x = 0, y = 0;
  for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === PA.T.tree && m.tiles[i + 1] === PA.T.tree) { x = i % m.w; y = (i / m.w) | 0; break; }
  m.set(x, y, 'white', 'grass', PA.C.WALK);
  if (!m.vqStale) { console.log('FAIL GameMap.set did not mark a dressed map for re-dressing'); process.exitCode = 1; }
  PA.redress(m);
  const [a, k] = PA.vqAt(m, x, y);
  const grass = [global.PA_WORLD_TILES.names.grass, global.PA_WORLD_TILES.names.grass_alt];
  if (m.vqStale || !grass.includes(a[k] >> 2)) { console.log('FAIL re-dressing did not draw the new grass at ' + x + ',' + y); process.exitCode = 1; }
}
if (PA.furnishMissing.size) { console.log('FAIL the interior tileset has no ' + [...PA.furnishMissing].join(', ') + ' (src/game/rooms.js asks for it)'); process.exitCode = 1; }
if (PA.dressMissing.size) { console.log('FAIL the overworld tileset has no ' + [...PA.dressMissing].join(', ') + ' (src/game/dress.js asks for it)'); process.exitCode = 1; }
if (fails) process.exitCode = 1;
// a seed is a seed: the same world again after other worlds were made in between (Continue rebuilds from it)
{
  const print = (w) => JSON.stringify([Object.keys(w.maps).sort(), w.doors, w.vars, w.quest.tale]);
  const first = print(PA.genWorld('SAME-AGAIN'));
  PA.genWorld('SOMETHING-ELSE');
  if (print(PA.genWorld('SAME-AGAIN')) !== first) { console.log('FAIL the same seed built a different world the second time'); process.exitCode = 1; }
}
// signposts keep their distance: none within two tiles of another
for (let i = 0; i < 40; i++) {
  const ow = PA.genWorld('SIGNS' + i).maps.overworld;
  for (const a of ow.signs) for (const b of ow.signs) if (a !== b && Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2) { console.log('FAIL signposts at ' + a.x + ',' + a.y + ' and ' + b.x + ',' + b.y + ' are crowded (SIGNS' + i + ')'); process.exitCode = 1; }
}
