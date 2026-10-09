// Every room in the interior tileset (src/game/rooms.js): the player's two floors, the rival's house, the
// lab, the library, the clinic, the shop, the ASSEMBLY ROOMS and a few townsfolk's houses, from where you
// come in. Screenshots go to tests/shots_rooms; exits non-zero on page errors or a room that isn't furnished.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots_rooms');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 700, height: 700 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => window.PA && window.PA.booted);
  for (const seed of ['S1', 'S0']) {
    const rooms = await p.evaluate((s) => {
      PA.audio.muted = true; PA.scripts.length = 0;
      PA.state = PA.newState(s); PA.genAndInstall(s);
      PA.state.name = 'ELIZA'; PA.state.rival = 'FITZ';
      PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'ELIZA', RIVAL: 'FITZ' });
      Object.assign(PA.state.flags, { coldOpen: true, act1: true, labIntro: true, profStop: true, starter: true, rival1: true, quest: true });
      PA.replaceAll(PA.ow.scene);
      const ids = Object.keys(PA.world.maps).filter((id) => PA.world.maps[id].indoor && !PA.world.maps[id].dungeon);
      const houses = ids.filter((id) => id.startsWith('house')).slice(0, 3);
      return ids.filter((id) => !id.startsWith('house') && !/town3/.test(id)).concat(houses).map((id) => {
        const m = PA.world.maps[id];
        const w = PA.world.maps.overworld.warps.find((x) => x.to === id); // where you come in
        return w ? [id, w.tx, w.ty - 1, 'up'] : [id, 3, 6, 'up']; // the bedroom: where a new game starts
      });
    }, seed);
    for (const [id, x, y, dir] of rooms) {
      await p.evaluate(([id, x, y, dir]) => {
        PA.scripts.length = 0; PA.replaceAll(PA.ow.scene); PA.ow.enterMap(id, x, y, dir);
        PA.scripts.length = 0; while (PA.top() && PA.top() !== PA.ow.scene) PA.pop(PA.top());
      }, [id, x, y, dir]);
      await p.waitForTimeout(150);
      const ok = await p.evaluate(() => !!(PA.ow.map.vq && PA.ow.map.vo && !PA.ow.map.roomProblems.length));
      if (!ok) errs.push(seed + ' ' + id + ': not furnished');
      await p.locator('#screen').screenshot({ path: path.join(OUT, seed + '_' + id + '.png') });
    }
  }
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
