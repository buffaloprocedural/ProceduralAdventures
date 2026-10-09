// Procedural Adventures - dungeons (cave / forest), encounter tables, trainer teams
'use strict';
(function (PA) {
  const C = PA.C, T = PA.T;

  // ---------------------------------------------------------------- species pools
  // [creature, weight]: who lives where (src/game/roster.js). GULLET is never wild - there is only one GULLIVER.
  const pool = (list) => list.map(([n, w]) => [PA.sid(n), w]);
  PA.POOLS = {
    field: pool([['DUSTDASH', 10], ['DUNEKIT', 9], ['MARGLEAF', 8], ['EMBERWREN', 8], ['RIPTABBY', 7], ['PUFFLUKE', 7], ['MOSSAPO', 6],
      ['SUCCESSGOAT', 5], ['SERVOLT', 5], ['PLATYPULSE', 5], ['PINKADILLO', 4], ['LUMIKIT', 4], ['HEXKIT', 4], ['IRONPURR', 3],
      ['LORISLURK', 3], ['MONOCAT', 3], ['GLASSPRITE', 2], ['PYRACAL', 2], ['PRISMMER', 2], ['HOARFOWL', 1],
      ['SHOWMEER', 6], ['BURROWL', 5], ['KITEFOX', 4], ['DANDYGLIDE', 4], ['MAGPLATE', 3], ['PETALPOCA', 3], ['MELEEFITE', 3],
      ['COOLCARRION', 2], ['GEMSTOAT', 2], ['VOLTALOTL', 2]]),
    cave: pool([['MONOCAT', 9], ['IRONPURR', 7], ['POTOOM', 5], ['CROYGEL', 5], ['GLUMPH', 4], ['DUNEKIT', 4], ['LORISLURK', 3],
      ['HEXKIT', 3], ['SHOEBOLT', 2], ['YAMMERS', 2], ['GEMSTOAT', 6], ['MAGPLATE', 3], ['BURROWL', 3],
      ['COOLCARRION', 2]]),
    forest: pool([['MARGLEAF', 8], ['MOSSAPO', 8], ['FOSSIRE', 6], ['LORISLURK', 5], ['POTOOM', 5], ['EMBERWREN', 4], ['HEXKIT', 3],
      ['GLASSPRITE', 3], ['SUCCESSGOAT', 3], ['SERVOLT', 2], ['HOARFOWL', 2], ['DANDYGLIDE', 5], ['MELEEFITE', 5],
      ['PETALPOCA', 3], ['COOLCARRION', 3], ['KITEFOX', 2]]),
    glade: pool([['BLIZZPARD', 2], ['HOARFOWL', 3], ['PRISMMER', 4], ['LUMIKIT', 4], ['YAMMERS', 3], ['SHOEBOLT', 2], ['PYRACAL', 3],
      ['SUCCESSGOAT', 3], ['GLASSPRITE', 3], ['FOSSIRE', 2], ['PINKADILLO', 3], ['PLATYPULSE', 2], ['VOLTALOTL', 3], ['PETALPOCA', 2], ['KITEFOX', 3],
      ['GEMSTOAT', 2]]),
  };
  // every creature the wild and the trainers may use
  const ALL_IDS = [];
  for (let id = 1; id <= window.PA_DATA.species.length; id++) if (!PA.LEGENDARY.includes(id) && id !== PA.sid('GULLET')) ALL_IDS.push(id);
  PA.TYPE_SPECIES = (type) => ALL_IDS.filter((id) => PA.species(id).t.includes(type));

  function table(rng, pool, n, lvMin, lvMax, exclude, rate) {
    const p = pool.filter(([id]) => !(exclude && exclude(id)));
    const list = [];
    const chosen = new Set();
    for (let i = 0; i < 40 && list.length < n; i++) {
      const id = rng.pickW(p.map((x) => [x[0], x[1]]));
      if (chosen.has(id)) continue;
      chosen.add(id);
      const w = p.find((x) => x[0] === id)[1];
      list.push([id, lvMin, lvMax, w]);
    }
    return { rate: rate || 0.11, list };
  }
  PA.genEncounters = function (world, rng) {
    const q = world.quest;
    const excl = q.kind === 'type' ? (id) => PA.species(id).t.includes(q.type) : null;
    const LV = { 1: [2, 5], 2: [6, 10], 3: [10, 13] };
    world.zones.forEach((z, zi) => {
      if (z.kind === 'route') { const [a, b] = LV[z.n]; z.enc = table(rng, PA.POOLS.field, z.n === 1 ? 4 : 6, a, b, excl); }
      if (z.kind === 'gate') z.enc = table(rng, PA.POOLS.field, 5, 11, 14, excl);
      if (z.kind === 'glade') z.enc = table(rng, PA.POOLS.glade, 5, 8, 12, excl, 0.14);
      if (z.kind === 'passage' && !world.maps.tunnel) z.enc = table(rng, PA.POOLS.field, 4, 2, 4, excl); // the wood or marsh out of the hamlet
    });
    if (world.maps.tunnel) world.maps.tunnel.encounters = table(rng, PA.POOLS.cave, 4, 2, 5, excl); // or its cave or crypt
  };
  PA.rollEncounter = function (enc, rng) {
    const id0 = rng.pickW(enc.list.map((e) => [e, e[3]]));
    const lv = rng.int(id0[1], id0[2]);
    return { id: id0[0], lv };
  };

  // ---------------------------------------------------------------- teams
  PA.makeTeam = function (rng, types, n, lvMin, lvMax, fallbackPool) {
    const team = [];
    const valid = types.filter((t) => PA.TYPES.includes(t));
    for (let i = 0; i < n; i++) {
      const lv = rng.int(lvMin, lvMax);
      let id;
      const t = valid.length ? rng.pick(valid) : null;
      const cands = t ? ALL_IDS.filter((x) => PA.species(x).t.includes(t) && PA.bst(x) < 420) : [];
      if (cands.length && rng.chance(0.85)) id = rng.pick(cands);
      else id = rng.pickW((fallbackPool || PA.POOLS.field).map((x) => [x[0], x[1]]));
      team.push([id, lv]);
    }
    return team;
  };

  // ---------------------------------------------------------------- dungeons
  PA.genDungeon = function (world, rng) {
    const q = world.quest;
    const m = world.slots.mouth;
    if (q.dungeon === 'cave') {
      const f1 = cave(rng.sub('f1'), 'dungeon1', 30, 26, 'cave', world.names.mount);
      const f2 = cave(rng.sub('f2'), 'dungeon2', 30, 26, 'caveDeep', world.names.mount + ' B1F');
      if (!f1 || !f2) { world.dungeonCheck = () => false; return; }
      world.maps.dungeon1 = f1.map; world.maps.dungeon2 = f2.map;
      // overworld mouth <-> f1 entrance
      world.maps.overworld.warps.push({ x: m.x, y: m.y, to: 'dungeon1', tx: f1.entry[0], ty: f1.entry[1] - 1, dir: 'up' });
      f1.map.warps.push({ x: f1.entry[0], y: f1.entry[1], to: 'overworld', tx: m.front[0], ty: m.front[1], dir: m.dir === 'up' ? 'down' : 'up', exit: true });
      f1.map.warps.push({ x: f1.far[0], y: f1.far[1], to: 'dungeon2', tx: f2.entry[0], ty: f2.entry[1] - 1, dir: 'up' });
      f2.map.warps.push({ x: f2.entry[0], y: f2.entry[1], to: 'dungeon1', tx: f1.far[0], ty: f1.far[1] + 1, dir: 'down' });
      f1.map.set(f1.far[0], f1.far[1], 'cladder', 'cave', C.WARP);
      f2.map.set(f2.entry[0], f2.entry[1], 'cladder', 'caveDeep', C.WARP);
      f1.map.set(f1.entry[0], f1.entry[1], 'cladder', 'cave', C.WARP);
      world.dungeon = { floors: [f1, f2], boss: f2.far, bossMap: 'dungeon2' };
      // boss platform
      const [bx, by] = f2.far;
      for (let y = by - 1; y <= by + 1; y++) for (let x = bx - 1; x <= bx + 1; x++) if (f2.map.collAt(x, y) === C.CAVE) f2.map.set(x, y, 'craised', 'caveDeep', C.WALK);
      const enc1 = enc(world, rng, 12, 15), enc2 = enc(world, rng, 14, 17);
      f1.map.encounters = enc1; f2.map.encounters = enc2;
      world.dungeonCheck = () => {
        const r1 = PA.reach(f1.map, f1.entry[0], f1.entry[1] - 1, true);
        const r2 = PA.reach(f2.map, f2.entry[0], f2.entry[1] - 1, true);
        return r1[f1.map.i(f1.far[0], f1.far[1])] && r2[f2.map.i(bx, by + 1)];
      };
    } else {
      const f = forest(rng.sub('forest'), 'dungeon1', 34, 42, world.names.wood);
      world.maps.dungeon1 = f.map;
      world.maps.overworld.warps.push({ x: m.x, y: m.y, to: 'dungeon1', tx: f.entry[0], ty: f.entry[1] - 1, dir: 'up' });
      f.map.warps.push({ x: f.entry[0], y: f.entry[1], to: 'overworld', tx: m.front[0], ty: m.front[1], dir: m.dir === 'up' ? 'down' : 'up', exit: true });
      world.dungeon = { floors: [f], boss: f.far, bossMap: 'dungeon1' };
      f.map.encounters = enc(world, rng, 12, 16);
      world.dungeonCheck = () => {
        const r = PA.reach(f.map, f.entry[0], f.entry[1] - 1, true);
        return r[f.map.i(f.far[0], f.far[1] + 1)];
      };
    }
  };
  function enc(world, rng, a, b) {
    const q = world.quest;
    const pool = (q.dungeon === 'cave' ? PA.POOLS.cave : PA.POOLS.forest).slice();
    let ex = null;
    if (q.kind === 'type') {
      ex = (id) => PA.species(id).t.includes(q.type);
      const t = table(rng, pool, 4, a, b, ex, q.dungeon === 'cave' ? 0.09 : 0.12);
      const special = PA.TYPE_SPECIES(q.type);
      // make the quest type plentiful here
      for (const id of rng.shuffle(special).slice(0, 3)) t.list.push([id, a, b, 7]);
      return t;
    }
    return table(rng, pool, 5, a, b, null, q.dungeon === 'cave' ? 0.08 : 0.12);
  }

  PA._cave = (...a) => cave(...a);
  function cave(rng, id, W, H, pal, name) {
    for (let attempt = 0; attempt < 30; attempt++) {
      let g = new Uint8Array(W * H);
      const I = (x, y) => y * W + x;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[I(x, y)] = (x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || rng.chance(0.38)) ? 1 : 0;
      for (let it = 0; it < 5; it++) {
        const n = new Uint8Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) { n[I(x, y)] = 1; continue; }
          let c = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[I(x + dx, y + dy)]) c++;
          n[I(x, y)] = c >= 5 || (it < 2 && c <= 1) ? 1 : 0;
        }
        g = n;
      }
      // keep the largest region
      const lab = new Int32Array(W * H).fill(-1);
      let best = -1, bestN = 0, cur = 0;
      for (let s = 0; s < W * H; s++) {
        if (g[s] || lab[s] >= 0) continue;
        let cnt = 0; const st = [s]; lab[s] = cur;
        while (st.length) { const p = st.pop(); cnt++; const x = p % W, y = (p / W) | 0; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { const k = I(nx, ny); if (!g[k] && lab[k] < 0) { lab[k] = cur; st.push(k); } } }
        if (cnt > bestN) { bestN = cnt; best = cur; }
        cur++;
      }
      if (bestN < W * H * 0.24) continue;
      for (let s = 0; s < W * H; s++) if (!g[s] && lab[s] !== best) g[s] = 1;
      // entry: a dead-end nook carved below the lowest floor tile near the middle
      let entry = null;
      for (let y = H - 3; y > H / 2 && !entry; y--) {
        const xs = []; for (let x = 3; x < W - 3; x++) if (!g[I(x, y)] && g[I(x, y + 1)] && g[I(x - 1, y + 1)] && g[I(x + 1, y + 1)]) xs.push(x);
        if (xs.length) { const x = xs.reduce((a, b) => (Math.abs(b - W / 2) < Math.abs(a - W / 2) ? b : a)); entry = [x, y + 1]; g[I(x, y + 1)] = 0; }
      }
      if (!entry) continue;
      // farthest tile by BFS
      const dist = new Int32Array(W * H).fill(-1);
      const qq = [I(entry[0], entry[1])]; dist[qq[0]] = 0;
      let far = qq[0];
      while (qq.length) { const p = qq.shift(); const x = p % W, y = (p / W) | 0; if (dist[p] > dist[far]) far = p; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { const k = I(nx, ny); if (!g[k] && dist[k] < 0) { dist[k] = dist[p] + 1; qq.push(k); } } }
      // prefer a far tile that has floor below it (so it can be approached from the south)
      let farP = null, bd = -1;
      for (let s = 0; s < W * H; s++) {
        if (g[s] || dist[s] < 0) continue;
        const x = s % W, y = (s / W) | 0;
        if (g[I(x, y + 1)] || g[I(x - 1, y)] && g[I(x + 1, y)]) continue;
        if (y + 1 === entry[1] && x === entry[0]) continue;
        let nb = 0; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (!g[I(nx, ny)]) nb++;
        const score = dist[s] + (nb <= 2 ? 6 : 0);
        if (score > bd) { bd = score; farP = [x, y]; }
      }
      if (!farP || bd < 25) continue;
      const map = new PA.GameMap(id, W, H, { indoor: true, border: T.cwall, borderPal: pal, music: 'cave', name, graded: false });
      map.dark = true; map.dungeon = true;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (g[I(x, y)]) map.set(x, y, 'cwall', pal, C.SOLID);
        else map.set(x, y, rng.chance(0.06) ? 'cdark' : 'cfloor', pal, C.CAVE);
      }
      return { map, entry, far: farP, dist, W, H, g };
    }
    return null;
  }

  function forest(rng, id, W, H, name) {
    const BW = Math.floor(W / 2), BH = Math.floor(H / 2);
    const open = new Uint8Array(BW * BH);
    const B = (x, y) => y * BW + x;
    // maze over odd blocks
    const st = [[1, BH - 2]]; open[B(1, BH - 2)] = 1;
    const cells = [];
    while (st.length) {
      const [x, y] = st[st.length - 1];
      const nb = rng.shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]]).filter(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 1 && ny >= 1 && nx < BW - 1 && ny < BH - 1 && !open[B(nx, ny)];
      });
      if (!nb.length) { st.pop(); continue; }
      const [dx, dy] = nb[0];
      open[B(x + dx / 2, y + dy / 2)] = 1; open[B(x + dx, y + dy)] = 1;
      st.push([x + dx, y + dy]); cells.push([x + dx, y + dy]);
    }
    // braid: knock out some walls for loops
    for (let i = 0; i < 18; i++) {
      const x = rng.int(1, BW - 2), y = rng.int(1, BH - 2);
      if (open[B(x, y)]) continue;
      if ((open[B(x - 1, y)] && open[B(x + 1, y)]) || (open[B(x, y - 1)] && open[B(x, y + 1)])) open[B(x, y)] = 1;
    }
    // clearing at the top
    const cx = Math.floor(BW / 2);
    for (let y = 1; y <= 3; y++) for (let x = cx - 2; x <= cx + 2; x++) open[B(x, y)] = 1;
    open[B(cx, 4)] = 1;
    // ensure the clearing connects: carve down until hitting an open block
    for (let y = 4; y < BH - 1; y++) { if (open[B(cx, y + 1)] && y > 4) break; open[B(cx, y)] = 1; }
    const map = new PA.GameMap(id, BW * 2, BH * 2, { indoor: true, border: T.btree_00, borderPal: 'forest', music: 'forest', name, graded: true });
    map.dungeon = true;
    for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        const x = bx * 2 + sx, y = by * 2 + sy;
        if (open[B(bx, by)]) {
          const r = rng.next();
          if (r < 0.2 && by > 4) map.set(x, y, 'ftall', 'forest', C.GRASS);
          else map.set(x, y, 'ffloor', 'forest', C.WALK);
        } else map.set(x, y, 'btree_' + sx + sy, 'forest', C.SOLID);
      }
    }
    // tall grass patches
    for (let i = 0; i < 14; i++) {
      const x = rng.int(2, map.w - 3), y = rng.int(10, map.h - 4);
      for (let k = 0; k < 6; k++) {
        const xx = x + rng.int(-1, 1), yy = y + rng.int(-1, 1);
        if (map.collAt(xx, yy) === C.WALK) map.set(xx, yy, 'ftall', 'forest', C.GRASS);
      }
    }
    // entry at the bottom of block (1, BH-2)
    const ex = 2, ey = map.h - 3;
    for (let y = ey; y < map.h; y++) { map.set(ex, y, 'ffloor', 'forest', C.WALK); map.set(ex + 1, y, 'ffloor', 'forest', C.WALK); }
    map.set(ex, map.h - 1, 'black', 'forest', C.WARP);
    map.set(ex + 1, map.h - 1, 'black', 'forest', C.SOLID);
    const far = [cx * 2, 3];
    for (let y = 2; y <= 6; y++) for (let x = cx * 2 - 4; x <= cx * 2 + 5; x++) if (map.collAt(x, y) !== C.SOLID) map.set(x, y, (x + y) % 5 === 0 ? 'flower' : 'ffloor', (x + y) % 5 === 0 ? 'flowerY' : 'forest', C.WALK);
    map.dark = false;
    return { map, entry: [ex, map.h - 1], far, W: map.w, H: map.h };
  }
})(window.PA);
