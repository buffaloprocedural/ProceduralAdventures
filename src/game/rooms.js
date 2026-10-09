// Procedural Adventures - rooms: every interior, laid out in the original interior tileset (art/interior).
// A room is a plan - one character per cell, which also gives the collision - plus the furniture put on
// it. Floors, walls, stairs, mats and rugs are the base layer; furniture and wall decor are an object
// layer drawn over it (map.vq holds the base in 8x8 quarters, map.vo one object tile per cell).
// The rooms keep every spot the story uses: where people stand, the counters you talk across, the
// stairs and the doormats, the bookshelves and the TV you can read or watch.
'use strict';
(function (PA) {
  const IT = window.PA_INTERIOR_TILES, C = PA.C, T = PA.T;
  const VOID = PA.gfx.WQ_VOID;

  // A name the tileset doesn't have draws as darkness rather than stopping the game; worldgen_test fails on it.
  PA.furnishMissing = new Set();
  const tid = (name) => {
    const t = IT.names[name];
    if (t !== undefined) return t;
    if (!PA.furnishMissing.has(name)) { PA.furnishMissing.add(name); console.warn('Procedural Adventures: the interior tileset has no ' + name); }
    return IT.names.void;
  };
  const OBJECT = new Set(IT.objects);
  const cellsOf = (piece) => { // [[dx, dy, tile name], ...] of a piece or a single tile
    const s = IT.pieces[piece];
    if (!s) return [[0, 0, piece]];
    const out = [];
    for (let dy = 0; dy < s[1]; dy++) for (let dx = 0; dx < s[0]; dx++) out.push([dx, dy, piece + '_' + dx + dy]);
    return out;
  };

  // plan characters -> collision
  const COLL = { '.': C.WALK, '#': C.SOLID, x: C.SOLID, E: C.MAT, U: C.STAIRS, D: C.STAIRS, C: C.COUNTER };

  // ---------------------------------------------------------------- the rooms
  // floor: base tile for floor; wall: a 1x2 wall piece (one wall row is drawn as its top and bottom halves);
  // walls: how many plan rows are wall (1 or 2); put: [piece, x, y] - a piece covers w x h cells from (x, y).
  const ROOMS = {
    // your bedroom, upstairs
    bedroom: {
      floor: 'floor_wood_light', wall: 'wall_house_1x2',
      plan: ['########',
             'xx.....D',
             '........',
             '........',
             '...x....',
             '...x....',
             'x.....x.',
             'x.....x.'],
      put: [['computer_desk_2x2', 0, 0], ['window_curtains', 3, 0], ['wall_clock', 4, 0], ['window_curtains', 5, 0],
        ['stairs_down', 7, 1], ['rug_red_3x3', 4, 2], ['tv_1x2', 3, 4], ['bed_1x2', 0, 6], ['potted_plant_1x2', 6, 6]],
    },
    // downstairs: the sitting room, and MOTHER's kitchen
    home: {
      floor: 'floor_wood_light', wall: 'wall_house_1x2',
      plan: ['########',
             'xx.xxxxU',
             '........',
             '........',
             '...xx...',
             '...xx...',
             '.......x',
             '..EE...x'],
      put: [['bookshelf_2x2', 0, 0], ['picture_frame', 2, 0], ['tv_1x2', 3, 0], ['fridge_1x2', 4, 0], ['stove_1x2', 5, 0],
        ['sink_counter_1x2', 6, 0], ['stairs_up_1x2', 7, 0], ['rug_red_3x3', 2, 3], ['chair_down', 3, 4], ['chair_down', 4, 4],
        ['table_2x1', 3, 5], ['potted_plant_1x2', 7, 6], ['exit_mat', 2, 7], ['exit_mat', 3, 7]],
    },
    // the rival's house: books, a piano nobody is allowed to touch
    rival: {
      floor: 'floor_wood_dark', wall: 'wall_house_1x2',
      plan: ['########',
             'xx..xx.x',
             '........',
             '...xx...',
             '...xx...',
             '........',
             'x......x',
             'x.EE...x'],
      put: [['bookshelf_2x2', 0, 0], ['picture_frame', 2, 0], ['wall_clock', 3, 0], ['piano_2x2', 4, 0], ['window_curtains', 6, 0],
        ['bookshelf_1x2', 7, 0], ['carpet_blue', 3, 2], ['carpet_blue', 4, 2], ['chair_down', 3, 3], ['chair_down', 4, 3], ['table_2x1', 3, 4],
        ['potted_plant_1x2', 0, 6], ['potted_plant_1x2', 7, 6], ['exit_mat', 2, 7], ['exit_mat', 3, 7]],
    },
    // PROF. BENNET's laboratory; the three starters sit on the counter at (6..8, 3)
    lab: {
      floor: 'floor_metal', wall: 'wall_lab_1x2',
      plan: ['##########',
             'xxxx..xxxx',
             'xx........',
             'xx....xxx.',
             '..........',
             '..........',
             'xxxx..xxxx',
             'xxxx..xxxx',
             '..........',
             'xx.......x',
             '.........x',
             '....EE....'],
      put: [['lab_machine_2x2', 0, 0], ['poster', 2, 0], ['calendar', 3, 0], ['research_desk', 2, 1], ['research_desk', 3, 1],
        ['bookshelf_2x2', 6, 0], ['bookshelf_2x2', 8, 0], ['specimen_tank_1x2', 0, 2], ['specimen_tank_1x2', 1, 2],
        ['counter_wood_l', 6, 3], ['counter_wood_m', 7, 3], ['counter_wood_r', 8, 3],
        ['bookshelf_2x2', 0, 6], ['bookshelf_2x2', 2, 6], ['bookshelf_2x2', 6, 6], ['bookshelf_2x2', 8, 6],
        ['beaker_table_2x1', 0, 9], ['potted_plant_1x2', 9, 9], ['exit_mat', 4, 11], ['exit_mat', 5, 11]],
    },
    // the CIRCULATING LIBRARY: the catalogue at (0, 1), shelves you can browse, a reading corner
    library: {
      floor: 'floor_wood_dark', wall: 'wall_tower_1x2',
      plan: ['##########',
             'xxxx..xxxx',
             '..........',
             '......xxx.',
             '..........',
             '..........',
             'xxxx..xxxx',
             'xxxx..xxxx',
             '..........',
             '.........x',
             'xx.......x',
             '....EE....'],
      put: [['picture_frame', 0, 0], ['wall_clock', 1, 0], ['research_desk', 0, 1], ['globe', 1, 1], ['bookshelf_1x2', 2, 0], ['bookshelf_1x2', 3, 0],
        ['bookshelf_2x2', 6, 0], ['bookshelf_2x2', 8, 0], ['table_2x1', 6, 3], ['armchair', 8, 3],
        ['bookshelf_2x2', 0, 6], ['bookshelf_2x2', 2, 6], ['bookshelf_2x2', 6, 6], ['bookshelf_2x2', 8, 6],
        ['carpet_red', 4, 8], ['carpet_red', 5, 8], ['carpet_red', 4, 9], ['carpet_red', 5, 9], ['carpet_red', 4, 10], ['carpet_red', 5, 10],
        ['sofa_2x1', 0, 10], ['potted_plant_1x2', 9, 9], ['exit_mat', 4, 11], ['exit_mat', 5, 11]],
    },
    // the clinic: the nurse stands at (3, 1) behind the counter (0..9, 2); the LODGINGS register is at (13, 3..4)
    clinic: {
      floor: 'floor_tile_white', wall: 'wall_clinic_1x2',
      plan: ['##############',
             '.xx.......x...',
             'CCCCCCCCCCxx..',
             '.............x',
             '.............x',
             '..............',
             'xx....xx....xx',
             'xx.EE.xx....xx'],
      put: [['healing_machine_2x2', 1, 0], ['clinic_wall_sign', 3, 0], ['window_curtains', 6, 0], ['window_curtains', 8, 0], ['potted_plant_1x2', 10, 0],
        ['poster', 12, 0], ['counter_clinic_l', 0, 2], ['counter_clinic_m', 1, 2], ['counter_clinic_m', 2, 2], ['counter_clinic_bell', 3, 2],
        ['counter_clinic_m', 4, 2], ['counter_clinic_m', 5, 2], ['counter_clinic_m', 6, 2], ['counter_clinic_m', 7, 2], ['counter_clinic_m', 8, 2],
        ['counter_clinic_r', 9, 2], ['waiting_bench_2x1', 10, 2], ['storage_terminal_1x2', 13, 3],
        ['potted_plant_1x2', 0, 6], ['potted_plant_1x2', 1, 6], ['water_cooler_1x2', 6, 6], ['potted_plant_1x2', 7, 6],
        ['potted_plant_1x2', 12, 6], ['potted_plant_1x2', 13, 6], ['exit_mat', 3, 7], ['exit_mat', 4, 7]],
    },
    // the shop: the clerk stands at (0, 5) behind the counter (1, 4..6)
    shop: {
      floor: 'floor_tile_mint', wall: 'wall_shop_1x2', walls: 2,
      plan: ['########',
             '########',
             '........',
             'xx..xxxx',
             'xC..xxxx',
             '.C......',
             'xC......',
             '...EE...'],
      put: [['shop_shelf_2x2', 0, 0], ['shop_shelf_2x2', 2, 0], ['poster', 4, 0], ['price_sign', 5, 1], ['vending_machine_1x2', 6, 0],
        ['water_cooler_1x2', 7, 0], ['shop_shelf_1x2', 0, 3], ['produce_bin', 1, 3], ['shop_shelf_2x2', 4, 3], ['shop_shelf_2x2', 6, 3],
        ['counter_shop_m', 1, 4], ['counter_shop_register', 1, 5], ['counter_shop_m', 1, 6], ['trash_can', 0, 6],
        ['exit_mat', 3, 7], ['exit_mat', 4, 7]],
    },
    // the ASSEMBLY ROOMS, where the dancing is battling: the Master of Ceremonies waits at (4, 1)
    hall: {
      floor: 'arena_floor', wall: 'wall_arena_1x2',
      plan: ['##########',
             'x........x',
             'x........x',
             'xxxx..xxxx',
             '..........',
             '..........',
             '..........',
             'x........x',
             'x........x',
             'xxxx..xxxx',
             '...x..x...',
             'x........x',
             'x........x',
             '....EE....'],
      put: [['picture_frame', 2, 0], ['trophy_case_2x1', 4, 0], ['picture_frame', 7, 0], ['brazier_1x2', 0, 1], ['brazier_1x2', 9, 1],
        ['rope_post', 0, 3], ['rope_barrier_h', 1, 3], ['rope_barrier_h', 2, 3], ['rope_post', 3, 3],
        ['rope_post', 6, 3], ['rope_barrier_h', 7, 3], ['rope_barrier_h', 8, 3], ['rope_post', 9, 3],
        ['arena_center_circle_2x2', 4, 5], ['banner_1x2', 0, 7], ['banner_1x2', 9, 7],
        ['rope_post', 0, 9], ['rope_barrier_h', 1, 9], ['rope_barrier_h', 2, 9], ['arena_statue_1x2', 3, 9],
        ['arena_statue_1x2', 6, 9], ['rope_barrier_h', 7, 9], ['rope_barrier_h', 8, 9], ['rope_post', 9, 9],
        ['carpet_red', 4, 10], ['carpet_red', 5, 10], ['carpet_red', 4, 11], ['carpet_red', 5, 11], ['carpet_red', 4, 12], ['carpet_red', 5, 12],
        ['potted_plant_1x2', 0, 11], ['potted_plant_1x2', 9, 11], ['exit_mat', 4, 13], ['exit_mat', 5, 13]],
    },
  };
  PA.ROOM_SPECS = ROOMS;

  // ---------------------------------------------------------------- laying a room out
  // Builds map.vq / map.vo from map.room (the spec) and notes anything that doesn't add up in map.roomProblems.
  PA.furnish = function (m) {
    const R = m.room, w = m.w, h = m.h;
    const vq = new Uint16Array(w * h * 4), vo = new Uint16Array(w * h).fill(VOID);
    const objName = new Array(w * h).fill(null); // the piece each cell belongs to (for signs: bookshelves, the TV...)
    const solidBase = new Uint8Array(w * h);      // cells where a base piece stands up from the floor (shop shelves)
    const problems = [];
    const put4 = (x, y, top, bottom) => { const k = (y * w + x) * 4, a = tid(top), b = tid(bottom || top); vq.set([a * 4, a * 4 + 1, b * 4 + 2, b * 4 + 3], k); };
    const walls = R.walls || 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (R.plan[y][x] === '#' && y < walls) {
        if (walls === 1) put4(x, y, R.wall + '_00', R.wall + '_01'); // one wall row: the top of the wall over its skirting
        else put4(x, y, R.wall + '_0' + y);
      } else put4(x, y, R.floor);
    }
    for (const [piece, x0, y0] of R.put) {
      for (const [dx, dy, name] of cellsOf(piece)) {
        const x = x0 + dx, y = y0 + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) { problems.push(piece + ' sticks out of the room at ' + x + ',' + y); continue; }
        if (OBJECT.has(tid(name))) {
          if (vo[y * w + x] !== VOID) problems.push(piece + ' overlaps ' + objName[y * w + x] + ' at ' + x + ',' + y);
          vo[y * w + x] = tid(name);
          objName[y * w + x] = piece;
        } else {
          put4(x, y, name);
          if (/shelf/.test(piece)) { solidBase[y * w + x] = 1; objName[y * w + x] = piece; }
        }
      }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // furniture where you can't walk, nothing in the way where you can
      const ch = R.plan[y][x], k = y * w + x;
      if (ch === 'x' && vo[k] === VOID && !solidBase[k]) problems.push('nothing solid at ' + x + ',' + y);
      if ('.EUD'.includes(ch) && vo[k] !== VOID) problems.push(objName[k] + ' stands in the way at ' + x + ',' + y);
    }
    m.vq = vq; m.vo = vo; m.vqPad = 0; m.vqW = w; m.vqH = h; m.vqKind = 'room'; m.vqSheet = 'interior'; m.vqStale = false; m.vqMode = null;
    const v = tid('void');
    m.vqEdge = new Uint16Array(16).fill(0).map((_, i) => v * 4 + (i & 3));
    m.objName = objName;
    m.roomProblems = problems;
    return m;
  };
  // which piece stands at (x, y) in a room ('bookshelf_2x2', 'tv_1x2'...), or null
  PA.roomObject = (m, x, y) => (m.objName && m.inb(x, y) ? m.objName[y * m.w + x] : null);

  function roomMap(id, R, opts) {
    const h = R.plan.length, w = R.plan[0].length;
    const map = new PA.GameMap(id, w, h, { indoor: true, border: T.black, borderPal: 'grey', music: opts.music || 'house', name: opts.name });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = map.i(x, y);
      map.tiles[k] = T.floor; // what a cell *is* indoors is its collision (and roomObject); the look is map.vq / map.vo
      map.coll[k] = COLL[R.plan[y][x]] === undefined ? C.SOLID : COLL[R.plan[y][x]];
    }
    map.room = R;
    return PA.furnish(map);
  }
  PA.buildRoom = function (name, id, opts) {
    const R = ROOMS[name];
    if (!R) throw new Error('no room called ' + name);
    return roomMap(id, R, opts || {});
  };

  // ---------------------------------------------------------------- a townsperson's house, furnished from its seed
  const FLOORS = ['floor_wood_light', 'floor_wood_light', 'floor_wood_dark', 'floor_tatami'];
  PA.buildHouse = function (id, rng, opts) {
    opts = opts || {};
    const W = 8, H = 8;
    const plan = [], put = [];
    for (let y = 0; y < H; y++) plan.push((y === 0 ? '#' : '.').repeat(W).split(''));
    const used = new Set();
    const free = (x, y, w, hh) => { for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + w; xx++) if (xx < 0 || xx >= W || yy >= H || used.has(xx + ',' + yy) || plan[yy][xx] === 'E') return false; return true; };
    const place = (piece, x, y, solidFrom) => { // solidFrom: the first row of the piece that blocks the way (wall rows are solid anyway)
      const [w, hh] = IT.pieces[piece] || [1, 1];
      for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + w; xx++) { used.add(xx + ',' + yy); if (yy > 0 && yy >= y + (solidFrom || 0)) plan[yy][xx] = 'x'; }
      put.push([piece, x, y]);
    };
    const floor = rng.pick(FLOORS);
    // the back wall: windows, a picture or a clock here and there
    for (let x = 0; x < W; x++) {
      const r = rng.next();
      if (r < 0.3) put.push(['window_curtains', x, 0]);
      else if (r < 0.42) put.push([rng.pick(['picture_frame', 'wall_clock', 'calendar', 'wall_shelf']), x, 0]);
    }
    const unwall = (x) => { for (let i = put.length - 1; i >= 0; i--) if (put[i][2] === 0 && put[i][1] === x && !IT.pieces[put[i][0]]) put.splice(i, 1); };
    // tall things against the back wall: bookshelves, a dresser, a wardrobe, a fireplace, the kitchen, a TV
    const nTall = rng.int(1, 3);
    for (let i = 0; i < nTall; i++) {
      const piece = rng.pick(['bookshelf_1x2', 'bookshelf_1x2', 'dresser_1x2', 'grandfather_clock_1x2', 'wardrobe_2x2', 'fireplace_2x2', 'bookshelf_2x2']);
      const pw = (IT.pieces[piece] || [1])[0], x = rng.int(0, W - pw);
      if (!free(x, 0, pw, 2)) continue;
      for (let k = 0; k < pw; k++) unwall(x + k);
      place(piece, x, 0);
    }
    if (rng.chance(0.35)) { // a little kitchen
      const x = rng.int(0, W - 3);
      if (free(x, 0, 3, 2)) ['fridge_1x2', 'stove_1x2', 'sink_counter_1x2'].forEach((p, k) => { unwall(x + k); place(p, x + k, 0); });
    }
    if (rng.chance(0.6)) { const x = rng.int(1, 6); if (free(x, 0, 1, 2)) { unwall(x); place('tv_1x2', x, 0); } }
    // a table with chairs, on a rug
    if (rng.chance(0.85)) {
      const tx = rng.int(2, 4), ty = rng.int(3, 4);
      if (free(tx, ty, 2, 2)) {
        if (rng.chance(0.5)) put.unshift(['rug_red_3x3', tx - 1 + rng.int(0, 1), ty - 1]);
        place('chair_down', tx, ty); place('chair_down', tx + 1, ty); place('table_2x1', tx, ty + 1);
        if (rng.chance(0.7) && free(tx - 1, ty + 1, 1, 1)) place('stool', tx - 1, ty + 1);
        if (rng.chance(0.7) && free(tx + 2, ty + 1, 1, 1)) place('armchair', tx + 2, ty + 1);
      }
    }
    // plants in the corners, perhaps a bed, perhaps a fish tank
    for (const x of [0, 7]) if (rng.chance(0.55) && free(x, 6, 1, 2)) place('potted_plant_1x2', x, 6);
    if (rng.chance(0.4)) { const x = rng.pick([0, 7]); if (free(x, 3, 1, 2)) place('bed_1x2', x, 3); }
    if (rng.chance(0.25)) { const x = rng.pick([4, 5]); if (free(x, 6, 2, 1) && free(x, 7, 2, 1)) place('fish_tank_2x1', x, 6); }
    // the way out
    plan[7][2] = 'E'; plan[7][3] = 'E';
    put.push(['exit_mat', 2, 7], ['exit_mat', 3, 7]);
    // no rug under the furniture at the edges of the room: keep it inside
    for (const p of put) if (p[0] === 'rug_red_3x3') { p[1] = Math.max(0, Math.min(W - 3, p[1])); p[2] = Math.max(1, Math.min(H - 4, p[2])); }
    const R = { floor, wall: 'wall_house_1x2', plan: plan.map((r) => r.join('')), put };
    return roomMap(id, R, { name: opts.name, music: 'house' });
  };
})(window.PA);
