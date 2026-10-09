// Procedural Adventures - utilities (global namespace PA)
'use strict';
window.PA = window.PA || {};
(function (PA) {
  // ---------- seeded RNG (sfc32 seeded from a string/number via xmur3) ----------
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function sfc32(a, b, c, d) {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  class RNG {
    constructor(seed) {
      const s = xmur3(String(seed));
      this.f = sfc32(s(), s(), s(), s());
      for (let i = 0; i < 12; i++) this.f();
    }
    next() { return this.f(); }
    int(a, b) { if (b === undefined) { b = a; a = 0; } return a + Math.floor(this.f() * (b - a + 1)); }
    range(a, b) { return a + this.f() * (b - a); }
    chance(p) { return this.f() < p; }
    pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
    pickW(pairs) { // [[item, weight], ...]
      let tot = 0; for (const p of pairs) tot += p[1];
      let r = this.f() * tot;
      for (const p of pairs) { r -= p[1]; if (r <= 0) return p[0]; }
      return pairs[pairs.length - 1][0];
    }
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    }
    sub(tag) { return new RNG(String(this.int(0, 1e9)) + ':' + tag); }
  }
  PA.RNG = RNG;
  PA.rand = new RNG(Date.now()); // non-deterministic gameplay RNG (battles etc.)

  PA.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  PA.lerp = (a, b, t) => a + (b - a) * t;
  PA.DIRS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };
  PA.OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  PA.hexToRgb = (h) => {
    h = h.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  };
  PA.fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m));
  // pads with a figure space by default: as wide as a digit in the font, so padded numbers line up
  PA.pad = (n, w, ch) => { n = String(n); while (n.length < w) n = (ch || '\u2007') + n; return n; };
  PA.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  PA.title = (s) => s.toLowerCase().replace(/(^|[\s\-'])\w/g, (m) => m.toUpperCase());
  PA.seedWord = () => {
    const syl = ['ben', 'net', 'dar', 'cy', 'bing', 'ley', 'lyd', 'ia', 'jane', 'col', 'lins', 'luc', 'as', 'pem',
      'ber', 'mer', 'y', 'ton', 'long', 'bourn', 'ros', 'ings', 'kit', 'ty', 'char', 'lotte', 'wick', 'ham'];
    const r = new RNG(Date.now() + ':' + Math.random());
    let w = '';
    const n = r.int(2, 3);
    for (let i = 0; i < n; i++) w += r.pick(syl);
    return w.toUpperCase().slice(0, 10);
  };
})(window.PA);
