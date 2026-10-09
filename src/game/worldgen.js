// Procedural Adventures - procedural world generation
'use strict';
(function (PA) {
  const C = PA.C, T = PA.T;
  const CW = 24, CH = 20, GW = 6, GH = 6;
  PA.CELL = { CW, CH, GW, GH };

  // ---------------------------------------------------------------- names
  PA.genNames = function (rng) {
    const P = window.PA_DATA.austen.places;
    const townPool = ['LONGBOURN', 'MERYTON', 'LAMBTON', 'HUNSFORD', 'KYMPTON', 'BAKEWELL', 'BARNET', 'HATFIELD', 'STOKE',
      'BROMLEY', 'ELTHAM', 'WESTERHAM', 'RAMSGATE', 'MATLOCK', 'EPSOM', 'CLAPHAM', 'MARGATE', 'ASHWORTH'];
    const towns = rng.shuffle(townPool).slice(0, 3);
    const estate = rng.pick(['PEMBERLEY', 'ROSINGS', 'NETHERFIELD']);
    const regionPool = ['HERTFORDSHIRE', 'DERBYSHIRE', 'KENT', 'NETHERSHIRE', 'AUSTENSHIRE', 'BENNETSHIRE', 'MERRYSHIRE'];
    const region = rng.pick(regionPool);
    const mount = rng.pick(['OAKHAM MOUNT', 'DOVEDALE PEAK', 'MATLOCK TOR', 'STOKE CRAGS', 'BLENHEIM HILL']);
    const wood = rng.pick(['PEMBERLEY WOODS', 'ROSINGS PARK', 'NETHERFIELD WOOD', 'HAYE PARK', 'KYMPTON COPSE']);
    return { towns, estate, region, mount, wood, used: P.length };
  };

  // ---------------------------------------------------------------- helpers
  function neighbours(x, y) { return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]; }
  // A* on a cost function; returns list of [x,y]
  function astar(sx, sy, tx, ty, inside, cost) {
    const key = (x, y) => x + ',' + y;
    const open = [[0, sx, sy]];
    const g = new Map([[key(sx, sy), 0]]);
    const came = new Map();
    let guard = 0;
    while (open.length && guard++ < 20000) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, x, y] = open.splice(bi, 1)[0];
      if (x === tx && y === ty) {
        const path = [[x, y]];
        let k = key(x, y);
        while (came.has(k)) { const p = came.get(k); path.push(p); k = key(p[0], p[1]); }
        return path.reverse();
      }
      for (const [nx, ny] of neighbours(x, y)) {
        if (!inside(nx, ny)) continue;
        const c = cost(nx, ny);
        if (c === Infinity) continue;
        const ng = g.get(key(x, y)) + c;
        if (ng < (g.has(key(nx, ny)) ? g.get(key(nx, ny)) : Infinity)) {
          g.set(key(nx, ny), ng);
          came.set(key(nx, ny), [x, y]);
          open.push([ng + Math.abs(nx - tx) + Math.abs(ny - ty), nx, ny]);
        }
      }
    }
    return null;
  }
  PA.astar = astar;
  // cheap value noise
  function noiseField(rng, w, h, scale) {
    const gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2;
    const grid = []; for (let i = 0; i < gw * gh; i++) grid.push(rng.next());
    return (x, y) => {
      const fx = x / scale, fy = y / scale; const ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy;
      const v = (a, b) => grid[(b) * gw + a];
      const s = (t) => t * t * (3 - 2 * t);
      const a = v(ix, iy) * (1 - s(tx)) + v(ix + 1, iy) * s(tx);
      const b = v(ix, iy + 1) * (1 - s(tx)) + v(ix + 1, iy + 1) * s(tx);
      return a * (1 - s(ty)) + b * s(ty);
    };
  }

  // ---------------------------------------------------------------- coarse layout
  function layout(rng, plan) {
    const total = plan.reduce((a, p) => a + p.cells, 0);
    const used = new Map();
    const seq = [];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let tries = 0;
    function dfs(x, y, idx, sub, lastDir) {
      if (++tries > 4000) return false;
      used.set(x + ',' + y, seq.length);
      const zi = idx;
      seq.push({ cx: x, cy: y, zone: zi, sub });
      if (seq.length === total) return true;
      let nIdx = idx, nSub = sub + 1;
      if (nSub >= plan[idx].cells) { nIdx = idx + 1; nSub = 0; }
      let order = rng.shuffle(dirs);
      if (lastDir && plan[nIdx].kind === 'route' && nSub > 0 && rng.chance(0.65)) order = [lastDir].concat(order.filter((d) => d !== lastDir));
      for (const d of order) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || used.has(nx + ',' + ny)) continue;
        if (dfs(nx, ny, nIdx, nSub, d)) return true;
      }
      used.delete(x + ',' + y);
      seq.pop();
      return false;
    }
    const sx = rng.int(0, GW - 1), sy = rng.int(0, GH - 1);
    if (!dfs(sx, sy, 0, 0, null)) return null;
    return { seq, used };
  }

  // ---------------------------------------------------------------- world
  // signposts keep their distance: none within two tiles of another (diagonals count), or a street feels like a noticeboard
  const signNear = (ow, x, y) => ow.signs.some((s) => Math.abs(s.x - x) <= 2 && Math.abs(s.y - y) <= 2);

  PA.genWorld = function (seed) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const w = tryGen(seed, attempt);
      if (w) { w.attempt = attempt; return w; }
    }
    throw new Error('world generation failed for seed ' + seed);
  };

  function tryGen(seed, attempt) {
    const rng = new PA.RNG(seed + '#' + attempt);
    const world = { seed, maps: {}, cells: [], doors: {}, slots: {}, names: PA.genNames(rng.sub('names')) };
    world.quest = PA.genQuest(rng.sub('quest'), world);
    const plan = [
      { kind: 'town', role: 'home', cells: 1 },
      { kind: 'route', n: 1, cells: rng.int(1, 2) },
      { kind: 'town', role: 'town2', cells: 1 },
      { kind: 'route', n: 2, cells: 2 },
      { kind: 'town', role: 'town3', cells: 1 },
      { kind: 'route', n: 3, cells: rng.int(1, 2) },
      { kind: 'gate', cells: 1 },
    ];
    world.plan = plan;
    const lay = layout(rng.sub('layout'), plan);
    const fail = (r) => { PA.genStats = PA.genStats || {}; PA.genStats[r] = (PA.genStats[r] || 0) + 1; return null; };
    if (!lay) return fail('layout');
    const ow = new PA.GameMap('overworld', GW * CW, GH * CH, { name: world.names.region, music: 'route' });
    world.maps.overworld = ow;
    ow.fill(0, 0, ow.w, ow.h, 'tree', 'tree', C.SOLID);
    // cells
    const cells = lay.seq.map((s, i) => ({
      i, cx: s.cx, cy: s.cy, x0: s.cx * CW, y0: s.cy * CH, zi: s.zone, sub: s.sub,
      kind: plan[s.zone].kind, role: plan[s.zone].role, routeN: plan[s.zone].n, open: [],
    }));
    world.cells = cells;
    // optional glade off a route cell
    const gl = rng.sub('glade');
    const routeCells = cells.filter((c) => c.kind === 'route');
    for (const rc of gl.shuffle(routeCells)) {
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map((d) => [rc.cx + d[0], rc.cy + d[1]]).filter(([x, y]) => x >= 0 && y >= 0 && x < GW && y < GH && !lay.used.has(x + ',' + y));
      if (opts.length && gl.chance(0.85)) {
        const [x, y] = gl.pick(opts);
        const g = { i: cells.length, cx: x, cy: y, x0: x * CW, y0: y * CH, zi: -1, sub: 0, kind: 'glade', open: [], parent: rc.i };
        cells.push(g);
        lay.used.set(x + ',' + y, g.i);
        break;
      }
    }
    // openings between consecutive cells (and glade)
    const link = (a, b, width) => {
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      const r = rng;
      if (dx !== 0) {
        const y = r.int(5, CH - 7);
        a.open.push({ side: dx > 0 ? 'right' : 'left', pos: y, w: width, to: b.i });
        b.open.push({ side: dx > 0 ? 'left' : 'right', pos: y, w: width, to: a.i });
      } else {
        const x = r.int(5, CW - 7);
        a.open.push({ side: dy > 0 ? 'down' : 'up', pos: x, w: width, to: b.i });
        b.open.push({ side: dy > 0 ? 'up' : 'down', pos: x, w: width, to: a.i });
      }
    };
    for (let i = 1; i < lay.seq.length; i++) {
      const a = cells[i - 1], b = cells[i];
      const gateLink = b.kind === 'gate';
      link(a, b, gateLink ? 1 : a.kind === 'town' || b.kind === 'town' ? 3 : 2);
    }
    const glade = cells.find((c) => c.kind === 'glade');
    if (glade) link(cells[glade.parent], glade, 2);

    // zones (area names / music / encounters)
    const zr = rng.sub('zones');
    let routeNo = zr.int(1, 3);
    world.zones = plan.map((p, zi) => {
      if (p.kind === 'town') {
        const idx = p.role === 'home' ? 0 : p.role === 'town2' ? 1 : 2;
        return { kind: 'town', role: p.role, name: world.names.towns[idx], music: 'town' };
      }
      if (p.kind === 'route') { const n = routeNo; routeNo += zr.int(1, 3); return { kind: 'route', n: p.n, name: (world.names.route || 'ROUTE') + ' ' + n, music: 'route' }; }
      return { kind: 'gate', name: world.quest.dungeon === 'cave' ? world.names.mount : world.names.wood, music: 'route' };
    });
    if (glade) { glade.zi = world.zones.length; world.zones.push({ kind: 'glade', name: world.names.glade || PA.Lines.gladeName(zr), music: 'forest' }); }
    world.zoneTown = (role) => world.zones.findIndex((z) => z.role === role);
    world.zoneRoute = (n) => world.zones.findIndex((z) => z.kind === 'route' && z.n === n);
    ow.zones = world.zones;
    for (const c of cells) for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) ow.zone[ow.i(c.x0 + x, c.y0 + y)] = c.zi;

    // carve
    for (const c of cells) {
      const cr = rng.sub('cell' + c.i);
      if (c.kind === 'town') { if (!carveTown(world, ow, c, cr)) return fail('town'); }
      else if (c.kind === 'route') carveRoute(world, ow, c, cr);
      else if (c.kind === 'gate') { if (!carveGate(world, ow, c, cr)) return fail('gate'); }
      else if (c.kind === 'glade') carveGlade(world, ow, c, cr);
    }
    // encounter tables
    PA.genEncounters(world, rng.sub('enc'));
    // dungeon
    PA.genDungeon(world, rng.sub('dungeon'));
    // quest population (NPCs, triggers)
    PA.populateQuest(world, rng.sub('populate'));
    // validation
    const v = validate(world);
    if (v !== true) return fail('validate:' + v);
    // how it looks: the outdoor maps in the new tileset (src/game/dress.js)
    PA.dressWorld(world);
    return world;
  }

  // ---------------------------------------------------------------- cell carving basics
  function cellInterior(c, b) { return { x0: c.x0 + b, y0: c.y0 + b, x1: c.x0 + CW - 1 - b, y1: c.y0 + CH - 1 - b }; }
  function openingTiles(c, o) {
    // tiles to clear from cell edge to the interior (border thickness 2)
    const out = [];
    for (let k = 0; k < o.w; k++) {
      for (let d = 0; d < 3; d++) {
        if (o.side === 'left') out.push([c.x0 + d, c.y0 + o.pos + k]);
        if (o.side === 'right') out.push([c.x0 + CW - 1 - d, c.y0 + o.pos + k]);
        if (o.side === 'up') out.push([c.x0 + o.pos + k, c.y0 + d]);
        if (o.side === 'down') out.push([c.x0 + o.pos + k, c.y0 + CH - 1 - d]);
      }
    }
    return out;
  }
  function openingInner(c, o) { // a point just inside the cell for path routing
    const mid = Math.floor((o.w - 1) / 2);
    if (o.side === 'left') return [c.x0 + 2, c.y0 + o.pos + mid];
    if (o.side === 'right') return [c.x0 + CW - 3, c.y0 + o.pos + mid];
    if (o.side === 'up') return [c.x0 + o.pos + mid, c.y0 + 2];
    return [c.x0 + o.pos + mid, c.y0 + CH - 3];
  }
  function groundTile(ow, x, y, rng, kind) {
    const r = rng.next();
    if (kind === 'town') {
      if (r < 0.12) ow.set(x, y, 'tuft', 'grass', C.WALK); else ow.set(x, y, 'white', 'grass', C.WALK);
    } else {
      if (r < 0.18) ow.set(x, y, 'tuft', 'grass', C.WALK); else ow.set(x, y, 'white', 'grass', C.WALK);
    }
  }
  function setPath(ow, x, y) { ow.set(x, y, 'hatch', 'ground', C.WALK); }
  function isPath(ow, x, y) { return ow.tileAt(x, y) === T.hatch && PA.palName(ow.palAt(x, y)) === 'ground'; }

  // ---------------------------------------------------------------- towns
  const BUILD = {
    home: [{ s: 'house', tag: 'playerHouse' }, { s: 'house', tag: 'rivalHouse' }, { s: 'lab', tag: 'lab' }],
    town2: [{ s: 'hall', tag: 'hall' }, { s: 'clinic', tag: 'clinic' }, { s: 'shop', tag: 'shop' }, { s: 'house', tag: 'house' }, { s: 'house_small', tag: 'house' }],
    town3: [{ s: 'lab', tag: 'library' }, { s: 'clinic', tag: 'clinic' }, { s: 'shop', tag: 'shop' }, { s: 'house', tag: 'house' }, { s: 'house_small', tag: 'house' }],
  };
  // roof palettes; src/game/dress.js draws each as the tileset's roof of that colour (there is no green one).
  // The clinic is always teal and the shop blue, and the Assembly Rooms never borrow the clinic's colour.
  const ROOFS = ['roofRed', 'roofBlue', 'roofPurple', 'roofTeal', 'roofOrange'];
  function carveTown(world, ow, c, rng) {
    // the home town is a hamlet in a small clearing, and its only way out is a passage (a cave, a crypt, a wood
    // or a marsh) running from the clearing to the edge of its screen
    const home = c.role === 'home';
    const I = home ? hamletBox(c) : cellInterior(c, 2);
    const lane = home ? passageLane(c, I) : [];
    const inLane = new Set(lane.flat().map(([x, y]) => x + ',' + y));
    for (let y = I.y0; y <= I.y1; y++) for (let x = I.x0; x <= I.x1; x++) groundTile(ow, x, y, rng, 'town');
    // openings
    for (const o of c.open) for (const [x, y] of openingTiles(c, o)) groundTile(ow, x, y, rng, 'town');
    for (const [x, y] of lane.flat()) groundTile(ow, x, y, rng, 'town');
    // occupancy: 0 free, 1 building, 2 reserved
    const occ = new Map();
    const k = (x, y) => x + ',' + y;
    for (const o of c.open) {
      const [ix, iy] = openingInner(c, o);
      for (let d = -2; d <= 2; d++) for (let e = -2; e <= 2; e++) occ.set(k(ix + d, iy + e), 2);
    }
    if (lane.length) { // keep the way into the passage clear
      const [lx, ly] = lane[lane.length - 1][Math.floor((lane[0].length - 1) / 2)], [px, py] = lane[lane.length - 2][Math.floor((lane[0].length - 1) / 2)];
      for (let s = 1; s <= 2; s++) for (let e = -2; e <= 2; e++) { const x = lx + (lx - px) * s + (lx === px ? e : 0), y = ly + (ly - py) * s + (ly === py ? e : 0); occ.set(k(x, y), 2); }
    }
    const doors = [];
    const list = BUILD[c.role].slice();
    // place largest buildings first; exhaustive search over valid spots
    list.sort((p1, p2) => PA.STAMPS[p2.s].w * PA.STAMPS[p2.s].h - PA.STAMPS[p1.s].w * PA.STAMPS[p1.s].h);
    for (const b of list) {
      const S = PA.STAMPS[b.s];
      const cands = [];
      for (let y = I.y0; y <= I.y1 - S.h - 2; y++) for (let x = I.x0 + 1; x <= I.x1 - S.w; x++) {
        let ok = true;
        for (let yy = y; yy < y + S.h && ok; yy++) for (let xx = x; xx < x + S.w && ok; xx++) if (occ.get(k(xx, yy))) ok = false;
        for (let yy = y - 1; yy <= y + S.h + 1 && ok; yy++) for (let xx = x - 1; xx <= x + S.w && ok; xx++) if (occ.get(k(xx, yy)) === 1) ok = false;
        if (ok) cands.push([x, y]);
      }
      if (!cands.length) return false;
      const [x, y] = rng.pick(cands);
      const roof = b.s === 'clinic' ? 'roofTeal' : b.s === 'shop' ? 'roofOrange' : b.tag === 'hall' ? rng.pick(['roofPurple', 'roofOrange', 'roofRed']) : rng.pick(ROOFS);
      const rows = b.s === 'house' ? [roof, roof, 'wall'] : b.s === 'house_small' ? [roof, 'wall'] : [roof, roof, 'wall', 'wall'];
      const door = ow.stamp(b.s, x, y, rows, b.tag);
      for (let yy = y; yy < y + S.h; yy++) for (let xx = x; xx < x + S.w; xx++) occ.set(k(xx, yy), 1);
      occ.set(k(door.x, door.y + 1), 2); occ.set(k(door.x, door.y + 2), 2);
      for (let xx = x - 1; xx <= x + S.w; xx++) if (!occ.get(k(xx, y + S.h))) occ.set(k(xx, y + S.h), 3);
      doors.push({ tag: b.tag, stamp: b.s, x: door.x, y: door.y, bx: x, by: y, roof });
    }
    // hub and paths
    const cx = Math.floor((I.x0 + I.x1) / 2), cy = Math.floor((I.y0 + I.y1) / 2);
    let hub = null;
    for (let r = 0; r < 8 && !hub; r++) for (let t = 0; t < 30 && !hub; t++) {
      const x = cx + rng.int(-r, r), y = cy + rng.int(-r, r);
      if (!occ.get(k(x, y)) || occ.get(k(x, y)) === 3) hub = [x, y];
    }
    if (!hub) hub = [cx, cy];
    const inside = (x, y) => x >= I.x0 && x <= I.x1 && y >= I.y0 && y <= I.y1 || inLane.has(x + ',' + y) || c.open.some((o) => openingTiles(c, o).some(([a, b]) => a === x && b === y));
    const cost = (x, y) => (occ.get(k(x, y)) === 1 ? Infinity : isPath(ow, x, y) ? 1 : 3);
    const targets = doors.map((d) => [d.x, d.y + 1]).concat(c.open.map((o) => openingInner(c, o)));
    for (const [tx, ty] of targets) {
      const p = astar(hub[0], hub[1], tx, ty, inside, cost);
      if (!p) return false;
      for (const [x, y] of p) { setPath(ow, x, y); occ.set(k(x, y), 2); }
    }
    for (const o of c.open) for (const [x, y] of openingTiles(c, o)) setPath(ow, x, y);
    // decorations
    const free = [];
    for (let y = I.y0; y <= I.y1; y++) for (let x = I.x0; x <= I.x1; x++) if (!occ.get(k(x, y))) free.push([x, y]);
    const fr = rng.shuffle(free);
    let fi = 0;
    const take = () => fr[fi++];
    // flower beds
    for (let n = rng.int(2, 4); n > 0; n--) {
      const p = take(); if (!p) break;
      const w = rng.int(2, 4), h = rng.int(1, 2);
      const pal = rng.pick(['flower', 'flower', 'flowerY']);
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const x = p[0] + xx, y = p[1] + yy;
        if (!occ.get(k(x, y)) && x <= I.x1 && y <= I.y1) { ow.set(x, y, (xx + yy) % 2 ? 'flower_b' : 'flower', pal, C.WALK); occ.set(k(x, y), 4); }
      }
    }
    // fences
    for (let n = rng.int(1, 3); n > 0; n--) {
      const p = take(); if (!p) break;
      const len = rng.int(3, 6);
      for (let xx = 0; xx < len; xx++) {
        const x = p[0] + xx, y = p[1];
        if (occ.get(k(x, y)) || x > I.x1) break;
        ow.set(x, y, 'posts', 'wood', C.SOLID); occ.set(k(x, y), 5);
      }
    }
    // single trees
    for (let n = rng.int(2, 5); n > 0; n--) {
      const p = take(); if (!p) break;
      if (occ.get(k(p[0], p[1]))) continue;
      ow.set(p[0], p[1], rng.chance(0.5) ? 'tree' : 'tree_lite', 'tree', C.SOLID); occ.set(k(p[0], p[1]), 5);
    }
    // signs: town sign near the first opening path
    const zone = world.zones[c.zi];
    const signSpots = [];
    for (const d of doors) signSpots.push(d);
    const placeSign = (nearX, nearY, text) => {
      for (let r = 1; r < 5; r++) for (let t = 0; t < 20; t++) {
        const x = nearX + rng.int(-r, r), y = nearY + rng.int(-r, r);
        if (x < I.x0 || x > I.x1 || y < I.y0 || y > I.y1) continue;
        if (occ.get(k(x, y)) || signNear(ow, x, y)) continue;
        ow.set(x, y, 'sign', 'wood', C.SOLID); occ.set(k(x, y), 5);
        ow.signs.push({ x, y, text });
        return true;
      }
      return false;
    };
    const tale = PA.isTale(world) && world.quest.T.S; // a dealt story names its own buildings (src/game/tales.js)
    placeSign(hub[0], hub[1], tale ? PA.taleTownSign(rng, zone.name, c.role, world) : PA.Lines.townSign(rng, zone.name, c.role, world));
    for (const d of doors) {
      if (tale) {
        if (d.tag === 'hall') placeSign(d.x - 1, d.y + 1, tale.hall + '\nAll welcome. Mostly.');
        if (d.tag === 'library') placeSign(d.x - 1, d.y + 1, tale.lib + '\nOpen whenever you are.');
        if (d.tag === 'playerHouse') placeSign(d.x - 1, d.y + 1, '{PLAYER}\'s house');
        if (d.tag === 'rivalHouse') placeSign(d.x - 1, d.y + 1, '{RIVAL}\'s house');
        if (d.tag === 'lab') placeSign(d.x + 1, d.y + 2, tale.lab);
        continue;
      }
      if (d.tag === 'hall') placeSign(d.x - 1, d.y + 1, PA.Lines.hallSign(rng, world));
      if (d.tag === 'library') placeSign(d.x - 1, d.y + 1, 'THE CIRCULATING LIBRARY\nOpen whenever you are.');
      if (d.tag === 'playerHouse') placeSign(d.x - 1, d.y + 1, '{PLAYER}\'s house');
      if (d.tag === 'rivalHouse') placeSign(d.x - 1, d.y + 1, '{RIVAL}\'s house');
      if (d.tag === 'lab') placeSign(d.x + 1, d.y + 2, 'PROF. ' + world.quest.prof.short + '\'s\nLABORATORY');
    }
    // free tiles list for NPC placement
    c.free = [];
    for (let y = I.y0; y <= I.y1; y++) for (let x = I.x0; x <= I.x1; x++) {
      const v = occ.get(k(x, y));
      if ((!v || v === 3 || v === 2 || v === 4) && PA.walkable(ow.collAt(x, y))) c.free.push([x, y]);
    }
    c.hub = hub;
    c.doors = doors;
    for (const d of doors) {
      world.doors[c.role + ':' + d.tag + (d.tag === 'house' ? ':' + d.x : '')] = d;
    }
    // interiors
    PA.buildTownInteriors(world, ow, c, rng);
    if (home && !dressPassage(world, ow, c, lane, rng.sub('passage'))) return false;
    return true;
  }

  // ---------------------------------------------------------------- the hamlet and its passage
  // The clearing sits on the far side of the screen from the way out; the passage runs straight from the edge.
  function hamletBox(c) {
    const o = c.open[0], BW = 15, BH = 12, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    let x0, y0;
    if (o.side === 'left' || o.side === 'right') { y0 = clamp(o.pos - 5, 2, CH - 2 - BH); x0 = o.side === 'left' ? CW - 2 - BW : 2; }
    else { x0 = clamp(o.pos - 6, 2, CW - 2 - BW); y0 = o.side === 'up' ? CH - 2 - BH : 2; }
    return { x0: c.x0 + x0, y0: c.y0 + y0, x1: c.x0 + x0 + BW - 1, y1: c.y0 + y0 + BH - 1 };
  }
  function passageLane(c, I) { // lane[d] = the tiles across the way out, d tiles in from the screen's edge
    const o = c.open[0], lane = [];
    for (let d = 0; d < CW; d++) {
      const row = [];
      for (let k = 0; k < o.w; k++) {
        if (o.side === 'left') row.push([c.x0 + d, c.y0 + o.pos + k]);
        else if (o.side === 'right') row.push([c.x0 + CW - 1 - d, c.y0 + o.pos + k]);
        else if (o.side === 'up') row.push([c.x0 + o.pos + k, c.y0 + d]);
        else row.push([c.x0 + o.pos + k, c.y0 + CH - 1 - d]);
      }
      if (row.some(([x, y]) => x >= I.x0 && x <= I.x1 && y >= I.y0 && y <= I.y1)) break;
      lane.push(row);
    }
    return lane;
  }
  const PASSAGES = {
    cave: ['THE NARROW CAVE', 'THE LONG TUNNEL', 'THE BACK CAVE'],
    crypt: ['THE OLD CRYPT', 'THE UNDERCROFT', 'THE CATACOMBS'],
    forest: ['THE TANGLEWOOD', 'THE BRAMBLE WOOD', 'THE NEAR WOOD'],
    marsh: ['THE MARSH', 'THE REEDBED', 'THE BOG'],
  };
  function dressPassage(world, ow, c, lane, rng) {
    const kind = rng.pick(Object.keys(PASSAGES)), name = rng.pick(PASSAGES[kind]);
    const L = lane.length, mid = Math.floor((lane[0].length - 1) / 2);
    const inw = [lane[1][mid][0] - lane[0][mid][0], lane[1][mid][1] - lane[0][mid][1]]; // pointing into the hamlet
    const side = [Math.abs(inw[1]), Math.abs(inw[0])]; // across the lane
    const dirOf = ([dx, dy]) => (dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up');
    const zi = world.zones.length;
    world.zones.push({ kind: 'passage', name, music: kind === 'forest' || kind === 'marsh' ? 'forest' : 'cave' });
    const P = (world.slots.passage = { kind, name, rock: [] });
    const zone = (x, y) => { if (ow.inb(x, y)) ow.zone[ow.i(x, y)] = zi; };
    if (kind === 'forest' || kind === 'marsh') {
      lane.forEach((row, d) => {
        row.forEach(([x, y], k) => {
          zone(x, y);
          if (k === mid) ow.set(x, y, 'tall', 'tall', C.GRASS); // the way through
          else if (kind === 'marsh' && d > 0 && d < L - 1 && rng.chance(0.45)) ow.set(x, y, 'water', 'water', C.WATER);
          else ow.set(x, y, 'tall', 'tall', C.GRASS);
        });
        if (kind === 'marsh' && d > 0 && d < L - 1) for (const [x, y] of [[row[0][0] - side[0], row[0][1] - side[1]], [row[row.length - 1][0] + side[0], row[row.length - 1][1] + side[1]]]) {
          if (ow.inb(x, y)) { ow.set(x, y, 'water', 'water', C.WATER); zone(x, y); }
        }
      });
      const [sx, sy] = lane[Math.floor(L / 2)][mid];
      P.start = { kind, map: 'overworld', x: sx, y: sy };
      return true;
    }
    // a cave or a crypt: rock all along the lane, a mouth at each end, and a tunnel between them
    const pal = kind === 'crypt' ? 'caveDeep' : 'cave';
    const t = PA._cave(rng.sub('tunnel'), 'tunnel', 26, 20, pal, name);
    if (!t) return false;
    lane.forEach((row, d) => row.forEach(([x, y]) => {
      zone(x, y);
      if (d === 0) { setPath(ow, x, y); return; }
      ow.set(x, y, d === L - 1 ? 'mface' : 'mtop', 'mountain', C.SOLID);
      P.rock.push([x, y]);
    }));
    const [ex, ey] = lane[1][mid], [efx, efy] = lane[0][mid];
    const [tx, ty] = lane[L - 1][mid], tfx = tx + inw[0], tfy = ty + inw[1];
    ow.set(ex, ey, 'mcave', 'mountain', C.WARP); ow.set(tx, ty, 'mcave', 'mountain', C.WARP);
    setPath(ow, tfx, tfy);
    const m = t.map;
    m.set(t.entry[0], t.entry[1], 'cladder', pal, C.WARP);
    m.set(t.far[0], t.far[1], 'cladder', pal, C.WARP);
    ow.warps.push({ x: tx, y: ty, to: 'tunnel', tx: t.entry[0], ty: t.entry[1] - 1, dir: 'up' });
    m.warps.push({ x: t.entry[0], y: t.entry[1], to: 'overworld', tx: tfx, ty: tfy, dir: dirOf(inw), exit: true });
    m.escape = { x: tfx, y: tfy, dir: dirOf(inw) }; // a HACKNEY TOKEN takes you home to the hamlet
    ow.warps.push({ x: ex, y: ey, to: 'tunnel', tx: t.far[0], ty: t.far[1] + 1, dir: 'down' });
    m.warps.push({ x: t.far[0], y: t.far[1], to: 'overworld', tx: efx, ty: efy, dir: dirOf([-inw[0], -inw[1]]) });
    world.maps.tunnel = m;
    // the story starts a few steps in, somewhere with room to stand
    const W = t.W, open = (x, y) => m.collAt(x, y) === C.CAVE;
    let start = null;
    for (let want = 3; want < 12 && !start; want++) for (let s = 0; s < W * t.H && !start; s++) {
      const x = s % W, y = (s / W) | 0;
      if (t.dist[s] !== want || !open(x, y)) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(x + dx, y + dy)).length >= 3) start = [x, y];
    }
    if (!start) return false;
    P.start = { kind, map: 'tunnel', x: start[0], y: start[1] };
    // a couple of things left lying about, in the open and never in the way
    for (let i = 0, n = 0; i < 400 && n < 2; i++) {
      const s = rng.int(0, W * t.H - 1), x = s % W, y = (s / W) | 0;
      if (t.dist[s] < 8 || !open(x, y) || (x === t.far[0] && Math.abs(y - t.far[1]) < 2)) continue;
      if (Math.abs(x - start[0]) + Math.abs(y - start[1]) < 2) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(x + dx, y + dy)).length < 4) continue;
      m.setColl(x, y, C.SOLID);
      if (!tunnelThrough(m, t)) { m.setColl(x, y, C.CAVE); continue; }
      m.items.push({ x, y, item: rng.pick(['TONIC', 'TONIC', 'ANTIDOTE', 'SMELLING SALTS']), key: 'tun' + n }); n++;
    }
    P.ends = { entry: t.entry, far: t.far };
    return tunnelThrough(m, t);
  }
  function tunnelThrough(m, { entry, far }) { // the tunnel joins its two mouths
    return !!reach(m, entry[0], entry[1] - 1, true)[m.i(far[0], far[1] + 1)];
  }

  function pond(ow, x, y, w, h) {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const top = yy === 0, bot = yy === h - 1 && h > 1, l = xx === 0, r = xx === w - 1;
      let t = 'water';
      if (top) t = l ? 'water_tl' : r ? 'water_tr' : 'water_t';
      else if (bot) t = l ? 'water_bl' : r ? 'water_br' : 'water_b';
      else t = l ? 'water_l' : r ? 'water_r' : 'water';
      ow.set(x + xx, y + yy, t, 'water', C.WATER);
    }
  }
  PA.pond = pond;

  // ---------------------------------------------------------------- routes
  function carveRoute(world, ow, c, rng) {
    const I = cellInterior(c, rng.int(1, 2));
    const nf = noiseField(rng, CW, CH, 5);
    for (let y = I.y0; y <= I.y1; y++) for (let x = I.x0; x <= I.x1; x++) {
      const v = nf(x - c.x0, y - c.y0);
      if (v > 0.66) ow.set(x, y, 'hatch', 'grass', C.WALK); else groundTile(ow, x, y, rng, 'route');
    }
    for (const o of c.open) for (const [x, y] of openingTiles(c, o)) ow.set(x, y, 'hatch', 'ground', C.WALK);
    const k = (x, y) => x + ',' + y;
    const prot = new Map(); // 1 path, 2 near path, 3 used
    const inside = (x, y) => x >= I.x0 && x <= I.x1 && y >= I.y0 && y <= I.y1;
    // main path between all openings via a hub
    const pts = c.open.map((o) => openingInner(c, o));
    const hub = [rng.int(I.x0 + 3, I.x1 - 3), rng.int(I.y0 + 3, I.y1 - 3)];
    const nf2 = noiseField(rng, CW, CH, 3);
    const cost = (x, y) => 1 + nf2(x - c.x0, y - c.y0) * 6;
    const pathTiles = [];
    for (const p of pts) {
      const path = astar(p[0], p[1], hub[0], hub[1], (x, y) => inside(x, y) || (Math.abs(x - p[0]) + Math.abs(y - p[1]) < 3), cost);
      if (!path) continue;
      for (const [x, y] of path) { pathTiles.push([x, y]); }
    }
    // widen path to 2
    const widened = [];
    for (const [x, y] of pathTiles) { widened.push([x, y]); widened.push([x + 1, y]); widened.push([x, y + 1]); }
    for (const [x, y] of widened) {
      if (!inside(x, y) && !c.open.some((o) => openingTiles(c, o).some(([a, b]) => a === x && b === y))) continue;
      setPath(ow, x, y); prot.set(k(x, y), 1);
    }
    for (const o of c.open) for (const [x, y] of openingTiles(c, o)) { setPath(ow, x, y); prot.set(k(x, y), 1); }
    for (const [x, y] of widened) for (const [nx, ny] of neighbours(x, y)) if (!prot.get(k(nx, ny))) prot.set(k(nx, ny), 2);
    c.path = widened.filter(([x, y]) => inside(x, y));
    c.hub = hub;
    // tall grass blobs (some over the path, to force encounters)
    const nBlobs = rng.int(3, 5);
    for (let b = 0; b < nBlobs; b++) {
      let bx, by;
      if (b === 0 && c.path.length) { [bx, by] = rng.pick(c.path); }
      else { bx = rng.int(I.x0, I.x1); by = rng.int(I.y0, I.y1); }
      const rx = rng.int(2, 4), ry = rng.int(1, 3);
      for (let y = by - ry; y <= by + ry; y++) for (let x = bx - rx; x <= bx + rx; x++) {
        if (!inside(x, y)) continue;
        const dx = (x - bx) / (rx + 0.5), dy = (y - by) / (ry + 0.5);
        if (dx * dx + dy * dy > 1) continue;
        if (prot.get(k(x, y)) === 3) continue;
        ow.set(x, y, 'tall', 'tall', C.GRASS);
      }
    }
    // trees: clusters away from the path
    const nTrees = rng.int(5, 9);
    for (let t = 0; t < nTrees; t++) {
      const bx = rng.int(I.x0, I.x1), by = rng.int(I.y0, I.y1);
      const n = rng.int(2, 7);
      let x = bx, y = by;
      for (let i = 0; i < n; i++) {
        if (inside(x, y) && !prot.get(k(x, y))) { ow.set(x, y, rng.chance(0.75) ? 'tree' : 'tree_dark', 'tree', C.SOLID); prot.set(k(x, y), 3); }
        const d = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); x += d[0]; y += d[1];
      }
    }
    // a little pond
    if (rng.chance(0.35)) {
      for (let t = 0; t < 40; t++) {
        const w = rng.int(3, 4), h = rng.int(2, 3);
        const x = rng.int(I.x0, I.x1 - w + 1), y = rng.int(I.y0, I.y1 - h + 1);
        let ok = true;
        for (let yy = y - 1; yy <= y + h && ok; yy++) for (let xx = x - 1; xx <= x + w && ok; xx++) if (prot.get(k(xx, yy)) === 1) ok = false;
        if (!ok) continue;
        pond(ow, x, y, w, h);
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) prot.set(k(xx, yy), 3);
        c.pond = { x, y, w, h };
        break;
      }
    }
    // ledges (one-way shortcuts) — horizontal segments off the path
    if (rng.chance(0.7)) {
      for (let t = 0; t < 30; t++) {
        const len = rng.int(3, 7);
        const x = rng.int(I.x0, I.x1 - len + 1), y = rng.int(I.y0 + 2, I.y1 - 2);
        let ok = true;
        for (let xx = x; xx < x + len && ok; xx++) {
          const p = prot.get(k(xx, y));
          if (p === 1 || p === 3) ok = false;
          if (!PA.walkable(ow.collAt(xx, y - 1)) || !PA.walkable(ow.collAt(xx, y + 1))) ok = false;
        }
        if (!ok) continue;
        for (let xx = x; xx < x + len; xx++) { ow.set(xx, y, 'ledge', 'ledge', C.LEDGE); prot.set(k(xx, y), 3); }
        c.ledges = (c.ledges || []).concat([{ x, y, len }]);
        break;
      }
    }
    // flowers
    for (let n = rng.int(1, 3); n > 0; n--) {
      const x = rng.int(I.x0, I.x1), y = rng.int(I.y0, I.y1);
      const pal = rng.pick(['flower', 'flowerY']);
      for (let i = 0; i < rng.int(2, 5); i++) {
        const xx = x + (i % 3), yy = y + ((i / 3) | 0);
        if (inside(xx, yy) && !prot.get(k(xx, yy)) && ow.collAt(xx, yy) === C.WALK) ow.set(xx, yy, i % 2 ? 'flower_b' : 'flower', pal, C.WALK);
      }
    }
    // sign at entry
    const entry = c.open.find((o) => cellsBefore(world, c, o.to));
    if (entry) {
      const [ex, ey] = openingInner(c, entry);
      for (let t = 0; t < 30; t++) {
        const x = ex + rng.int(-2, 2), y = ey + rng.int(-2, 2);
        if (!inside(x, y) || prot.get(k(x, y)) === 1 || prot.get(k(x, y)) === 3) continue;
        if (ow.collAt(x, y) !== C.WALK && ow.collAt(x, y) !== C.GRASS) continue;
        if (signNear(ow, x, y)) continue;
        ow.set(x, y, 'sign', 'wood', C.SOLID); prot.set(k(x, y), 3);
        ow.signs.push({ x, y, text: PA.Lines.routeSign(rng, world, c) });
        break;
      }
    }
    c.prot = prot;
    c.inside = inside;
    c.I = I;
  }
  function cellsBefore(world, c, otherIdx) { return otherIdx < c.i; }

  // ---------------------------------------------------------------- dungeon gate
  function carveGate(world, ow, c, rng) {
    const I = cellInterior(c, 2);
    for (let y = I.y0; y <= I.y1; y++) for (let x = I.x0; x <= I.x1; x++) groundTile(ow, x, y, rng, 'route');
    for (const o of c.open) for (const [x, y] of openingTiles(c, o)) setPath(ow, x, y);
    const entry = c.open[0];
    // where the mouth goes: far side from entry
    let mx, my;
    const cave = world.quest.dungeon === 'cave';
    // put a mountain/wood band on the side opposite the entry
    // band along the top unless the entry would collide with it
    const top = entry.side === 'down' || ((entry.side === 'left' || entry.side === 'right') && entry.pos >= 9);
    const bandH = 6;
    const by0 = top ? I.y0 : I.y1 - bandH + 1;
    for (let y = by0; y < by0 + bandH; y++) for (let x = I.x0; x <= I.x1; x++) {
      if (cave) {
        const face = top ? y === by0 + bandH - 1 : y === by0;
        ow.set(x, y, face ? 'mface' : 'mtop', 'mountain', C.SOLID);
        if (!face && (x === I.x0)) ow.set(x, y, 'mside_r', 'mountain', C.SOLID);
        if (!face && (x === I.x1)) ow.set(x, y, 'mside', 'mountain', C.SOLID);
      } else {
        const bx = (x - I.x0) % 2, byy = (y - by0) % 2;
        ow.set(x, y, 'btree_' + bx + byy, 'forest', C.SOLID);
      }
    }
    mx = Math.floor((I.x0 + I.x1) / 2) + rng.int(-4, 4);
    if (!cave && (mx - I.x0) % 2 === 1) mx--;
    my = top ? by0 + bandH - 1 : by0;
    if (cave) ow.set(mx, my, 'mcave', 'mountain', C.WARP);
    else {
      ow.set(mx, my, 'black', 'forest', C.WARP); ow.set(mx + 1, my, 'black', 'forest', C.SOLID);
      if (top) { ow.set(mx, my - 1, 'black', 'forest', C.SOLID); ow.set(mx + 1, my - 1, 'black', 'forest', C.SOLID); }
    }
    world.slots.mouth = { x: mx, y: my, front: [mx, top ? my + 1 : my - 1], dir: top ? 'up' : 'down' };
    // path from entry to mouth
    const [ex, ey] = openingInner(c, entry);
    const inside = (x, y) => x >= I.x0 && x <= I.x1 && y >= I.y0 && y <= I.y1 && !(y >= by0 && y < by0 + bandH);
    const fr = world.slots.mouth.front;
    const p = astar(ex, ey, fr[0], fr[1], (x, y) => inside(x, y) || (x === ex && y === ey), () => 1);
    if (!p) return false;
    for (const [x, y] of p) setPath(ow, x, y);
    // decoration: a few trees and flowers not on path
    for (let n = 0; n < 8; n++) {
      const x = rng.int(I.x0, I.x1), y = rng.int(I.y0, I.y1);
      if (!inside(x, y) || isPath(ow, x, y)) continue;
      if (Math.abs(x - fr[0]) + Math.abs(y - fr[1]) < 3) continue;
      if (p.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) <= 1)) continue;
      ow.set(x, y, cave ? 'tree' : 'stump', cave ? 'tree' : 'forest', C.SOLID);
    }
    for (let n = 0; n < 6; n++) {
      const x = rng.int(I.x0, I.x1), y = rng.int(I.y0, I.y1);
      if (!inside(x, y) || isPath(ow, x, y) || ow.collAt(x, y) !== C.WALK) continue;
      ow.set(x, y, 'tall', 'tall', C.GRASS);
    }
    c.I = I; c.inside = inside;
    // the blocker stands in the 1-wide opening between route 3 and here
    const o = entry;
    let bx, byy;
    if (o.side === 'left') { bx = c.x0 + 1; byy = c.y0 + o.pos; }
    if (o.side === 'right') { bx = c.x0 + CW - 2; byy = c.y0 + o.pos; }
    if (o.side === 'up') { bx = c.x0 + o.pos; byy = c.y0 + 1; }
    if (o.side === 'down') { bx = c.x0 + o.pos; byy = c.y0 + CH - 2; }
    world.slots.blocker = { x: bx, y: byy, side: o.side };
    world.slots.gateEntry = [ex, ey];
    return true;
  }

  // ---------------------------------------------------------------- glade
  function carveGlade(world, ow, c, rng) {
    const I = cellInterior(c, 3);
    const cx = (I.x0 + I.x1) / 2, cy = (I.y0 + I.y1) / 2;
    for (let y = I.y0; y <= I.y1; y++) for (let x = I.x0; x <= I.x1; x++) {
      const dx = (x - cx) / ((I.x1 - I.x0) / 2 + 0.5), dy = (y - cy) / ((I.y1 - I.y0) / 2 + 0.5);
      if (dx * dx + dy * dy > 1.05) continue;
      const r = rng.next();
      if (r < 0.18) ow.set(x, y, (x + y) % 2 ? 'flower' : 'flower_b', rng.pick(['flower', 'flowerY']), C.WALK);
      else if (r < 0.4) ow.set(x, y, 'tall', 'tall', C.GRASS);
      else groundTile(ow, x, y, rng, 'route');
    }
    const o = c.open[0];
    const [ix, iy] = openingInner(c, o);
    for (const [x, y] of openingTiles(c, o)) setPath(ow, x, y);
    const p = astar(ix, iy, Math.round(cx), Math.round(cy), (x, y) => x >= c.x0 && y >= c.y0 && x < c.x0 + CW && y < c.y0 + CH, () => 1);
    if (p) for (const [x, y] of p) if (ow.collAt(x, y) !== C.WALK || true) setPath(ow, x, y);
    // a pond in the middle
    const pw = 3, ph = 2;
    const px = Math.round(cx) + 1, py = Math.round(cy) - 2;
    pond(ow, px, py, pw, ph);
    world.slots.glade = { x: Math.round(cx) - 1, y: Math.round(cy) - 1, cell: c };
    c.I = I;
  }

  // ---------------------------------------------------------------- interiors
  PA.buildTownInteriors = function (world, ow, c, rng) {
    for (const d of c.doors) {
      let room, id;
      const zone = world.zones[c.zi];
      if (d.tag === 'playerHouse') {
        id = 'home1';
        room = PA.buildRoom('home', id, { name: '{PLAYER}\'s house', music: 'house' });
        const up = PA.buildRoom('bedroom', 'home2', { name: '{PLAYER}\'s room', music: 'house' });
        world.maps.home2 = up;
        room.warps.push({ x: 7, y: 1, to: 'home2', tx: 7, ty: 1, dir: 'left' });
        up.warps.push({ x: 7, y: 1, to: 'home1', tx: 7, ty: 1, dir: 'left' });
      } else if (d.tag === 'rivalHouse') { id = 'rivalHouse'; room = PA.buildRoom('rival', id, { name: '{RIVAL}\'s house' }); }
      else if (d.tag === 'lab') { id = 'lab'; room = PA.buildRoom('lab', id, { name: 'LAB', music: 'house' }); }
      else if (d.tag === 'library') { id = 'library'; room = PA.buildRoom('library', id, { name: 'LIBRARY', music: 'house' }); }
      else if (d.tag === 'clinic') { id = 'clinic_' + c.role; room = PA.buildRoom('clinic', id, { name: 'CLINIC', music: 'center' }); }
      else if (d.tag === 'shop') { id = 'shop_' + c.role; room = PA.buildRoom('shop', id, { name: 'SHOP', music: 'center' }); }
      else if (d.tag === 'hall') { id = 'hall'; room = PA.buildRoom('hall', id, { name: 'ASSEMBLY ROOMS', music: 'hall' }); }
      else { const n = world.houseCount || 0; world.houseCount = n + 1; // counted per world, so a seed always builds the same rooms
        id = 'house' + n + '_' + c.role; room = PA.buildHouse(id, rng.sub(id), { name: zone.name.charAt(0) + zone.name.slice(1).toLowerCase() + ' house' }); }
      room.zoneName = zone.name;
      room.townRole = c.role;
      world.maps[id] = room;
      d.map = id;
      // warps: door -> mat; mats -> door front
      const mats = [];
      for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) if (room.collAt(x, y) === PA.C.MAT) mats.push([x, y]);
      const entryMat = mats[mats.length > 1 ? 1 : 0] || [Math.floor(room.w / 2), room.h - 1];
      // prefer the left mat for entering
      const em = mats.length ? mats.reduce((a, b) => (b[0] < a[0] ? b : a)) : entryMat;
      ow.warps.push({ x: d.x, y: d.y, to: id, tx: em[0], ty: em[1], dir: 'up' });
      for (const [mx, my] of mats) room.warps.push({ x: mx, y: my, to: 'overworld', tx: d.x, ty: d.y + 1, dir: 'down', exit: true });
      room.exitTo = { x: d.x, y: d.y + 1 };
    }
  };

  // ---------------------------------------------------------------- validation
  function reach(map, sx, sy, passBlockers) {
    const seen = new Uint8Array(map.w * map.h);
    const q = [[sx, sy]];
    seen[map.i(sx, sy)] = 1;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy, dir] of [[1, 0, 'r'], [-1, 0, 'l'], [0, 1, 'd'], [0, -1, 'u']]) {
        let nx = x + dx, ny = y + dy;
        if (!map.inb(nx, ny)) continue;
        const cc = map.collAt(nx, ny);
        if (cc === C.LEDGE) { if (dir !== 'd') continue; ny += 1; if (!map.inb(nx, ny) || !PA.walkable(map.collAt(nx, ny))) continue; }
        else if (!PA.walkable(cc)) continue;
        if (cc === C.DOOR || cc === C.WARP) { if (!seen[map.i(nx, ny)]) seen[map.i(nx, ny)] = 1; continue; }
        const n = map.npcSpecs ? map.npcSpecs.find((s) => s.x === nx && s.y === ny && s.solidForGen && !(passBlockers && s.blocker)) : null;
        if (n) continue;
        if (!seen[map.i(nx, ny)]) { seen[map.i(nx, ny)] = 1; q.push([nx, ny]); }
      }
    }
    return seen;
  }
  PA.reach = reach;
  function validate(world) { // (the passage's tunnel counts as a way through)
    const ow = world.maps.overworld, rock = (world.slots.passage && world.slots.passage.rock) || [];
    const saved = rock.map(([x, y]) => ow.collAt(x, y));
    for (const [x, y] of rock) ow.setColl(x, y, C.WALK);
    try { return validateWorld(world); } finally { rock.forEach(([x, y], i) => ow.setColl(x, y, saved[i])); }
  }
  function validateWorld(world) {
    const ow = world.maps.overworld;
    const home = world.doors['home:playerHouse'];
    if (!home) return 'nohome';
    const s = reach(ow, home.x, home.y + 1, true);
    // every door and the mouth reachable
    for (const key in world.doors) { const d = world.doors[key]; if (!s[ow.i(d.x, d.y)]) return 'door:' + key; }
    const m = world.slots.mouth; if (!m || !s[ow.i(m.x, m.y)]) return 'mouth';
    // and we can walk home again from the mouth front
    const back = reach(ow, m.front[0], m.front[1], true);
    if (!back[ow.i(home.x, home.y)]) return 'back';
    // every reachable tile can get back home (no ledge traps)
    const hx = home.x, hy = home.y + 1;
    // reverse check on a sample of tiles
    let checked = 0;
    for (let i = 0; i < s.length && checked < 40; i += 97) {
      if (!s[i]) continue;
      const x = i % ow.w, y = (i / ow.w) | 0;
      if (!PA.walkable(ow.collAt(x, y)) || ow.collAt(x, y) === C.DOOR || ow.collAt(x, y) === C.WARP) continue;
      const r = reach(ow, x, y, true);
      if (!r[ow.i(hx, hy)]) return 'trap';
      checked++;
    }
    // the passage's tunnel, if it has one, goes all the way through
    const P = world.slots.passage;
    if (P && P.ends && !tunnelThrough(world.maps.tunnel, P.ends)) return 'tunnel';
    // dungeon: entrance reaches boss
    if (world.dungeonCheck && !world.dungeonCheck()) return 'dungeon';
    return true;
  }
})(window.PA);
