// Loads the game into Node, without a browser: every script index.html loads, in the same order (bar main.js).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = global;
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => ({}) }), addEventListener() {}, body: { classList: { add() {}, contains() { return false; } } } };
global.addEventListener = () => {};
global.localStorage = { getItem: () => null, setItem() {} };
global.navigator = { maxTouchPoints: 0 };
global.location = { search: '' };
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((f) => f !== 'src/main.js');
for (const f of files) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  try { (0, eval)(code); } catch (e) { console.error('load fail', f, e); process.exit(1); }
}
module.exports = global.PA;
