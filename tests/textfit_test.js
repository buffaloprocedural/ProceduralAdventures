// Node harness: every line of story text fits the screen it is shown on.
//   node tests/textfit_test.js
// The text box is 144px wide and two lines tall; a page (split by \f) may run to six lines before it drags.
// Placeholders are filled with long names, so a line that fits here fits any world.
const PA = require('./headless.js');
const D = PA.TALES, G = PA.gfx;
let fails = 0;
const bad = (where, m) => { fails++; console.log('FAIL ' + where + ': ' + m); };

const LONG = { PLAYER: 'MADISON', RIVAL: 'CLAUDETTE', MON: 'EMBERWREN', HOME: 'WILLOW CREEK', TOWN2: 'BUFFALO BEND', TOWN3: 'PRAIRIE ROSE',
  REGION: 'THE TALLGRASS', DUNGEON: 'THE STORM CELLAR', GOAL: 'GOLDEN SICKLE', ITEM: 'GOLDEN SICKLE', CLIENT: 'MRS. HALVERSON', GIVER: 'THE BLACKSMITH',
  TOKEN: 'SIGNATURE', TOKENS: 'SIGNATURES', N: '6', MOTHER: 'MUM', VIP: 'THE NEW SETTLER', ROYAL: 'THE TOWN FOUNDER', BEAST: 'BLIZZPARD',
  FOE: 'THE OLD TRAPPER', BOSS: 'THE OLD TRAPPER', SP: 'BLIZZPARD', KEEPER: 'THE SHERIFF', LEAD: 'THE SCHOOLTEACHER', LEADER: 'THE SCHOOLTEACHER',
  LAB: 'THE SCHOOLHOUSE', HALL: 'THE BARN DANCE', LIB: 'THE GENERAL STORE', SEED: 'ABC123', S1: 'COTTONWOOD', S2: 'BUFFALO BEND', S3: 'PRAIRIE ROSE',
  G: 'ROMANCE', S: 'WILLOW CREEK' };
const fill = (s) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in LONG ? LONG[k] : m));
const EXPANDS = new Set(['⒧']);

function check(where, s) {
  if (/\n/.test(s)) bad(where, 'has a stray newline: "' + s.slice(0, 60) + '..."');
  const missing = [...new Set([...s].filter((c) => !/[\s\f]/.test(c) && !EXPANDS.has(c) && !G.hasGlyph(c)))];
  if (missing.length) bad(where, 'uses letters the font lacks: ' + missing.join(' '));
  const pages = PA.wrap(fill(s));
  const tall = Math.max(...pages.map((p) => p.length));
  if (tall > 6) bad(where, 'a page runs to ' + tall + ' lines: "' + s.slice(0, 60) + '..."');
}
function walk(v, at, fn) {
  if (typeof v === 'string') return fn(at, v);
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, at + '[' + i + ']', fn));
  if (v && typeof v === 'object') for (const k in v) walk(v[k], at + '.' + k, fn);
}
walk(D, 'TALES', (at, s) => { if (/\s/.test(s)) check(at, s); });
walk(PA.Lines, 'Lines', (at, s) => { if (/\s/.test(s) && !/^Lines\.PROF\b/.test(at)) check(at, s); });

// the bag shows two lines of an item's description
const names = Object.keys(PA.ITEMS).concat(['WORLD MAP', 'ALMANAC', 'MUSIC BOX', 'INVITATION']);
for (const P of Object.values(D.premises)) if (P.goal && P.goal.noun) names.push(P.goal.noun);
for (const S of Object.values(D.settings)) names.push(...(S.lost || []));
for (const n of names) {
  const d = PA.itemInfo(n).desc || '';
  const p = PA.wrap(d);
  if (p.length > 1 || p[0].length > 2) bad('item ' + n, 'the description "' + d + '" is more than two lines');
}

// episode titles: three lines at 19 columns, with the longest goal and the longest town the decks can deal
const longest = (xs) => xs.reduce((a, b) => (G.textWidth(b) > G.textWidth(a) ? b : a), '');
const goal = PA.title(longest(Object.values(D.premises).map((P) => P.goal.noun)));
const town = PA.title(longest(Object.values(D.settings).map((S) => S.towns[0])));
for (const [id, Gc] of Object.entries(D.genres)) {
  for (const t of Gc.titles) {
    const s = '"' + PA.fmt(t, { G: goal, S: town }) + ' (Somehow)"';
    if (PA.wrap(s, 19)[0].length > 3) bad('genre ' + id, 'the title "' + t + '" runs past three lines with long names');
  }
  for (const a of Gc.acts) if (PA.wrap(a.join(' '), 19)[0].length > 3) bad('genre ' + id, 'the act card "' + a.join(' ') + '" runs past three lines');
}
console.log(fails ? fails + ' FAILURES' : 'TEXT FITS');
if (fails) process.exitCode = 1;
