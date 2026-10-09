// Procedural Adventures - dressing the outdoor maps in the original overworld tileset (art/tiles).
// The game still reads the old tile ids (PA.T) for what each cell *is* - tree, water, path, ledge,
// wall - and PA.dressWorld() decides how it *looks*. Every 16x16 cell is drawn as four 8x8 quarters
// of the new 16x16 tiles (map.vq), so paths and ponds round off at every corner, 2x2 trees grow out
// of tree-filled ground, and buildings are put together from roof, wall, door and sign pieces.
// It is a pure function of the map and never touches an RNG, so it changes no world.
'use strict';
(function (PA) {
  const W = window.PA_WORLD_TILES, T = PA.T, C = PA.C;
  const VOID = (PA.VQ_VOID = PA.gfx.WQ_VOID); // a quarter drawn as deep forest shade (the way into the woods)
  const PAD = 6; // dressed cells beyond each edge of the map; further out, the border repeats by parity

  // A piece the tileset doesn't have (renamed in a rebuilt manifest, say) is drawn as plain grass rather
  // than stopping world generation; tests/worldgen_test.js fails on any name collected here.
  PA.dressMissing = new Set();
  const tid = (name) => {
    const t = W.names[name];
    if (t !== undefined) return t;
    if (!PA.dressMissing.has(name)) { PA.dressMissing.add(name); console.warn('Procedural Adventures: the overworld tileset has no ' + name); }
    return W.names.grass;
  };
  const Q = (name, q) => tid(name) * 4 + q;
  const all4 = (name) => [Q(name, 0), Q(name, 1), Q(name, 2), Q(name, 3)];
  const halves = (top, bottom) => [Q(top, 0), Q(top, 1), Q(bottom, 2), Q(bottom, 3)];
  // a cheap, stable hash for picking variants by position
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) % 100; };

  // Quarter-tile edges for a set of 3x3 edge tiles (P_nw ... P_se, P_center, P_inner_nw ...). `same`
  // says whether a neighbour belongs to the same area; each quarter only looks at its own corner.
  function edged(P, same, x, y) {
    const n = same(x, y - 1), s = same(x, y + 1), w = same(x - 1, y), e = same(x + 1, y);
    const pick = (q, V, H, D, vName, hName, corner) => {
      if (V && H) return Q(P + (D ? '_center' : '_inner_' + corner), q);
      if (V) return Q(P + '_' + hName, q);
      if (H) return Q(P + '_' + vName, q);
      return Q(P + '_' + corner, q);
    };
    return [
      pick(0, n, w, same(x - 1, y - 1), 'n', 'w', 'nw'), pick(1, n, e, same(x + 1, y - 1), 'n', 'e', 'ne'),
      pick(2, s, w, same(x - 1, y + 1), 's', 'w', 'sw'), pick(3, s, e, same(x + 1, y + 1), 's', 'e', 'se'),
    ];
  }

  // ---------------------------------------------------------------- buildings
  // roof palette (chosen in src/game/worldgen.js, also what the town map shows) -> roof tiles
  const ROOF = { roofRed: 'red', roofBlue: 'blue', roofTeal: 'teal', roofPurple: 'purple', roofOrange: 'brown', roofGreen: 'teal' };
  // wall rows under the roof, left to right; the door piece sits on the stamp's door cell
  const WALLS = {
    house: [['wall_l', 'wall_door', 'wall_window', 'wall_r']],
    house_small: [['wall_l', 'wall_door', 'wall_window', 'wall_r']],
    clinic: [['wall_l', 'sign_clinic', 'wall_window', 'wall_r'], ['wall_l', 'glass_doors', 'wall_m', 'wall_r']],
    shop: [['wall_l', 'sign_shop', 'wall_window', 'wall_r'], ['awning_l', 'wall_door', 'awning_m', 'awning_r']],
    lab: [['wall_l', 'wall_window', 'sign_lab', 'wall_window', 'wall_window', 'wall_r'], ['wall_l', 'wall_m', 'wall_door', 'wall_m', 'wall_window', 'wall_r']],
    hall: [['wall_l', 'wall_window', 'wall_window', 'wall_window', 'sign_arena', 'wall_r'], ['wall_l', 'wall_m', 'wall_window', 'wall_m', 'wall_doorway_open', 'wall_r']],
  };
  PA.DOOR_PIECES = ['wall_door', 'glass_doors', 'wall_doorway_open'];
  function building(b) {
    const colour = ROOF[b.roof] || 'red';
    const walls = WALLS[b.name].map((row) => row.slice());
    if (b.tag === 'library') walls[0] = walls[0].map((p) => (p === 'sign_lab' ? 'wall_window' : p));
    const roofRows = b.h - walls.length;
    const cols = b.w === 4 ? [0, 1, 2, 3] : [0, 1, 2, 1, 2, 3];
    const chimney = b.name === 'house' || b.name === 'house_small';
    const cells = [];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      let refs;
      if (y < roofRows) {
        const c = cols[x], top = chimney && x === 2 ? 'roof_' + colour + '_chimney' : 'roof_' + colour + '_' + c + '0';
        const bottom = 'roof_' + colour + '_' + c + '1';
        refs = roofRows === 1 ? halves(top, bottom) : all4(y === 0 ? top : bottom);
      } else refs = all4(walls[y - roofRows][x]);
      cells.push([b.x + x, b.y + y, refs]);
    }
    return cells;
  }

  // ---------------------------------------------------------------- one map
  function dressMap(m, kind) {
    const VW = m.w + 2 * PAD, VH = m.h + 2 * PAD;
    const vq = new Uint16Array(VW * VH * 4).fill(VOID);
    const tileAt = (x, y) => (m.inb(x, y) ? m.tiles[m.i(x, y)] : m.border);
    const palAt = (x, y) => PA.palName(m.inb(x, y) ? m.pals[m.i(x, y)] : m.borderPal);
    const collAt = (x, y) => (m.inb(x, y) ? m.coll[m.i(x, y)] : C.SOLID);
    const inPad = (x, y) => x >= -PAD && y >= -PAD && x < m.w + PAD && y < m.h + PAD;
    const put = (x, y, refs) => { const k = ((y + PAD) * VW + x + PAD) * 4; for (let q = 0; q < 4; q++) vq[k + q] = refs[q]; };
    const missing = new Set();

    const isTree = (x, y) => inPad(x, y) && (tileAt(x, y) === T.tree || tileAt(x, y) === T.tree_dark);
    const isPath = (x, y) => { const t = tileAt(x, y); return (t === T.hatch && palAt(x, y) === 'ground') || collAt(x, y) === C.DOOR || t === T.mcave || t === T.black; };
    const WATER = new Set([T.water, T.water_t, T.water_tl, T.water_tr, T.water_l, T.water_r, T.water_b, T.water_bl, T.water_br]);
    const isWater = (x, y) => m.inb(x, y) && WATER.has(tileAt(x, y));
    const isWall = (x, y) => tileAt(x, y) === T.cwall;
    const isPost = (x, y) => m.inb(x, y) && tileAt(x, y) === T.posts;

    // trees: 2x2 where they fit - first on the even grid (which the border repeats), then wherever a
    // 2x2 of tree cells is still free; a lone tree is a bush, a leftover in a wood is a wall of forest
    const taken = new Uint8Array(VW * VH);
    const tk = (x, y) => (y + PAD) * VW + x + PAD;
    const block = (x, y) => isTree(x, y) && isTree(x + 1, y) && isTree(x, y + 1) && isTree(x + 1, y + 1) &&
      !taken[tk(x, y)] && !taken[tk(x + 1, y)] && !taken[tk(x, y + 1)] && !taken[tk(x + 1, y + 1)];
    const species = (x, y) => {
      if ([[0, 0], [1, 0], [0, 1], [1, 1]].some(([a, b]) => tileAt(x + a, y + b) === T.tree_dark)) return 'pine';
      const h = hash(x, y);
      return h < 8 ? 'berry' : h < 16 ? 'pine' : 'round';
    };
    const grow = (x, y) => {
      const sp = 'tree_' + species(x, y) + '_';
      for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { taken[tk(x + a, y + b)] = 1; put(x + a, y + b, all4(sp + a + b)); }
    };
    for (let y = -PAD; y < m.h + PAD; y += 2) for (let x = -PAD; x < m.w + PAD; x += 2) if (block(x, y)) grow(x, y);
    for (let y = -PAD; y < m.h + PAD; y++) for (let x = -PAD; x < m.w + PAD; x++) if (block(x, y)) grow(x, y);

    for (let y = -PAD; y < m.h + PAD; y++) for (let x = -PAD; x < m.w + PAD; x++) {
      const t = tileAt(x, y), pal = palAt(x, y);
      if (kind === 'forest' && !m.inb(x, y)) put(x, y, all4('tree_pine_' + (x & 1) + (y & 1)));
      else if (t === T.tree || t === T.tree_dark) {
        if (taken[tk(x, y)]) continue;
        const alone = ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => isTree(x + a, y + b));
        put(x, y, all4(alone ? 'bush_cuttable' : 'forest_wall'));
      } else if (t === T.white || t === T.ffloor) put(x, y, all4(hash(x, y) < (t === T.ffloor ? 18 : 6) ? 'grass_alt' : 'grass'));
      else if (t === T.tuft) put(x, y, all4('grass_alt'));
      else if (t === T.hatch) put(x, y, pal === 'ground' ? edged('path', isPath, x, y) : all4('grass_alt'));
      else if (WATER.has(t)) put(x, y, edged('water', isWater, x, y).map((r) => (r >> 2 === tid('water_center') ? tid('water_1') * 4 + (r & 3) : r)));
      else if (t === T.tall || t === T.ftall) put(x, y, all4('tall_grass'));
      else if (t === T.flower || t === T.flower_b) put(x, y, all4(pal === 'flowerY' ? 'flowers_white_1' : 'flowers_red_1'));
      else if (t === T.stump) put(x, y, all4('stump'));
      else if (t === T.sign) put(x, y, all4('sign_wood'));
      else if (t === T.posts) put(x, y, all4(isPost(x - 1, y) || isPost(x + 1, y) ? 'fence_wood_h' : isPost(x, y - 1) || isPost(x, y + 1) ? 'fence_wood_v' : 'fence_wood_post'));
      else if (t === T.ledge || t === T.ledge_r || t === T.ledge_flat) {
        const l = tileAt(x - 1, y) === t, r = tileAt(x + 1, y) === t;
        put(x, y, all4(l && r ? 'ledge_s' : r ? 'ledge_s_l' : l ? 'ledge_s_r' : 'ledge_s'));
      } else if (t === T.mtop || t === T.mside || t === T.mside_r) {
        const lip = tileAt(x, y + 1) === T.mface || tileAt(x, y + 1) === T.mcave;
        put(x, y, all4(t === T.mside_r ? 'cliff_top_l' : t === T.mside ? 'cliff_top_r' : lip ? 'cliff_lip' : 'cliff_top'));
      } else if (t === T.mface) {
        const face = (x2) => tileAt(x2, y) === T.mface || tileAt(x2, y) === T.mcave;
        put(x, y, all4(!face(x - 1) ? 'cliff_face_l' : !face(x + 1) ? 'cliff_face_r' : 'cliff_face'));
      } else if (t === T.mcave) put(x, y, all4('cliff_cave_entrance'));
      else if (t >= T.btree_00 && t <= T.btree_11) {
        const name = ['00', '10', '01', '11'][t - T.btree_00];
        put(x, y, all4('tree_pine_' + name));
      } else if (t === T.black) put(x, y, [VOID, VOID, VOID, VOID]);
      else if (t === T.cwall) put(x, y, all4(!isWall(x, y + 1) ? 'cave_wall_base' : !isWall(x, y - 1) ? 'cave_wall_top' : 'cave_wall'));
      else if (t === T.cfloor) put(x, y, all4('cave_floor'));
      else if (t === T.cdark) put(x, y, all4('cave_floor_alt'));
      else if (t === T.cladder) put(x, y, all4('cave_ladder'));
      else if (t === T.cstairs) put(x, y, all4('cave_stairs'));
      else if (t === T.craised) put(x, y, all4('town_paving'));
      else if (!(m.buildings || []).some((b) => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h)) missing.add(t);
    }
    for (const b of m.buildings || []) for (const [x, y, refs] of building(b)) put(x, y, refs);

    // beyond the dressed margin: the border, repeated by parity (a 2x2 tree in a wood)
    const edge = new Uint16Array(16);
    const bt = m.border;
    for (let py = 0; py < 2; py++) for (let px = 0; px < 2; px++) {
      const refs = bt === T.cwall ? all4('cave_wall') : bt >= T.btree_00 && bt <= T.btree_11 ? all4('tree_pine_' + px + py) : all4('tree_round_' + px + py);
      edge.set(refs, (py * 2 + px) * 4);
    }
    m.vq = vq; m.vqPad = PAD; m.vqW = VW; m.vqH = VH; m.vqEdge = edge; m.vqKind = kind; m.vqStale = false;
    m.vqMode = kind === 'cave' && m.pals.some((p) => PA.palName(p) === 'caveDeep') ? 'deep' : null;
    m.vqMissing = [...missing];
  }

  // where cell (x, y)'s four quarters are: [array, index] (the renderer inlines this)
  PA.vqAt = function (m, x, y) {
    const vx = x + m.vqPad, vy = y + m.vqPad;
    if (vx >= 0 && vy >= 0 && vx < m.vqW && vy < m.vqH) return [m.vq, (vy * m.vqW + vx) * 4];
    return [m.vqEdge, ((y & 1) * 2 + (x & 1)) * 4];
  };

  PA.dressBuilding = building; // [[x, y, quarters], ...] for a stamp record

  // a dressed map whose tiles changed after generation (GameMap.set/stamp mark it) is dressed again
  PA.redress = (m) => (m.vqKind === 'room' ? PA.furnish(m) : dressMap(m, m.vqKind));

  PA.dressWorld = function (world) {
    if (!W) throw new Error('the overworld tileset is missing - rebuild src/gen/world_tiles.js (tools/build_world_tiles.py)');
    for (const id in world.maps) {
      const m = world.maps[id];
      if (id === 'overworld') dressMap(m, 'overworld');
      else if (m.dungeon) dressMap(m, m.border === T.cwall ? 'cave' : 'forest');
    }
  };
})(window.PA);
