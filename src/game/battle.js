// Procedural Adventures - battles
'use strict';
(function (PA) {
  const G = PA.gfx, I = PA.input;
  // (a sentence may start with a foe's name, 'the wild X')
  const say = (t, o) => PA.say(typeof t === 'string' ? t.charAt(0).toUpperCase() + t.slice(1) : t, o);
  const STAGE = [2 / 8, 2 / 7, 2 / 6, 2 / 5, 2 / 4, 2 / 3, 1, 3 / 2, 4 / 2, 5 / 2, 6 / 2, 7 / 2, 8 / 2];
  const mult = (s) => STAGE[s + 6];
  const STAT_NAME = { atk: 'ATTACK', def: 'DEFENSE', spd: 'SPEED', spc: 'SPECIAL', acc: 'ACCURACY', eva: 'EVASIVENESS', pow: 'ATTACK' };
  // Temperament (src/game/roster.js): a Diva hits harder the turn after it lands a hit, and sulks - less
  // accurate - after taking a big one; a Shy One is hard to hit on its first turn out and holds back while
  // its opponent is still at full health.
  const DIVA_HYPE = 1.25, DIVA_SULK_AT = 0.3, DIVA_SULK_ACC = 0.75, SHY_HIDE_ACC = 0.75, SHY_NERVES = 0.75;
  const STATUS_TXT = { PSN: 'poisoned', BRN: 'burned', PAR: 'paralyzed', SLP: 'fell asleep', FRZ: 'frozen stiff' };
  const FXPAL = {
    fire: [[255, 255, 240], [248, 200, 64], [224, 80, 32], [64, 16, 8]], water: [[240, 248, 255], [128, 192, 248], [48, 104, 200], [16, 32, 72]],
    ice: [[248, 255, 255], [168, 232, 248], [72, 160, 208], [16, 48, 80]], zap: [[255, 255, 230], [248, 232, 64], [200, 144, 16], [48, 32, 8]],
    leaf: [[240, 255, 230], [136, 208, 96], [56, 128, 56], [16, 40, 16]], psy: [[255, 240, 255], [224, 144, 232], [152, 64, 176], [40, 16, 56]],
    rock: [[248, 240, 224], [200, 168, 128], [128, 96, 64], [40, 24, 16]], poison: [[248, 240, 255], [184, 136, 216], [104, 56, 144], [32, 16, 48]],
    normal: [[255, 255, 255], [200, 200, 208], [96, 96, 112], [16, 16, 24]], heart: [[255, 255, 255], [248, 160, 192], [216, 64, 112], [64, 16, 32]],
    food: [[255, 250, 236], [240, 200, 132], [176, 112, 56], [56, 32, 16]],
  };

  // the battle-effect tiles by name (tools/build_fx.py): impact, note, fang, gust (4 frames), spike, zzz, bolt,
  // spark, leaf, slash (2), drop, rock, flame (3), ice, bubble (3), swirl, heart, food (3: seed, pellet, treat), hand, anger
  const T = window.PA_ASSETS.fxTiles;
  // befriending: the approaches (as the menu shows them), the foods, and what a compliment can be about
  const APPROACHES = ['COMPLIMENT', 'WAIT', 'PET', 'FEED', 'PLAY'];
  const APPROACH_LABEL = { COMPLIMENT: 'COMPLIMENT', WAIT: 'WAIT QUIETLY', PET: 'PET', FEED: 'FEED', PLAY: 'PLAY' };
  const FOODS = ['SEEDS', 'PELLETS', 'TREATS'];
  const FOOD = { SEEDS: ['a handful of seeds', 'seeds', 'seeds', 0], PELLETS: ['a scoop of pellets', 'pellets', 'pellets', 1], TREATS: ['a little biscuit', 'biscuit', 'treats', 2] };
  const FEATURES = ['whiskers', 'tail', 'posture', 'colouring', 'eyes', 'composure', 'ears', 'sense of style'];

  class Side {
    constructor(mon, b) { this.b = b; this.set(mon); }
    set(mon) {
      this.mon = mon;
      this.st = { atk: 0, def: 0, spd: 0, spc: 0, acc: 0, eva: 0 };
      this.v = { out: this.b.turnNo + 1 }; // the turn it first faces (a Shy One hides on it)
      this.types = mon ? mon.types.slice() : [];
      this.disp = mon ? mon.hp : 0;
    }
  }

  class Battle {
    constructor(o) {
      this.kind = o.kind;
      this.trainer = o.trainer;
      this.enemyTeam = o.kind === 'wild' ? [o.wild] : o.team;
      this.music = o.music;
      this.special = o.special;
      this.party = PA.state.party;
      this.ei = 0;
      this.pi = Math.max(0, this.party.findIndex((m) => m.hp > 0));
      this.turnNo = 0;
      this.E = new Side(this.enemyTeam[0], this);
      this.P = new Side(null, this);
      this.parts = new Set();
      this.done = false; this.result = null;
      this.ui = { eX: 0, pX: 0, eShow: false, pShow: false, eTrainer: o.kind === 'trainer', pTrainer: true, eAlpha: 1, eDrop: 0, pDrop: 0, eBlink: 0, pBlink: 0, shake: 0, shakeE: 0, fx: [], eScale: 1, pScale: 1, pHop: 0, eSil: false, flash: 0, invert: 0, menu: null };
      this.runTries = 0;
      this.payday = 0;
      this.t = 0;
      PA.audio.play(this.music, PA.ow.song(this.music));
      this.script = PA.script(this.run());
    }
    update() {}

    // ------------------------------------------------------------ drawing
    // The screen: a status strip across the top (yours on the left, over your creature; the other side's on the
    // right, over its), the two creatures facing each other below it, and the text window at the bottom.
    draw() {
      const u = this.ui;
      this.t++;
      G.clear(G.rgb(G.grade([248, 246, 236], 'day')));
      const sx = u.shake ? (Math.random() < 0.5 ? -2 : 2) : 0;
      if (u.shake) u.shake--;
      // where each creature stands
      G.ctx.fillStyle = 'rgba(80,90,120,0.13)';
      ellipse(120, 86, 30, 5);
      ellipse(36, 96, 32, 4);
      // the other side: a trainer, or its creature
      if (u.eTrainer && this.trainer) {
        const t = this.trainer;
        const spr = t.spr !== undefined ? t.spr : PA.SPR.youngster;
        if (PA.isPerson(spr)) G.person(spr, 'down', 0, 96 + u.eX + sx, 34, { scale: 3 });
        else G.char(spr, 0, t.pal || 'cGrey', 96 + u.eX + sx, 34, { scale: 3 });
      } else if (u.eShow && this.E.mon && !(u.eBlink && (u.eBlink-- >> 2) % 2)) {
        const shx = u.shakeE ? (u.shakeE-- % 4 < 2 ? -3 : 3) : 0;
        if (u.eSil) G.mon(this.E.mon.id, 'front', 92 + u.eX + sx + shx, 24, { pal: [[60, 60, 80], [60, 60, 80], [60, 60, 80], [60, 60, 80]] });
        else if (u.eScale < 1) G.mon(this.E.mon.id, 'front', 92 + u.eX, 24, { squash: u.eScale });
        else G.mon(this.E.mon.id, 'front', 92 + u.eX + sx + shx, 24 + u.eDrop, { clipBottom: u.eDrop });
      }
      // your side
      if (u.pTrainer) {
        G.hero(PA.heroWho(), 'up', 0, 16 + u.pX, 46, { scale: 3 });
      } else if (u.pShow && this.P.mon && !(u.pBlink && (u.pBlink-- >> 2) % 2)) {
        const hop = u.pHop || 0;
        if (u.pScale < 1) G.mon(this.P.mon.id, 'back', 4 + u.pX, 36, { squash: u.pScale });
        else G.mon(this.P.mon.id, 'back', 4 + u.pX + sx, 36 + u.pDrop - hop, { clipBottom: u.pDrop });
      }
      // effects
      for (const f of u.fx) {
        if (f.t < 0) continue;
        if (f.kind === 'fx') G.fx(f.tile, f.pal, f.x, f.y, { scale: f.scale || 1, flipX: f.flipX, flipY: f.flipY });
        else if (f.kind === 'rect') G.rect(f.x, f.y, f.w, f.h, f.col);
        else if (f.kind === 'ring') { G.ctx.strokeStyle = f.col; G.ctx.lineWidth = 2; G.ctx.beginPath(); G.ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); G.ctx.stroke(); }
      }
      // the status strip
      if (u.eTrainer && u.showTeams) this.drawTeamHearts(true);
      else if (this.E.mon && (u.eShow || u.eTrainer === false) && !u.hideEInfo) this.drawEnemyInfo();
      if (u.pTrainer && u.showTeams) this.drawTeamHearts(false);
      else if (this.P.mon && u.pShow) this.drawPlayerInfo();
      if (this.kind === 'wild' && this.E.v.hearts > 0 && !this.E.v.hurt && u.eShow) this.drawHeartsMeter();
      // the text window
      G.box(0, 96, 160, 48);
      if (u.flash) { G.fade(u.flash > 2 ? 3 : 2, '#ffffff'); u.flash--; }
      if (u.invert) { u.invert--; G.ctx.globalCompositeOperation = 'difference'; G.rect(0, 0, 160, 96, '#ffffff'); G.ctx.globalCompositeOperation = 'source-over'; }
    }
    drawEnemyInfo() {
      const m = this.E.mon;
      G.panel(81, 1, 78, 22);
      const lv = m.status ? PA.statusLabel(m.status) : '⒧' + m.level;
      G.textR(lv, 155, 4, m.status ? '#c03018' : undefined);
      const lvW = G.textWidth(lv);
      G.textFit(m.name, 85, 4, 66 - lvW);
      // a creature of a kind you've befriended before wears a little heart
      if (PA.state.caught[m.id] && this.kind === 'wild') G.fx(T.heart, FXPAL.heart, 155 - lvW - 9, 3);
      this.hpBar(85, 13, 70, this.E.disp, m.maxhp);
    }
    drawPlayerInfo() {
      const m = this.P.mon;
      G.panel(1, 1, 78, 22);
      const lv = m.status ? PA.statusLabel(m.status) : '⒧' + m.level;
      G.textR(lv, 75, 4, m.status ? '#c03018' : undefined);
      G.textFit(m.name, 5, 4, 66 - G.textWidth(lv));
      const hp = Math.max(0, Math.round(this.P.disp));
      this.hpBar(5, 13, 32, this.P.disp, m.maxhp);
      G.textR(PA.pad(hp, 3) + '/' + PA.pad(m.maxhp, 3), 75, 12);
      const ef = this.ui.expDisp !== undefined ? this.ui.expDisp : m.expFrac();
      G.rect(5, 20, 70, 1, '#a8a6b4');
      G.rect(5, 20, Math.round(70 * ef), 1, '#3c6cd8');
    }
    hpBar(x, y, w, hp, max) {
      const f = Math.max(0, hp) / max;
      G.progress(x, y, w, 6, f, G.hpColour(f));
    }
    // each side's team as six little hearts: full (well), amber (ailing), grey (fainted), faint (an empty place)
    drawTeamHearts(enemy) {
      const team = enemy ? this.enemyTeam : this.party;
      const x0 = enemy ? 81 : 1;
      G.panel(x0, 1, 78, 22);
      for (let i = 0; i < 6; i++) {
        const m = team[i], x = x0 + 5 + i * 12, y = 8;
        if (!m) { G.alpha(0.3); G.fx(T.heart, FXPAL.normal, x, y); G.alpha(1); continue; }
        G.fx(T.heart, m.hp <= 0 ? FXPAL.normal : m.status ? FXPAL.zap : FXPAL.heart, x, y);
      }
    }
    // the befriending meter: hearts won so far, under the other side's panel
    drawHeartsMeter() {
      const need = this.special ? 5 : 3, n = this.E.v.hearts;
      for (let i = 0; i < need; i++) {
        if (i >= n) G.alpha(0.35);
        G.fx(T.heart, i < n ? FXPAL.heart : FXPAL.normal, 154 - (need - i) * 10, 26);
        G.alpha(1);
      }
    }

    // ------------------------------------------------------------ helpers
    get pm() { return this.P.mon; }
    diva(side) { return !!side.mon && PA.isDiva(side.mon.id); }
    shy(side) { return !!side.mon && PA.isShy(side.mon.id); }
    hiding(side) { return this.shy(side) && side.v.out === this.turnNo; }
    get em() { return this.E.mon; }
    // yours by name; the other side's is 'the wild X' or 'MARY's X'
    nameOf(side) { return side !== this.E ? side.mon.name : this.kind === 'wild' ? 'the wild ' + side.mon.name : PA.sub(this.trainer.name) + '\'s ' + side.mon.name; }
    *wait(n) { for (let i = 0; i < n; i++) yield; }
    *tweenHP(side, to) {
      const from = side.disp;
      const n = Math.max(8, Math.min(40, Math.abs(from - to) * 2));
      for (let i = 1; i <= n; i++) { side.disp = from + (to - from) * (i / n); yield; }
      side.disp = to;
    }
    *slide(key, from, to, n) { for (let i = 0; i <= n; i++) { this.ui[key] = from + (to - from) * (i / n); yield; } }

    // ------------------------------------------------------------ flow
    *run() {
      const u = this.ui;
      // intro slide
      u.eX = -110; u.pX = 120;
      for (let i = 0; i <= 30; i++) { u.eX = -110 + (110 * i) / 30; u.pX = 120 - (120 * i) / 30; yield; }
      if (this.kind === 'wild') {
        u.eTrainer = false; u.eShow = true; u.eX = 0;
        PA.audio.cry(this.em.id);
        u.showTeams = true;
        yield* say(this.special ? this.em.name + ' steps out to meet you!' : 'A wild ' + this.em.name + ' blocks your way!');
        u.showTeams = false;
      } else {
        u.showTeams = true;
        yield* say(PA.sub(this.trainer.cls + ' ' + this.trainer.name) + ' requests the pleasure of a battle!');
        u.showTeams = false;
        yield* this.slide('eX', 0, 80, 16);
        u.eTrainer = false;
        yield* this.sendOutEnemy(true);
      }
      u.showTeams = false;
      yield* this.slide('pX', 0, -80, 14);
      u.pTrainer = false;
      yield* this.sendOutPlayer(true);
      // main loop
      for (;;) {
        const act = yield* this.chooseAction();
        if (act.type === 'run') {
          const ok = yield* this.tryRun();
          if (ok) return yield* this.end('run');
          yield* this.enemyTurnOnly();
        } else if (act.type === 'befriend') {
          const r = yield* this.befriend(act.approach, act.food);
          if (r === 'befriended') return yield* this.end('befriended');
          if (r === 'left') return yield* this.end('run');
          if (r !== 'none') yield* this.enemyTurnOnly();
        } else if (act.type === 'item') {
          const r = yield* this.useItem(act.item, act.target);
          if (r === 'used') yield* this.enemyTurnOnly();
        } else if (act.type === 'switch') {
          yield* this.switchTo(act.index);
          yield* this.enemyTurnOnly();
        } else if (act.type === 'fight') {
          yield* this.turn(act.move);
        }
        // hurting a wild creature ends any hope of friendship this time (said once, if you had been trying)
        if (this.E.v.hurt && !this.E.v.hurtSaid && this.E.v.tried && this.em.hp > 0) {
          this.E.v.hurtSaid = true;
          yield* say(this.nameOf(this.E) + ' won\'t trust you now. Not today, anyway.');
        }
        if (this.over) return yield* this.end(this.over);
        const s = yield* this.checkFaints();
        if (s) return yield* this.end(s);
        yield* this.endOfTurn();
        const s2 = yield* this.checkFaints();
        if (s2) return yield* this.end(s2);
      }
    }
    *end(result) {
      this.result = result;
      if (result === 'win' && this.kind === 'trainer') {
        PA.audio.play('victory', PA.ow.song('victory'));
        this.ui.eShow = false; this.ui.eTrainer = true; this.ui.eX = 60; this.ui.hideEInfo = true;
        yield* this.slide('eX', 60, 0, 20);
        yield* say('{PLAYER} has bested ' + PA.sub(this.trainer.cls + ' ' + this.trainer.name) + '!');
        if (this.trainer.lose) yield* say(this.trainer.lose);
        const prize = this.trainer.prize + this.payday;
        PA.state.money += prize;
        yield* say('{PLAYER} is paid £' + prize + ', as is only proper.');
      } else if (result === 'win' && this.payday) {
        PA.state.money += this.payday;
        yield* say('{PLAYER} picked up £' + this.payday + '!');
      }
      if (result === 'lose' && this.trainer && this.trainer.canLose) {
        this.ui.pShow = false;
        if (this.trainer.winText) { this.ui.eShow = false; this.ui.eTrainer = true; this.ui.eX = 0; this.ui.hideEInfo = true; yield* say(this.trainer.winText); }
      }
      // clear battle-only status
      for (const m of this.party) if (m.status === 'CNF') m.status = null;
      for (let i = 0; i < 6; i++) yield;
      this.done = true;
    }

    // ------------------------------------------------------------ send-outs
    *sendOutEnemy(first) {
      const u = this.ui;
      u.eShow = true; u.eScale = 0.1; u.eDrop = 0; u.eX = 0;
      this.E.set(this.em);
      if (!first || this.kind === 'trainer') {
        yield* say(PA.sub(this.trainer.cls + ' ' + this.trainer.name) + ' calls on ' + this.em.name + '!', { auto: 30 });
      }
      PA.audio.sfx('pop');
      for (let i = 0; i <= 8; i++) { u.eScale = 0.1 + 0.9 * (i / 8); yield; }
      u.eScale = 1;
      PA.audio.cry(this.em.id);
      PA.dexSee(this.em.id);
      yield* this.wait(10);
    }
    *sendOutPlayer(first) {
      const u = this.ui;
      this.P.set(this.party[this.pi]);
      this.parts.add(this.pi);
      u.pShow = true; u.pScale = 0.1; u.pDrop = 0; u.pX = 0;
      yield* say('Off you go, ' + this.pm.name + '!', { auto: 24 });
      PA.audio.sfx('pop');
      for (let i = 0; i <= 8; i++) { u.pScale = 0.1 + 0.9 * (i / 8); yield; }
      u.pScale = 1;
      PA.audio.cry(this.pm.id);
      u.expDisp = undefined;
      yield* this.wait(8);
    }
    *switchTo(i) {
      const u = this.ui;
      yield* say('That will do, ' + this.pm.name + '!', { auto: 20 });
      for (let k = 8; k >= 0; k--) { u.pScale = 0.1 + 0.9 * (k / 8); yield; }
      u.pShow = false;
      this.pi = i;
      yield* this.sendOutPlayer(false);
    }

    // ------------------------------------------------------------ menus
    *chooseAction() {
      for (;;) {
        const m = PA.push(new BattleMenu(this));
        while (!m.done) yield;
        if (m.result === 'attack') {
          const usable = this.pm.moves.filter((mv) => mv.pp > 0 && !(this.P.v.disabled && this.P.v.disabled.move === mv.n));
          if (!usable.length) { yield* say(this.pm.name + ' has no moves left!'); return { type: 'fight', move: 'FLOUNDER' }; }
          if (this.P.v.charging) return { type: 'fight', move: this.P.v.charging };
          if (this.P.v.recharge) return { type: 'fight', move: null };
          const mm = PA.push(new MoveMenu(this));
          while (!mm.done) yield;
          if (mm.result < 0) continue;
          const mv = this.pm.moves[mm.result];
          if (mv.pp <= 0) { yield* say('That move is spent. No PP left!'); continue; }
          if (this.P.v.disabled && this.P.v.disabled.move === mv.n) { yield* say(mv.n + ' is disabled!'); continue; }
          return { type: 'fight', move: mv.n, slot: mm.result };
        }
        if (m.result === 'befriend') {
          if (this.kind !== 'wild') { yield* say(PA.sub(this.trainer.name) + '\'s ' + this.em.name + ' already has its person.'); continue; }
          if (this.E.v.hurt) { yield* say(this.nameOf(this.E) + ' won\'t trust you now. Not today, anyway.'); continue; }
          const am = PA.push(new ApproachMenu(this));
          while (!am.done) yield;
          if (am.result < 0) continue;
          const approach = APPROACHES[am.result];
          if (approach !== 'FEED') return { type: 'befriend', approach };
          const f = yield* PA.menu(FOODS, { x: 88, y: 48, w: 72, cancel: -1 });
          if (f < 0) continue;
          return { type: 'befriend', approach, food: FOODS[f] };
        }
        if (m.result === 'team') {
          const i = yield* PA.menus.party({ mode: 'battle', active: this.pi });
          if (i < 0 || i === this.pi) continue;
          if (this.party[i].hp <= 0) { yield* say('It is in no state to battle.'); continue; }
          return { type: 'switch', index: i };
        }
        if (m.result === 'bag') {
          const it = yield* PA.menus.bag({ battle: true });
          if (!it) continue;
          const info = PA.itemInfo(it);
          if (['heal', 'cure', 'revive', 'pp'].includes(info.kind)) {
            const ti = yield* PA.menus.party({ mode: 'item', item: it });
            if (ti < 0) continue;
            return { type: 'item', item: it, target: ti };
          }
          yield* say('A small, sensible voice in your head says:\f"Not now. There\'s a proper moment for everything."');
          continue;
        }
        if (m.result === 'leave') {
          if (this.kind === 'trainer') { yield* say('One does not walk out of a trainer battle. It would be terribly rude.'); continue; }
          return { type: 'run' };
        }
      }
    }
    *tryRun() {
      this.runTries++;
      if (this.special) { yield* say('It\'s looking right at you. You can\'t bring yourself to run.'); return false; }
      if (this.P.v.trapped) { yield* say('There\'s no getting away!'); return false; }
      const ps = this.pm.spd, es = this.em.spd;
      const ch = PA.clamp(0.45 + (ps - es) / Math.max(1, ps) * 0.6 + 0.12 * (this.runTries - 1), 0.25, 1);
      if (ps >= es || PA.rand.next() < ch) { PA.audio.sfx('run'); yield* say('You slipped away, unnoticed.'); return true; }
      yield* say('There\'s no getting away!');
      return false;
    }
    *useItem(item, target) {
      const info = PA.itemInfo(item);
      const m = this.party[target];
      const r = PA.menus.applyItem(item, m, true);
      if (!r.ok) { yield* say(r.msg || 'It won\'t have any effect.'); return 'none'; }
      PA.ow.take(item);
      if (target === this.pi) { yield* this.tweenHP(this.P, m.hp); }
      PA.audio.sfx('heal');
      yield* say(r.msg);
      return 'used';
    }
    // ------------------------------------------------------------ befriending (docs/FRIENDSHIP_PLAN.md)
    // Each try takes your turn. What it thinks of an approach depends on its temperament and its row in PA.CARE;
    // a liked approach may add a heart, a favourite two. Fill the meter (3 hearts, 5 for a special creature) and
    // it joins you. A disliked one costs a heart and may send it off; petting one that hates it gets you bitten.
    *befriend(approach, food) {
      const E = this.E, m = this.em, u = this.ui;
      if (this.kind !== 'wild') { yield* say(PA.sub(this.trainer.name) + '\'s ' + m.name + ' already has its person.'); return 'none'; }
      if (E.v.hurt) { yield* say(this.nameOf(E) + ' won\'t trust you now. Not today, anyway.'); return 'none'; }
      const care = PA.care(m.id), diva = PA.isDiva(m.id), nm = this.nameOf(E);
      const need = this.special ? 5 : 3;
      E.v.tried = true; E.v.hearts = E.v.hearts || 0;
      const likes = PA.state.likes || (PA.state.likes = {});
      const known = likes[m.id] || (likes[m.id] = {});
      const F = FOOD[food] || FOOD.TREATS;
      // the attempt, and a little show
      if (approach === 'COMPLIMENT') {
        yield* say('{PLAYER} admires ' + nm + '\'s marvellous ' + PA.rand.pick(FEATURES) + '.', { auto: 40 });
        PA.audio.sfx('spark');
        for (let i = 0; i < 24; i++) { const t = i / 24; u.fx = [0, 1, 2].map((k) => ({ kind: 'fx', tile: T.impact, pal: FXPAL.heart, x: 36 + 84 * PA.clamp(t * 1.4 - k * 0.15, 0, 1), y: 64 - 14 * PA.clamp(t * 1.4 - k * 0.15, 0, 1) + k * 4 })); yield; }
      } else if (approach === 'WAIT') {
        yield* say('{PLAYER} sits down and waits, very still.', { auto: 40 });
        yield* this.wait(30);
      } else if (approach === 'PET') {
        yield* say('{PLAYER} reaches out, slowly, to give ' + nm + ' a pat.', { auto: 40 });
        for (let i = 0; i < 24; i++) { u.fx = [{ kind: 'fx', tile: T.hand, pal: FXPAL.food, x: 112 + Math.round(Math.sin(i / 3) * 2), y: 30 + (i < 12 ? i : 24 - i) / 2, scale: 2 }]; yield; }
      } else if (approach === 'FEED') {
        yield* say('{PLAYER} offers ' + F[0] + '.', { auto: 40 });
        for (let i = 0; i < 20; i++) { u.fx = [0, 1, 2].map((k) => ({ kind: 'fx', tile: T.food + F[3], pal: FXPAL.food, x: 100 + k * 10, y: 60 + Math.min(i, 14) + (k % 2) * 3 })); yield; }
      } else { // PLAY
        yield* say(this.pm.name + ' does a little hop. An invitation!', { auto: 40 });
        for (let i = 0; i < 24; i++) { u.pHop = Math.round(Math.abs(Math.sin(i / 24 * Math.PI * 2)) * 6); yield; }
        u.pHop = 0;
      }
      u.fx = [];
      // what it makes of that
      let v;
      if (approach === 'PET') v = care.pet === 'loves' || (care.pet === 'fine' && care.fav === 'PET') ? 'fav' : care.pet === 'hates' ? 'hate' : 'like';
      else if (approach === 'FEED') v = F[2] !== care.diet ? 'meh' : care.fav === 'FEED' ? 'fav' : 'like';
      else if (approach === care.fav) v = 'fav';
      else if (diva) v = approach === 'WAIT' ? 'dislike' : 'like';
      else v = approach === 'WAIT' ? 'like' : 'dislike';
      const lead = this.pm;
      const p = PA.clamp((PA.friendRate(m.id) / 255) * PA.clamp(1 + 0.05 * (lead.level - m.level), 0.6, 1.3) * (PA.state.caught[m.id] ? 1.2 : 1)
        + (PA.isDiva(lead.id) === diva ? 0.08 : 0), 0.08, 0.92);
      let gain = v === 'fav' ? (PA.rand.next() < p + 0.25 ? 2 : 0) : v === 'like' ? (PA.rand.next() < p ? 1 : 0) : 0;
      if (PA.testFriendAlways && v !== 'hate') { v = 'fav'; gain = need; }
      if (v === 'hate') { // F10: it bites back at once, then the turn goes on as usual
        known.pet = 'hates';
        PA.audio.sfx('cross');
        for (let i = 0; i < 20; i++) { u.fx = [{ kind: 'fx', tile: T.anger, pal: FXPAL.fire, x: 136, y: 26 - (i < 6 ? i : 6), scale: 2 }]; u.shakeE = i < 10 ? 4 : 0; yield; }
        u.fx = [];
        yield* say(nm + ' does NOT want to be petted!');
        const hits = m.moves.filter((mv) => mv.pp > 0 && PA.moveData(mv.n).power > 0);
        if (this.pm.hp > 0) yield* this.doMove(E, this.P, hits.length ? PA.rand.pick(hits).n : 'FLOUNDER');
        E.v.hearts = Math.max(0, E.v.hearts - 1);
        return 'used';
      }
      if (v === 'meh') { yield* say(nm + ' sniffs the ' + F[1] + ' and turns up its nose.'); return 'used'; }
      if (v === 'dislike') {
        PA.audio.sfx('status');
        yield* say(nm + (diva ? ' yawns pointedly.' : ' hides its face.'));
        if (E.v.hearts > 0) { E.v.hearts--; yield* say(nm + ' looks away.'); }
        if (!this.special && PA.rand.next() < (diva ? 0.3 : 0.5)) {
          PA.audio.sfx('flee');
          for (let i = 0; i <= 16; i++) { u.eX = i * 5; yield; }
          u.eShow = false; u.eX = 0;
          yield* say(nm + ' wandered off.');
          return 'left';
        }
        return 'used';
      }
      if (!gain) { yield* say('It isn\'t sure yet.'); return 'used'; }
      if (approach === 'PET') known.pet = care.pet;
      if (approach === 'FEED') known.diet = care.diet;
      if (v === 'fav') known.fav = approach;
      for (let h = 0; h < Math.min(gain, need - E.v.hearts); h++) {
        PA.audio.sfx('heart');
        for (let i = 0; i < 14; i++) { u.fx = [{ kind: 'fx', tile: T.heart, pal: FXPAL.heart, x: 112 + h * 12, y: 40 - i, scale: 2 }]; yield; }
      }
      u.fx = [];
      E.v.hearts = Math.min(need, E.v.hearts + gain);
      yield* say(nm + (v === 'fav' ? ' loves that!' : ' seems to like that.'));
      if (E.v.hearts < need) return 'used';
      // a new friend
      for (let i = 0; i < 20; i++) { u.eX = -Math.round(Math.sin(i / 20 * Math.PI) * 8); yield; }
      u.eX = 0;
      PA.audio.jingle(PA.audio.J.friend);
      yield* say(m.name + ' wants to be {PLAYER}\'s friend!');
      const isNew = !PA.state.caught[m.id];
      PA.dexCatch(m.id);
      if (isNew) {
        yield* say(m.name + '\'s particulars go into the ALMANAC.');
        yield* PA.scenesApi.dexEntry(m.id);
      }
      yield* this.giveExp(); // F4: as much as winning
      m.ot = PA.state.name;
      m.status = m.status === 'CNF' ? null : m.status;
      const nick = yield* PA.yesno('Would you like to give ' + m.name + ' a nickname?');
      if (nick) { const nn = yield* PA.scenesApi.naming('Nickname?', m.name, 10, m.id); if (nn && nn !== m.name) m.nick = nn; }
      if (this.party.length < 6) this.party.push(m);
      else { PA.state.box.push(m); yield* say(m.name + ' went to the LODGINGS. It\'ll be fine. There are snacks.'); }
      this.caught = m;
      PA.state.stats.caught = (PA.state.stats.caught || 0) + 1;
      return 'befriended';
    }

    // ------------------------------------------------------------ turns
    enemyMove() {
      const s = this.E;
      if (s.v.charging) return s.v.charging;
      if (s.v.recharge) return null;
      let moves = s.mon.moves.filter((m) => m.pp > 0 && !(s.v.disabled && s.v.disabled.move === m.n));
      if (!moves.length) return 'FLOUNDER';
      if (s.v.taunt && this.kind !== 'wild') { const hit = moves.filter((m) => PA.moveData(m.n).power > 0); if (hit.length) moves = hit; }
      if (this.kind === 'wild') return PA.rand.pick(moves).n;
      // simple trainer AI
      let best = null, bestScore = -1;
      for (const mv of moves) {
        const d = PA.moveData(mv.n);
        let sc = 10;
        if (d.power > 0) {
          const eff = PA.typeEff(d.type, this.P.types);
          sc = d.power * eff * (s.types.includes(d.type) ? 1.5 : 1) * (d.acc / 100);
          if (eff === 0) sc = 0;
        } else if (d.inflict === 'CNF') sc = this.P.v.confused ? 0 : 45; // confusion is volatile, not a status
        else if (d.inflict) sc = this.pm.status || this.immune(this.P, d.inflict) ? 0 : 45;
        else if (d.guard) sc = s.v.guardTurn === this.turnNo - 1 ? 0 : 20; // a guard fails two turns running
        else if (d.heal || d.rest) sc = s.mon.hp < s.mon.maxhp / 2 ? 90 : 5;
        else if (d.mark) sc = this.P.v.marked ? 5 : 30;
        else if (d.taunt) sc = this.P.v.taunt ? 5 : 20;
        else if (d.temp) sc = ((d.temp.who === 'self' ? s : this.P).v.temps || []).some((x) => x.move === d.name) ? 0 : 25;
        else if (d.self) sc = s.st[d.self[0].stat === 'pow' ? 'atk' : d.self[0].stat] >= 2 ? 5 : 30;
        else if (d.foe) sc = this.P.st[d.foe[0].stat === 'pow' ? 'atk' : d.foe[0].stat] <= -2 ? 5 : 25;
        else if (d.sureNext) sc = s.v.sureNext ? 0 : 15;
        sc *= 0.75 + PA.rand.next() * 0.5;
        if (sc > bestScore) { bestScore = sc; best = mv.n; }
      }
      return best;
    }
    speedOf(side) {
      let s = side.mon.spd * mult(side.st.spd);
      if (side.mon.status === 'PAR') s /= 4;
      return s;
    }
    *turn(pMove) {
      this.turnNo++;
      // boss trainers may heal once
      if (this.kind === 'trainer' && this.trainer.prize >= 900 && !this.E.v.healed && this.em.hp < this.em.maxhp * 0.25 && PA.rand.chance(0.7)) {
        this.E.v.healed = true;
        const amt = Math.min(this.em.maxhp - this.em.hp, 50);
        this.em.hp += amt;
        yield* say(PA.sub(this.trainer.name) + ' used STRONG TONIC!');
        PA.audio.sfx('heal');
        yield* this.tweenHP(this.E, this.em.hp);
        yield* this.doMove(this.P, this.E, pMove);
        return;
      }
      const eMove = this.enemyMove();
      const pd = pMove ? PA.moveData(pMove) : null, ed = eMove ? PA.moveData(eMove) : null;
      const pp = pd ? pd.priority || 0 : 0, ep = ed ? ed.priority || 0 : 0;
      let pFirst;
      if (pp !== ep) pFirst = pp > ep;
      else { const a = this.speedOf(this.P), b = this.speedOf(this.E); pFirst = a > b || (a === b && PA.rand.chance(0.5)); }
      const order = pFirst ? [[this.P, this.E, pMove], [this.E, this.P, eMove]] : [[this.E, this.P, eMove], [this.P, this.E, pMove]];
      for (const [a, d, mv] of order) {
        if (a.mon.hp <= 0 || d.mon.hp <= 0) break;
        a.v.first = a === order[0][0];
        yield* this.doMove(a, d, mv);
        if (this.over) return;
      }
    }
    *enemyTurnOnly() {
      this.turnNo++;
      this.E.v.first = false;
      if (this.em.hp <= 0) return;
      const eMove = this.enemyMove();
      yield* this.doMove(this.E, this.P, eMove);
    }

    *doMove(A, D, moveName) {
      const isP = A === this.P;
      const who = this.nameOf(A);
      // recharge
      if (A.v.recharge) { A.v.recharge = false; yield* say(who + ' has to catch its breath!'); return; }
      if (moveName === null) return;
      // sleep / freeze / flinch / paralysis / confusion
      if (A.mon.status === 'SLP') {
        A.mon.sleep--;
        if (A.mon.sleep <= 0) { A.mon.status = null; yield* say(who + ' woke up!'); }
        else { yield* this.statusAnim(A, 'SLP'); yield* say(who + ' is fast asleep.'); }
        return;
      }
      if (A.mon.status === 'FRZ') {
        if (PA.rand.chance(0.2)) { A.mon.status = null; yield* say(who + ' thawed out!'); }
        else { yield* say(who + ' is frozen stiff!'); return; }
      }
      if (A.v.flinch) { A.v.flinch = false; yield* say(who + ' flinched!'); return; }
      if (A.v.stunned) { A.v.stunned = false; A.v.stunImmune = this.turnNo + 1; yield* this.statusAnim(A, 'FRZ'); yield* say(who + ' is frozen in place!'); return; }
      if (A.mon.status === 'PAR' && PA.rand.chance(0.25)) { yield* this.statusAnim(A, 'PAR'); yield* say(who + ' is too stiff to move!'); return; }
      if (A.v.confused) {
        A.v.confused--;
        if (A.v.confused <= 0) { A.v.confused = 0; yield* say(who + ' has come to its senses!'); }
        else {
          yield* say(who + ' is all in a muddle!');
          yield* this.statusAnim(A, 'CNF');
          if (PA.rand.chance(0.5)) {
            const dmg = Math.max(1, Math.floor(((2 * A.mon.level / 5 + 2) * 40 * A.mon.atk / A.mon.def) / 50) + 2);
            yield* say('It blundered into itself!');
            yield* this.damage(A, dmg, null);
            return;
          }
        }
      }
      let d = PA.moveData(moveName);
      if (A.v.taunt && d.power === 0 && !A.v.charging) {
        this.spendPP(A, moveName);
        yield* say(who + ' can\'t take its eyes off ' + this.nameOf(D) + '!');
        return;
      }
      // mirror: use the last attack used on it
      if (d.mirror) {
        this.spendPP(A, moveName);
        yield* say(who + ' used ' + moveName + '!');
        if (!D.v.last) { yield* say('It came to nothing!'); return; }
        d = PA.moveData(D.v.last);
        yield* say(who + ' used ' + d.name + '!');
        return yield* this.execute(A, D, d, true);
      }
      // charging two-turn moves
      if (d.charge && !A.v.charging) {
        this.spendPP(A, moveName);
        A.v.charging = moveName;
        if (d.semiInv) A.v.semi = true;
        if (d.chargeGuard) { A.v.guard = true; A.v.guardTurn = this.turnNo; }
        yield* say(who + (d.chargeSay || ' is charging up!'));
        if (d.semiInv) { if (isP) this.ui.pShow = false; else this.ui.eShow = false; }
        return;
      }
      const wasCharging = !!A.v.charging;
      A.v.charging = null; A.v.semi = false;
      if (isP) this.ui.pShow = true; else this.ui.eShow = true;
      if (!wasCharging) this.spendPP(A, moveName);
      yield* say(who + ' used ' + moveName + '!', { auto: 26 });
      A.v.last = moveName;
      yield* this.execute(A, D, d, false);
    }
    spendPP(A, moveName) {
      const mv = A.mon.moves.find((m) => m.n === moveName);
      if (mv && mv.pp > 0) mv.pp--;
    }
    hits(A, D, d) {
      this.missWhy = null;
      const sulking = A.v.sulk;
      A.v.sulk = false; // a sulk lasts one attack
      if (d.sure) return true;
      if (D.v.semi) return false;
      if (A.v.sureNext) { A.v.sureNext = false; return true; }
      if (d.ohko) return A.mon.level >= D.mon.level && PA.rand.chance(0.3);
      let acc = (d.acc / 100) * mult(A.st.acc) / mult(D.st.eva);
      if (sulking) acc *= DIVA_SULK_ACC;
      if (this.hiding(D)) { acc *= SHY_HIDE_ACC; this.missWhy = 'hiding'; }
      if (acc >= 1) acc = 255 / 256; // the famous 1/256
      return PA.rand.next() < acc;
    }
    *execute(A, D, d, viaOther) {
      const isP = A === this.P;
      const who = this.nameOf(A), tgt = this.nameOf(D);
      // a status move aimed only at the user: no accuracy roll, and nothing to block
      const selfMove = d.power === 0 && !(d.inflict || d.foe || d.mark || d.taunt || (d.temp && d.temp.who === 'foe') || d.seed || d.disable);
      if (!selfMove && D.v.guard && !D.v.semi) { // blocked or dodged (SINK AWAY, WRINKLE WALL, BILL SENSE...)
        D.v.guard = false;
        A.v.sulk = false;
        yield* say(tgt + ' dodged the attack!');
        return;
      }
      if (!selfMove && !this.hits(A, D, d)) {
        if (d.crash) { yield* say(who + ' overshot and took a tumble!'); yield* this.damage(A, 1, null); return; }
        if (this.missWhy === 'hiding' && d.acc >= 100) { yield* say(tgt + ' was hiding! ' + who + '\'s attack missed!'); return; }
        const acc1 = (d.acc >= 100 && !this.joked256);
        if (acc1) this.joked256 = true;
        yield* say(acc1 && d.acc >= 100 ? who + '\'s attack missed!\f(It does that sometimes. One time in 256. It\'s tradition.)' : who + '\'s attack missed!');
        return;
      }
      // a wild creature that's been hurt won't be anyone's friend this time (F1: your moves that target it and land)
      if (isP && D === this.E && !selfMove && this.kind === 'wild') D.v.hurt = true;
      // status-only moves
      if (d.power === 0 && !d.fixed && !d.levelDmg && !d.halve && !d.psywave && !d.ohko && !d.counter) return yield* this.statusMove(A, D, d);
      // damaging moves
      if (d.needSleep && D.mon.status !== 'SLP') { yield* say('It came to nothing!'); return; }
      yield* this.anim(A, D, d.anim, d);
      // temperament and marks
      let mod = 1;
      if (this.diva(A) && A.v.hype === this.turnNo) { mod *= DIVA_HYPE; yield* say(who + ' is feeling itself!', { auto: 30 }); }
      if (this.shy(A) && D.mon.hp >= D.mon.maxhp) { mod *= SHY_NERVES; if (!A.v.nervesSaid) { A.v.nervesSaid = true; yield* say(who + ' hasn\'t worked up the nerve yet...', { auto: 30 }); } }
      if (D.v.marked && D.v.marked.by === A.mon && D.v.marked.n > 0) { mod *= 1.5; D.v.marked.n--; }
      if (d.firstBoost && A.v.first) mod *= d.firstBoost;
      let total = 0;
      const nHits = d.hits ? (d.hits[0] === d.hits[1] ? d.hits[0] : PA.rand.pickW([[2, 3], [3, 3], [4, 1], [5, 1]])) : 1;
      let lastEff = 1, critAny = false, hitCount = 0;
      for (let h = 0; h < nHits; h++) {
        if (D.mon.hp <= 0) break;
        const r = this.calcDamage(A, D, d, mod);
        if (r.eff === 0) { yield* say(tgt + ' is quite unaffected!'); return; }
        lastEff = r.eff; critAny = critAny || r.crit;
        if (h > 0) yield* this.anim(A, D, 'hit', d, true);
        const room = D.v.sub > 0 ? D.v.sub : D.mon.hp; // what this hit can actually take off
        yield* this.damage(D, r.dmg, r);
        total += Math.min(r.dmg, room); hitCount++; // recoil and drain use damage dealt, not overkill
        if (r.crit) yield* say('A telling blow!', { auto: 30 });
      }
      if (nHits > 1) yield* say('It struck ' + hitCount + ' times!');
      if (lastEff > 1) yield* say('It was most effective!', { auto: 34 });
      else if (lastEff < 1) yield* say('It barely made an impression...', { auto: 34 });
      if (d.ohko && D.mon.hp <= 0) yield* say('Felled in a single blow!');
      // after-effects
      if (d.drain && total > 0) {
        const heal = Math.max(1, Math.floor(total * d.drain));
        A.mon.hp = Math.min(A.mon.maxhp, A.mon.hp + heal);
        yield* this.tweenHP(A, A.mon.hp);
        yield* say(d.drainSay ? who + d.drainSay : who + ' drew strength from ' + tgt + '!');
      }
      if (d.recoil && total > 0) {
        yield* say(who + ' is hurt by the effort!');
        yield* this.damage(A, Math.max(1, Math.floor(total * d.recoil)), null);
      }
      if (d.recharge && D.mon.hp > 0) A.v.recharge = true;
      if (d.selfKO) { yield* this.damage(A, A.mon.hp, null); }
      if (d.payday) { this.payday += A.mon.level * 2; yield* say('Coins tumbled everywhere!'); }
      if (d.trap && D.mon.hp > 0 && !D.v.trapped) { D.v.trapped = PA.rand.int(2, 5); D.v.trapName = d.name; }
      if (d.thrash && PA.rand.chance(0.5) && A.mon.hp > 0) { A.v.confused = PA.rand.int(2, 3); yield* say(who + ' is worn out and muddled!'); }
      if (D.mon.hp > 0 && total > 0) {
        if (d.sec && PA.rand.next() < d.sec.p) yield* this.inflict(A, D, d.sec.status, true);
        if (d.secStat && PA.rand.next() < d.secStat.p) yield* this.stage(D, d.secStat.stat, d.secStat.n, true);
        if (d.flinch && A.v.first && PA.rand.next() < d.flinch) D.v.flinch = true;
        if (d.stun && !(D.v.stunImmune >= this.turnNo)) { D.v.stunned = true; yield* say(tgt + ' was frozen in place!'); }
        // a Diva that takes a big hit sulks
        if (this.diva(D) && total >= D.mon.maxhp * DIVA_SULK_AT && !D.v.sulk) { D.v.sulk = true; yield* say(tgt + ' is sulking!'); }
      }
      if (total > 0 && A.mon.hp > 0) {
        if (this.diva(A)) A.v.hype = this.turnNo + 1; // feeling itself next turn
        if (d.afterSelf) { for (const x of d.afterSelf) yield* this.stage(A, x.stat, x.n, true); if (d.afterSay) yield* say(who + d.afterSay); }
        if (d.thorns && !A.v.thorns) { A.v.thorns = true; yield* say(who + ' bristled with spikes!'); }
        // spikes hurt whoever touched them
        if (!d.special && D.v.thorns) { yield* say(who + ' was hurt by the spikes!'); yield* this.damage(A, Math.max(1, Math.floor(A.mon.maxhp / 8)), null); }
      }
      D.v.lastHitBy = d;
      D.v.lastDmg = total;
    }
    calcDamage(A, D, d, mod) {
      const eff = PA.typeEff(d.type, D.types);
      if (eff === 0) return { dmg: 0, eff: 0 };
      if (d.fixed) return { dmg: d.fixed, eff: 1 };
      if (d.levelDmg) return { dmg: A.mon.level, eff: 1 };
      if (d.halve) return { dmg: Math.max(1, Math.floor(D.mon.hp / 2)), eff: 1 };
      if (d.psywave) return { dmg: Math.max(1, Math.floor(A.mon.level * (0.5 + PA.rand.next()))), eff: 1 };
      if (d.ohko) return { dmg: D.mon.hp, eff: 1 };
      if (d.counter) { const last = A.v.lastHitBy; if (last && !last.special && A.v.lastDmg) return { dmg: A.v.lastDmg * 2, eff: 1 }; return { dmg: 0, eff: 0 }; }
      const special = PA.isSpecial(d);
      const power = d.desperate ? Math.round(40 + 80 * (1 - A.mon.hp / A.mon.maxhp)) : d.power; // BLUSH GLOW
      let crit = PA.rand.next() < Math.min(255 / 256, (A.mon.sp.s[3] / 512) * (d.highCrit ? 8 : 1) * (A.v.focus ? 0.25 : 1));
      let atk = special ? A.mon.spc : A.mon.atk, def = special ? D.mon.spc : D.mon.def;
      if (!crit) {
        atk *= mult(special ? A.st.spc : A.st.atk);
        def *= mult(special ? D.st.spc : D.st.def);
        if (!special && D.v.reflect) def *= 2;
        if (special && D.v.light) def *= 2;
      }
      if (!special && A.mon.status === 'BRN') atk /= 2;
      if (d.selfKO) def = Math.max(1, def / 2);
      atk = Math.max(1, Math.floor(atk)); def = Math.max(1, Math.floor(def));
      if (atk > 255 || def > 255) { atk = Math.max(1, Math.floor(atk / 4)); def = Math.max(1, Math.floor(def / 4)); }
      const L = A.mon.level * (crit ? 2 : 1);
      let dmg = Math.floor(Math.floor((Math.floor(2 * L / 5 + 2) * atk * power) / def) / 50);
      dmg = Math.min(997, dmg) + 2;
      if (A.types.includes(d.type)) dmg = Math.floor(dmg * 1.5);
      dmg = Math.floor(dmg * eff * (mod || 1));
      if (dmg > 1) dmg = Math.floor((dmg * PA.rand.int(217, 255)) / 255);
      return { dmg: Math.max(1, dmg), eff, crit };
    }
    *damage(side, dmg, r) {
      const u = this.ui;
      // substitute absorbs
      if (side.v.sub && r) {
        side.v.sub -= dmg;
        PA.audio.sfx('hit');
        if (side.v.sub <= 0) { side.v.sub = 0; yield* say('The decoy fell apart!'); } else yield* say('The decoy took the blow for ' + this.nameOf(side) + '!');
        return;
      }
      if (r) {
        PA.audio.sfx(r.eff > 1 ? 'hitSuper' : r.eff < 1 ? 'hitWeak' : 'hit');
        if (side === this.E) u.eBlink = 24; else { u.pBlink = 24; u.shake = 10; }
      }
      side.mon.hp = Math.max(0, side.mon.hp - dmg);
      yield* this.tweenHP(side, side.mon.hp);
      if (side === this.P && side.mon.hp > 0 && side.mon.hp < side.mon.maxhp / 5) PA.audio.sfx('lowhp');
    }
    *inflict(A, D, st, secondary) {
      const tgt = this.nameOf(D);
      if (st === 'CNF') {
        if (D.v.confused) { if (!secondary) yield* say(tgt + ' is already confused!'); return; }
        D.v.confused = PA.rand.int(2, 5);
        PA.audio.sfx('status');
        yield* say(tgt + ' is all in a muddle!');
        return;
      }
      if (D.mon.status) { if (!secondary) yield* say('It came to nothing!'); return; }
      if (this.immune(D, st)) { if (!secondary) yield* say(tgt + ' is quite unaffected!'); return; }
      if (D.v.sub && !secondary) { yield* say('It came to nothing!'); return; }
      D.mon.status = st;
      if (st === 'SLP') D.mon.sleep = PA.rand.int(1, 3);
      PA.audio.sfx('status');
      yield* this.statusAnim(D, st);
      yield* say(tgt + (st === 'SLP' ? ' fell asleep!' : st === 'FRZ' ? ' froze stiff!' : ' was ' + STATUS_TXT[st] + '!'));
    }
    immune(side, st) { const t = PA.STATUS_IMMUNE[st]; return !!t && side.types.includes(t); }
    *stage(side, stat, n, secondary) {
      const name = this.nameOf(side);
      if (stat === 'pow') { // ATTACK and SPECIAL together: whichever its attacks use
        const a = side.st.atk, c = side.st.spc;
        side.st.atk = PA.clamp(a + n, -6, 6); side.st.spc = PA.clamp(c + n, -6, 6);
        if (side.st.atk === a && side.st.spc === c) { if (!secondary) yield* say('Nothing happened!'); return 0; }
        PA.audio.sfx(n > 0 ? 'stat' : 'statDown');
        yield* say(name + '\'s ATTACK' + (n > 1 ? ' greatly rose!' : n > 0 ? ' rose!' : n < -1 ? ' greatly fell!' : ' fell!'));
        return side.st.atk - a;
      }
      const cur = side.st[stat];
      if (n < 0 && side.v.mist && side !== (n < 0 ? null : side)) { yield* say(name + ' is protected by MIST!'); return; }
      const nv = PA.clamp(cur + n, -6, 6);
      if (nv === cur) { if (!secondary) yield* say('Nothing happened!'); return 0; }
      side.st[stat] = nv;
      PA.audio.sfx(n > 0 ? 'stat' : 'statDown');
      yield* say(name + '\'s ' + STAT_NAME[stat] + (n > 1 ? ' greatly rose!' : n > 0 ? ' rose!' : n < -1 ? ' greatly fell!' : ' fell!'));
      return nv - cur;
    }
    *statusMove(A, D, d) {
      const who = this.nameOf(A), tgt = this.nameOf(D);
      if (d.guard) {
        if (A.v.guardTurn === this.turnNo - 1) { yield* say('It came to nothing!'); return; } // not two turns running
        A.v.guard = true; A.v.guardTurn = this.turnNo;
        yield* this.anim(A, A, 'self', d);
        yield* say(who + d.guard);
        return;
      }
      if (d.retreat) { // STRIPED RETREAT: away into the undergrowth
        if (this.kind === 'wild') {
          PA.audio.sfx('flee');
          yield* say(A === this.P ? who + ' slipped off into the undergrowth, and you with it!' : who + ' slipped away into the undergrowth!');
          this.over = 'run'; return;
        }
        yield* say(who + ' slipped into the undergrowth!');
        yield* this.stage(A, 'eva', 2, true);
        return;
      }
      if (d.rest) {
        if (A.mon.hp >= A.mon.maxhp) { yield* say('It came to nothing!'); return; }
        A.mon.hp = A.mon.maxhp; A.mon.status = 'SLP'; A.mon.sleep = 2;
        yield* this.tweenHP(A, A.mon.hp);
        yield* say(who + (d.say || ' started sleeping!') + ' It regained health!');
        return;
      }
      if (d.heal) {
        if (A.mon.hp >= A.mon.maxhp) { yield* say('It came to nothing!'); return; }
        if (d.say) yield* say(who + d.say);
        yield* this.anim(A, A, 'self', d);
        A.mon.hp = Math.min(A.mon.maxhp, A.mon.hp + Math.floor(A.mon.maxhp * d.heal));
        PA.audio.sfx('heal');
        yield* this.tweenHP(A, A.mon.hp);
        yield* say(who + ' regained health!');
        return;
      }
      if (d.inflict) {
        yield* this.anim(A, D, d.anim, d);
        if (d.say) yield* say(who + d.say);
        return yield* this.inflict(A, D, d.inflict, false);
      }
      if (d.mark) {
        yield* this.anim(A, D, 'stab', d);
        D.v.marked = { by: A.mon, n: d.mark }; // the creature that signed, not its side: a switch-in hasn't earned it
        yield* say(who + ' signed its name on ' + tgt + '! Its next hits will land harder.');
        return;
      }
      if (d.sureNext) { A.v.sureNext = true; yield* say(who + ' peered in from out of sight! Its next attack can\'t miss.'); return; }
      if (d.temp) { // a stage that wears off (CLOUD COVER, BLACK CAT CROSS)
        const S = d.temp.who === 'self' ? A : D;
        S.v.temps = S.v.temps || [];
        if (S.v.temps.some((x) => x.move === d.name)) { yield* say('It came to nothing!'); return; }
        yield* this.anim(A, S, S === A ? 'self' : 'down', d);
        if (d.say) yield* say(who + d.say);
        const got = yield* this.stage(S, d.temp.stat, d.temp.n);
        if (got) S.v.temps.push({ move: d.name, stat: d.temp.stat, n: got, t: d.temp.t });
        return;
      }
      if (d.self || d.foe || d.taunt || d.hesitate) {
        if (d.say) yield* say(who + d.say);
        if (d.self) { yield* this.anim(A, A, 'self', d); for (const x of d.self) yield* this.stage(A, x.stat, x.n, d.self.length > 1); }
        if (d.foe) {
          if (D.v.mist) yield* say(tgt + ' is protected by MIST!');
          else { yield* this.anim(A, D, 'down', d); for (const x of d.foe) yield* this.stage(D, x.stat, x.n, d.foe.length > 1); }
        }
        if (d.taunt && !D.v.taunt) { D.v.taunt = d.taunt; yield* say(tgt + ' can\'t stop looking at ' + who + '!'); }
        if (d.hesitate && A.v.first && D.mon.hp > 0) { D.v.flinch = true; yield* say(tgt + ' hesitated...'); }
        return;
      }
      if (d.seed) {
        if (D.types.includes('BLOOM') || D.v.seeded) { yield* say('It came to nothing!'); return; }
        yield* this.anim(A, D, 'leaf', d);
        D.v.seeded = true;
        yield* say(this.nameOf(D) + ' was seeded!');
        return;
      }
      if (d.haze) {
        for (const s of [this.P, this.E]) { for (const k in s.st) s.st[k] = 0; s.v.confused = 0; }
        if (D.mon.status) D.mon.status = null;
        PA.audio.sfx('swoosh');
        yield* say('All status changes were eliminated!');
        return;
      }
      if (d.screen) { A.v[d.screen === 'def' ? 'reflect' : 'light'] = true; yield* this.anim(A, A, 'self', d); yield* say(d.screen === 'def' ? who + ' gained armor!' : who + '\'s protected against special attacks!'); return; }
      if (d.mist) { A.v.mist = true; yield* say(who + '\'s shrouded in MIST!'); return; }
      if (d.focus) { A.v.focus = true; yield* say(who + '\'s getting pumped!'); return; }
      if (d.substitute) {
        const cost = Math.floor(A.mon.maxhp / 4);
        if (A.v.sub || A.mon.hp <= cost) { yield* say('It came to nothing!'); return; }
        A.mon.hp -= cost; A.v.sub = cost + 1;
        yield* this.tweenHP(A, A.mon.hp);
        yield* say('A decoy stands in its place!');
        return;
      }
      if (d.disable) {
        const mv = PA.rand.pick(D.mon.moves);
        if (!mv || D.v.disabled) { yield* say('It came to nothing!'); return; }
        D.v.disabled = { move: mv.n, t: PA.rand.int(2, 5) };
        yield* say(this.nameOf(D) + '\'s ' + mv.n + ' was disabled!');
        return;
      }
      yield* say('Nothing came of it.');
    }
    *statusAnim(side, st) {
      const enemy = side === this.E;
      const cx = enemy ? 120 : 36, cy = enemy ? 58 : 70;
      const u = this.ui;
      const tile = st === 'SLP' ? T.zzz : st === 'PAR' ? T.bolt : st === 'CNF' ? T.swirl : T.bubble;
      const pal = st === 'PAR' ? FXPAL.zap : st === 'CNF' ? FXPAL.psy : FXPAL.normal;
      for (let i = 0; i < 30; i++) {
        u.fx = [{ kind: 'fx', tile, pal, x: cx - 8 + Math.sin(i / 4) * 10, y: cy - 20 - i / 2, scale: 2 }];
        yield;
      }
      u.fx = [];
    }

    // ------------------------------------------------------------ animations
    *anim(A, D, kind, d, quick) {
      const u = this.ui;
      const fromE = A === this.E;
      const ax = fromE ? 120 : 36, ay = fromE ? 54 : 68;
      const tx = fromE ? 36 : 120, ty = fromE ? 68 : 54;
      const P = (k) => FXPAL[k];
      const n = quick ? 10 : 24;
      const sfx = { fire: 'fire', water: 'water', zap: 'zap', leaf: 'leaf', psy: 'psy', beam: 'beam', ice: 'beam', wind: 'whoosh', sound: 'status', powder: 'status', zapStatus: 'zap', self: 'spark', rock: 'hit', poison: 'status', bite: 'hit', slash: 'swoosh', stab: 'swoosh', down: 'statDown' }[kind];
      if (sfx) PA.audio.sfx(sfx);
      // attacker lunge
      if (!quick && ['hit', 'bite', 'slash', 'stab'].includes(kind)) {
        for (let i = 0; i < 6; i++) { if (fromE) u.eX = -i * 2; else u.pX = i * 2; yield; }
        for (let i = 6; i >= 0; i--) { if (fromE) u.eX = -i * 2; else u.pX = i * 2; yield; }
      }
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const fx = [];
        switch (kind) {
          case 'hit': fx.push({ kind: 'fx', tile: T.impact, pal: P('normal'), x: tx - 8 + (i % 3) * 3, y: ty - 8, scale: 2 }); break;
          case 'slash': for (let k = 0; k < 3; k++) fx.push({ kind: 'fx', tile: T.slash + (k % 2), pal: P('normal'), x: tx - 12 + k * 8 - (1 - t) * 10, y: ty - 16 + k * 8 + t * 6, scale: 2 }); break;
          case 'bite': fx.push({ kind: 'fx', tile: T.fang, pal: P('normal'), x: tx - 8, y: ty - 18 + t * 8, scale: 2 }); fx.push({ kind: 'fx', tile: T.fang, pal: P('normal'), x: tx - 8, y: ty + 2 - t * 8, scale: 2, flipY: true }); break;
          case 'stab': fx.push({ kind: 'fx', tile: T.spike, pal: P('normal'), x: ax + (tx - ax) * t - 8, y: ay + (ty - ay) * t - 8, scale: 2, flipX: fromE }); break;
          case 'fire': for (let k = 0; k < 4; k++) fx.push({ kind: 'fx', tile: T.flame + ((i + k) % 3), pal: P('fire'), x: tx - 20 + k * 11, y: ty - 4 - Math.abs(Math.sin(t * 6 + k)) * 14, scale: 2 }); break;
          case 'water': for (let k = 0; k < 5; k++) { const tt = PA.clamp(t * 1.4 - k * 0.1, 0, 1); fx.push({ kind: 'fx', tile: T.drop, pal: P('water'), x: ax + (tx - ax) * tt - 4 + k * 2, y: ay + (ty - ay) * tt - 4 - Math.sin(tt * Math.PI) * 12, scale: 1 + (k % 2) }); } break;
          case 'ice': for (let k = 0; k < 4; k++) fx.push({ kind: 'fx', tile: T.ice, pal: P('ice'), x: tx - 18 + k * 10, y: ty - 30 + ((t * 40 + k * 9) % 36), scale: 2 }); break;
          case 'zap': case 'zapStatus': if (i % 4 < 2) { fx.push({ kind: 'fx', tile: T.bolt, pal: P('zap'), x: tx - 10, y: ty - 16, scale: 2 }); fx.push({ kind: 'fx', tile: T.spark, pal: P('zap'), x: tx + 2, y: ty - 4, scale: 2 }); u.invert = kind === 'zap' ? 1 : 0; } break;
          case 'leaf': for (let k = 0; k < 4; k++) { const tt = PA.clamp(t * 1.3 - k * 0.1, 0, 1); fx.push({ kind: 'fx', tile: T.leaf, pal: P('leaf'), x: ax + (tx - ax) * tt - 4 + Math.sin(tt * 9 + k) * 6, y: ay + (ty - ay) * tt - 4 + k * 3, scale: 2 }); } break;
          case 'psy': fx.push({ kind: 'ring', x: tx, y: ty, r: 4 + t * 26, col: 'rgba(168,72,200,' + (1 - t) + ')' }); fx.push({ kind: 'ring', x: tx, y: ty, r: Math.max(1, t * 26 - 10), col: 'rgba(224,144,232,' + (1 - t) + ')' }); break;
          case 'rock': for (let k = 0; k < 3; k++) fx.push({ kind: 'fx', tile: T.rock, pal: P('rock'), x: tx - 16 + k * 12, y: ty - 40 + Math.min(1, t * 1.5 + k * 0.1) * 36, scale: 2 }); break;
          case 'poison': for (let k = 0; k < 4; k++) fx.push({ kind: 'fx', tile: T.bubble + (k % 3), pal: P('poison'), x: tx - 16 + k * 8, y: ty - 4 - t * 14 - k * 2, scale: 2 }); break;
          case 'beam': for (let k = 0; k < 8; k++) { const tt = PA.clamp(t * 2 - k * 0.1, 0, 1); if (tt > 0) fx.push({ kind: 'fx', tile: T.drop, pal: P(d && d.type === 'FROST' ? 'ice' : d && d.type === 'HUSH' ? 'psy' : 'normal'), x: ax + (tx - ax) * tt - 4, y: ay + (ty - ay) * tt - 4 }); } break;
          case 'wind': for (let k = 0; k < 3; k++) fx.push({ kind: 'fx', tile: T.gust + ((i >> 2) + k) % 4, pal: P('normal'), x: tx - 12 + Math.cos(t * 12 + k * 2) * 12, y: ty - 8 + Math.sin(t * 12 + k * 2) * 8, scale: 2 }); break;
          case 'sound': for (let k = 0; k < 3; k++) { const tt = PA.clamp(t * 1.3 - k * 0.15, 0, 1); fx.push({ kind: 'fx', tile: T.note, pal: P('heart'), x: ax + (tx - ax) * tt - 4, y: ay + (ty - ay) * tt - 8 - Math.sin(tt * 10) * 6, scale: 2 }); } break;
          case 'powder': for (let k = 0; k < 6; k++) fx.push({ kind: 'fx', tile: T.impact, pal: P(d && d.inflict === 'SLP' ? 'psy' : d && d.inflict === 'PSN' ? 'poison' : 'zap'), x: tx - 20 + k * 7, y: ty - 30 + ((t * 30 + k * 7) % 30) }); break;
          case 'self': for (let k = 0; k < 4; k++) fx.push({ kind: 'fx', tile: T.impact, pal: P('zap'), x: ax - 16 + k * 10, y: ay + 10 - t * 30 - (k % 2) * 6 }); break;
          case 'down': fx.push({ kind: 'fx', tile: T.impact, pal: P('normal'), x: tx - 4, y: ty - 4 + t * 10 }); if (i % 6 === 0) { if (fromE) u.shake = 2; else u.shakeE = 6; } break;
          default: fx.push({ kind: 'fx', tile: T.impact, pal: P('normal'), x: tx - 8, y: ty - 8, scale: 2 });
        }
        u.fx = fx;
        yield;
      }
      u.fx = [];
      if (['hit', 'slash', 'bite', 'stab', 'rock'].includes(kind)) { if (fromE) u.shake = 8; else u.shakeE = 10; }
    }

    // ------------------------------------------------------------ end of turn / faint
    *endOfTurn() {
      for (const [S, O] of [[this.P, this.E], [this.E, this.P]]) {
        if (!S.mon || S.mon.hp <= 0) continue;
        const nm = this.nameOf(S);
        if (S.mon.status === 'PSN' || S.mon.status === 'BRN') {
          let dmg = Math.max(1, Math.floor(S.mon.maxhp / 16));
          if (S.v.toxic) { S.v.toxicN = (S.v.toxicN || 0) + 1; dmg *= S.v.toxicN; }
          yield* say(nm + '\'s hurt by ' + (S.mon.status === 'PSN' ? 'poison' : 'the burn') + '!', { auto: 26 });
          yield* this.damage(S, dmg, null);
        }
        if (S.v.seeded && S.mon.hp > 0 && O.mon.hp > 0) {
          const dmg = Math.max(1, Math.floor(S.mon.maxhp / 8));
          yield* say('LEECH SEED saps ' + nm + '!', { auto: 26 });
          yield* this.damage(S, dmg, null);
          O.mon.hp = Math.min(O.mon.maxhp, O.mon.hp + dmg);
          yield* this.tweenHP(O, O.mon.hp);
        }
        if (S.v.trapped && S.mon.hp > 0) {
          S.v.trapped--;
          yield* say(nm + ' is hurt by ' + S.v.trapName + '!', { auto: 26 });
          yield* this.damage(S, Math.max(1, Math.floor(S.mon.maxhp / 16)), null);
        }
        if (S.v.guard && S.v.guardTurn < this.turnNo) S.v.guard = false; // a guard lasts into the next turn, no further
        if (S.mon.hp <= 0) continue; // fainted to poison, a burn or a trap just now
        if (S.v.taunt && --S.v.taunt <= 0) { S.v.taunt = 0; yield* say(nm + ' looked away at last.'); }
        for (const t of (S.v.temps || []).slice()) { // CLOUD COVER, BLACK CAT CROSS: wear off after their turns
          if (--t.t > 0) continue;
          S.v.temps.splice(S.v.temps.indexOf(t), 1);
          if (t.stat === 'pow') { S.st.atk = PA.clamp(S.st.atk - t.n, -6, 6); S.st.spc = PA.clamp(S.st.spc - t.n, -6, 6); } else S.st[t.stat] = PA.clamp(S.st[t.stat] - t.n, -6, 6);
          yield* say(nm + '\'s ' + STAT_NAME[t.stat] + ' returned to normal.');
        }
        if (S.v.disabled) { S.v.disabled.t--; if (S.v.disabled.t <= 0) { S.v.disabled = null; yield* say(nm + '\'s disabled no more!'); } }
      }
    }
    *checkFaints() {
      const u = this.ui;
      if (this.em.hp <= 0) {
        PA.audio.cry(this.em.id, 0.7);
        for (let i = 0; i <= 28; i += 2) { u.eDrop = i * 2; yield; }
        u.eShow = false; u.eDrop = 0;
        yield* say(this.nameOf(this.E) + ' fainted!');
        PA.state.stats.wins = (PA.state.stats.wins || 0) + 1;
        yield* this.giveExp();
        if (this.kind === 'wild') return 'win';
        const next = this.enemyTeam.findIndex((m) => m.hp > 0);
        if (next < 0) return 'win';
        this.ei = next;
        this.E.mon = this.enemyTeam[next];
        // shift mode
        if (this.party.filter((m) => m.hp > 0).length > 1 && this.pm.hp > 0) {
          const yes = yield* PA.yesno(PA.sub(this.trainer.cls + ' ' + this.trainer.name) + ' is about to use ' + this.E.mon.name + '. Will {PLAYER} change creatures?');
          if (yes) {
            const i = yield* PA.menus.party({ mode: 'battle', active: this.pi });
            if (i >= 0 && i !== this.pi && this.party[i].hp > 0) { yield* this.sendOutEnemy(false); yield* this.switchTo(i); return null; }
          }
        }
        yield* this.sendOutEnemy(false);
      }
      if (this.pm.hp <= 0) {
        PA.audio.cry(this.pm.id, 0.7);
        for (let i = 0; i <= 28; i += 2) { u.pDrop = i * 2; yield; }
        u.pShow = false; u.pDrop = 0;
        this.pm.status = null;
        yield* say(this.pm.name + ' fainted!');
        const alive = this.party.filter((m) => m.hp > 0).length;
        if (!alive) {
          if (this.trainer && this.trainer.canLose) return 'lose';
          return 'lose';
        }
        for (;;) {
          if (this.kind === 'wild') {
            const yes = yield* PA.yesno('Send out another creature?');
            if (!yes) { const ok = yield* this.tryRun(); if (ok) return 'run'; }
          }
          const i = yield* PA.menus.party({ mode: 'battle', active: -1, force: true });
          if (i >= 0 && this.party[i].hp > 0) { this.pi = i; yield* this.sendOutPlayer(false); break; }
        }
      }
      return null;
    }
    *giveExp() {
      const enemy = this.em;
      const parts = [...this.parts].filter((i) => this.party[i] && this.party[i].hp > 0);
      if (!parts.length) return;
      const base = Math.floor((PA.baseExp(enemy.id) * enemy.level) / 7) * (this.kind === 'trainer' ? 1.5 : 1);
      const each = Math.max(1, Math.floor((base * PA.EXP_MULT) / parts.length));
      for (const i of parts) {
        const m = this.party[i];
        if (m.level >= 100) continue;
        const active = i === this.pi;
        const before = m.expFrac();
        yield* say(m.name + ' gained ' + each + ' experience!', { auto: 30 });
        const evs = m.addExp(each);
        if (active) {
          // animate exp bar
          const levels = evs.filter((e) => e.type === 'level').length;
          let disp = before;
          for (let l = 0; l <= levels; l++) {
            const target = l < levels ? 1 : m.expFrac();
            for (let k = 0; k < 20; k++) { disp += (target - disp) * 0.25; this.ui.expDisp = disp; if (k % 4 === 0) PA.audio.sfx('exp'); yield; }
            if (l < levels) disp = 0;
          }
          this.ui.expDisp = undefined;
        }
        for (const e of evs) {
          if (e.type === 'level') {
            if (active) { this.P.disp = m.hp; }
            PA.audio.jingle(PA.audio.J.level);
            yield* say(m.name + ' reached level ' + e.level + '!');
            if (active) yield* PA.scenesApi.levelStats(m, e.before);
          } else if (e.type === 'learn') yield* PA.menus.learnMove(m, e.move);
        }
      }
      this.parts = new Set([this.pi]);
    }
  }
  function ellipse(cx, cy, rx, ry) { const c = G.ctx; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
  PA.Battle = Battle;

  // ---------------------------------------------------------------- battle menus
  // the commands, a list at the right of the text window; BEFRIEND is greyed when it can't be used
  const COMMANDS = ['ATTACK', 'BEFRIEND', 'TEAM', 'BAG', 'LEAVE'];
  class BattleMenu {
    constructor(b) { this.b = b; this.i = b.lastMenu || 0; this.done = false; }
    update() {
      if (I.repeat.up) { this.i = (this.i + 4) % 5; PA.audio.sfx('tick'); }
      if (I.repeat.down) { this.i = (this.i + 1) % 5; PA.audio.sfx('tick'); }
      if (I.pressed.a) { PA.audio.sfx('select'); this.result = COMMANDS[this.i].toLowerCase(); this.b.lastMenu = this.i; this.done = true; PA.pop(this); }
    }
    draw() {
      G.text('What will', 8, 104);
      G.textFit(this.b.pm.name + ' do?', 8, 120, 76);
      G.box(88, 88, 72, 56);
      const off = this.b.kind !== 'wild' || this.b.E.v.hurt;
      G.selRow(94, 96 + this.i * 9, 60, 9);
      COMMANDS.forEach((t, k) => {
        const grey = (k === 1 && off) || (k === 4 && this.b.kind !== 'wild');
        G.text(t, 104, 96 + k * 9, k === this.i ? (grey ? '#aeaac4' : G.UI.selText) : grey ? G.UI.grey : undefined);
      });
      G.cursor(97, 95 + this.i * 9);
    }
  }
  // the five approaches, laid out like the attack list, with what the almanac knows so far
  class ApproachMenu {
    constructor(b) { this.b = b; this.i = b.lastApproach || 0; this.done = false; }
    update() {
      if (I.repeat.up) { this.i = (this.i + 4) % 5; PA.audio.sfx('tick'); }
      if (I.repeat.down) { this.i = (this.i + 1) % 5; PA.audio.sfx('tick'); }
      if (I.pressed.a) { PA.audio.sfx('select'); this.result = this.i; this.b.lastApproach = this.i; this.done = true; PA.pop(this); }
      if (I.pressed.b) { PA.audio.sfx('select'); this.result = -1; this.done = true; PA.pop(this); }
    }
    draw() {
      const id = this.b.em.id, k = (PA.state.likes || {})[id] || {};
      G.window(0, 40, 104, 56, 'WHAT IT LIKES');
      G.text('Likes: ' + (k.fav ? APPROACH_LABEL[k.fav].toLowerCase() : '?'), 6, 57);
      G.text('Eats: ' + (k.diet || '?'), 6, 69);
      G.text('Petting: ' + ({ loves: 'loves it', fine: 'fine', hates: 'hates it' }[k.pet] || '?'), 6, 81);
      G.box(0, 96, 160, 48);
      G.selRow(6, 100 + this.i * 8, 148, 8);
      APPROACHES.forEach((a, j) => G.text(APPROACH_LABEL[a], 16, 100 + j * 8, j === this.i ? G.UI.selText : undefined));
      G.cursor(9, 99 + this.i * 8);
    }
  }
  class MoveMenu {
    constructor(b) { this.b = b; this.i = Math.min(b.lastMove || 0, b.pm.moves.length - 1); this.done = false; }
    update() {
      const n = this.b.pm.moves.length;
      if (I.repeat.up) { this.i = (this.i + n - 1) % n; PA.audio.sfx('tick'); }
      if (I.repeat.down) { this.i = (this.i + 1) % n; PA.audio.sfx('tick'); }
      if (I.pressed.a) { PA.audio.sfx('select'); this.result = this.i; this.b.lastMove = this.i; this.done = true; PA.pop(this); }
      if (I.pressed.b) { PA.audio.sfx('select'); this.result = -1; this.done = true; PA.pop(this); }
    }
    draw() {
      const m = this.b.pm;
      const mv = m.moves[this.i];
      if (mv) {
        const d = PA.moveData(mv.n);
        G.window(0, 56, 72, 40, 'TYPE');
        G.text(d.type, 8, 71, typeColour(d.type));
        G.textR('PP ' + PA.pad(mv.pp, 2) + '/' + PA.pad(mv.max, 2), 64, 83);
      }
      G.box(0, 96, 160, 48);
      G.selRow(6, 104 + this.i * 8, 148, 8);
      for (let k = 0; k < 4; k++) G.textFit(m.moves[k] ? m.moves[k].n : '-', 16, 104 + k * 8, 136, k === this.i ? G.UI.selText : undefined);
      G.cursor(9, 103 + this.i * 8);
    }
  }
  function typeColour(t) { return (PA.TYPE_COLOUR && PA.TYPE_COLOUR[t]) || G.INK; }
  PA.typeColour = typeColour;
})(window.PA);
