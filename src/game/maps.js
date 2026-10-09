// Procedural Adventures - map model, tile semantics, palettes, prefab rooms
'use strict';
(function (PA) {
  const A = window.PA_ASSETS;
  const T = (PA.T = A.tileNames);
  PA.STAMPS = A.stamps;

  // collision / behaviour codes
  const C = (PA.C = {
    WALK: 0, SOLID: 1, GRASS: 2, WATER: 3, LEDGE: 4, COUNTER: 5, DOOR: 6, MAT: 7, STAIRS: 8, CAVE: 9, WARP: 10,
  });
  PA.walkable = (c) => c === C.WALK || c === C.GRASS || c === C.DOOR || c === C.MAT || c === C.STAIRS || c === C.CAVE || c === C.WARP;

  // Sprites. A number is a row of the object sheet (PA_ASSETS.chars: the parcel, the letter and the jump shadow,
  // and the emote bubbles - original art from art/objects, built by tools/build_objects.py). A string names a character from the original
  // sheets in art/npcs (src/gen/people.js); every sheet is available under its own name
  // (PA.SPR.angler, PA.SPR.milkmaid, ...), and the game's roles are aliases onto them.
  PA.SPR = { misc: 0, emote: 1 };
  if (window.PA_PEOPLE) for (const k in window.PA_PEOPLE.chars) PA.SPR[k] = k;
  Object.assign(PA.SPR, {
    prof: 'professor', nurse: 'medic', granny: 'grandma', youngster: 'kid', youngster2: 'kid',
    scholar: 'bookworm', scholar2: 'bookworm', sage: 'wizard', sailor: 'pirate', officer: 'redcoat',
    bugboy: 'scout', scientist: 'scout', lass: 'twin_buns', girl: 'twin_buns',
    lady2: 'mrs_bennet', oldman: 'old_man_a', oldman2: 'old_man_b', beauty: 'debutante', squire: 'sir_william',
    maid: 'miss_mary', cooltrainer: 'col_forster', boss: 'prejudice_boss',
    // rival, mother, sister, lady, gentleman, woman, hiker, kid, farmer: sheets of the same name
  });
  // A creature out and about (a town pet, the creature asleep across the road): 'mon:<species id>', drawn
  // with its party icon.
  PA.isCreature = (spr) => typeof spr === 'string' && spr.startsWith('mon:');
  PA.monSpr = (id) => 'mon:' + id;
  PA.isPerson = (spr) => typeof spr === 'string' && !PA.isCreature(spr);
  // a character's display name, where its sheet folder gives one (art/npcs/*/meta.json), e.g. 'SIR GARETH'
  PA.personName = (key) => (window.PA_PEOPLE && window.PA_PEOPLE.names[key]) || null;
  // the objects (art/objects, tools/build_objects.py): frames of row PA.SPR.misc; row PA.SPR.emote holds the bubbles
  PA.MISC = { parcel: 1, paper: 8, shadow: 9 };

  // default palette per named tile
  const DEFAULT_PAL = {
    white: 'grass', black: 'grey', tree: 'tree', tree_dark: 'treeDark', tree_lite: 'tree', tuft: 'grass', hatch: 'grass',
    tall: 'tall', flower: 'flower', flower_b: 'flower', flower_c: 'flowerY', posts: 'wood', sign: 'wood', mailbox: 'wall',
    ledge: 'ledge', ledge_l: 'ledge', ledge_r: 'ledge', ledge_flat: 'ledge',
    water: 'water', water_t: 'water', water_tl: 'water', water_tr: 'water', water_l: 'water', water_r: 'water',
    water_b: 'water', water_bl: 'water', water_br: 'water',
    stump: 'forest', ffloor: 'forest', ftall: 'forest', btree_00: 'forest', btree_10: 'forest', btree_01: 'forest', btree_11: 'forest',
    cfloor: 'cave', cwall: 'cave', cstairs: 'cave', cladder: 'cave', craised: 'cave', cdark: 'cave',
    mtop: 'mountain', mface: 'mountain', mcave: 'mountain', mside: 'mountain', mside_r: 'mountain',
  };
  PA.defPal = (name) => DEFAULT_PAL[name] || 'grey';

  // palette index registry (maps store a byte per cell)
  const palNames = Object.keys(PA.gfx.PAL);
  PA.palId = (n) => { let i = palNames.indexOf(n); if (i < 0) { palNames.push(n); i = palNames.length - 1; } return i; };
  PA.palName = (i) => palNames[i];

  // ---------------------------------------------------------------- map class
  class GameMap {
    constructor(id, w, h, opts) {
      opts = opts || {};
      this.id = id; this.w = w; this.h = h;
      this.tiles = new Uint16Array(w * h);
      this.pals = new Uint8Array(w * h);
      this.coll = new Uint8Array(w * h);
      this.zone = new Int16Array(w * h).fill(-1);
      this.over = new Map(); // decorative overrides
      this.warps = []; this.npcs = []; this.signs = []; this.items = []; this.triggers = []; this.buildings = [];
      this.name = opts.name || id;
      this.music = opts.music || 'town';
      this.indoor = !!opts.indoor;
      this.border = opts.border !== undefined ? opts.border : T.tree;
      this.borderPal = PA.palId(opts.borderPal || 'tree');
      this.encounters = null;  // {rate, list:[[id, minLv, maxLv, weight]]}
      this.zones = [];         // overworld zone descriptors
      this.dark = !!opts.dark;
      this.graded = opts.graded !== undefined ? opts.graded : !this.indoor;
    }
    i(x, y) { return y * this.w + x; }
    inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    set(x, y, tile, pal, coll) {
      if (!this.inb(x, y)) return;
      const k = this.i(x, y);
      const t = typeof tile === 'string' ? T[tile] : tile;
      this.tiles[k] = t;
      this.pals[k] = PA.palId(pal || (typeof tile === 'string' ? PA.defPal(tile) : 'grey'));
      if (coll !== undefined) this.coll[k] = coll;
      if (this.vq) this.vqStale = true; // src/game/dress.js re-dresses it before the next draw
    }
    tileAt(x, y) { return this.inb(x, y) ? this.tiles[this.i(x, y)] : this.border; }
    palAt(x, y) { return this.inb(x, y) ? this.pals[this.i(x, y)] : this.borderPal; }
    collAt(x, y) { return this.inb(x, y) ? this.coll[this.i(x, y)] : C.SOLID; }
    setColl(x, y, c) { if (this.inb(x, y)) this.coll[this.i(x, y)] = c; }
    fill(x0, y0, w, h, tile, pal, coll) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, tile, pal, coll); }
    // place a building stamp; rowPals: palette per row. Each building is remembered so that
    // src/game/dress.js can draw it in the new tileset (tag: what it is, e.g. 'library').
    stamp(name, x0, y0, rowPals, tag) {
      const s = PA.STAMPS[name];
      for (let ty = 0; ty < s.h; ty++) for (let tx = 0; tx < s.w; tx++) {
        const k = this.i(x0 + tx, y0 + ty);
        if (!this.inb(x0 + tx, y0 + ty)) continue;
        this.tiles[k] = s.t[ty][tx];
        this.pals[k] = PA.palId(rowPals[Math.min(ty, rowPals.length - 1)]);
        this.coll[k] = C.SOLID;
      }
      const door = s.door ? { x: x0 + s.door[0], y: y0 + s.door[1] } : null;
      if (door) this.coll[this.i(door.x, door.y)] = C.DOOR;
      this.buildings.push({ name, tag, x: x0, y: y0, w: s.w, h: s.h, door, roof: rowPals[0] });
      if (this.vq) this.vqStale = true;
      return door;
    }
    npcAt(x, y) { return this.npcs.find((n) => n.visible() && ((n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y))); }
    signAt(x, y) { return this.signs.find((s) => s.x === x && s.y === y); }
    itemAt(x, y) { return this.items.find((s) => s.x === x && s.y === y && !PA.flag('item:' + s.key)); }
    warpAt(x, y) { return this.warps.find((w) => w.x === x && w.y === y); }
    zoneAt(x, y) { return this.inb(x, y) ? this.zone[this.i(x, y)] : -1; }
  }
  PA.GameMap = GameMap;

  // The rooms (prefab and procedural) are in src/game/rooms.js.
})(window.PA);
