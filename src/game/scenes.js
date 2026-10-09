// Procedural Adventures - title, intro, naming, act cards, transitions, almanac entries, credits
'use strict';
(function (PA) {
  const G = PA.gfx, I = PA.input;
  const API = (PA.scenesApi = {});

  G.textOutline = function (str, x, y, col, outline, sc) {
    sc = sc || 1;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) G.textBig(str, x + dx, y + dy, outline, sc);
    G.textBig(str, x, y, col, sc);
  };

  // ---------------------------------------------------------------- title
  // The title: the two-word name and GULLIVER on one flat colour, with pixel snow, rain or petals falling
  // (one mood each time, or ?title=snow|rain|petals). Two layers of particles: near ones bigger and faster.
  const MOODS = {
    snow: { bg: '#22264a', title: '#f6f2e6', outline: '#5a7ad0', cols: ['#ffffff', '#dfe6ff', '#b8c4f0'] },
    rain: { bg: '#1f4a52', title: '#eaf6f2', outline: '#2f8c8a', cols: ['#a8d8e8', '#7fb8cc', '#cfeaf2'] },
    petals: { bg: '#5a3348', title: '#fff0e6', outline: '#c0507a', cols: ['#f8b8cc', '#ffffff', '#f088a8'] },
  };
  class Title {
    constructor() {
      this.t = 0; this.monX = 160; this.next = 200; // GULLIVER, the mascot, slides in from the right
      this.hasSave = !!PA.loadSaveData();
      this.menu = null; this.ready = false; this.menuTop = 144;
      const force = ((typeof location !== 'undefined' && location.search) || '').match(/[?&]title=(\w+)/);
      this.mood = force && MOODS[force[1]] ? force[1] : ['snow', 'rain', 'petals'][Math.floor(Math.random() * 3)];
      let calm = false;
      try { calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      this.speed = calm ? 0.5 : 1;
      const rng = new PA.RNG('title:' + this.mood);
      this.parts = [];
      for (let i = 0; i < (calm ? 26 : 52); i++) {
        const near = i % 3 === 0;
        this.parts.push({ x: rng.next() * 160, y: rng.next() * 144, near, ph: rng.next() * 6.28, c: rng.int(0, 2), f: rng.int(0, 1) });
      }
    }
    enter() { PA.audio.play('title', PA.audio.compose('PROCEDURAL ADVENTURES', 'title')); }
    update() {
      this.t++;
      this.monX += (52 - this.monX) * 0.15;
      if (--this.next <= 0) { this.next = 400; if (PA.GULL_ID) PA.audio.cry(PA.GULL_ID); }
      if (!this.ready && (I.pressed.a || I.pressed.start)) { this.ready = true; PA.audio.sfx('menu'); PA.script(titleMenu(this)); }
      const sp = this.speed;
      for (const p of this.parts) {
        const k = p.near ? 1 : 0.55;
        if (this.mood === 'snow') { p.y += 0.35 * k * sp; p.x += Math.sin(this.t / 40 + p.ph) * 0.25 * sp; }
        else if (this.mood === 'rain') { p.y += 2.6 * k * sp; p.x -= 0.9 * k * sp; }
        else { p.y += 0.45 * k * sp; p.x += (0.35 + Math.sin(this.t / 30 + p.ph) * 0.4) * k * sp; }
        if (p.y > 144) { p.y -= 150; p.splash = this.mood === 'rain' ? 6 : 0; p.sx = p.x; }
        if (p.x < -4) p.x += 166; if (p.x > 162) p.x -= 166;
        if (p.splash) p.splash--;
      }
    }
    draw() {
      const M = MOODS[this.mood];
      G.clear(M.bg);
      for (const p of this.parts) {
        const x = Math.round(p.x), y = Math.round(p.y), col = M.cols[p.c];
        if (this.mood === 'snow') G.rect(x, y, p.near ? 2 : 1, p.near ? 2 : 1, col);
        else if (this.mood === 'rain') { G.rect(x, y, 1, p.near ? 4 : 3, col); if (p.splash) { G.rect(Math.round(p.sx) - 1, 142, 1, 1, col); G.rect(Math.round(p.sx) + 1, 142, 1, 1, col); } }
        else { // a petal, tumbling: two frames
          const fr = ((this.t >> 4) + p.f) % 2;
          if (fr) G.rect(x, y, p.near ? 2 : 1, p.near ? 2 : 1, col); else { G.rect(x, y, p.near ? 3 : 2, 1, col); if (p.near) G.rect(x + 1, y + 1, 1, 1, col); }
        }
      }
      G.textOutline('PROCEDURAL', 80 - G.textWidth('PROCEDURAL', 2) / 2, 18, M.title, M.outline, 2);
      G.textOutline('ADVENTURES', 80 - G.textWidth('ADVENTURES', 2) / 2, 38, M.title, M.outline, 2);
      if (PA.GULL_ID) G.mon(PA.GULL_ID, 'front', Math.round(this.monX), 60 + Math.round(Math.sin(this.t / 16)));
      if (!this.ready && (this.t >> 5) % 2) G.textC('PRESS START', 80, 132, M.title);
    }
  }
  function* titleMenu(title) {
    for (;;) {
      const items = [];
      if (title.hasSave) items.push('CONTINUE');
      items.push('NEW ADVENTURE', 'CHOOSE A SEED', 'OPTIONS', 'CREDITS');
      title.menuTop = 144 - (items.length * 16 + 8);
      const r = yield* PA.menu(items, { x: 0, y: title.menuTop, w: 136, cancel: null });
      const it = items[r];
      if (it === 'CONTINUE') {
        const ok = yield* PA.continueGame();
        if (ok) return;
      } else if (it === 'NEW ADVENTURE') { yield* PA.newGame(PA.seedWord()); return; }
      else if (it === 'CHOOSE A SEED') {
        const s = yield* API.naming('World seed?', '', 10, 0, true);
        if (s) { yield* PA.newGame(s.toUpperCase()); return; }
      } else if (it === 'CREDITS') yield* API.creditsPage();
      else yield* PA.menus.options();
    }
  }
  PA.Title = Title;

  // ---------------------------------------------------------------- naming screen
  const ROWS_UP = ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ ', '×():;[]&+', '-?!♪./,\'é'];
  const ROWS_LO = ['abcdefghi', 'jklmnopqr', 'stuvwxyz ', '×():;[]&+', '-?!♪./,\'é'];
  class Naming {
    constructor(prompt, init, max, monId, digits) {
      this.prompt = prompt; this.name = init || ''; this.max = max || 7; this.cx = 0; this.cy = 0; this.lower = false; this.done = false; this.monId = monId; this.t = 0;
      this.digits = digits;
      I.typing = true;
      this.typing = false; // true once a letter has come from the keyboard
      I.onType = (e) => {
        // Z/X/Space are the A/B buttons on the grid, until you start typing a name (so "ELIZA" works);
        // Shift+Z / Shift+X always type. The arrow keys hand control back to the grid.
        if (e.key.startsWith('Arrow')) { this.typing = false; return false; }
        const button = e.key === ' ' || e.key === 'z' || e.key === 'x' || ((e.key === 'Z' || e.key === 'X') && !e.shiftKey);
        if (button && !this.typing) return false;
        if (e.key.length === 1 && /[A-Za-z0-9 .,!?'\-é]/.test(e.key)) {
          if (this.name.length < this.max) { this.name += digits ? e.key.toUpperCase() : e.key; PA.audio.sfx('tick'); }
          this.typing = true;
          return true;
        }
        if (e.key === 'Backspace') { this.name = this.name.slice(0, -1); return true; }
        if (e.key === 'Enter') { this.finish(); return true; }
        return false;
      };
    }
    rows() { const r = this.lower ? ROWS_LO : ROWS_UP; return this.digits ? ['ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ ', '012345678', '9-'] : r; }
    finish() { I.typing = false; I.onType = null; this.done = true; this.result = this.name.trim(); PA.pop(this); }
    update() {
      this.t++;
      const rows = this.rows();
      const nRows = rows.length + 1; // last row: case / ED
      if (I.repeat.up) { this.cy = (this.cy + nRows - 1) % nRows; PA.audio.sfx('tick'); }
      if (I.repeat.down) { this.cy = (this.cy + 1) % nRows; PA.audio.sfx('tick'); }
      if (I.repeat.left) { this.cx = (this.cx + 8) % 9; PA.audio.sfx('tick'); }
      if (I.repeat.right) { this.cx = (this.cx + 1) % 9; PA.audio.sfx('tick'); }
      if (I.pressed.b) { this.name = this.name.slice(0, -1); PA.audio.sfx('select'); }
      if (I.pressed.start) { this.finish(); return; }
      if (I.pressed.a) {
        PA.audio.sfx('select');
        if (this.cy === rows.length) {
          if (this.cx < 5 && !this.digits) this.lower = !this.lower;
          else this.finish();
          return;
        }
        const ch = (rows[this.cy] || '')[this.cx];
        if (ch && this.name.length < this.max) this.name += ch;
        if (this.name.length >= this.max) { this.cy = rows.length; this.cx = 7; }
      }
    }
    draw() {
      G.clear(G.PAPER);
      if (this.monId) G.mon(this.monId, 'front', 104, 0, {});
      else G.hero(PA.heroWho(), 'down', 0, 8, 4, { scale: 2 });
      G.text(this.prompt, 8 + (this.monId ? 0 : 32), 8);
      G.text(this.name + ((this.t >> 4) % 2 && this.name.length < this.max ? '_' : ''), 40, 24);
      // a slot under each letter typed (the font is proportional), then 6px slots for the letters still to come
      let sx = 40;
      for (let i = 0; i < this.max; i++) {
        const w = i < this.name.length ? G.textWidth(this.name[i]) : 6;
        G.rect(sx, 33, w - 1, 1, G.INK);
        sx += w;
      }
      G.box(0, 40, 160, 104);
      const rows = this.rows();
      // the chosen key: a navy bar (and the pointer) behind it
      const last = this.cy === rows.length, cy = 48 + this.cy * 13;
      const sx0 = last ? (this.cx < 5 ? 13 : 121) : 13 + this.cx * 16, sw = last ? (this.cx < 5 ? 66 : 32) : 12;
      if (!(last && this.cx < 5 && this.digits)) G.selBar(sx0, cy - 2, sw, 11);
      const ink = (on) => (on ? G.UI.selText : undefined);
      rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) G.text(r[x], 16 + x * 16, 48 + y * 13, ink(y === this.cy && x === this.cx)); });
      G.text(this.digits ? '' : (this.lower ? 'UPPER CASE' : 'lower case'), 16, 48 + rows.length * 13, ink(last && this.cx < 5));
      G.text('DONE', 125, 48 + rows.length * 13, ink(last && this.cx >= 5));
      if (!('ontouchstart' in window)) G.text('Type! ENTER = done', 16, 126, '#8a8494');
      G.cursor(sx0 - 6, cy - 1);
    }
  }
  API.naming = function* (prompt, init, max, monId, digits) {
    const n = PA.push(new Naming(prompt, init, max, monId, digits));
    while (!n.done) yield;
    return n.result;
  };

  // ---------------------------------------------------------------- the stage: who you are
  class Stage {
    constructor() { this.who = null; this.x = 64; this.colour = '#f6f0e2'; this.fade = 0; this.shrink = 1; this.mon = null; }
    update() {}
    draw() {
      G.clear(this.colour);
      G.ctx.fillStyle = 'rgba(120,100,80,0.15)'; G.ctx.beginPath(); G.ctx.ellipse(80, 96, 34, 7, 0, 0, Math.PI * 2); G.ctx.fill();
      if (this.mon) G.mon(this.mon, 'front', 52, 40);
      else if (this.who !== null) {
        const sc = 4 * this.shrink;
        if (this.who.hero) G.hero(this.who.hero, 'down', 0, Math.round(80 - 8 * sc), Math.round(96 - 16 * sc), { scale: sc });
        else if (PA.isPerson(this.who.spr)) G.person(this.who.spr, 'down', 0, Math.round(80 - 8 * sc), Math.round(96 - 16 * sc), { scale: sc });
        else G.char(this.who.spr, this.who.frame || 0, this.who.pal, Math.round(80 - 8 * sc), Math.round(96 - 16 * sc), { scale: sc });
      }
      if (this.fade) G.fade(this.fade, '#000000');
    }
  }
  // how you're presenting today (or the game picks), then a name
  function* whoAreYou(st, names) { // names: [masc presets, femme presets]
    st.who = null;
    const g = yield* PA.choose('Feeling masc or femme presenting today?', ['MASC', 'FEMME', 'CHOOSE FOR ME'], { cancel: null });
    PA.state.femme = g === 2 ? PA.rand.chance(0.5) : g === 1;
    PA.state.look = PA.pickLook(PA.state.femme); // one of the six of that kind, different every playthrough
    st.who = { hero: PA.heroWho() };
    PA.audio.sfx('select');
    const presets = (names || [['EDMUND', 'FITZ', 'BINGLEY'], ['ELIZA', 'JANE', 'LIZZY']])[PA.state.femme ? 1 : 0];
    const r = yield* PA.choose('Your name?', ['NEW NAME'].concat(presets), { cancel: null });
    let name = r > 0 ? presets[r - 1] : (yield* API.naming('YOUR NAME?', '', 7));
    if (!name) name = presets[0];
    PA.state.name = name; PA.vars.PLAYER = name;
  }
  API.Stage = Stage; API.whoAreYou = whoAreYou; // for the start of every story (src/game/tales.js)

  // ---------------------------------------------------------------- act cards & captions
  const ACT_BG = ['#1f2a4a', '#4a2340', '#5a2f1a'];
  API.actCard = function* (n) {
    const q = PA.world.quest;
    const [l1, l2] = q.acts[n - 1];
    const sc = { t: 0, done: false, update() { this.t++; if (this.t > 60 && (I.pressed.a || I.pressed.start)) this.done = true; if (this.t > 330) this.done = true; }, draw() {
      const t = this.t;
      G.clear(ACT_BG[n - 1]);
      // curtain
      const open = Math.min(1, t / 40);
      for (let y = 0; y < 144; y += 4) G.rect(0, y, 160, 2, 'rgba(255,255,255,0.03)');
      const act = 'ACT ' + ['I', 'II', 'III'][n - 1];
      G.textOutline(act, 80 - G.textWidth(act, 2) / 2, 24, '#f8d860', '#100810', 2);
      if (t > 30) PA.wrap(l1 + ' ' + l2, 19)[0].slice(0, 3).forEach((l, k) => G.textC(l, 80, 56 + k * 11, '#f6efe0'));
      if (n === 1 && t > 60) {
        G.textC('TONIGHT\'S EPISODE:', 80, 98, '#c8b0e8');
        PA.wrap('"' + q.episode + '"', 19)[0].slice(0, 3).forEach((l, k) => G.textC(l, 80, 110 + k * 10, '#f8d860'));
      }
      if (n === 3 && t > 60) G.textC('(the sun is setting)', 80, 112, '#f0a878');
      if (n === 2 && t > 60) G.textC('(it\'s complicated)', 80, 112, '#e8a8c8');
      // curtains sliding
      const w = Math.round(80 * (1 - open));
      G.rect(0, 0, w, 144, '#7a1a2a'); G.rect(160 - w, 0, w, 144, '#7a1a2a');
    } };
    PA.audio.stop();
    PA.audio.jingle(PA.audio.J.act);
    PA.push(sc);
    while (!sc.done) yield;
    const f = yield* PA.fadeOut('#000000', 8);
    PA.pop(sc);
    yield* PA.fadeIn(f, 8);
  };
  API.caption = function* (text) {
    const sc = { t: 0, update() { this.t++; }, draw() { G.clear('#000000'); PA.wrap(PA.sub(text), 18)[0].forEach((l, k) => G.textC(l, 80, 64 + k * 10, '#f6efe0')); } };
    PA.push(sc);
    PA.audio.jingle(PA.audio.J.sting);
    for (let i = 0; i < 150; i++) { if (i > 40 && I.pressed.a) break; yield; }
    PA.pop(sc);
  };

  // ---------------------------------------------------------------- battle intro transition
  API.battleIntro = function* (trainer) {
    PA.audio.stop();
    PA.audio.sfx('swoosh');
    const sc = { mode: 0, k: 0, inv: false, update() {}, draw() {
      if (this.inv) { G.ctx.globalCompositeOperation = 'difference'; G.rect(0, 0, 160, 144, '#ffffff'); G.ctx.globalCompositeOperation = 'source-over'; }
      if (this.mode === 1) {
        const k = this.k;
        if (trainer) { // closing spiral-ish squares
          for (let r = 0; r < k; r++) { G.rect(r * 4, r * 4, 160 - r * 8, 4, '#000'); G.rect(r * 4, 140 - r * 4, 160 - r * 8, 4, '#000'); G.rect(r * 4, r * 4, 4, 144 - r * 8, '#000'); G.rect(156 - r * 4, r * 4, 4, 144 - r * 8, '#000'); }
        } else for (let y = 0; y < 144; y += 8) { const w = Math.min(160, k * 8); if ((y / 8) % 2) G.rect(160 - w, y, w, 8, '#000'); else G.rect(0, y, w, 8, '#000'); }
      }
    } };
    PA.push(sc);
    for (let f = 0; f < 3; f++) { sc.inv = true; yield* PA.wait(4); sc.inv = false; yield* PA.wait(4); }
    sc.mode = 1;
    const n = trainer ? 20 : 21;
    for (let i = 0; i <= n; i++) { sc.k = i; yield; yield; }
    PA.pop(sc);
  };

  // ---------------------------------------------------------------- level-up stats
  API.levelStats = function* (m, before) {
    // a box at the right listing the new stat values
    const sc = { done: false, update() { if (I.pressed.a || I.pressed.b) { PA.audio.sfx('select'); this.done = true; } }, draw() {
      G.box(72, 16, 88, 80);
      [['ATTACK', m.atk], ['DEFENSE', m.def], ['SPEED', m.spd], ['SPECIAL', m.spc]].forEach(([n, v], k) => { G.text(n, 88, 24 + k * 16); G.textR(String(v), 144, 32 + k * 16); });
    } };
    PA.push(sc);
    while (!sc.done) yield;
    PA.pop(sc);
  };

  // ---------------------------------------------------------------- dex entry
  // an almanac page: a card with the creature on it, its type and temperament as tags, its size, what you've
  // learned it likes (src/game/battle.js befriend) and its entry, a few lines at a time
  const PER_PAGE = 3;
  API.dexEntry = function* (id) {
    const sp = PA.species(id);
    PA.audio.cry(id);
    const friend = PA.state.caught[id];
    const lines = PA.wrap(friend ? (sp.d || 'No notes yet.') : 'Befriend one to learn more. It looks at you as if you should already know.', 18)[0];
    const sc = { done: false, page: 0, update() {
      if (I.pressed.a && (this.page + 1) * PER_PAGE < lines.length) { PA.audio.sfx('select'); this.page++; return; } // the rest of a long entry
      if (I.pressed.a || I.pressed.b) { PA.audio.sfx('select'); this.done = true; }
    }, draw() {
      G.clear(G.UI.face);
      G.window(0, 0, 160, 144, sp.n);
      G.mon(id, 'front', 52, 14);
      const tag = (t, x, col) => { const w = G.textWidth(t) + 6; G.rect(x, 79, w, 10, col); G.text(t, x + 3, 80, '#ffffff'); return x + w + 3; };
      let x = tag(sp.t[0], 8, PA.typeColour(sp.t[0]));
      if (sp.temper) tag(sp.temper === 'diva' ? 'DIVA' : 'SHY ONE', x, '#706878');
      G.textR((sp.h || '?') + ', ' + (sp.w || '?'), 152, 80, '#5a5868');
      const k = (PA.state.likes || {})[id] || {};
      const known = [k.fav && 'likes ' + { COMPLIMENT: 'compliments', WAIT: 'patience', PET: 'a pat', FEED: 'snacks', PLAY: 'play' }[k.fav], k.diet && 'eats ' + k.diet, k.pet === 'hates' && 'no petting!'].filter(Boolean);
      if (known.length) G.textFit(known.join(' · '), 8, 92, 144, '#c03060');
      G.etch(4, 102, 152);
      lines.slice(this.page * PER_PAGE, this.page * PER_PAGE + PER_PAGE).forEach((l, j) => G.text(l, 8, 106 + j * 10));
      this.t = (this.t || 0) + 1;
      if ((this.page + 1) * PER_PAGE < lines.length) G.more(144, 130, this.t);
    } };
    PA.push(sc);
    while (!sc.done) yield;
    PA.pop(sc);
  };


  // ---------------------------------------------------------------- credits
  API.credits = function* () {
    const q = PA.world.quest, s = PA.state;
    const starter = s.party.find((p) => p.id === q.starters[s.starterTaken]) || s.party[0];
    const mins = Math.max(1, Math.round((s.time || 0) / 3600));
    const H = (t) => ({ t, h: true }); // gold heading
    const cast = PA.isTale() ? PA.taleCredits(H, starter) : [H('STARRING'), '',
      PA.sub('{PLAYER}'), 'as Themself', '', PA.sub('{RIVAL}'), 'as The Rival', '',
      starter ? starter.name : 'A CREATURE', 'as The Best Friend', '', PA.sub('{GIVER}'), 'as The Client', '',
      PA.sub('{BOSS}'), 'as The Trouble', '', 'PROF. BENNET', 'as Himself, Reluctantly', '',
      ...(q.gull && q.gull !== 'player' ? ['GULLIVER', 'as Himself. Nice!', ''] : []), ''];
    const roll = [
      H('PROCEDURAL'), H('ADVENTURES'), '', '"' + q.episode + '"', '', '', ...cast,
      H('WORLD SEED'), PA.world.seed, '', H('FILMED ON LOCATION IN'), PA.world.names.region, PA.world.vars.HOME, PA.world.vars.TOWN2, PA.world.vars.TOWN3, PA.world.vars.DUNGEON, '', '',
      ...(PA.isTale() && !q.tale.battles ? [PA.sub('{TOKENS} GATHERED {N}'), 'BATTLES NONE NEEDED'] : ['BATTLES WON ' + (s.stats.wins || 0), 'FRIENDS MADE ' + Object.keys(s.caught).length]),
      'TIME ' + mins + ' MIN', '', '',
      'With thanks to the', 'little monsters,', 'for everything else,', 'and to:', '', '',
      ...PA.creditLines({ skipTitle: true }), '', '',
      'This world will be', 'forgotten.', '', 'You won\'t be.', '', '', '', '', '', H('THE END'), '', '(of this particular', 'world)',
    ];
    const lines = [];
    for (const l of roll) {
      const o = typeof l === 'string' ? { t: l } : l;
      if (o.t.length <= 19) lines.push(o); else PA.wrap(o.t, 19)[0].forEach((t) => lines.push({ t, h: o.h }));
    }
    PA.audio.play('ending', PA.ow.song('ending'));
    const team = s.party.slice();
    const sc = { y: 150, t: 0, done: false, opaque: true, update() {
      this.t++;
      this.y -= I.held.a || I.held.b ? 1.6 : 0.4;
      if (this.y < -lines.length * 10 + 60) this.done = true;
    }, draw() {
      G.clear('#141024');
      for (let i = 0; i < 40; i++) { const sx = (i * 71 + 13) % 160, sy = (i * 37 + this.t * (0.1 + (i % 3) * 0.05)) % 144; G.rect(sx, sy, 1, 1, i % 5 ? '#5a4a8a' : '#f8e8b0'); }
      lines.forEach((l, k) => {
        const y = Math.round(this.y + k * 10);
        if (y < -8 || y > 144) return;
        G.textC(l.t, 80, y, l.h ? '#f8d860' : '#efe6ff');
      });
      if (team.length) {
        const m = team[Math.floor(this.t / 240) % team.length];
        G.alpha(0.18); G.mon(m.id, 'front', 52, 44); G.alpha(1);
      }
    } };
    PA.push(sc);
    while (!sc.done) yield;
    PA.pop(sc);
    const keep = yield* PA.yesno('Keep exploring this world?', { labels: ['STAY', 'NEW WORLD'], w: 88, x: 72 });
    if (keep) {
      PA.saveGame();
      yield* PA.say('The story is over, but the world is still here. It\'s yours now. (Game saved.)');
      PA.ow.restoreMusic();
    } else {
      PA.saveGame();
      PA.replaceAll(new Title());
    }
  };
})(window.PA);
