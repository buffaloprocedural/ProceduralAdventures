// Procedural Adventures - graphics: 160x144 screen, 2-bit sheets, palette colourisation, font, boxes
'use strict';
(function (PA) {
  const W = 160, H = 144;
  const G = (PA.gfx = { W, H });
  let canvas, ctx;

  // ---------------------------------------------------------------- palettes
  // Each palette: 4 colours, lightest -> darkest (GB shade order).
  const P = (a, b, c, d) => [a, b, c, d].map(PA.hexToRgb);
  G.PAL = {
    grey: P('#f8f8f8', '#a8a8a8', '#585858', '#101010'),
    text: P('#fbf7ee', '#c9c1b0', '#5d5a66', '#17151f'),
    // overworld
    ground: P('#fbf6e2', '#d9cf98', '#8f8a52', '#25261a'),
    grass: P('#f3f8dc', '#9fd08a', '#4f8f4f', '#12301b'),
    tall: P('#eaf5c8', '#86c46a', '#3b7a3f', '#0f2a18'),
    tree: P('#eef6d6', '#8cc46c', '#3f7a44', '#102414'),
    treeDark: P('#e3efc8', '#6fa95c', '#2f5f39', '#0c1d10'),
    flower: P('#fffaf0', '#a8d68a', '#e0506a', '#3a1420'),
    flowerY: P('#fffaf0', '#a8d68a', '#e8b030', '#3a2410'),
    water: P('#eaf6ff', '#86c2f0', '#3a72c0', '#0f2048'),
    ledge: P('#f3f8dc', '#a6cf7e', '#7a6a3a', '#2a2010'),
    wood: P('#fbf0dc', '#d8a868', '#8a5a30', '#2a1808'),
    wall: P('#fbfaf2', '#dcd6c8', '#8c8478', '#22201c'),
    roofRed: P('#fff2e8', '#f2906e', '#b83a2c', '#3a1010'),
    roofBlue: P('#eef4ff', '#8eaaf0', '#3a54b8', '#101838'),
    roofGreen: P('#f2fae6', '#8ed08a', '#2f8a52', '#0f2a18'),
    roofPurple: P('#f8f0ff', '#c09ae0', '#7040a8', '#201030'),
    roofTeal: P('#ecfbf8', '#7ccdc4', '#2a8a86', '#0c2826'),
    roofOrange: P('#fff6e6', '#f2b860', '#c06a20', '#3a1c08'),
    mountain: P('#f6efe0', '#cdb48c', '#86684a', '#2a1c12'),
    cave: P('#f0e4d0', '#c0a080', '#76583e', '#22160e'),
    caveDeep: P('#d8d0e8', '#9890b8', '#585078', '#181428'),
    forest: P('#e6f2c8', '#7cb860', '#2e6a3a', '#0a1e10'),
    // interiors
    floor: P('#fbf2e0', '#e2c69c', '#a47c52', '#2c1e12'),
    floorBlue: P('#f4f6ff', '#c4cbe8', '#6c76a8', '#1a1e34'),
    floorPink: P('#fff6f6', '#f2c4c8', '#b8687a', '#2e141a'),
    iwall: P('#f6f8ff', '#bcc6dc', '#6a7898', '#1a2030'),
    shelf: P('#fbf2e0', '#d8b080', '#8a5a34', '#24140a'),
    plant: P('#f4fae0', '#8ccc70', '#3a7a3e', '#10220e'),
    mat: P('#fff0e8', '#e88070', '#a83838', '#2a0c0c'),
    machine: P('#f8fbff', '#b8c8d8', '#607088', '#141c28'),
    lab: P('#f6f8fa', '#c8d0d8', '#707e8c', '#182028'),
    stone: P('#f4f0ea', '#c4b8a8', '#7c6e60', '#221c16'),
    // battle / ui
    hpGreen: P('#ffffff', '#58d858', '#289828', '#000000'),
    shadow: P('#000000', '#000000', '#000000', '#000000'),
    // characters
    cRed: P('#fbe8d8', '#f06048', '#a02820', '#181010'),
    cBlue: P('#fbe8d8', '#6890f0', '#283c98', '#101018'),
    cGreen: P('#fbe8d8', '#68b858', '#2a6a2a', '#101810'),
    cBrown: P('#fbe8d8', '#c08850', '#6a4020', '#181008'),
    cPurple: P('#fbe8d8', '#b078d8', '#5a2a88', '#140c1c'),
    cPink: P('#fbe8d8', '#f088b0', '#a83a68', '#1c0c14'),
    cGrey: P('#fbe8d8', '#a0a0a8', '#505058', '#101014'),
    cTeal: P('#fbe8d8', '#58c0b8', '#1f6e68', '#0c1818'),
    cGold: P('#fbe8d8', '#e8b840', '#906010', '#181008'),
    cNavy: P('#fbe8d8', '#7078c0', '#2a2c70', '#0c0c18'),
  };
  // time-of-day grading for the three acts
  G.tod = 'day';
  function grade(rgb, mode) {
    let [r, g, b] = rgb;
    if (mode === 'noon') { r = r * 0.98 + 8; g = g * 0.97 + 4; b = b * 0.9 + 2; }
    else if (mode === 'dusk') {
      const l = (r + g + b) / 765; // lights warm to amber, shadows cool to violet
      r = r * 0.92 + 18 * l + 6; g = g * 0.9 + 4 * l; b = b * 0.8 + 18 * (1 - l) + 12;
    } else if (mode === 'night') { r = r * 0.55 + 4; g = g * 0.6 + 8; b = b * 0.78 + 26; }
    return [PA.clamp(Math.round(r), 0, 255), PA.clamp(Math.round(g), 0, 255), PA.clamp(Math.round(b), 0, 255)];
  }
  G.grade = grade;

  // ---------------------------------------------------------------- sheets
  const sheets = {};
  function loadImage(uri) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = uri; });
  }
  // 2-bit sheet: greyscale PNG -> shade indices (255 = transparent)
  async function decode(uri) {
    const img = await loadImage(uri);
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data;
    const idx = new Uint8Array(img.width * img.height);
    for (let i = 0, j = 0; i < idx.length; i++, j += 4) {
      if (d[j + 3] < 128) idx[i] = 255;
      else { const v = d[j]; idx[i] = v > 212 ? 0 : v > 127 ? 1 : v > 42 ? 2 : 3; }
    }
    return { w: img.width, h: img.height, idx };
  }
  G.load = async function () {
    const A = window.PA_ASSETS;
    const keys = ['chars', 'fx'];
    // Full-colour sheets. A missing or broken character sheet is skipped (drawn as nothing), not fatal; the
    // two tilesets are required, as nothing else can draw the maps (the old placeholder tiles are retired).
    const M = window.PA_MASCOT;
    const extra = { hero: window.PA_HERO, people: window.PA_PEOPLE, mascot: M && M.overworld, creatures: window.PA_CREATURES,
      world: window.PA_WORLD_TILES, interior: window.PA_INTERIOR_TILES };
    const built = { hero: 'hero.js', people: 'people.js', mascot: 'mascot.js', creatures: 'creatures.js (tools/build_creatures.py)', world: 'world_tiles.js (tools/build_world_tiles.py)',
      interior: 'interior_tiles.js (tools/build_interior_tiles.py)' };
    const required = ['world', 'interior'];
    const names = Object.keys(extra).filter((k) => extra[k]);
    const [out, imgs] = await Promise.all([
      Promise.all(keys.map((k) => decode(A[k]))),
      Promise.all(names.map((k) => loadImage(extra[k].png).catch(() => null))),
    ]);
    keys.forEach((k, i) => (sheets[k] = out[i]));
    names.forEach((k, i) => { if (imgs[i]) full[k] = { img: imgs[i], meta: extra[k] }; });
    for (const k of Object.keys(extra)) if (!full[k] && !required.includes(k)) console.warn('Procedural Adventures: ' + k + ' sprites missing - rebuild src/gen/' + built[k]);
    buildFont();
    for (const k of required) {
      if (!full[k]) throw new Error('the ' + k + ' tileset is missing - rebuild src/gen/' + built[k]);
      animOf[k] = [];
      for (const t in full[k].meta.anim || {}) animOf[k][+t] = full[k].meta.anim[t];
    }
  };

  // colourise a region of a sheet into a canvas
  function colourise(sheet, sx, sy, w, h, pal, opts) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const im = x.createImageData(w, h);
    const d = im.data;
    const transWhite = opts && opts.transWhite;
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const v = sheet.idx[(sy + yy) * sheet.w + sx + xx];
        const j = (yy * w + xx) * 4;
        if (v === 255 || (transWhite && v === 0)) { d[j + 3] = 0; continue; }
        const col = pal[v];
        d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = 255;
      }
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  G.colourise = colourise;

  const cache = new Map();
  function palOf(p, graded) {
    const pal = typeof p === 'string' ? G.PAL[p] || G.PAL.grey : p;
    if (!graded || G.tod === 'day') return pal;
    return pal.map((c) => grade(c, G.tod));
  }
  // whole-sheet colourisation cached per palette (+time of day)
  function sheetCanvas(name, palName, graded) {
    const key = name + '|' + palName + '|' + (graded ? G.tod : 'day');
    let c = cache.get(key);
    if (!c) {
      const s = sheets[name];
      c = colourise(s, 0, 0, s.w, s.h, palOf(palName, graded));
      cache.set(key, c);
    }
    return c;
  }
  G.sheetCanvas = sheetCanvas;
  G.clearCache = () => cache.clear();

  // ---------------------------------------------------------------- screen
  G.init = function (cv) {
    canvas = cv;
    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    G.ctx = ctx;
    G.canvas = canvas;
    window.addEventListener('resize', G.resize);
    window.addEventListener('orientationchange', () => setTimeout(G.resize, 150)); // iOS reports the new size late
    G.resize();
  };
  G.resize = function () {
    const touch = document.body.classList.contains('touch');
    const full = document.body.classList.contains('full');
    const vw = window.innerWidth, vh = window.innerHeight;
    // a phone held upright: the screen spans the full width at the top, and the pad below gets the rest (src/style.css)
    const portrait = touch && !full && vh > vw;
    document.body.classList.toggle('portrait', portrait);
    if (portrait) {
      const bezel = document.getElementById('bezel');
      const notch = bezel ? parseFloat(getComputedStyle(bezel).paddingTop) || 0 : 0;
      const s = Math.min(vw / W, (vh - notch - 200) / H); // full width, unless that would squeeze the pad
      canvas.style.width = Math.floor(W * s) + 'px';
      canvas.style.height = Math.floor(H * s) + 'px';
      G.scale = s;
      return;
    }
    let availW = vw - (full ? 0 : touch ? 28 : 80);
    let availH = vh - (full ? 0 : touch ? 230 : 110);
    let s = Math.floor(Math.min(availW / W, availH / H));
    if (s < 1) s = Math.max(availW / W, 0.5); // tiny screens: still hard-edged via CSS
    canvas.style.width = W * s + 'px';
    canvas.style.height = H * s + 'px';
    G.scale = s;
  };

  G.clear = function (col) {
    ctx.fillStyle = col || '#f8f8f8';
    ctx.fillRect(0, 0, W, H);
  };
  G.rect = function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); };
  G.rgb = (c) => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  G.palColour = (p, i, graded) => G.rgb(palOf(p, graded)[i]);

  // ---------------------------------------------------------------- characters
  // frames: 0 down,1 down-walk,2 down-walk2,3 up,4 up-walk,5 up-walk2,6 left,7 left-walk,8 right,9 right-walk
  G.char = function (row, frame, pal, x, y, opts) {
    const c = sheetCanvas('chars', pal, true);
    const flip = opts && opts.flip;
    const scale = (opts && opts.scale) || 1;
    if (flip) {
      ctx.save();
      ctx.translate(x + 16 * scale, y);
      ctx.scale(-1, 1);
      ctx.drawImage(c, frame * 16, row * 16, 16, 16, 0, 0, 16 * scale, 16 * scale);
      ctx.restore();
    } else ctx.drawImage(c, frame * 16, row * 16, 16, 16, x, y, 16 * scale, 16 * scale);
  };

  // ---------------------------------------------------------------- full-colour character sheets
  // Original art (art/protagonist, art/npcs; built by tools/build_hero.py, build_people.py). Colours are kept
  // as drawn; only the act's time-of-day grading is applied, like every other sprite. Graded copies share `cache`.
  const full = {}; // name -> { img, meta }
  function fullCanvas(name, mode) {
    mode = mode || G.tod;
    const key = name + '|full|' + mode;
    let c = cache.get(key);
    if (c) return c;
    const img = full[name].img;
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    if (mode !== 'day') {
      const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const g = grade([d[i], d[i + 1], d[i + 2]], mode);
        d[i] = g[0]; d[i + 1] = g[1]; d[i + 2] = g[2];
      }
      x.putImageData(im, 0, 0);
    }
    cache.set(key, c);
    return c;
  }
  // Draw one 16x16 frame of character `who` from a full-colour sheet.
  // dir: down|up|left|right ; step: 0 standing, 1/2 the two walking feet
  function drawFull(name, who, dir, step, x, y, opts) {
    const s = full[name];
    if (!s) return; // sheet failed to load (G.load warned): draw nothing rather than stop the game
    const M = s.meta, cell = M.cell;
    const [cx, cy] = M.chars[who] || Object.values(M.chars)[0];
    const row = M.rows[dir] || 0, col = M.cols[step] || 0;
    const sc = (opts && opts.scale) || 1;
    ctx.drawImage(fullCanvas(name), (cx + col) * cell, (cy + row) * cell, cell, cell, Math.round(x), Math.round(y), cell * sc, cell * sc);
  }
  const sheetOf = (who) => (full.mascot && full.mascot.meta.chars[who] ? 'mascot' : 'people');
  // the player can also be someone from the NPC sheets (GULLIVER, now and then)
  G.hero = (who, dir, step, x, y, opts) => (window.PA_HERO && window.PA_HERO.chars[who] ? drawFull('hero', who, dir, step, x, y, opts) : G.person(who, dir, step, x, y, opts));
  G.person = (who, dir, step, x, y, opts) => drawFull(sheetOf(who), who, dir, step, x, y, opts);
  // the distinct-looking protagonists (the title screen cycles through them)
  G.heroKinds = function () {
    const H = window.PA_HERO;
    if (!H) return ['boy'];
    const seen = new Set();
    return Object.keys(H.chars).filter((k) => { const id = H.chars[k].join(','); return !seen.has(id) && seen.add(id); });
  };

  // ---------------------------------------------------------------- the tilesets
  // Original tiles: the overworld (art/tiles; tools/build_world_tiles.py) and the interiors (art/interior;
  // tools/build_interior_tiles.py). Maps are drawn in 8x8 quarters of their 16x16 tiles (src/game/dress.js,
  // src/game/rooms.js): a quarter is tile * 4 + (0 nw, 1 ne, 2 sw, 3 se), or WQ_VOID for deep forest shade.
  // Rooms add a layer of furniture, one whole tile per cell, drawn over the floor. mode is the grading:
  // day/noon/dusk, or 'night' deep underground.
  const VOID = (G.WQ_VOID = 0xffff);
  const animOf = {}; // sheet -> tile -> its frames, for water and flowers (filled by G.load)
  const voidCol = {};
  // look the sheet up once per frame, then hand it to G.wcell / G.wobj
  G.tileSheet = (name, mode) => ({ c: fullCanvas(name, mode), cols: full[name].meta.cols, anim: animOf[name], mode });
  // one map cell: its four quarters are a[k .. k+3]
  G.wcell = function (S, a, k, x, y, tick) {
    const c = S.c, cols = S.cols, anim = S.anim, f = (tick / 32) | 0, r0 = a[k];
    if ((r0 & 3) === 0 && a[k + 1] === r0 + 1 && a[k + 2] === r0 + 2 && a[k + 3] === r0 + 3) { // most cells: one whole tile
      let t = r0 >> 2;
      const an = anim[t];
      if (an) t = an[f % an.length];
      ctx.drawImage(c, (t % cols) * 16, ((t / cols) | 0) * 16, 16, 16, x, y, 16, 16);
      return;
    }
    for (let q = 0; q < 4; q++) {
      const ref = a[k + q], dx = x + (q & 1) * 8, dy = y + (q >> 1) * 8;
      if (ref === VOID) {
        ctx.fillStyle = voidCol[S.mode] || (voidCol[S.mode] = G.rgb(S.mode === 'day' ? [26, 38, 32] : grade([26, 38, 32], S.mode)));
        ctx.fillRect(dx, dy, 8, 8);
        continue;
      }
      let t = ref >> 2;
      const an = anim[t];
      if (an) t = an[f % an.length];
      ctx.drawImage(c, (t % cols) * 16 + (ref & 1) * 8, ((t / cols) | 0) * 16 + (ref & 2) * 4, 8, 8, dx, dy, 8, 8);
    }
  };
  // a piece of furniture (a whole tile, drawn over the floor with its transparency)
  G.wobj = (S, t, x, y) => ctx.drawImage(S.c, (t % S.cols) * 16, ((t / S.cols) | 0) * 16, 16, 16, x, y, 16, 16);
  // the front row of tall grass, drawn over the feet of whoever is standing in it (top = the cell's top)
  G.wgrass = function (x, top, mode) {
    const s = full.world;
    const key = 'world|grass|' + mode;
    let g = cache.get(key);
    if (!g) {
      const M = s.meta, t = M.names.tall_grass, src = fullCanvas('world', mode);
      g = document.createElement('canvas');
      g.width = 16; g.height = 8;
      const gx = g.getContext('2d');
      gx.drawImage(src, (t % M.cols) * 16, ((t / M.cols) | 0) * 16 + 8, 16, 8, 0, 0, 16, 8);
      const im = gx.getImageData(0, 0, 16, 8), d = im.data;
      const bg = [d[0], d[1], d[2]]; // the grass between the blades
      for (let i = 0; i < d.length; i += 4) if (d[i] === bg[0] && d[i + 1] === bg[1] && d[i + 2] === bg[2]) d[i + 3] = 0;
      gx.putImageData(im, 0, 0);
      cache.set(key, g);
    }
    ctx.drawImage(g, Math.round(x), Math.round(top) + 8);
  };

  // ---------------------------------------------------------------- creature sprites
  // The roster's battle sets (src/gen/creatures.js): per creature a 32x32 front view and back view, drawn at
  // 2x, and a two-frame 16x16 party icon. A set is found by the species' name.
  function creatureSet(id) {
    const s = full.creatures, sp = PA.species && PA.species(id);
    if (!s || !sp) return null;
    const at = s.meta.sets[sp.n];
    return at ? { s, x: at[0], y: at[1] } : null;
  }
  function silhouette(s, colour) { // the enemy's dark outline before it is revealed
    const key = 'creatures|sil|' + colour;
    let img = cache.get(key);
    if (!img) {
      img = document.createElement('canvas'); img.width = s.img.width; img.height = s.img.height;
      const x2 = img.getContext('2d'); x2.drawImage(s.img, 0, 0);
      x2.globalCompositeOperation = 'source-atop'; x2.fillStyle = colour; x2.fillRect(0, 0, img.width, img.height);
      cache.set(key, img);
    }
    return img;
  }
  // which: 'front' (the enemy's slot: 56px box, hanging from its top) or 'back' (the player's: 32px box at 2x,
  // standing on its floor). opts: scale, squash (0..1, shrink to bottom-centre), clipBottom (faint slide),
  // pal (a silhouette in pal[3]), flip.
  G.mon = function (id, which, x, y, opts) {
    opts = opts || {};
    const c = creatureSet(id);
    if (!c) return;
    const { s } = c;
    const img = opts.pal ? silhouette(s, G.rgb(opts.pal[3])) : s.img;
    const [ox, oy] = s.meta[which === 'back' ? 'back' : 'front'], S32 = s.meta.size;
    const sx = c.x + ox, sy = c.y + oy;
    const box = which === 'front' ? 56 : 32, sc = opts.scale || (which === 'back' ? 2 : 1);
    let w = 64 * sc / (which === 'back' ? 2 : 1), h = w; // fill the 64px battle slot
    let dx = x + (box * sc - w) / 2, dy = which === 'front' ? y : y + box * sc - h;
    if (opts.squash !== undefined && opts.squash < 1) { dx += w * (1 - opts.squash) / 2; dy += h * (1 - opts.squash); w *= opts.squash; h *= opts.squash; }
    if (opts.clipBottom) { // faint slide: only the rows above the cut, shifted down
      const vis = S32 - opts.clipBottom * S32 / h;
      if (vis <= 0) return;
      ctx.drawImage(img, sx, sy, S32, vis, Math.round(dx), Math.round(dy + opts.clipBottom), w, vis * h / S32);
      return;
    }
    if (opts.flip) {
      ctx.save(); ctx.translate(Math.round(dx) + w, Math.round(dy)); ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, S32, S32, 0, 0, w, h);
      ctx.restore();
    } else ctx.drawImage(img, sx, sy, S32, S32, Math.round(dx), Math.round(dy), w, h);
  };
  // the 16x16 party icon (frame 0 or 1)
  G.monIcon = function (id, frame, x, y) {
    const c = creatureSet(id);
    if (!c) return;
    const [ix, iy] = c.s.meta.icons[frame ? 1 : 0], n = c.s.meta.icon;
    ctx.drawImage(c.s.img, c.x + ix, c.y + iy, n, n, Math.round(x), Math.round(y), n, n);
  };
  G.mascotIcon = (frame, x, y) => G.monIcon(PA.GULL_ID, frame, x, y);

  // ---------------------------------------------------------------- fx (battle-effect tiles, tools/build_fx.py)
  // each tile comes at 16x16 (row 0), drawn when the effect is shown at double size or more, and at 8x8 (row 1)
  G.fx = function (tile, pal, x, y, opts) {
    const c = sheetCanvas('fx', pal || 'grey', false);
    const sc = (opts && opts.scale) || 1;
    const big = sc >= 2, n = big ? 16 : 8;
    const sx = tile * n, sy = big ? 0 : 16;
    if (opts && (opts.flipX || opts.flipY)) {
      ctx.save();
      ctx.translate(x + (opts.flipX ? 8 * sc : 0), y + (opts.flipY ? 8 * sc : 0));
      ctx.scale(opts.flipX ? -1 : 1, opts.flipY ? -1 : 1);
      ctx.drawImage(c, sx, sy, n, n, 0, 0, 8 * sc, 8 * sc);
      ctx.restore();
    } else ctx.drawImage(c, sx, sy, n, n, x, y, 8 * sc, 8 * sc);
  };

  // ---------------------------------------------------------------- font
  // Bitmap8, an original proportional 8-bit font (art/font, src/gen/font.js): 5x7 glyphs in 8x8 cells,
  // each with its own advance (most 6px; digits all 6, so numbers line up). Tinted to any colour.
  let fontCanvas = {};
  let glyphIndex = {}, glyphAdv = [], glyphAlias = {};
  function hexBits(hex) {
    const rows = [];
    for (let i = 0; i < 8; i++) rows.push(parseInt(hex.substr(i * 2, 2), 16));
    return rows;
  }
  function buildFont() {
    const F = window.PA_FONT;
    if (!F) throw new Error('the font is missing - rebuild src/gen/font.js (tools/build_font.py)');
    const chars = Object.keys(F.glyphs);
    chars.forEach((ch, i) => { glyphIndex[ch] = i; glyphAdv[i] = F.glyphs[ch][1]; });
    glyphAlias = F.alias || {};
    G.fontChars = chars;
    G._fontBits = chars.map((ch) => F.glyphs[ch][0]);
  }
  function fontFor(colour) {
    let c = fontCanvas[colour];
    if (c) return c;
    const n = G._fontBits.length;
    c = document.createElement('canvas');
    c.width = n * 8; c.height = 8;
    const x = c.getContext('2d');
    x.fillStyle = colour;
    G._fontBits.forEach((rows, i) => {
      for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 8; xx++) if (rows[yy] & (128 >> xx)) x.fillRect(i * 8 + xx, yy, 1, 1);
    });
    fontCanvas[colour] = c;
    return c;
  }
  // the glyph a character is drawn with (undefined = none: drawn as a gap)
  function glyphOf(ch) {
    if (!G.fontChars && window.PA_FONT) buildFont(); // measured before init (headless tests): the font is plain data
    let gi = glyphIndex[ch];
    if (gi === undefined && glyphAlias[ch]) gi = glyphIndex[glyphAlias[ch]];
    if (gi === undefined) gi = glyphIndex[ch.toUpperCase()];
    return gi;
  }
  // shorthand the game's strings use, spelled out in the font's own letters
  const EXPAND = { '⒧': 'Lv' };
  const expand = (str) => (/[⒧]/.test(str) ? str.replace(/[⒧]/g, (c) => EXPAND[c]) : String(str));
  const advOf = (ch) => { const gi = glyphOf(ch); return gi === undefined ? (ch === ' ' ? 4 : 6) : glyphAdv[gi]; };
  G.textWidth = function (str, sc) {
    let w = 0;
    for (const ch of expand(str)) w += advOf(ch);
    return w * (sc || 1);
  };
  G.INK = '#17151f';
  G.PAPER = '#ffffff';
  G.hasGlyph = (ch) => glyphOf(ch) !== undefined;
  // squeeze: px taken off every advance (G.textFit)
  function draw(str, x, y, colour, sc, squeeze) {
    const c = fontFor(colour || G.INK);
    sc = sc || 1;
    let cx = x;
    for (const ch of expand(str)) {
      const gi = glyphOf(ch);
      if (gi !== undefined && ch !== ' ') ctx.drawImage(c, gi * 8, 0, 8, 8, Math.round(cx), y, 8 * sc, 8 * sc);
      cx += (advOf(ch) - (squeeze || 0)) * sc;
    }
  }
  G.text = function (str, x, y, colour) { draw(str, x, y, colour); };
  // text squeezed to fit maxW when it would not fit as it is (long attack names)
  G.textFit = function (str, x, y, maxW, colour) {
    const w = G.textWidth(str);
    if (w <= maxW) return draw(str, x, y, colour);
    const n = [...expand(str)].length;
    draw(str, x, y, colour, 1, Math.min(2, Math.ceil((w - maxW) / Math.max(1, n))));
  };
  G.textR = function (str, xRight, y, colour) { draw(str, xRight - G.textWidth(str), y, colour); };
  G.textC = function (str, cx, y, colour) { draw(str, Math.round(cx - G.textWidth(str) / 2), y, colour); };
  // a menu row: the part after a tab is right-aligned at xRight (prices, counts)
  G.textCols = function (str, x, xRight, y, colour) {
    const i = str.indexOf('\t');
    if (i < 0) return draw(str, x, y, colour);
    draw(str.slice(0, i), x, y, colour);
    G.textR(str.slice(i + 1), xRight, y, colour);
  };
  // big text (scaled glyphs) for title cards
  G.textBig = function (str, x, y, colour, sc, shadow) {
    if (shadow) draw(str, x + sc, y + sc, shadow, sc);
    draw(str, x, y, colour, sc);
  };

  // ---------------------------------------------------------------- windows (a 90s desktop look, drawn here)
  // grey bevelled windows round sunken white fields, navy selection bars, an arrowhead cursor
  const UI = G.UI = {
    face: '#c5c3cb', hi: '#ffffff', light: '#e4e2ea', shadow: '#82808e', dark: '#1a1824',
    sel: '#20288a', selDim: '#d3d6ea', selText: '#ffffff', title: '#20288a', title2: '#4c86cc', grey: '#8f8a96',
  };
  const R = (x, y, w, h, c) => { if (w > 0 && h > 0) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); } };
  // a 1px bevel: tl colour on the top and left edges, br on the bottom and right
  G.bevel = function (x, y, w, h, tl, br) {
    R(x, y, w - 1, 1, tl); R(x, y, 1, h - 1, tl);
    R(x, y + h - 1, w, 1, br); R(x + w - 1, y, 1, h, br);
  };
  // raised grey panel (buttons, status panels): ink outline, highlight/shadow bevel, face
  G.panel = function (x, y, w, h, opts) {
    opts = opts || {};
    R(x, y, w, h, UI.dark);
    if (opts.pressed) G.bevel(x + 1, y + 1, w - 2, h - 2, UI.shadow, UI.light);
    else G.bevel(x + 1, y + 1, w - 2, h - 2, UI.hi, UI.shadow);
    R(x + 2, y + 2, w - 4, h - 4, opts.face || UI.face);
  };
  // sunken field (text areas, bars)
  G.well = function (x, y, w, h, paper) {
    G.bevel(x, y, w, h, UI.shadow, UI.hi);
    R(x + 1, y + 1, w - 2, h - 2, paper || G.PAPER);
  };
  // the standard window: a raised frame with a sunken field 4px in, where the text sits (from x+8)
  G.box = function (x, y, w, h, opts) {
    opts = opts || {};
    G.panel(x, y, w, h);
    G.well(x + 3, y + 3, w - 6, h - 6, opts.paper);
  };
  // a header strip (navy fading to blue) with white lettering
  G.titleBar = function (x, y, w, title) {
    const a = [32, 40, 138], b = [76, 134, 204];
    for (let i = 0; i < w; i++) {
      const t = i / Math.max(1, w - 1);
      R(x + i, y, 1, 9, 'rgb(' + a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(',') + ')');
    }
    G.text(title, x + 2, y + 1, UI.selText);
  };
  // a window with a header; its field starts at y+13
  G.window = function (x, y, w, h, title, opts) {
    opts = opts || {};
    G.panel(x, y, w, h);
    G.titleBar(x + 3, y + 3, w - 6, title);
    G.well(x + 3, y + 13, w - 6, h - 16, opts.paper);
  };
  // the selected row of a list: a navy bar, or a pale one while the menu waits on another
  G.selBar = function (x, y, w, h, dim) { R(x, y, w, h, dim ? UI.selDim : UI.sel); };
  // the selection bar behind a row of text drawn at y, in a list spaced `spacing` apart
  G.selRow = function (x, y, w, spacing, dim) {
    if (spacing >= 12) G.selBar(x, y - 2, w, 11, dim); else G.selBar(x, y - 1, w, 9, dim);
  };
  // the cursor: a little outlined arrowhead pointing right, in the 8px slot at (x, y)
  const POINTER = ['X', 'XX', 'XWX', 'XWWX', 'XWWWX', 'XWWX', 'XWX', 'XX', 'X'];
  G.cursor = function (x, y) {
    POINTER.forEach((row, j) => { for (let i = 0; i < row.length; i++) R(x + i, y + j, 1, 1, row[i] === 'X' ? UI.dark : UI.hi); });
  };
  // a small solid triangle, pointing 'up', 'down' or 'right' (w wide)
  G.tri = function (x, y, dir, col, w) {
    w = w || 7;
    const n = Math.ceil(w / 2);
    for (let k = 0; k < n; k++) {
      if (dir === 'up') R(x + n - 1 - k, y + k, 2 * k + 1, 1, col);
      else if (dir === 'down') R(x + k, y + k, w - 2 * k, 1, col);
      else R(x + k, y + k, 1, w - 2 * k, col);
    }
  };
  // "more to read": a navy triangle bobbing gently
  G.more = function (x, y, t, col) { G.tri(x + 1, y + 2 + (((t || 0) >> 4) % 2), 'down', col || UI.sel); };
  // more of a list above / below: small triangles at the right
  G.scrollMarks = function (x, yTop, yBottom, up, down) {
    if (up) G.tri(x, yTop, 'up', UI.sel, 5);
    if (down) G.tri(x, yBottom - 3, 'down', UI.sel, 5);
  };
  // a sunken bar filled to frac (0..1), with a lighter top edge
  G.progress = function (x, y, w, h, frac, col) {
    G.well(x, y, w, h, '#ffffff');
    const n = Math.ceil((w - 2) * Math.max(0, Math.min(1, frac)));
    if (n <= 0) return;
    col = col || UI.sel;
    R(x + 1, y + 1, n, h - 2, col);
    if (h > 4) { ctx.globalAlpha = 0.45; R(x + 1, y + 1, n, 1, '#ffffff'); ctx.globalAlpha = 1; }
  };
  G.hpColour = (f) => (f > 0.5 ? '#30b040' : f > 0.2 ? '#e8a810' : '#e03020');
  // an etched dividing line
  G.etch = function (x, y, w) { R(x, y, w, 1, UI.shadow); R(x, y + 1, w, 1, UI.hi); };

  // ---------------------------------------------------------------- screen fx
  // stepped fade, level 0..4 (retro palette-step look)
  G.fade = function (level, colour) {
    if (level <= 0) return;
    const a = [0, 0.3, 0.55, 0.8, 1][Math.min(4, Math.round(level))];
    ctx.globalAlpha = a;
    ctx.fillStyle = colour || '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  };
  G.save = () => ctx.save();
  G.restore = () => ctx.restore();
  G.alpha = (a) => (ctx.globalAlpha = a);
})(window.PA);
