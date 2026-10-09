// Procedural Adventures - overworld: movement, NPCs, interaction, triggers, warps, and the script API
'use strict';
(function (PA) {
  const G = PA.gfx, I = PA.input, C = PA.C, T = PA.T, S = PA.SPR;
  const OW = (PA.ow = {});

  // ---------------------------------------------------------------- NPC runtime
  class NPC {
    constructor(spec) {
      Object.assign(this, spec);
      this.home = { x: spec.x, y: spec.y };
      this.px = 0; this.py = 0; this.moving = false; this.tx = spec.x; this.ty = spec.y;
      this.timer = 40 + Math.floor(Math.random() * 120);
      this.step = 0; this.dir = spec.dir || 'down';
      this.emote = null;
    }
    visible() {
      if (PA.flag('hide:' + this.key)) return false;
      if (this.temp && !this.spawned) return false;
      return !this.cond || this.cond();
    }
    defeated() { return this.trainer && PA.flag('tr:' + this.trainer.key); }
  }
  OW.NPC = NPC;

  const player = (OW.player = { x: 0, y: 0, dir: 'down', px: 0, py: 0, moving: false, step: 0, jump: 0, speed: 1, turnWait: 0, bumpT: 0 });
  OW.npcs = [];
  OW.map = null;

  // GULLIVER, when he's following you (src/game/mascot.js decides): he walks into the tile you just left
  // (or, in a story about escorting someone home, that someone: src/game/tales.js)
  const follower = (OW.follower = { on: false, x: 0, y: 0, fx: 0, fy: 0, dir: 'down', t: 1, step: 0, spr: 'gulliver', chat: null });
  OW.followerInfo = () => (PA.taleFollower && PA.taleFollower()) || null; // someone you're walking home
  OW.placeFollower = function () {
    const info = OW.followerInfo();
    follower.on = !!info && !!OW.map;
    if (info) { follower.spr = info.spr; follower.chat = info.chat; }
    if (!follower.on) return;
    const m = OW.map, back = PA.OPP[player.dir];
    follower.x = player.x; follower.y = player.y; // fallback: tucked behind you until your first step
    for (const dir of [back, 'left', 'right', player.dir]) {
      const d = PA.DIRS[dir], x = player.x + d.x, y = player.y + d.y;
      if (m.inb(x, y) && PA.walkable(m.collAt(x, y)) && m.collAt(x, y) !== C.DOOR && m.collAt(x, y) !== C.WARP && !OW.npcAt(x, y)) { follower.x = x; follower.y = y; break; }
    }
    follower.fx = follower.x; follower.fy = follower.y; follower.t = 1; follower.dir = player.dir;
  };
  const followerAt = (x, y) => follower.on && follower.t >= 1 && follower.x === x && follower.y === y && !(x === player.x && y === player.y);
  OW.anim = 0;

  // ---------------------------------------------------------------- map entry
  OW.enterMap = function (id, x, y, dir) {
    const map = PA.world.maps[id];
    OW.map = map; OW.mapId = id;
    player.x = x; player.y = y; player.dir = dir || player.dir; player.px = player.py = 0; player.moving = false; player.jump = 0;
    OW.npcs = (map.npcSpecs || []).map((s) => new NPC(s));
    OW.placeFollower();
    PA.state.pos = { map: id, x, y, dir: player.dir };
    OW.lastZone = map.id === 'overworld' ? map.zoneAt(x, y) : -2;
    OW.updateMusic(true);
    if (map.onEnter) PA.script(map.onEnter());
    // triggers also fire when you arrive on them through a door
    for (const t of map.triggers) {
      if (x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h && (!t.cond || t.cond())) { PA.script(t.script()); break; }
    }
    if (map.id !== 'overworld' && !map.indoor) OW.banner(PA.sub(map.name));
    if (map.dungeon && !OW._bannerShown) OW.banner(PA.sub(map.name));
  };
  OW.banner = function (text) {
    for (const s of PA.scenes) if (s instanceof PA.Banner) PA.pop(s);
    PA.push(new PA.Banner(text));
  };
  OW.zoneMusic = function () {
    const map = OW.map;
    if (!map) return 'town';
    if (map.id === 'overworld') {
      const z = map.zones[map.zoneAt(player.x, player.y)];
      if (!z) return 'route';
      if (PA.state.act >= 3 && z.kind !== 'town') return 'dusk';
      if (z.kind === 'town') return 'town:' + z.name;
      if (z.kind === 'glade') return 'forest';
      if (z.kind === 'gate') return 'tension';
      if (z.kind === 'passage') return z.music;
      return 'route:' + z.n;
    }
    if (map.dungeon) return map.music;
    return map.music || 'house';
  };
  OW.song = function (key) {
    PA.songs = PA.songs || {};
    if (!PA.songs[key]) PA.songs[key] = PA.audio.compose(PA.world.seed + ':' + key, key.split(':')[0]);
    return PA.songs[key];
  };
  OW.updateMusic = function (force) {
    if (OW.musicLock) return;
    const k = OW.zoneMusic();
    if (force || PA.audio.current() !== k) PA.audio.play(k, OW.song(k));
  };
  OW.playMusic = function (k) { OW.musicLock = true; PA.audio.play(k, OW.song(k)); };
  OW.restoreMusic = function () { OW.musicLock = false; OW.updateMusic(true); };

  // ---------------------------------------------------------------- queries
  OW.npc = (key) => OW.npcs.find((n) => n.key === key && n.visible());
  OW.npcAt = (x, y) => OW.npcs.find((n) => n.visible() && n.spr !== undefined && ((n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y)));
  OW.free = function (x, y, ignore) {
    const m = OW.map;
    if (!m.inb(x, y)) return false;
    const c = m.collAt(x, y);
    if (!PA.walkable(c) || c === C.DOOR || c === C.WARP || c === C.STAIRS) return false;
    if (player.x === x && player.y === y) return false;
    const n = OW.npcAt(x, y);
    if (n && n !== ignore) return false;
    return true;
  };
  OW.refreshNPCs = function () { /* visibility is evaluated live; nothing to do */ };

  // ---------------------------------------------------------------- update
  OW.busy = () => {
    if (PA.scriptBusy()) return true;
    const st = PA.scenes;
    for (let i = st.length - 1; i >= 0; i--) if (!st[i].passive) return st[i] !== OW.scene;
    return true;
  };
  // walk-sheet frames: 0 down, 1-2 down-walk, 3 up, 4-5 up-walk, 6-7 left, 8-9 right
  function frameFor(n, dir, walking, alt) {
    if (n.frame !== undefined) return n.frame;
    if (dir === 'down') return walking ? (alt ? 2 : 1) : 0;
    if (dir === 'up') return walking ? (alt ? 5 : 4) : 3;
    if (dir === 'left') return walking ? 7 : 6;
    return walking ? 9 : 8;
  }

  function tryMove(dir) {
    const m = OW.map;
    player.dir = dir;
    const d = PA.DIRS[dir];
    const nx = player.x + d.x, ny = player.y + d.y;
    // exit mats: stepping down while on a mat leaves the building
    if (dir === 'down' && m.collAt(player.x, player.y) === C.MAT) {
      const w = m.warpAt(player.x, player.y);
      if (w) { PA.script(OW.doWarp(w)); return; }
    }
    if (!m.inb(nx, ny)) {
      bump(); return;
    }
    const c = m.collAt(nx, ny);
    if (c === C.LEDGE) {
      if (dir === 'down' && OW.free(nx, ny + 1)) { startMove(dir, 2); PA.audio.sfx('ledge'); return; }
      bump(); return;
    }
    if (c === C.DOOR) { if (dir === 'up') { startMove(dir, 1); return; } bump(); return; }
    if (c === C.WARP || c === C.STAIRS) { startMove(dir, 1); return; }
    if (!PA.walkable(c)) { bump(); return; }
    if (OW.npcAt(nx, ny)) { bump(); return; }
    startMove(dir, 1);
  }
  function bump() {
    if (player.bumpT <= 0) { PA.audio.sfx('bump'); player.bumpT = 18; }
  }
  function startMove(dir, tiles) {
    player.moving = true; player.dir = dir; player.tiles = tiles; player.prog = 0; player.step++;
    player.jump = tiles === 2 ? 1 : 0;
    if (follower.on && (follower.x !== player.x || follower.y !== player.y)) { // follow into the tile you're leaving
      follower.fx = follower.x; follower.fy = follower.y;
      const dx = player.x - follower.x, dy = player.y - follower.y;
      follower.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      follower.x = player.x; follower.y = player.y; follower.t = 0; follower.step++;
    }
  }
  function finishMove() {
    const d = PA.DIRS[player.dir];
    player.x += d.x * player.tiles; player.y += d.y * player.tiles;
    player.px = player.py = 0; player.moving = false; player.jump = 0;
    PA.state.pos = { map: OW.mapId, x: player.x, y: player.y, dir: player.dir };
    PA.state.steps = (PA.state.steps || 0) + 1;
    afterStep();
  }
  function afterStep() {
    const m = OW.map;
    // poison damage while walking (it never makes a creature faint here)
    if (PA.state.steps % 4 === 0) {
      let hurt = false;
      for (const p of PA.state.party) if (p.status === 'PSN' && p.hp > 1) { p.hp--; hurt = true; }
      if (hurt && PA.state.steps % 16 === 0) { G.flash = 4; PA.audio.sfx('hitWeak'); }
    }
    if (PA.state.repel > 0) { PA.state.repel--; if (PA.state.repel === 0) PA.script(PA.say('LAVENDER WATER\'s effect wore off.')); }
    // warps
    const w = m.warpAt(player.x, player.y);
    const c = m.collAt(player.x, player.y);
    if (w && (c === C.DOOR || c === C.WARP || c === C.STAIRS || (c === C.MAT && player.dir === 'down'))) { PA.script(OW.doWarp(w)); return; }
    // zone change
    if (m.id === 'overworld') {
      const z = m.zoneAt(player.x, player.y);
      if (z !== OW.lastZone && z >= 0) {
        OW.lastZone = z;
        const zone = m.zones[z];
        OW.banner(zone.name);
        OW.updateMusic();
        if (zone.kind === 'town' && PA.world.cells) { /* nothing */ }
        PA.state.visited = PA.state.visited || {};
        PA.state.visited[z] = 1;
      }
    }
    // triggers
    for (const t of m.triggers) {
      if (player.x >= t.x && player.x < t.x + t.w && player.y >= t.y && player.y < t.y + t.h && (!t.cond || t.cond())) {
        PA.script(t.script());
        return;
      }
    }
    // trainers
    if (checkSight()) return;
    // encounters
    if (c === C.GRASS || c === C.CAVE) {
      let enc = m.encounters;
      if (m.id === 'overworld') { const z = m.zones[m.zoneAt(player.x, player.y)]; enc = z && z.enc; }
      if (enc && PA.rand.next() < enc.rate && PA.state.party.some((p) => p.hp > 0)) {
        const e = PA.rollEncounter(enc, PA.rand);
        const lead = PA.state.party.find((p) => p.hp > 0);
        if (PA.state.repel > 0 && lead && e.lv < lead.level) return;
        PA.script(OW.wildBattle(e.id, e.lv));
      }
    }
  }
  function checkSight() {
    for (const n of OW.npcs) {
      if (!n.visible()) continue;
      const sight = n.trainer ? (n.trainer.sight || 3) : 0;
      if (!sight || n.defeated() || n.engaged) continue;
      const d = PA.DIRS[n.dir];
      for (let k = 1; k <= sight; k++) {
        const x = n.x + d.x * k, y = n.y + d.y * k;
        if (player.x === x && player.y === y) { PA.script(trainerSpotted(n, k)); return true; }
        const c = OW.map.collAt(x, y);
        if (!PA.walkable(c) || OW.npcAt(x, y)) break;
      }
    }
    return false;
  }
  function* trainerSpotted(n, dist) {
    n.engaged = true;
    PA.audio.jingle(PA.audio.J.spotted);
    yield* OW.emote(n, 'exclaim');
    for (let k = 1; k < dist; k++) yield* OW.walkNPC(n, [n.dir]);
    OW.facePlayerTo(n);
    yield* trainerTalk(n);
    n.engaged = false;
  }
  function* trainerTalk(n) {
    const t = n.trainer;
    if (n.defeated()) { yield* PA.say(t.after); return; }
    yield* PA.say(t.intro);
    const res = yield* OW.trainerBattle(t);
    if (res === 'win') PA.setFlag('tr:' + t.key);
  }

  OW.update = function () {
    OW.anim++;
    if (G.flash > 0) G.flash--;
    if (player.bumpT > 0) player.bumpT--;
    const m = OW.map;
    if (!m) return;
    // NPCs
    for (const n of OW.npcs) updateNPC(n);
    // player
    if (player.moving) {
      const sp = player.speed;
      player.prog += sp;
      const total = 16 * player.tiles;
      const d = PA.DIRS[player.dir];
      player.px = d.x * Math.min(player.prog, total);
      player.py = d.y * Math.min(player.prog, total);
      if (follower.t < 1) follower.t = Math.min(1, player.prog / total);
      if (player.prog >= total) finishMove();
      return;
    }
    if (OW.busy()) return;
    if (I.pressed.start) { PA.audio.sfx('menu'); PA.script(PA.menus.start()); return; }
    if (I.pressed.select) { PA.script(PA.menus.journal()); return; }
    if (I.pressed.a) { interact(); return; }
    const dir = I.dir();
    player.speed = I.held.b ? 2 : 1;
    if (dir) {
      if (dir !== player.dir && !I.pressed[dir] && player.turnWait <= 0) { /* keep walking direction */ }
      if (dir !== player.dir && I.pressed[dir]) { player.dir = dir; player.turnWait = 5; return; }
      if (player.turnWait > 0) { player.turnWait--; if (!I.held[dir]) return; if (player.turnWait > 0) return; }
      tryMove(dir);
    } else player.turnWait = 0;
  };
  function updateNPC(n) {
    if (!n.visible()) return;
    if (n.emoteT > 0) n.emoteT--;
    if (n.moving) {
      n.prog += 1;
      const d = PA.DIRS[n.dir];
      n.px = d.x * n.prog; n.py = d.y * n.prog;
      if (n.prog >= 16) { n.x = n.tx; n.y = n.ty; n.px = n.py = 0; n.moving = false; }
      return;
    }
    if (OW.busy() || n.scripted) return;
    if (n.move === 'wander' || n.move === 'turn') {
      if (--n.timer > 0) return;
      n.timer = 60 + Math.floor(Math.random() * 120);
      const dir = PA.rand.pick(['up', 'down', 'left', 'right']);
      if (n.move === 'turn' || n.trainer) { n.dir = dir; if (n.trainer && !player.moving) checkSight(); return; }
      const d = PA.DIRS[dir];
      const nx = n.x + d.x, ny = n.y + d.y;
      n.dir = dir;
      if (Math.abs(nx - n.home.x) > 2 || Math.abs(ny - n.home.y) > 2) return;
      if (!OW.free(nx, ny, n) || OW.map.collAt(nx, ny) === C.GRASS) return;
      npcStep(n, dir);
    }
  }
  function npcStep(n, dir) {
    const d = PA.DIRS[dir];
    n.dir = dir; n.tx = n.x + d.x; n.ty = n.y + d.y; n.moving = true; n.prog = 0; n.step = (n.step || 0) + 1;
  }

  function interact() {
    const m = OW.map;
    const d = PA.DIRS[player.dir];
    let x = player.x + d.x, y = player.y + d.y;
    if (followerAt(x, y)) { follower.dir = PA.OPP[player.dir]; if (follower.chat) PA.script(follower.chat()); return; }
    let n = OW.npcAt(x, y);
    const sign0 = m.signAt(x, y);
    // talk across counters
    if (!n && m.collAt(x, y) === C.COUNTER) { x += d.x; y += d.y; n = OW.npcAt(x, y); }
    if (n) { PA.script(talkTo(n)); return; }
    const it = m.itemAt(x, y);
    if (it) { PA.script(pickItem(it)); return; }
    if (sign0 && !sign0.counter) {
      PA.script((function* () {
        if (sign0.script) { const r = sign0.script(); if (r && r.next) yield* r; }
        else yield* PA.say(sign0.text);
      })());
      return;
    }
    const c = m.collAt(x, y);
    if (c === C.WATER) { PA.script(PA.say(PA.rand.pick(['The water is calm. It reflects the sky, and you, and nothing else.', 'A gentle pond. Down there, a GLUMPH is having a very ordinary day.']))); return; }
    const t = m.tileAt(x, y);
    if (t === T.tree || t === T.tree_dark || t === T.tree_lite) {
      if (PA.rand.chance(0.08)) PA.script(PA.say('It\'s a tree. It\'s been a tree as long as this world has existed. It seems at peace with that.'));
    }
  }
  function* talkTo(n) {
    if (n.move !== 'none' && (PA.isPerson(n.spr) || PA.isCreature(n.spr) || n.spr >= 0) && n.frame === undefined) { n.dir = PA.OPP[player.dir]; }
    n.scripted = true;
    if (n.cry && n.text) {
      const id = PA.speciesId[n.text.split(':')[0]];
      if (id) PA.audio.cry(id);
    }
    try {
      if (n.trainer) yield* trainerTalk(n);
      else if (n.talk) yield* n.talk(n);
      else if (n.text) yield* PA.say(typeof n.text === 'function' ? n.text() : n.text);
    } finally { n.scripted = false; }
  }
  function* pickItem(it) {
    PA.setFlag('item:' + it.key);
    OW.map.setColl(it.x, it.y, OW.map.tileAt(it.x, it.y) === T.cfloor || OW.map.tileAt(it.x, it.y) === T.cdark ? C.CAVE : C.WALK);
    yield* OW.give(it.item, 1, false, false, 'found');
  }

  // ---------------------------------------------------------------- rendering
  OW.draw = function () {
    const m = OW.map;
    if (!m) return;
    const bx = player.x * 16 + player.px - 64;
    const by = player.y * 16 + player.py - 64;
    const camX = Math.round(bx), camY = Math.round(by);
    OW.camX = camX; OW.camY = camY;
    const tx0 = Math.floor(camX / 16), ty0 = Math.floor(camY / 16);
    const ox = -(camX - tx0 * 16), oy = -(camY - ty0 * 16);
    G.clear(m.dark ? '#201810' : '#f3f8dc');
    if (m.vq) { // the tilesets, in quarters (outdoors: src/game/dress.js; rooms: src/game/rooms.js, plus furniture)
      if (m.vqStale) PA.redress(m);
      const mode = OW.mode(m), S = G.tileSheet(m.vqSheet || 'world', mode), P = m.vqPad, vo = m.vo, V = G.WQ_VOID;
      for (let ty = 0; ty <= 10; ty++) for (let tx = 0; tx <= 11; tx++) {
        const mx = tx0 + tx, my = ty0 + ty, vx = mx + P, vy = my + P, sx = ox + tx * 16, sy = oy + ty * 16;
        if (vx >= 0 && vy >= 0 && vx < m.vqW && vy < m.vqH) {
          const k = vy * m.vqW + vx;
          G.wcell(S, m.vq, k * 4, sx, sy, OW.anim);
          if (vo && vo[k] !== V) G.wobj(S, vo[k], sx, sy);
        } else G.wcell(S, m.vqEdge, ((my & 1) * 2 + (mx & 1)) * 4, sx, sy, OW.anim); // the border, by parity
      }
    }
    // items
    for (const it of m.items) {
      if (PA.flag('item:' + it.key)) continue;
      const sx = it.x * 16 - camX, sy = it.y * 16 - camY - 4;
      if (sx < -16 || sy < -16 || sx > 176 || sy > 160) continue;
      G.char(S.misc, PA.MISC.parcel, 'cBrown', sx, sy);
    }
    // characters sorted by y
    const list = OW.npcs.filter((n) => n.visible() && n.spr !== undefined && (PA.isPerson(n.spr) || PA.isCreature(n.spr) || n.spr >= 0));
    const all = list.map((n) => ({ n, y: n.y * 16 + n.py }));
    all.push({ n: player, y: player.y * 16 + player.py, isPlayer: true });
    if (follower.on) all.push({ n: follower, y: (follower.fy + (follower.y - follower.fy) * follower.t) * 16 - 0.5, isFollower: true });
    all.sort((a, b) => a.y - b.y);
    for (const e of all) {
      if (e.isPlayer) drawPlayer(camX, camY);
      else if (e.isFollower) drawFollower(camX, camY);
      else drawNPC(e.n, camX, camY);
    }
    // night/dusk vignette in caves
    if (m.dark) {
      const ctx = G.ctx;
      const grd = ctx.createRadialGradient(72, 64, 30, 72, 64, 110);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(10,6,20,0.45)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, 160, 144);
    }
    if (G.flash > 0) G.fade(2, '#ffffff');
  };
  OW.mode = (m) => (m.vqMode === 'deep' ? 'night' : m.graded ? G.tod : 'day');
  // Tall grass in front of a sprite: the front row of tufts of the grass cell(s) its feet are in, lined up
  // with the tiles, so it covers the feet as they walk in and lets go as they walk out. (wx, wy): the
  // sprite's top-left as drawn, in world pixels.
  function grassOver(wx, wy) {
    const m = OW.map;
    if (!m.vq) return; // only outdoor maps have tall grass
    const feet = Math.floor((wy + 15) / 16), c0 = Math.floor(wx / 16), c1 = Math.floor((wx + 15) / 16);
    for (let c = c0; c <= c1; c++) if (m.collAt(c, feet) === C.GRASS) G.wgrass(c * 16 - OW.camX, feet * 16 - OW.camY, OW.mode(m));
  }
  function drawPlayer(camX, camY) {
    const walking = player.moving && (player.prog % 16) < 8;
    const alt = player.step % 2 === 1;
    const sx = player.x * 16 + player.px - camX, sy0 = player.y * 16 + player.py - camY - 4;
    let sy = sy0;
    if (player.jump) {
      const t = player.prog / 32;
      sy -= Math.round(Math.sin(t * Math.PI) * 10);
      G.char(S.misc, PA.MISC.shadow, 'grey', sx, sy0 + 2);
    }
    G.hero(PA.heroWho(), player.dir, walking ? (alt ? 2 : 1) : 0, sx, sy);
    if (!player.jump) grassOver(sx + camX, sy0 + camY);
    if (OW.playerEmote > 0) { G.char(S.emote, OW.playerEmoteKind || 2, 'grey', sx, sy - 16); OW.playerEmote--; }
  }
  function drawFollower(camX, camY) {
    const f = follower, t = f.t;
    const wx = (f.fx + (f.x - f.fx) * t) * 16, wy = (f.fy + (f.y - f.fy) * t) * 16;
    const sx = Math.round(wx - camX), sy0 = Math.round(wy - camY - 4);
    if (sx < -16 || sy0 < -20 || sx > 176 || sy0 > 160) return;
    const far = Math.abs(f.x - f.fx) + Math.abs(f.y - f.fy) > 1; // hopping a ledge after you
    const sy = far && t < 1 ? sy0 - Math.round(Math.sin(t * Math.PI) * 8) : sy0;
    const walking = t < 1 && (t * 16) % 16 < 8;
    G.person(f.spr || 'gulliver', f.dir, walking ? (f.step % 2 ? 2 : 1) : 0, sx, sy);
    if (sy === sy0) grassOver(sx + camX, sy0 + camY);
  }
  function drawNPC(n, camX, camY) {
    const sx = n.x * 16 + n.px - camX, sy = n.y * 16 + n.py - camY - 4;
    if (sx < -16 || sy < -20 || sx > 176 || sy > 160) return;
    const walking = n.moving && n.prog < 8;
    const alt = (n.step || 0) % 2 === 1;
    if (PA.isPerson(n.spr)) G.person(n.spr, n.dir, walking ? (alt ? 2 : 1) : 0, sx, sy);
    else if (PA.isCreature(n.spr)) G.monIcon(+n.spr.slice(4), n.sleepy ? 0 : walking ? (alt ? 1 : 0) : (OW.anim >> 5) & 1, sx, sy);
    else G.char(n.spr, frameFor(n, n.dir, walking, alt), n.pal || 'cGrey', sx, sy);
    grassOver(sx + camX, sy + camY);
    if (n.emoteT > 0) G.char(S.emote, n.emoteKind || 2, 'grey', sx, sy - 16);
  }

  // ---------------------------------------------------------------- script API
  OW.sayRnd = (arr) => PA.say(PA.rand.pick(arr));
  OW.has = (item) => (PA.state.bag[item] || 0) > 0;
  OW.take = (item, n) => { PA.state.bag[item] = Math.max(0, (PA.state.bag[item] || 0) - (n || 1)); if (!PA.state.bag[item]) delete PA.state.bag[item]; };
  OW.addItem = (item, n) => { PA.state.bag[item] = (PA.state.bag[item] || 0) + (n || 1); };
  OW.give = function* (item, n, key, quest, verb) {
    n = n || 1;
    OW.addItem(item, n);
    const info = PA.itemInfo(item);
    const isKey = key || info.kind === 'key';
    PA.audio.jingle(isKey ? PA.audio.J.key : PA.audio.J.item);
    const what = n > 1 ? item + ' ×' + n : item;
    yield* PA.say('{PLAYER} ' + (verb || 'received') + ' ' + what + '!', { });
    yield* PA.wait(10);
  };
  OW.giveMoney = function* (n) { PA.state.money += n; PA.audio.sfx('buy'); yield* PA.say('{PLAYER} received £' + n + '!'); };
  OW.partyHasType = (t) => PA.state.party.some((p) => p.types.includes(t)) || (PA.state.box || []).some((p) => PA.species(p.id).t.includes(t));
  OW.addJournal = function (text) {
    PA.state.journal = PA.state.journal || [];
    PA.state.journal.push(PA.sub(text));
  };
  OW.heal = function* (quiet) {
    for (const p of PA.state.party) p.heal();
    const f = yield* PA.fadeOut('#ffffff', 10);
    PA.audio.jingle(PA.audio.J.heal);
    yield* PA.wait(70);
    yield* PA.fadeIn(f, 10);
    if (OW.map && OW.map.healPoint !== false) PA.state.lastHeal = { map: OW.mapId, x: player.x, y: player.y, dir: player.dir };
  };
  OW.nurse = function* () {
    yield* PA.say('Good day! You look as though you have had an adventure. We mend tired creatures here, free of charge, and ask no impertinent questions.');
    const yes = yield* PA.yesno('Shall I see to your team?');
    if (!yes) { yield* PA.say('Another time, then! Ideally not on a stretcher.'); return; }
    yield* PA.say('Wonderful. I shan\'t be a moment.');
    for (const p of PA.state.party) p.heal();
    PA.audio.jingle(PA.audio.J.heal);
    OW.healing = 100;
    yield* PA.wait(100);
    PA.state.lastHeal = { map: OW.mapId, x: 3, y: 3, dir: 'up' };
    yield* PA.say('There we are! All in fine fettle. Do call again, though not too soon.');
  };
  // the LODGINGS: where creatures stay while the team is full (state.box)
  OW.lodgings = function* () {
    yield* PA.say('{PLAYER} opened the LODGINGS register.');
    const box = PA.state.box;
    const ch = yield* PA.choose(null, ['COLLECT', 'LODGE', 'CLOSE'], { cancel: 2 });
    if (ch === 0) {
      if (!box.length) { yield* PA.say('Nobody is lodging here just now. The rooms are very tidy.'); return; }
      if (PA.state.party.length >= 6) { yield* PA.say('Your party is full!'); return; }
      const i = yield* PA.menu(box.map((m) => m.name + '\t⒧' + m.level).concat(['CANCEL']), { x: 8, y: 0, cancel: box.length });
      if (i < 0 || i >= box.length) return;
      const [m] = box.splice(i, 1);
      PA.state.party.push(m);
      yield* PA.say(m.name + ' came down to join you. It blinks at the light.');
    } else if (ch === 1) {
      if (PA.state.party.length <= 1) { yield* PA.say('You can\'t send away your last creature!'); return; }
      const i = yield* PA.menus.pickParty('Who will take a room?');
      if (i < 0) return;
      const [m] = PA.state.party.splice(i, 1);
      box.push(m);
      yield* PA.say(m.name + ' took a room. It seems glad of a lie-down.');
    }
  };
  const moneyBox = { passive: true, update() {}, draw() {
    G.window(88, 0, 72, 26, 'MONEY');
    G.textR('£' + PA.state.money, 152, 15);
  } };
  OW.moneyBox = moneyBox;
  OW.shop = function* (stock) {
    PA.push(moneyBox);
    yield* PA.say('Good day! What may I fetch for you?', { keep: true });
    for (;;) {
      const ch = yield* PA.menu(['BUY', 'SELL', 'GOOD DAY'], { x: 0, y: 0, w: 88, h: 56, cancel: 2 });
      for (const s of PA.scenes.slice()) if (s instanceof PA.TextBox) PA.pop(s);
      if (ch === 0) yield* PA.menus.buy(stock);
      else if (ch === 1) yield* PA.menus.sell();
      else break;
      yield* PA.say('Is there anything else I can do?', { keep: true });
    }
    for (const s of PA.scenes.slice()) if (s instanceof PA.TextBox) PA.pop(s);
    PA.pop(moneyBox);
    yield* PA.say('Thank you! Come again!');
  };
  OW.face = (n, d) => { n.dir = d; };
  OW.facePlayer = (d) => { player.dir = d; };
  OW.faceNPCToPlayer = (n) => { n.dir = dirTo(n.x, n.y, player.x, player.y); };
  OW.facePlayerTo = (n) => { if (n) player.dir = dirTo(player.x, player.y, n.x, n.y); };
  function dirTo(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  OW.walkNPC = function* (n, dirs) {
    n.scripted = true;
    for (const d of dirs) {
      npcStep(n, d);
      while (n.moving) yield;
    }
    n.scripted = false;
  };
  OW.walkPlayer = function* (dirs) {
    for (const d of dirs) {
      startMove(d, 1);
      while (player.moving) yield;
    }
  };
  OW.emote = function* (who, kind) {
    const k = kind === 'question' ? 3 : kind === 'smile' ? 1 : 2;
    if (who === 'player') { OW.playerEmote = 40; OW.playerEmoteKind = k; }
    else { who.emoteT = 40; who.emoteKind = k; }
    PA.audio.sfx('select');
    yield* PA.wait(40);
  };
  OW.spawnNear = function (spec) {
    // put a temporary NPC on a free tile next to the player (prefer in front)
    const order = [player.dir, 'up', 'down', 'left', 'right'];
    for (const d of order) {
      for (let dist = 1; dist <= 2; dist++) {
        const v = PA.DIRS[d];
        const x = player.x + v.x * dist, y = player.y + v.y * dist;
        if (OW.free(x, y)) {
          const n = new NPC(Object.assign({}, spec, { x, y }));
          n.spawned = true;
          OW.npcs.push(n);
          return n;
        }
      }
    }
    return null;
  };
  OW.walkAway = function* (n) {
    const dirs = ['down', 'left', 'right', 'up'].sort(() => PA.rand.next() - 0.5);
    for (let k = 0; k < 3; k++) {
      const d = dirs.find((dd) => { const v = PA.DIRS[dd]; return OW.free(n.x + v.x, n.y + v.y, n) && !(n.x + v.x === player.x && n.y + v.y === player.y); });
      if (!d) break;
      yield* OW.walkNPC(n, [d]);
    }
    PA.setFlag('hide:' + n.key);
    if (n.temp) { const i = OW.npcs.indexOf(n); if (i >= 0) OW.npcs.splice(i, 1); }
  };
  OW.flute = function* () {
    PA.audio.jingle({ bpm: 120, loop: false, len: 34, tracks: [{ v: 'p1', duty: 0.125, vol: 0.12, env: 'hold', notes: [[0, 72, 4], [4, 76, 4], [8, 79, 4], [12, 77, 4], [16, 76, 4], [20, 74, 4], [24, 72, 8]] }, { v: 'tri', vol: 0.25, notes: [[0, 48, 16], [16, 43, 16]] }] });
    yield* PA.say('{PLAYER} wound up the MUSIC BOX.\f♪ ♪ ♪');
    yield* PA.wait(60);
  };
  OW.showMon = function* (id) {
    OW._shownMon = { id };
    PA.audio.cry(id);
    const sc = { update() {}, draw() { G.box(40, 8, 80, 72); G.mon(id, 'front', 52, 16); }, passive: false };
    OW._monScene = sc;
    PA.push(sc);
    yield* PA.wait(1);
  };
  OW.hideMon = function () { if (OW._monScene) { PA.pop(OW._monScene); OW._monScene = null; } };
  OW.giveMon = function* (id, lv, opts) {
    const m = new PA.Mon(id, lv, { goodDV: !!(opts && opts.starter), ot: PA.state.name });
    PA.dexSee(id); PA.dexCatch(id);
    if (PA.state.party.length < 6) PA.state.party.push(m); else PA.state.box.push(m);
    PA.audio.jingle(PA.audio.J.friend);
    yield* PA.say('{PLAYER} received ' + m.name + '!');
    const nick = yield* PA.yesno('Would you like to give ' + m.name + ' a nickname?');
    if (nick) {
      const nm = yield* PA.scenesApi.naming('Nickname?', m.name, 10, m.id);
      if (nm && nm !== m.name) m.nick = nm;
    }
    return m;
  };
  OW.warp = function* (mapId, x, y, dir, opts) {
    const f = yield* PA.fadeOut((opts && opts.colour) || '#ffffff', 8);
    OW.enterMap(mapId, x, y, dir);
    yield* PA.wait(4);
    yield* PA.fadeIn(f, 8);
  };
  OW.doWarp = function* (w) {
    PA.audio.sfx(w.exit ? 'exit' : 'door');
    // step back out of a door onto the front tile happens implicitly by destination
    yield* OW.warp(w.to, w.tx, w.ty, w.dir);
  };
  OW.cutTo = function* (mapId, x, y, dir, caption) {
    const f = yield* PA.fadeOut('#000000', 12);
    if (caption) yield* PA.scenesApi.caption(caption);
    OW.enterMap(mapId, x, y, dir);
    yield* PA.wait(10);
    yield* PA.fadeIn(f, 12);
  };
  OW.setAct = function* (n) {
    PA.state.act = n;
    G.tod = n === 1 ? 'day' : n === 2 ? 'noon' : 'dusk';
    G.clearCache();
    yield* PA.scenesApi.actCard(n);
    OW.updateMusic(true);
    if (n === 3) PA.ow.addJournal(PA.world.quest.act3Journal || 'ACT III. Enter {DUNGEON} and confront {BOSS}.');
  };
  OW.credits = function* () { yield* PA.scenesApi.credits(); };

  // battles
  OW.trainerBattle = function* (t) {
    const team = t.team.map(([id, lv]) => new PA.Mon(id, lv, { ot: t.name }));
    team.forEach((m) => PA.dexSee(m.id));
    yield* PA.scenesApi.battleIntro(true);
    const b = PA.push(new PA.Battle({ kind: 'trainer', trainer: t, team, music: t.music || (t.rival ? 'rival' : 'trainer') }));
    while (!b.done) yield;
    PA.pop(b);
    OW.restoreMusic();
    if (b.result === 'lose' && !t.canLose) { yield* OW.whiteout(); return 'lose'; }
    if (b.result === 'lose') { for (const p of PA.state.party) p.heal(); }
    return b.result;
  };
  OW.wildBattle = function* (id, lv, opts) {
    opts = opts || {};
    const mon = new PA.Mon(id, lv);
    PA.dexSee(id);
    yield* PA.scenesApi.battleIntro(false);
    const b = PA.push(new PA.Battle({ kind: 'wild', wild: mon, music: opts.special ? 'boss' : 'battle', special: opts.special }));
    while (!b.done) yield;
    PA.pop(b);
    OW.restoreMusic();
    if (b.result === 'lose' && opts.canLose) { for (const p of PA.state.party) p.heal(); return 'lose'; } // a story battle you may lose
    if (b.result === 'lose') { yield* OW.whiteout(); return 'lose'; }
    if (b.result === 'befriended' && PA.questAfterFriend) yield* PA.questAfterFriend(b.caught);
    return b.result;
  };
  OW.whiteout = function* () {
    yield* PA.say('{PLAYER} has no one left who can battle!\fEverything goes dark...');
    PA.state.money = Math.floor(PA.state.money / 2);
    const h = PA.state.lastHeal || { map: 'home1', x: 4, y: 4, dir: 'up' };
    const f = yield* PA.fadeOut('#000000', 16);
    for (const p of PA.state.party) p.heal();
    OW.enterMap(h.map, h.x, h.y, h.dir);
    yield* PA.wait(20);
    yield* PA.fadeIn(f, 16);
    yield* PA.say(h.map === 'home1' ? '{MOTHER}: Oh, my poor {PLAYER}! Sit down. Have some tea. Then go and try again, there\'s a dear.' : 'Your team has been restored. Even heroes need a second try. Most of the good ones needed several.');
  };

  // dex helpers
  PA.dexSee = (id) => { PA.state.seen[id] = 1; };
  PA.dexCatch = (id) => { PA.state.seen[id] = 1; PA.state.caught[id] = 1; };

  // ---------------------------------------------------------------- the scene
  OW.scene = {
    update() { OW.update(); },
    draw() { OW.draw(); if (OW.healing > 0) { OW.healing--; if ((OW.healing >> 3) % 2) G.fade(1, '#ffd8e8'); } },
  };
})(window.PA);
