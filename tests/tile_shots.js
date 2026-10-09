// The overworld tileset (art/tiles, drawn by src/game/dress.js) everywhere it appears: every building door,
// ponds, ledges, the glade, the dungeon gate and both dungeon floors, for a cave seed and a forest seed, in
// daylight and at dusk. Screenshots go to tests/shots_tiles; exits non-zero on page errors or failed checks.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots_tiles');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 700, height: 700 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => window.PA && window.PA.booted); // boot fails without the tileset
  const dungeons = new Set();
  for (const seed of ['S1', 'S0']) {
    const spots = await p.evaluate((s) => {
      PA.audio.muted = true;
      PA.scripts.length = 0;
      PA.state = PA.newState(s); PA.genAndInstall(s);
      PA.state.name = 'ELIZA'; PA.state.rival = 'FITZ';
      PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'ELIZA', RIVAL: 'FITZ' });
      Object.assign(PA.state.flags, { coldOpen: true, act1: true, labIntro: true, profStop: true, starter: true, rival1: true });
      PA.replaceAll(PA.ow.scene);
      const w = PA.world, out = [];
      // the nearest cell you could really stand on (spots are picked near a feature, not on it)
      const stand = (map, x, y) => {
        const m = w.maps[map], ok = (c) => c === PA.C.WALK || c === PA.C.GRASS || c === PA.C.CAVE;
        for (let r = 0; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === r && ok(m.collAt(x + dx, y + dy))) return [x + dx, y + dy];
        }
        return null;
      };
      const at = (name, map, x, y) => { const s = stand(map, x, y); out.push(s ? [name, map, s[0], s[1]] : [name, map, x, y, 'nowhere to stand']); };
      for (const k of Object.keys(w.doors)) at(k.replace(/:/g, '_'), 'overworld', w.doors[k].x, w.doors[k].y + 2);
      for (const c of w.cells) if (c.pond) at('pond' + c.i, 'overworld', c.pond.x + 1, c.pond.y + c.pond.h);
      for (const c of w.cells) if (c.ledges) at('ledge' + c.i, 'overworld', c.ledges[0].x + 1, c.ledges[0].y + 1);
      for (const c of w.cells) if (c.kind === 'glade') at('glade', 'overworld', c.x0 + 12, c.y0 + 10);
      const m = w.slots.mouth;
      at('gate', 'overworld', m.front[0], m.front[1]);
      const e = w.maps.dungeon1.warps.find((x) => x.exit);
      out.push(['dungeon1', 'dungeon1', e.x, e.y - 1]); // where the game puts you (a cave floor)
      if (w.maps.dungeon2) at('dungeon2', w.dungeon.bossMap, w.dungeon.boss[0], w.dungeon.boss[1] + 2);
      return { spots: out, dungeon: w.quest.dungeon };
    }, seed);
    dungeons.add(spots.dungeon);
    for (const [tod, list] of [['day', spots.spots], ['dusk', spots.spots.filter((s) => /playerHouse|gate|glade/.test(s[0]))]]) {
      await p.evaluate((t) => { PA.gfx.tod = t; }, tod);
      for (const [name, map, x, y, bad] of list) {
        if (bad) errs.push(seed + ' ' + name + ': ' + bad);
        await p.evaluate(([map, x, y]) => {
          PA.scripts.length = 0; PA.replaceAll(PA.ow.scene); PA.ow.enterMap(map, x, y, 'down');
          PA.scripts.length = 0; while (PA.top() && PA.top() !== PA.ow.scene) PA.pop(PA.top());
        }, [map, x, y]);
        await p.waitForTimeout(150);
        const ok = await p.evaluate(() => !!PA.ow.map.vq);
        if (!ok) errs.push(seed + ' ' + name + ': map is not dressed');
        await p.locator('#screen').screenshot({ path: path.join(OUT, seed + '_' + tod + '_' + name + '.png') });
      }
    }
    await p.evaluate(() => { PA.gfx.tod = 'day'; });
  }
  if (!dungeons.has('cave') || !dungeons.has('forest')) errs.push('expected one cave seed and one forest seed, got ' + [...dungeons]);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
