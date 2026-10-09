// Procedural Adventures - boot, main loop, new game / continue / save
'use strict';
(function (PA) {
  const G = PA.gfx, I = PA.input;
  const SAVE_KEY = 'procedural_adventures_save_v2'; // v2: the creature roster (a v1 save holds an older one)

  PA.newState = function (seed) {
    return {
      seed, name: 'EDMUND', rival: 'FITZ', femme: false, flags: {}, party: [], box: [], bag: {}, money: 3000, act: 1,
      seen: {}, caught: {}, journal: [], time: 0, steps: 0, stats: {}, repel: 0, visited: {}, pos: null, lastHeal: null,
    };
  };
  // which protagonist sprite to draw (see PA_HERO.chars): the look picked for this playthrough, else the first
  // of the chosen kind (an older saved game has no look)
  PA.heroWho = () => (PA.state && (PA.state.look || (PA.state.femme ? 'girl' : 'boy'))) || 'boy';
  // After MASC or FEMME (or CHOOSE FOR ME), the protagonist is one of that kind's six looks (art/protagonist), at
  // random - and never the same look as the last new game in this browser, so every playthrough looks different.
  const LAST_LOOK = 'pa_last_look';
  PA.pickLook = function (femme) {
    const H = window.PA_HERO, all = (H && H.looks && H.looks[femme ? 'femme' : 'masc']) || [femme ? 'girl' : 'boy'];
    let last = null;
    try { last = localStorage.getItem(LAST_LOOK); } catch (e) {}
    const pool = all.length > 1 ? all.filter((k) => k !== last) : all;
    const look = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem(LAST_LOOK, look); } catch (e) {}
    return look;
  };
  function applyVars() {
    PA.vars = Object.assign({}, PA.world.vars, { PLAYER: PA.state.name, RIVAL: PA.state.rival }, PA.isTale() ? PA.taleVars() : {});
  }
  PA.genAndInstall = function (seed) {
    PA.world = PA.genWorld(seed);
    PA.songs = {};
    G.tod = 'day'; G.clearCache();
    return PA.world;
  };

  // a small "generating" interstitial so the first frame of a new world isn't a hitch
  function* generating(seed) {
    const sc = { t: 0, update() { this.t++; }, draw() {
      G.clear('#141024');
      G.textC('GENERATING A WORLD', 80, 56, '#f8d860');
      G.textC('SEED ' + seed, 80, 72, '#efe6ff');
      const dots = '.'.repeat((this.t >> 3) % 4);
      G.textC(dots.padEnd(3), 80, 88, '#efe6ff');
    } };
    PA.push(sc);
    yield* PA.wait(10);
    PA.genAndInstall(seed);
    yield* PA.wait(10);
    PA.pop(sc);
  }

  PA.newGame = function* (seed) {
    PA.state = PA.newState(seed);
    PA.textSpeed = PA.textSpeed || 2;
    for (const s of PA.scenes.slice()) PA.pop(s);
    yield* generating(seed);
    // every new game deals a story from the four decks (src/game/tales.js)
    PA.state.rival = PA.world.quest.rivalName; applyVars();
    yield* PA.playTale();
  };

  PA.loadSaveData = function () {
    try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  };
  // A save holds creatures by number; it also records the roster's names, so that if creatures are later added,
  // renamed or retired, each one can be found again. A save without that list was made with the first roster.
  function nameIn(saved, id) { return (saved || PA.ROSTER_V1.map((x) => x.split(':')[0]))[id - 1]; }
  function rosterRemap(saved) {
    const types = {};
    for (const x of PA.ROSTER_V1) { const [n, t] = x.split(':'); types[n] = t; }
    return (id) => {
      const n = nameIn(saved, id);
      if (!n) return id;
      const name = PA.ROSTER_RENAMED[n] || n;
      if (PA.ROSTER_NAMES.includes(name)) return PA.sid(name);
      const same = types[n] ? PA.TYPE_SPECIES(types[n]) : []; // retired: a creature of the same type stands in
      return same[0] || 1;
    };
  }
  PA.saveGame = function () {
    try {
      const s = Object.assign({}, PA.state, { roster: PA.ROSTER_NAMES, party: PA.state.party.map((m) => m.toJSON()), box: PA.state.box.map((m) => m.toJSON()) });
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      return true;
    } catch (e) { console.warn(e); return false; }
  };
  PA.continueGame = function* () {
    const d = PA.loadSaveData();
    if (!d) return false;
    for (const s of PA.scenes.slice()) PA.pop(s);
    // deal the same story again: the hand it was saved with (a save from before the decks is the classic story)
    PA.forceTale = d.taleKey || 'classic';
    try { yield* generating(d.seed); } finally { PA.forceTale = null; }
    PA.state = Object.assign(PA.newState(d.seed), d);
    if (d.girl !== undefined && d.femme === undefined) PA.state.femme = d.girl; // older saves said girl
    delete PA.state.girl; delete PA.state.hero; // (an older save could play as GULLIVER)
    // items renamed since the save was made
    // (the only place the old item names are kept: saves made before they changed still hold them)
    const RENAMED = { 'POK\u00e9 BALL': 'BALL', 'GREAT BALL': 'FINE BALL', 'ULTRA BALL': 'GRAND BALL', 'POK\u00e9DEX': 'ALMANAC',
      'RARE CANDY': 'SUGARED ALMOND', 'PARLYZ HEAL': 'LINIMENT', 'PARALYSIS CURE': 'LINIMENT', 'POK\u00e9 FLUTE': 'MUSIC BOX', 'FLUTE': 'MUSIC BOX',
      'POTION': 'TONIC', 'SUPER POTION': 'STRONG TONIC', 'HYPER POTION': 'GRAND TONIC', 'AWAKENING': 'SMELLING SALTS', 'BURN HEAL': 'ALOE BALM',
      'ICE HEAL': 'WARMING PAN', 'FULL HEAL': 'PANACEA', 'REVIVE': 'CORDIAL', 'ETHER': 'BARLEY WATER', 'ESCAPE ROPE': 'HACKNEY TOKEN',
      'REPEL': 'LAVENDER WATER', 'MOON STONE': 'MOONSTONE BROOCH', 'TOWN MAP': 'WORLD MAP' };
    for (const k in RENAMED) if (PA.state.bag[k]) { PA.state.bag[RENAMED[k]] = (PA.state.bag[RENAMED[k]] || 0) + PA.state.bag[k]; delete PA.state.bag[k]; }
    // creatures are befriended now, not caught: the old capture items are bought back at half price
    const RETIRED = { BALL: 200, 'FINE BALL': 600, 'GRAND BALL': 1200, 'PREMIER BALL': 200 };
    for (const k in RETIRED) if (PA.state.bag[k]) { PA.state.money += Math.floor(RETIRED[k] / 2) * PA.state.bag[k]; delete PA.state.bag[k]; }
    // the roster may have changed since the save was made: find every creature again by name (src/game/roster.js)
    const remap = rosterRemap(d.roster);
    const mon = (o) => {
      const n = nameIn(d.roster, o.id), retired = n && !PA.ROSTER_NAMES.includes(PA.ROSTER_RENAMED[n] || n);
      if (retired) o = Object.assign({}, o, { moves: null }); // a stand-in learns its own attacks
      const id = remap(o.id);
      const m = PA.Mon.from(Object.assign({}, o, { id }));
      if (!o.moves) { m.moves = m.defaultMoves(); }
      return m;
    };
    PA.state.party = d.party.map(mon);
    PA.state.box = (d.box || []).map(mon);
    // GULLIVER leads every party now: a game saved before then gets him back, at the front
    if (![...PA.state.party, ...PA.state.box].some((m) => PA.isMascot(m.id))) {
      const g = new PA.Mon(PA.GULL_ID, Math.max(5, ...PA.state.party.map((m) => m.level)), { ot: 'GULLIVER', nick: 'GULLIVER', goodDV: true });
      if (PA.state.party.length < 6) PA.state.party.unshift(g); else PA.state.box.push(g);
      PA.state.caught[PA.GULL_ID] = true; PA.state.seen[PA.GULL_ID] = true; PA.state.flags.gullJoined = true;
    }
    for (const k of ['seen', 'caught']) { const o = {}; for (const id in PA.state[k] || {}) o[remap(+id)] = 1; PA.state[k] = o; }
    if (PA.state.rivalStarter) PA.state.rivalStarter = remap(PA.state.rivalStarter);
    PA.state.roster = PA.ROSTER_NAMES;
    applyVars();
    G.tod = PA.state.act === 1 ? 'day' : PA.state.act === 2 ? 'noon' : 'dusk';
    G.clearCache();
    // reapply runtime world changes
    PA.push(PA.ow.scene);
    // map ids renamed since the save was made (center_/mart_ became clinic_/shop_)
    const mapId = (id) => String(id || '').replace(/^center_/, 'clinic_').replace(/^mart_/, 'shop_');
    for (const k of ['pos', 'lastHeal']) if (PA.state[k] && PA.state[k].map) PA.state[k].map = mapId(PA.state[k].map);
    // a room the rebuilt world doesn't have (a save from an older build) sends you home rather than nowhere
    const HOME = { map: 'home2', x: 3, y: 6, dir: 'up' };
    if (PA.state.lastHeal && !PA.world.maps[PA.state.lastHeal.map]) PA.state.lastHeal = null;
    const p = PA.state.pos && PA.world.maps[PA.state.pos.map] ? PA.state.pos : HOME;
    // re-collide taken items
    for (const id in PA.world.maps) { const m = PA.world.maps[id]; for (const it of m.items) if (PA.flag('item:' + it.key)) m.setColl(it.x, it.y, m.tileAt(it.x, it.y) === PA.T.cfloor || m.tileAt(it.x, it.y) === PA.T.cdark ? PA.C.CAVE : PA.C.WALK); }
    PA.ow.enterMap(p.map, p.x, p.y, p.dir);
    const f = { level: 4, colour: '#000000', draw() { G.fade(this.level, this.colour); }, update() {} };
    PA.push(f);
    yield* PA.fadeIn(f, 16);
    yield* PA.say('Welcome back, {PLAYER}. The world waited for you. It\'s good at that.');
    return true;
  };

  PA.onScriptError = function (e) {
    PA.lastError = String(e && e.stack || e);
  };

  // ---------------------------------------------------------------- main loop
  let acc = 0, last = 0;
  const STEP = 1000 / 60;
  function frame(now) {
    if (!last) last = now;
    acc += Math.min(100, now - last);
    last = now;
    let steps = 0;
    while (acc >= STEP && steps < 4) { tick(); acc -= STEP; steps++; }
    render();
    requestAnimationFrame(frame);
  }
  function tick() {
    I.update();
    PA.stepScripts();
    // passive scenes always update; topmost active scene gets input
    const st = PA.scenes;
    let topActive = null;
    for (let i = st.length - 1; i >= 0; i--) if (!st[i].passive) { topActive = st[i]; break; }
    for (const s of st.slice()) if (s.passive || s === topActive) s.update && s.update();
    if (PA.state && PA.ow.map && !PA.paused) PA.state.time = (PA.state.time || 0) + 1;
  }
  function render() {
    const st = PA.scenes;
    let start = 0;
    for (let i = st.length - 1; i >= 0; i--) if (st[i].opaque || st[i] === PA.ow.scene || st[i] instanceof PA.Battle || st[i] instanceof PA.Title) { start = i; break; }
    if (!st.length) G.clear('#000');
    for (let i = start; i < st.length; i++) st[i].draw && st[i].draw();
  }
  PA.tick = tick; PA.render = render;

  async function boot() {
    const cv = document.getElementById('screen');
    G.init(cv);
    G.clear('#000');
    try { await G.load(); } catch (e) { // a broken build: say so on screen rather than leave it black
      console.error('Procedural Adventures could not start:', e);
      G.clear('#000');
      try { ['COULD NOT START:', 'GAME FILES MISSING.', 'SEE THE CONSOLE.'].forEach((l, i) => G.textC(l, 80, 56 + i * 12, '#f8f8f8')); } catch (e2) { /* no font either */ }
      return;
    }
    I.bindTouch();
    try { const sp = +localStorage.getItem('pa_speed'); if (sp >= 1 && sp <= 3) PA.textSpeed = sp; } catch (e) {}
    I.onAnyKey = () => PA.audio.unlock();
    document.addEventListener('pointerdown', () => PA.audio.unlock());
    const params = new URLSearchParams(location.search);
    if (params.get('test') === '1') { PA.testMode = true; }
    // a controller paired (or woken by its first button press): say so, briefly
    PA.onPadConnected = () => { for (const sc of PA.scenes.slice()) if (sc instanceof PA.Banner) PA.pop(sc); PA.push(new PA.Banner('Controller ready!')); };
    PA.push(new PA.Title());
    requestAnimationFrame(frame);
    PA.booted = true;
  }
  window.addEventListener('load', boot);
})(window.PA);
