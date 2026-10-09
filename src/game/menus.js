// Procedural Adventures - start menu, party, bag, shop, dex, diary, town map, options, save
'use strict';
(function (PA) {
  const G = PA.gfx, I = PA.input;
  const M = (PA.menus = {});

  // ---------------------------------------------------------------- start menu
  M.start = function* () {
    let last = M._lastStart || 0;
    for (;;) {
      const items = [];
      if (PA.state.party.length) items.push('TEAM');
      items.push('BAG');
      if (PA.ow.has('ALMANAC')) items.push('ALMANAC');
      items.push('DIARY', 'CARD', 'SAVE', 'OPTIONS', 'CLOSE');
      const r = yield* PA.menu(items, { x: 80, y: 0, w: 80, start: Math.min(last, items.length - 1), spacing: 16 });
      if (r < 0 || items[r] === 'CLOSE') return;
      last = M._lastStart = r;
      const it = items[r];
      if (it === 'ALMANAC') yield* M.dex();
      else if (it === 'TEAM') { const res = yield* M.party({ mode: 'field' }); if (res === 'close') return; }
      else if (it === 'BAG') { const res = yield* M.bag({}); if (res === 'close') return; }
      else if (it === 'DIARY') yield* M.journal();
      else if (it === 'SAVE') { yield* M.save(); }
      else if (it === 'OPTIONS') yield* M.options();
      else if (it === 'CARD') yield* M.card();
    }
  };

  // ---------------------------------------------------------------- party
  class PartyScreen {
    constructor(opts) { this.opts = opts; this.i = opts.start || 0; this.done = false; this.t = 0; this.msg = opts.msg || (opts.mode === 'item' ? 'Use it on whom?' : 'Who will it be?'); this.swap = -1; }
    update() {
      this.t++;
      const n = PA.state.party.length;
      if (I.repeat.up) { this.i = (this.i + n - 1) % n; PA.audio.sfx('tick'); }
      if (I.repeat.down) { this.i = (this.i + 1) % n; PA.audio.sfx('tick'); }
      if (I.pressed.a) { PA.audio.sfx('select'); this.result = this.i; this.done = true; }
      if (I.pressed.b && !this.opts.force) { PA.audio.sfx('select'); this.result = -1; this.done = true; }
    }
    draw() {
      G.clear(G.PAPER);
      PA.state.party.forEach((m, k) => {
        const y = k * 16;
        const speed = m.hp <= 0 ? 0 : m.hp / m.maxhp > 0.5 ? 8 : m.hp / m.maxhp > 0.2 ? 16 : 32;
        const fr = speed && (this.t / speed | 0) % 2 && k === this.i ? 1 : 0;
        const on = k === this.i && !this.done, ink = on ? G.UI.selText : undefined;
        if (k === this.i) G.selBar(0, y, 160, 16, this.done);
        G.monIcon(m.id, fr, 8, y);
        G.text(m.name, 24, y, ink);
        if (m.status || m.hp <= 0) G.textR(m.hp <= 0 ? 'OUT' : PA.statusLabel(m.status), 158, y, on ? '#ffa898' : '#c03018');
        else G.textR('⒧' + m.level, 158, y, ink);
        const f = m.hp / m.maxhp;
        G.progress(24, y + 9, 70, 6, m.hp > 0 ? f : 0, G.hpColour(f));
        G.textR(PA.pad(m.hp, 3) + '/' + PA.pad(m.maxhp, 3), 158, y + 8, ink);
        if (k === this.swap) G.rect(0, y, 160, 16, 'rgba(120,140,220,0.25)');
      });
      if (!this.done) G.cursor(1, this.i * 16 + 4);
      G.box(0, 96, 160, 48);
      PA.wrap(PA.sub(this.msg))[0].slice(0, 2).forEach((l, k) => G.text(l, 8, 104 + k * 16));
    }
  }
  M.party = function* (opts) {
    opts = opts || {};
    if (!PA.state.party.length) return -1;
    const ps = PA.push(new PartyScreen(opts));
    for (;;) {
      ps.done = false;
      while (!ps.done) yield;
      if (ps.result < 0) { PA.pop(ps); return -1; }
      const m = PA.state.party[ps.result];
      if (opts.mode === 'battle') {
        const r = yield* PA.menu(['SWITCH', 'STATS', 'CANCEL'], { x: 88, y: 88, w: 72 });
        if (r === 0) {
          if (m.hp <= 0) { yield* PA.say('It is in no state to battle.'); continue; }
          if (ps.result === opts.active) { yield* PA.say(m.name + ' is already out!'); continue; }
          PA.pop(ps); return ps.result;
        }
        if (r === 1) yield* M.stats(m);
        continue;
      }
      if (opts.mode === 'item' || opts.mode === 'pick') { PA.pop(ps); return ps.result; }
      // field
      const r = yield* PA.menu(['STATS', 'SWITCH', 'CANCEL'], { x: 88, y: 88, w: 72 });
      if (r === 0) yield* M.stats(m);
      else if (r === 1) {
        ps.swap = ps.result; ps.msg = 'Move ' + m.name + ' where?';
        ps.done = false;
        while (!ps.done) yield;
        if (ps.result >= 0 && ps.result !== ps.swap) {
          const p = PA.state.party; const a = ps.swap, b = ps.result;
          [p[a], p[b]] = [p[b], p[a]];
          PA.audio.sfx('select');
        }
        ps.swap = -1; ps.msg = 'Who will it be?';
      }
    }
  };
  M.pickParty = function* (msg) { return yield* M.party({ mode: 'pick', msg }); };

  // stats pages
  // a creature's pages: PROFILE and ATTACKS, as two tabs (left / right switch; A goes on, B closes)
  class StatsScreen {
    constructor(m) { this.m = m; this.page = 0; this.done = false; }
    update() {
      if (I.pressed.a || I.pressed.right || I.pressed.left) { PA.audio.sfx('select'); if (this.page === 0 && !I.pressed.left) this.page = 1; else if (I.pressed.a && this.page === 1) { this.done = true; PA.pop(this); } else this.page = 0; }
      if (I.pressed.b) { this.done = true; PA.pop(this); }
    }
    draw() {
      const m = this.m, sp = m.sp;
      G.clear(G.UI.face);
      G.window(0, 0, 160, 144, m.name + '   ⒧' + m.level);
      // the tabs
      ['PROFILE', 'ATTACKS'].forEach((t, k) => {
        const x = 6 + k * 52;
        if (k === this.page) G.selBar(x, 15, 50, 10); else G.selBar(x, 15, 50, 10, true);
        G.textC(t, x + 25, 16, k === this.page ? G.UI.selText : undefined);
      });
      if (this.page === 0) {
        G.mon(m.id, 'front', 4, 26);
        const cond = m.hp <= 0 ? 'OUT' : m.status ? PA.statusLabel(m.status) : 'well';
        const rows = [['Type', sp.t[0], PA.typeColour(sp.t[0])], ['Temperament', sp.temper === 'diva' ? 'Diva' : 'Shy One'], ['Condition', cond, m.hp <= 0 || m.status ? '#c03018' : undefined], ['Met by', PA.sub(m.ot || '{PLAYER}')]];
        rows.forEach(([n, v, c], k) => { G.text(n, 72, 30 + k * 16, '#5a5868'); G.textFit(v, 80, 38 + k * 16, 74, c); });
        [['HEALTH', m.hp + '/' + m.maxhp], ['ATTACK', m.atk], ['DEFENSE', m.def], ['SPEED', m.spd], ['SPECIAL', m.spc]].forEach(([n, v], k) => {
          G.text(n, 8, 94 + k * 9); G.textR(String(v), 152, 94 + k * 9);
        });
      } else {
        m.moves.forEach((mv, k) => {
          const d = PA.moveData(mv.n), y = 30 + k * 20;
          G.textFit(mv.n, 8, y, 144);
          G.text(d.type, 16, y + 9, PA.typeColour(d.type));
          G.textR('PP ' + PA.pad(mv.pp, 2) + '/' + PA.pad(mv.max, 2), 152, y + 9);
        });
        G.etch(4, 112, 152);
        G.text('EXP ' + m.exp, 8, 118);
        G.text(m.level >= 100 ? 'At the top level.' : m.expToNext() + ' more to ⒧' + (m.level + 1), 8, 130, '#5a5868');
      }
    }
  }
  M.stats = function* (m) { const s = PA.push(new StatsScreen(m)); while (!s.done) yield; };

  // ---------------------------------------------------------------- bag
  M.bagList = function (battle) {
    const order = Object.keys(PA.state.bag).filter((k) => PA.state.bag[k] > 0);
    const kindRank = { heal: 1, cure: 2, revive: 3, pp: 4, candy: 5, stone: 6, field: 7, key: 8 };
    order.sort((a, b) => (kindRank[PA.itemInfo(a).kind] || 9) - (kindRank[PA.itemInfo(b).kind] || 9));
    return battle ? order.filter((k) => ['heal', 'cure', 'revive', 'pp'].includes(PA.itemInfo(k).kind)) : order;
  };
  M.bag = function* (opts) {
    opts = opts || {};
    let start = 0;
    for (;;) {
      const list = M.bagList(opts.battle);
      const labels = list.map((k) => {
        const n = PA.state.bag[k];
        const key = PA.itemInfo(k).kind === 'key';
        return k + (key ? '' : '\t×' + n);
      });
      labels.push('CANCEL');
      const r = yield* PA.menu(labels, { x: 0, y: 0, w: 160, h: Math.min(96, labels.length * 12 + 16), spacing: 12, start: Math.min(start, labels.length - 1), drawExtra: (mn) => {
        const k = list[mn.i];
        G.box(0, 96, 160, 48);
        if (k) PA.wrap(PA.itemInfo(k).desc || '')[0].slice(0, 2).forEach((l, j) => G.text(l, 8, 104 + j * 16));
        else G.text('Close the bag.', 8, 104);
      } });
      if (r < 0 || r >= list.length) return null;
      start = r;
      const item = list[r];
      if (opts.battle) return item;
      const ch = yield* PA.menu(['USE', 'TOSS', 'CANCEL'], { x: 96, y: 40, w: 64 });
      if (ch === 0) { const res = yield* M.useField(item); if (res === 'close') return 'close'; }
      else if (ch === 1) {
        if (PA.itemInfo(item).kind === 'key') { yield* PA.say('That\'s too important to toss! Probably.'); continue; }
        const yes = yield* PA.yesno('Toss one ' + item + '?');
        if (yes) { PA.ow.take(item); yield* PA.say('Threw away one ' + item + '. The tall grass will keep it safe.'); }
      }
    }
  };
  M.applyItem = function (item, m, inBattle) {
    const info = PA.itemInfo(item);
    if (info.kind === 'heal') {
      if (m.hp <= 0) return { ok: false, msg: 'It won\'t have any effect. It needs a CORDIAL.' };
      if (m.hp >= m.maxhp) return { ok: false };
      const before = m.hp;
      m.hp = Math.min(m.maxhp, m.hp + info.hp);
      return { ok: true, msg: m.name + ' recovered by ' + (m.hp - before) + '!' };
    }
    if (info.kind === 'cure') {
      if (!m.status || !info.cures.includes(m.status)) return { ok: false };
      m.status = null; m.sleep = 0;
      return { ok: true, msg: m.name + ' is feeling much better!' };
    }
    if (info.kind === 'revive') {
      if (m.hp > 0) return { ok: false };
      m.hp = Math.floor(m.maxhp / 2);
      return { ok: true, msg: m.name + ' is revitalized!' };
    }
    if (info.kind === 'pp') {
      if (m.moves.every((mv) => mv.pp >= mv.max)) return { ok: false };
      m.moves.forEach((mv) => (mv.pp = Math.min(mv.max, mv.pp + 10)));
      return { ok: true, msg: m.name + '\'s PP was restored.' };
    }
    return { ok: false };
  };
  M.useField = function* (item) {
    const info = PA.itemInfo(item);
    if (['heal', 'cure', 'revive', 'pp'].includes(info.kind)) {
      const t = yield* M.party({ mode: 'item', item });
      if (t < 0) return;
      const m = PA.state.party[t];
      const r = M.applyItem(item, m, false);
      if (!r.ok) { yield* PA.say(r.msg || 'It won\'t have any effect.'); return; }
      PA.ow.take(item);
      PA.audio.sfx('heal');
      yield* PA.say(r.msg);
      return;
    }
    if (info.kind === 'candy') {
      const t = yield* M.party({ mode: 'item', item });
      if (t < 0) return;
      const m = PA.state.party[t];
      if (m.level >= 100) { yield* PA.say('It won\'t have any effect.'); return; }
      PA.ow.take(item);
      const evs = m.addExp(PA.expAt(m.id, m.level + 1) - m.exp);
      PA.audio.jingle(PA.audio.J.level);
      for (const e of evs) {
        if (e.type === 'level') { yield* PA.say(m.name + ' reached level ' + e.level + '!'); yield* PA.scenesApi.levelStats(m, e.before); }
        else if (e.type === 'learn') yield* M.learnMove(m, e.move);
      }
      return;
    }
    if (info.kind === 'trinket') { yield* PA.say(info.desc); return; }
    if (item === 'LAVENDER WATER') { PA.ow.take(item); PA.state.repel = 120; PA.audio.sfx('spark'); yield* PA.say('{PLAYER} used LAVENDER WATER! Weak wild creatures will keep a respectful distance.'); return 'close'; }
    if (item === 'HACKNEY TOKEN') {
      if (!PA.ow.map.dungeon) { yield* PA.say('Not here, and not now. There is a proper moment for everything.'); return; }
      PA.ow.take(item);
      const m = PA.world.slots.mouth, out = PA.ow.map.escape || { x: m.front[0], y: m.front[1], dir: m.dir === 'up' ? 'down' : 'up' };
      yield* PA.say('{PLAYER} held up the HACKNEY TOKEN. A carriage appears from nowhere in particular. Out you go!');
      PA.script(PA.ow.warp('overworld', out.x, out.y, out.dir));
      return 'close';
    }
    if (item === 'WORLD MAP') { yield* M.worldMap(); return; }
    if (item === 'ALMANAC') { yield* M.dex(); return; }
    if (item === 'MUSIC BOX') {
      const p = PA.ow.player, d = PA.DIRS[p.dir];
      const n = PA.ow.npcAt(p.x + d.x, p.y + d.y);
      if (n && n.key === 'blocker') { PA.script(n.talk(n)); return 'close'; }
      yield* PA.ow.flute();
      yield* PA.say('A lovely tune. Nobody was asleep, but several people felt briefly profound.');
      return;
    }
    if (item === 'INVITATION') { yield* PA.say('It reads: "The bearer is cordially invited to proceed to {DUNGEON}. Signed, {LEADER}."\fThere is a small coffee stain. It adds character.'); return; }
    if (info.kind === 'key') { yield* PA.say(!info.kept ? info.desc : 'It\'s the ' + item + '. You hold it carefully. It feels important.'); return; }
    yield* PA.say('Not here, and not now. There is a proper moment for everything.');
  };

  // ---------------------------------------------------------------- shop
  M.qty = function* (max, price) {
    let n = 1;
    const sc = { done: false, update() {
      if (I.repeat.up) { n = n >= max ? 1 : n + 1; PA.audio.sfx('tick'); }
      if (I.repeat.down) { n = n <= 1 ? max : n - 1; PA.audio.sfx('tick'); }
      if (I.repeat.right) { n = Math.min(max, n + 10); PA.audio.sfx('tick'); }
      if (I.repeat.left) { n = Math.max(1, n - 10); PA.audio.sfx('tick'); }
      if (I.pressed.a) { this.done = true; this.result = n; PA.pop(this); }
      if (I.pressed.b) { this.done = true; this.result = 0; PA.pop(this); }
    }, draw() { G.box(56, 64, 104, 32); G.text('×' + PA.pad(n, 2), 64, 76); G.textR('£' + n * price, 152, 76); } };
    PA.push(sc);
    while (!sc.done) yield;
    return sc.result;
  };
  M.buy = function* (stock) {
    let start = 0;
    for (;;) {
      const labels = stock.map((k) => k + '\t£' + PA.ITEMS[k].price);
      labels.push('CANCEL');
      const r = yield* PA.menu(labels, { x: 0, y: 24, w: 160, h: Math.min(72, labels.length * 12 + 16), spacing: 12, start });
      if (r < 0 || r >= stock.length) return;
      start = r;
      const k = stock[r], price = PA.ITEMS[k].price;
      const max = Math.min(99, Math.floor(PA.state.money / price));
      if (max < 1) { yield* PA.say('You don\'t have enough money. Few of us do.'); continue; }
      const n = yield* M.qty(max, price);
      if (!n) continue;
      const yes = yield* PA.yesno(k + '? That will be £' + n * price + '. OK?');
      if (!yes) continue;
      PA.state.money -= n * price;
      PA.ow.addItem(k, n);
      PA.audio.sfx('buy');
      yield* PA.say('Here you are! Thank you!');
    }
  };
  M.sell = function* () {
    for (;;) {
      const list = M.bagList(false).filter((k) => PA.ITEMS[k]);
      if (!list.length) { yield* PA.say('You have nothing I can buy. Splendid restraint.'); return; }
      const labels = list.map((k) => k + '\t×' + PA.state.bag[k]).concat(['CANCEL']);
      const r = yield* PA.menu(labels, { x: 0, y: 24, w: 160, h: Math.min(72, labels.length * 12 + 16), spacing: 12 });
      if (r < 0 || r >= list.length) return;
      const k = list[r], price = Math.floor(PA.ITEMS[k].price / 2);
      const n = yield* M.qty(PA.state.bag[k], price);
      if (!n) continue;
      const yes = yield* PA.yesno('I can pay £' + n * price + '. OK?');
      if (!yes) continue;
      PA.ow.take(k, n); PA.state.money += n * price; PA.audio.sfx('buy');
    }
  };

  // ---------------------------------------------------------------- learning moves
  M.learnMove = function* (m, mv) {
    if (m.moves.some((x) => x.n === mv)) return;
    if (m.moves.length < 4) { m.learn(mv); PA.audio.jingle(PA.audio.J.level); yield* PA.say(m.name + ' picked up ' + mv + '!'); return; }
    for (;;) {
      yield* PA.say(m.name + ' would like to learn ' + mv + '!\fBut it already knows four moves, which is all anyone can be expected to remember.');
      const yes = yield* PA.yesno('Forget one of them to make room for ' + mv + '?');
      if (yes) {
        yield* PA.say('Which move should be forgotten?', { keep: true });
        const r = yield* PA.menu(m.moves.map((x) => x.n), { x: 0, y: 32, w: 160 });
        for (const s of PA.scenes.slice()) if (s instanceof PA.TextBox && s.keep) PA.pop(s);
        if (r >= 0) {
          const old = m.moves[r].n;
          m.replaceMove(r, mv);
          yield* PA.say(m.name + ' politely lets ' + old + ' slip its mind.');
          PA.audio.jingle(PA.audio.J.level);
          yield* PA.say(m.name + ' picked up ' + mv + '!');
          return;
        }
      }
      const stop = yield* PA.yesno('Give up on learning ' + mv + '?');
      if (stop) { yield* PA.say(m.name + ' did not learn ' + mv + '.'); return; }
    }
  };

  // ---------------------------------------------------------------- dex
  M.dex = function* () {
    const seen = Object.keys(PA.state.seen).map(Number).sort((a, b) => a - b);
    if (!seen.length) { yield* PA.say('The ALMANAC is empty. It judges you silently.'); return; }
    const max = Math.max(...seen);
    const ids = []; for (let i = 1; i <= max; i++) ids.push(i);
    let start = 0;
    for (;;) {
      const nC = Object.keys(PA.state.caught).length;
      const labels = ids.map((id) => (PA.state.caught[id] ? '♥ ' : '\u2007 ') + (PA.state.seen[id] ? PA.species(id).n : '- - - - -'));
      const r = yield* PA.menu(labels, { x: 0, y: 0, w: 120, h: 144, spacing: 12, start, drawExtra: (mn) => {
        G.box(104, 0, 56, 64);
        G.text('SPOTTED', 110, 8); G.textR(String(seen.length), 152, 18);
        G.text('FRIENDS', 110, 34); G.textR(String(nC), 152, 44);
        // scroll window: draw only around cursor
      } , visible: 11 });
      if (r < 0) return;
      start = r;
      if (PA.state.seen[ids[r]]) yield* PA.scenesApi.dexEntry(ids[r]);
    }
  };
  // menus with many items: make Menu scroll
  const baseDraw = PA.Menu.prototype.draw;
  PA.Menu.prototype.draw = function () {
    const vis = Math.floor((this.h - (this.spacing === 16 ? 8 : 16)) / this.spacing);
    if (this.items.length <= vis) return baseDraw.call(this);
    G.box(this.x, this.y, this.w, this.h);
    const top = PA.clamp(this.i - Math.floor(vis / 2), 0, this.items.length - vis);
    const rowY = this.y + 8 + (this.i - top) * this.spacing;
    G.selRow(this.x + 6, rowY, this.w - 18, this.spacing, this.done);
    for (let k = 0; k < vis; k++) {
      const it = this.items[top + k];
      const label = typeof it === 'string' ? it : it.label;
      G.textCols(label, this.x + 16, this.x + this.w - 14, this.y + 8 + k * this.spacing, PA.Menu.colour(it, top + k === this.i && !this.done)); // clear of the scroll marks
    }
    if (!this.done) G.cursor(this.x + 9, rowY - 1);
    G.scrollMarks(this.x + this.w - 11, this.y + 6, this.y + this.h - 6, top > 0, top + vis < this.items.length);
    if (this.drawExtra) this.drawExtra(this);
  };

  // ---------------------------------------------------------------- diary (journal)
  M.journal = function* () {
    const q = PA.world.quest;
    const sc = { done: false, update() { if (I.pressed.a || I.pressed.b || I.pressed.start || I.pressed.select) { PA.audio.sfx('select'); this.done = true; PA.pop(this); } }, draw() {
      G.clear('#f6efdc');
      G.window(0, 0, 160, 144, 'DIARY OF ' + PA.sub('{PLAYER}'), { paper: '#f6efdc' });
      const ep = PA.wrap('"' + q.episode + '"', 18)[0];
      ep.slice(0, 2).forEach((l, k) => G.text(l, 8, 20 + k * 9, '#7a4a98'));
      const act = PA.state.act || 1;
      G.text('ACT ' + ['I', 'II', 'III'][act - 1] + ' of III', 8, 42, '#3a5a8a');
      const lines = [];
      (PA.state.journal || []).slice(-5).forEach((j) => PA.wrap(j, 18)[0].forEach((l) => lines.push(l)));
      lines.slice(-9).forEach((l, k) => G.text(l, 8, 56 + k * 9));
      const mins = Math.floor((PA.state.time || 0) / 3600);
      G.text('TIME ' + mins + ' MIN', 8, 136 - 4, '#8a8a9a');
    } };
    PA.push(sc);
    while (!sc.done) yield;
  };

  // ---------------------------------------------------------------- trainer card
  M.card = function* () {
    const sc = { done: false, update() { if (I.pressed.a || I.pressed.b) { PA.audio.sfx('select'); this.done = true; PA.pop(this); } }, draw() {
      G.clear(G.PAPER);
      G.window(0, 0, 160, 96, 'TRAINER CARD');
      G.text('NAME/' + PA.sub('{PLAYER}'), 8, 16);
      G.text('MONEY/£' + PA.state.money, 8, 32);
      const s = Math.floor((PA.state.time || 0) / 60);
      G.text('TIME/' + Math.floor(s / 3600) + ':' + PA.pad(Math.floor(s / 60) % 60, 2, '0'), 8, 48);
      G.text('SEED/' + PA.world.seed, 8, 64);
      G.text('FRIENDS/' + Object.keys(PA.state.caught).length, 8, 80);
      G.hero(PA.heroWho(), 'down', 0, 112, 20, { scale: 3 });
      G.box(0, 96, 160, 48);
      const keys = M.bagList(false).filter((k) => PA.itemInfo(k).kind === 'key' && !['WORLD MAP', 'ALMANAC'].includes(k));
      G.text('KEEPSAKES', 8, 104);
      G.text(keys.length ? keys.join(', ').slice(0, 36) : 'None yet.', 8, 120);
    } };
    PA.push(sc);
    while (!sc.done) yield;
  };

  // ---------------------------------------------------------------- options
  M.options = function* () {
    for (;;) {
      const sp = ['SLOW', 'MID', 'FAST'][PA.textSpeed - 1];
      const pad = I.padLayout === 'right' ? 'A=RIGHT' : 'A=BOTTOM';
      const r = yield* PA.menu(['TEXT ' + sp, 'SOUND ' + (PA.audio.muted ? 'OFF' : 'ON'), 'SCREEN SIZE', 'PAD ' + pad, 'CANCEL'], { x: 0, y: 0, w: 144 });
      if (r === 0) { PA.textSpeed = PA.textSpeed % 3 + 1; try { localStorage.setItem('pa_speed', PA.textSpeed); } catch (e) {} }
      else if (r === 1) PA.audio.toggleMute();
      else if (r === 2) { yield* PA.say('Press F for fullscreen. The pixels will remain admirably square.'); }
      else if (r === 3) { // which face button is A: the bottom one, or the right one (pads labelled the other way round)
        I.setPadLayout(I.padLayout === 'right' ? 'bottom' : 'right');
        yield* PA.say(I.padLayout === 'right' ? 'Controller set: the right face button is A, the bottom one is B.' : 'Controller set: the bottom face button is A, the right one is B.');
      } else return;
    }
  };

  // ---------------------------------------------------------------- save
  M.save = function* () {
    const yes = yield* PA.yesno('Would you like to SAVE the game?');
    if (!yes) return;
    const ok = PA.saveGame();
    PA.audio.sfx('save');
    yield* PA.say(ok ? '{PLAYER} saved the game.\fSomewhere, a seed was written down.' : 'The save failed! (Is browser storage blocked?)');
  };

  // ---------------------------------------------------------------- world map
  M.worldMap = function* () {
    const ow = PA.world.maps.overworld;
    const C = PA.C, T = PA.T;
    const cv = document.createElement('canvas');
    cv.width = ow.w; cv.height = ow.h;
    const x = cv.getContext('2d');
    const im = x.createImageData(ow.w, ow.h);
    const visited = PA.state.visited || {};
    for (let yy = 0; yy < ow.h; yy++) for (let xx = 0; xx < ow.w; xx++) {
      const k = ow.i(xx, yy), c = ow.coll[k], t = ow.tiles[k];
      const pal = PA.palName(ow.pals[k]);
      let col = [48, 96, 56];
      if (c === C.WATER) col = [72, 128, 216];
      else if (c === C.GRASS) col = [92, 168, 88];
      else if (c === C.LEDGE) col = [150, 130, 80];
      else if (PA.walkable(c)) col = pal === 'ground' ? [224, 200, 140] : [176, 216, 140];
      else if (pal.startsWith('roof') || pal === 'wall') col = pal === 'wall' ? [240, 236, 220] : G.PAL[pal][2];
      else if (pal === 'mountain') col = [150, 120, 90];
      else if (pal === 'forest') col = [30, 80, 40];
      else if (t === T.sign || t === T.posts) col = [160, 110, 60];
      const z = ow.zone[k];
      if (z >= 0 && !visited[z]) col = col.map((v) => Math.round(v * 0.45 + 30));
      if (z < 0) col = [24, 56, 32];
      const j = k * 4; im.data[j] = col[0]; im.data[j + 1] = col[1]; im.data[j + 2] = col[2]; im.data[j + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    const named = [];
    PA.world.cells.forEach((c) => { const z = PA.world.zones[c.zi]; if (!named.some((n) => n.zi === c.zi)) named.push({ zi: c.zi, name: z.name, cx: c.x0 + 12, cy: c.y0 + 10, kind: z.kind }); });
    const p = PA.ow.player;
    let cur = Math.max(0, named.findIndex((n) => n.zi === ow.zoneAt(p.x, p.y)));
    const CW = PA.CELL.CW, CH = PA.CELL.CH;
    const cx0 = Math.min(...PA.world.cells.map((c) => c.cx)), cx1 = Math.max(...PA.world.cells.map((c) => c.cx));
    const cy0 = Math.min(...PA.world.cells.map((c) => c.cy)), cy1 = Math.max(...PA.world.cells.map((c) => c.cy));
    const bw = (cx1 - cx0 + 1) * CW, bh = (cy1 - cy0 + 1) * CH;
    const ox = Math.floor((160 - bw) / 2) - cx0 * CW, oy = Math.floor((120 - bh) / 2) - cy0 * CH;
    const sc = { t: 0, done: false, update() {
      this.t++;
      if (I.repeat.up || I.repeat.right) { cur = (cur + 1) % named.length; PA.audio.sfx('tick'); }
      if (I.repeat.down || I.repeat.left) { cur = (cur + named.length - 1) % named.length; PA.audio.sfx('tick'); }
      if (I.pressed.a || I.pressed.b) { this.done = true; PA.pop(this); }
    }, draw() {
      G.clear('#183820');
      G.ctx.drawImage(cv, cx0 * CW, cy0 * CH, bw, bh, ox + cx0 * CW, oy + cy0 * CH, bw, bh);
      for (const t of named) if (t.kind === 'town') { G.rect(ox + t.cx - 2, oy + t.cy - 2, 5, 5, '#20181a'); G.rect(ox + t.cx - 1, oy + t.cy - 1, 3, 3, PA.state.visited[t.zi] ? '#f8d040' : '#a09080'); }
      const n = named[cur];
      if (n) { G.ctx.strokeStyle = (this.t >> 3) % 2 ? '#fff' : '#f8d040'; G.ctx.strokeRect(ox + n.cx - 12 + 0.5, oy + n.cy - 10 + 0.5, 23, 19); }
      if (PA.ow.mapId === 'overworld' && (this.t >> 4) % 2) G.rect(ox + p.x - 1, oy + p.y - 1, 3, 3, '#f83030');
      G.box(0, 120, 160, 24);
      G.text(n ? n.name : '', 8, 128);
    } };
    PA.push(sc);
    while (!sc.done) yield;
  };
})(window.PA);
