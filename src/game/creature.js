// Procedural Adventures - species data, stats, experience, creature instances
'use strict';
(function (PA) {
  const D = window.PA_DATA;
  const SP = D.species; // 0-based array; id = index+1
  PA.species = (id) => SP[id - 1];
  PA.speciesId = {};
  SP.forEach((s, i) => (PA.speciesId[s.n] = i + 1));
  PA.TYPES = D.types;
  PA.typeEff = function (atk, defTypes) {
    const row = D.chart[atk];
    if (!row) return 1;
    let m = 1;
    for (const t of defTypes) m *= row[D.types.indexOf(t)];
    return m;
  };
  PA.bst = (id) => SP[id - 1].s.reduce((a, b) => a + b, 0);
  PA.baseExp = (id) => Math.max(36, Math.round(PA.bst(id) * 0.21));
  PA.LEGENDARY = []; // the roster has none (yet)
  // how hard a creature is to win over (45-255: sturdier ones are harder)
  // what the screens call each ailment
  PA.STATUS_LABEL = { PSN: 'TOX', PAR: 'STUN', SLP: 'ZZZ', BRN: 'HOT', FRZ: 'ICE', FNT: 'OUT' };
  PA.statusLabel = (st) => PA.STATUS_LABEL[st] || st;
  PA.friendRate = (id) => (PA.LEGENDARY.includes(id) ? 3 : PA.clamp(Math.round(330 - PA.bst(id) * 0.6), 45, 255));
  PA.EXP_MULT = 2.2; // tuned for a 15-45 minute adventure

  const GROWTH = {
    fast: (n) => Math.floor((4 * n * n * n) / 5),
    mfast: (n) => n * n * n,
    mslow: (n) => Math.max(0, Math.floor((6 / 5) * n * n * n - 15 * n * n + 100 * n - 140)),
    slow: (n) => Math.floor((5 * n * n * n) / 4),
  };
  PA.expAt = (id, lv) => (lv <= 1 ? 0 : GROWTH[SP[id - 1].g || 'mfast'](lv));


  function calcStat(base, dv, lv, isHp) {
    const v = Math.floor(((base + dv) * 2 * lv) / 100);
    return isHp ? v + lv + 10 : v + 5;
  }

  let uid = 1;
  class Mon {
    constructor(id, level, opts) {
      opts = opts || {};
      this.uid = uid++;
      this.id = id;
      this.level = level;
      const r = opts.rng || PA.rand;
      this.dv = opts.dv || { a: r.int(0, 15), d: r.int(0, 15), s: r.int(0, 15), c: r.int(0, 15) };
      if (opts.goodDV) for (const k of 'adsc') this.dv[k] = Math.max(this.dv[k], 8);
      this.exp = PA.expAt(id, level);
      this.moves = opts.moves ? opts.moves.map((m) => ({ n: m, pp: PA.moveData(m).pp, max: PA.moveData(m).pp })) : this.defaultMoves();
      this.status = null; this.sleep = 0;
      this.nick = opts.nick || null;
      this.ot = opts.ot || null;
      this.recalc();
      this.hp = this.maxhp;
    }
    get sp() { return SP[this.id - 1]; }
    get name() { return this.nick || SP[this.id - 1].n; }
    get types() { return SP[this.id - 1].t; }
    defaultMoves() {
      const learn = SP[this.id - 1].l.filter((l) => l[0] <= this.level);
      const names = [];
      for (const [, mv] of learn) { if (!names.includes(mv)) names.push(mv); }
      return names.slice(-4).map((m) => ({ n: m, pp: PA.moveData(m).pp, max: PA.moveData(m).pp }));
    }
    recalc() {
      const b = SP[this.id - 1].s; // HP At Df Sd Sc
      const hpdv = ((this.dv.a & 1) << 3) | ((this.dv.d & 1) << 2) | ((this.dv.s & 1) << 1) | (this.dv.c & 1);
      const oldMax = this.maxhp;
      this.maxhp = calcStat(b[0], hpdv, this.level, true);
      this.atk = calcStat(b[1], this.dv.a, this.level);
      this.def = calcStat(b[2], this.dv.d, this.level);
      this.spd = calcStat(b[3], this.dv.s, this.level);
      this.spc = calcStat(b[4], this.dv.c, this.level);
      if (oldMax !== undefined && this.hp !== undefined && this.hp > 0) this.hp = Math.min(this.maxhp, this.hp + (this.maxhp - oldMax));
    }
    expToNext() { return this.level >= 100 ? 0 : PA.expAt(this.id, this.level + 1) - this.exp; }
    expFrac() {
      if (this.level >= 100) return 1;
      const a = PA.expAt(this.id, this.level), b = PA.expAt(this.id, this.level + 1);
      return PA.clamp((this.exp - a) / Math.max(1, b - a), 0, 1);
    }
    // returns list of events: {type:'level', level} | {type:'learn', move} | {type:'full', move}
    addExp(n) {
      const ev = [];
      this.exp += n;
      while (this.level < 100 && this.exp >= PA.expAt(this.id, this.level + 1)) {
        const before = { maxhp: this.maxhp, atk: this.atk, def: this.def, spd: this.spd, spc: this.spc };
        this.level++;
        this.recalc();
        ev.push({ type: 'level', level: this.level, before });
        for (const [lv, mv] of SP[this.id - 1].l) {
          if (lv === this.level && !this.moves.some((m) => m.n === mv)) ev.push({ type: 'learn', move: mv });
        }
      }
      return ev;
    }
    learn(mv) {
      if (this.moves.some((m) => m.n === mv)) return true;
      if (this.moves.length < 4) { const d = PA.moveData(mv); this.moves.push({ n: mv, pp: d.pp, max: d.pp }); return true; }
      return false;
    }
    replaceMove(i, mv) { const d = PA.moveData(mv); this.moves[i] = { n: mv, pp: d.pp, max: d.pp }; }
    heal() {
      this.hp = this.maxhp; this.status = null; this.sleep = 0;
      this.moves.forEach((m) => (m.pp = m.max));
    }
    toJSON() {
      return { id: this.id, level: this.level, dv: this.dv, exp: this.exp, hp: this.hp, moves: this.moves, status: this.status, sleep: this.sleep, nick: this.nick, ot: this.ot };
    }
    static from(o) {
      const m = new Mon(o.id, o.level, { dv: o.dv });
      m.exp = o.exp; m.moves = o.moves; m.status = o.status; m.sleep = o.sleep || 0; m.nick = o.nick; m.ot = o.ot;
      m.recalc(); m.hp = o.hp;
      return m;
    }
  }
  PA.Mon = Mon;

  // ---------------------------------------------------------------- items
  PA.ITEMS = {
    'TONIC': { price: 300, kind: 'heal', hp: 20, desc: 'Restores 20 HP.' },
    'STRONG TONIC': { price: 700, kind: 'heal', hp: 50, desc: 'Restores 50 HP.' },
    'GRAND TONIC': { price: 1500, kind: 'heal', hp: 200, desc: 'Restores 200 HP.' },
    'ANTIDOTE': { price: 100, kind: 'cure', cures: ['PSN'], desc: 'Cures poison.' },
    'LINIMENT': { price: 200, kind: 'cure', cures: ['PAR'], desc: 'Cures paralysis.' },
    'SMELLING SALTS': { price: 250, kind: 'cure', cures: ['SLP'], desc: 'Wakes a sleeper.' },
    'ALOE BALM': { price: 250, kind: 'cure', cures: ['BRN'], desc: 'Soothes a burn.' },
    'WARMING PAN': { price: 250, kind: 'cure', cures: ['FRZ'], desc: 'Thaws a frozen one.' },
    'PANACEA': { price: 600, kind: 'cure', cures: ['PSN', 'PAR', 'SLP', 'BRN', 'FRZ'], desc: 'Cures all status.' },
    'CORDIAL': { price: 1500, kind: 'revive', desc: 'Revives a fainted creature.' },
    'BARLEY WATER': { price: 1000, kind: 'pp', desc: 'Restores PP.' },
    'HACKNEY TOKEN': { price: 550, kind: 'field', desc: 'Calls a carriage out of a cave or wood.' },
    'LAVENDER WATER': { price: 350, kind: 'field', desc: 'Keeps weak wild ones away.' },
    'SUGARED ALMOND': { price: 4800, kind: 'candy', desc: 'Grants a level.' },
    'MOONSTONE BROOCH': { price: 2100, kind: 'trinket', desc: 'A brooch with a glowing moonstone. Simply lovely.' },
  };
  // key items: a few have their own words; the rest (a story's GOAL, lost things) get one of these, always the same one
  const KEY_DESC = { 'WORLD MAP': 'Every road you know, and some you don\'t yet.', ALMANAC: 'Every creature you meet. It judges, but fairly.',
    'MUSIC BOX': 'A little tune for waking things.', INVITATION: 'Signed, sealed, slightly stained.' };
  const KEPT = ['Somebody is counting on this.', 'Keep it safe. Keep it dry.', 'It feels important. It is.', 'Lighter than it looks. Heavier than it feels.',
    'Not yours, but carried gladly.', 'Handle with care, and a little pride.'];
  PA.itemInfo = (n) => PA.ITEMS[n] || (KEY_DESC[n] ? { kind: 'key', desc: KEY_DESC[n] }
    : { kind: 'key', desc: KEPT[[...String(n)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % KEPT.length], kept: true });
})(window.PA);
