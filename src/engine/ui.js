// Procedural Adventures - scene stack, coroutine scripts, text boxes and menus
'use strict';
(function (PA) {
  const G = PA.gfx, I = PA.input;

  // ---------------------------------------------------------------- scene stack
  const stack = [];
  PA.scenes = stack;
  PA.push = (s) => { stack.push(s); if (s.enter) s.enter(); return s; };
  PA.pop = (s) => { const i = s ? stack.lastIndexOf(s) : stack.length - 1; if (i >= 0) { const [r] = stack.splice(i, 1); if (r.exit) r.exit(); return r; } };
  PA.top = () => stack[stack.length - 1];
  PA.replaceAll = (s) => { while (stack.length) PA.pop(); PA.push(s); };

  // ---------------------------------------------------------------- scripts
  const scripts = [];
  PA.scripts = scripts;
  PA.script = function (genFn, owner) {
    const g = typeof genFn === 'function' ? genFn() : genFn;
    const s = { g, owner, done: false };
    scripts.push(s);
    return s;
  };
  PA.scriptBusy = () => scripts.some((s) => !s.done);
  PA.stepScripts = function () {
    for (let i = 0; i < scripts.length; i++) {
      const s = scripts[i];
      try {
        const r = s.g.next();
        if (r.done) s.done = true;
      } catch (e) {
        console.error('script error', e);
        s.done = true;
        PA.onScriptError && PA.onScriptError(e);
      }
    }
    for (let i = scripts.length - 1; i >= 0; i--) if (scripts[i].done) scripts.splice(i, 1);
  };
  PA.wait = function* (n) { for (let i = 0; i < n; i++) yield; };
  PA.waitUntil = function* (fn) { while (!fn()) yield; };
  PA.waitScene = function* (s) { while (!s.done) yield; return s.result; };

  // ---------------------------------------------------------------- text layout
  // Lines are measured in pixels (the font is proportional): cols x 8px is the width a line may take.
  PA.TEXT_COLS = 18;
  // Several screens wrap the same text every frame, so results are cached (by text and width).
  const wrapCache = new Map();
  PA.wrap = function (text, cols) {
    cols = cols || PA.TEXT_COLS;
    const key = cols + '|' + text;
    const hit = wrapCache.get(key);
    if (hit) return hit;
    if (wrapCache.size > 400) wrapCache.clear();
    const pages = wrapText(String(text), cols);
    wrapCache.set(key, pages);
    return pages;
  };
  function wrapText(text, cols) {
    const maxW = cols * 8, W = (t) => (G.textWidth ? G.textWidth(t) : t.length * 8);
    const pages = [];
    for (const para of String(text).split('\f')) {
      const lines = [];
      for (const raw of para.split('\n')) {
        const words = raw.split(' ');
        let line = '';
        // the longest head of w, ending in a hyphen, that fits beside what's already on the line (0: none)
        const hyphenCut = (w, room) => {
          for (let k = w.length - 1; k > 0; k--) if (w[k - 1] === '-' && W(w.slice(0, k)) <= room) return k;
          return 0;
        };
        for (let w of words) {
          if (line && W(line + ' ' + w) > maxW) { // a compound word may break at its hyphen, as print does
            const k = hyphenCut(w, maxW - W(line + ' '));
            if (k) { lines.push(line + ' ' + w.slice(0, k)); line = ''; w = w.slice(k); }
          }
          while (W(w) > maxW) { // hard-break very long words, at a hyphen if there is one
            if (line) { lines.push(line); line = ''; }
            let k = hyphenCut(w, maxW) || w.length;
            while (k > 1 && W(w.slice(0, k)) > maxW) k--;
            lines.push(w.slice(0, k)); w = w.slice(k);
          }
          if (!line.length) line = w;
          else if (W(line + ' ' + w) <= maxW) line += ' ' + w;
          else { lines.push(line); line = w; }
        }
        lines.push(line);
      }
      pages.push(lines);
    }
    return pages;
  }
  PA.vars = {};
  PA.sub = (t) => PA.fmt(PA.fmt(String(t), PA.vars), PA.vars); // twice: some names are themselves made of names ({FOE} may be {RIVAL})

  // ---------------------------------------------------------------- text box
  PA.textSpeed = 2; // chars per frame (1 slow,2 mid,3 fast)
  class TextBox {
    constructor(text, opts) {
      opts = opts || {};
      this.pages = PA.wrap(PA.sub(text));
      this.page = 0; this.line = 0; // index of the line being typed
      this.shown = 0;   // chars typed into current line
      this.scroll = 0;  // scroll animation
      this.top = 0;     // first visible line index in page
      this.state = 'type';
      this.done = false;
      this.keep = !!opts.keep;   // stay drawn after done (for a following menu)
      this.auto = opts.auto || 0; // auto-advance after n frames
      this.timer = 0; this.blink = 0;
      this.y = opts.y === undefined ? 96 : opts.y;
      this.noArrowAtEnd = !!opts.keep;
    }
    get lines() { return this.pages[this.page]; }
    update() {
      if (this.done) return;
      this.blink++;
      const lines = this.lines;
      if (this.state === 'type') {
        const fast = I.held.a || I.held.b;
        let n = fast ? 4 : PA.textSpeed;
        while (n-- > 0) {
          const cur = lines[this.line] || '';
          if (this.shown < cur.length) this.shown++;
          if (this.shown >= cur.length) {
            if (this.line - this.top === 0 && this.line + 1 < lines.length) { this.line++; this.shown = 0; }
            else { this.state = 'wait'; this.timer = 0; break; }
          }
        }
        if (I.pressed.a && this.state === 'type') { /* speed handled by hold */ }
      } else if (this.state === 'wait') {
        this.timer++;
        const last = this.line + 1 >= lines.length;
        const lastPage = this.page + 1 >= this.pages.length;
        const go = this.auto ? this.timer >= this.auto : (I.pressed.a || I.pressed.b);
        if (last && lastPage && this.keep) { this.done = true; return; }
        if (go) {
          if (!this.auto) PA.audio.sfx('select');
          if (!last) { this.state = 'scroll'; this.scroll = 0; }
          else if (!lastPage) { this.page++; this.line = 0; this.top = 0; this.shown = 0; this.state = 'type'; }
          else { this.done = true; PA.pop(this); }
        }
      } else if (this.state === 'scroll') {
        this.scroll += 2;
        if (this.scroll >= 16) { this.top++; this.line++; this.shown = 0; this.scroll = 0; this.state = 'type'; }
      }
    }
    draw() {
      const y0 = this.y;
      G.box(0, y0, 160, 48);
      const lines = this.lines;
      const ctx = G.ctx;
      ctx.save();
      ctx.beginPath(); ctx.rect(8, y0 + 6, 144, 36); ctx.clip();
      const off = this.state === 'scroll' ? -this.scroll : 0;
      for (let k = 0; k < 3; k++) {
        const li = this.top + k;
        if (li > this.line) break;
        let s = lines[li] || '';
        if (li === this.line && this.state === 'type') s = s.slice(0, this.shown);
        G.text(s, 8, y0 + 8 + k * 16 + off);
      }
      ctx.restore();
      if (this.state === 'wait' && !(this.keep && this.line + 1 >= lines.length && this.page + 1 >= this.pages.length)) {
        G.more(144, y0 + 34, this.blink);
      }
    }
  }
  PA.TextBox = TextBox;
  PA.say = function* (text, opts) {
    const tb = PA.push(new TextBox(text, opts));
    while (!tb.done) yield;
    return tb;
  };
  // close a kept textbox
  PA.close = (tb) => { if (tb) PA.pop(tb); };

  // ---------------------------------------------------------------- menus
  class Menu {
    constructor(items, opts) {
      opts = opts || {};
      this.items = items;     // strings or {label, disabled}
      this.i = opts.start || 0;
      this.x = opts.x === undefined ? 0 : opts.x;
      this.y = opts.y === undefined ? 0 : opts.y;
      this.spacing = opts.spacing || 16;
      const maxW = Math.max(...items.map((s) => G.textWidth((typeof s === 'string' ? s : s.label).replace('\t', '  '))));
      this.w = opts.w || Math.ceil((maxW + 24) / 8) * 8;
      this.h = opts.h || items.length * this.spacing + (this.spacing === 16 ? 8 : 16);
      this.cancel = opts.cancel === undefined ? -1 : opts.cancel; // value when B pressed (null = disallow)
      this.done = false; this.result = null;
      this.onMove = opts.onMove; this.wrap = opts.wrap !== false;
      this.title = opts.title;
      this.drawExtra = opts.drawExtra;
      this.blinkFree = opts.blinkFree;
      this.keepAfter = !!opts.keep;
      this.under = opts.under || null; // scenes drawn with it (e.g. a kept textbox)
    }
    update() {
      if (this.done) return;
      const n = this.items.length;
      if (I.repeat.up) { this.i = this.wrap ? (this.i + n - 1) % n : Math.max(0, this.i - 1); PA.audio.sfx('tick'); this.onMove && this.onMove(this.i); }
      if (I.repeat.down) { this.i = this.wrap ? (this.i + 1) % n : Math.min(n - 1, this.i + 1); PA.audio.sfx('tick'); this.onMove && this.onMove(this.i); }
      if (I.pressed.a) {
        const it = this.items[this.i];
        if (it && it.disabled) { PA.audio.sfx('bump'); return; }
        PA.audio.sfx('select');
        this.finish(this.i);
      } else if (I.pressed.b && this.cancel !== null) {
        PA.audio.sfx('select');
        this.finish(this.cancel);
      }
    }
    finish(v) { this.result = v; this.done = true; if (!this.keepAfter) PA.pop(this); }
    draw() {
      G.box(this.x, this.y, this.w, this.h);
      const top = this.y + 8;
      G.selRow(this.x + 6, top + this.i * this.spacing, this.w - 12, this.spacing, this.done);
      this.items.forEach((it, k) => {
        const label = typeof it === 'string' ? it : it.label;
        G.textCols(label, this.x + 16, this.x + this.w - 8, top + k * this.spacing, Menu.colour(it, k === this.i && !this.done));
      });
      if (!this.done) G.cursor(this.x + 9, top + this.i * this.spacing - 1);
      if (this.drawExtra) this.drawExtra(this);
    }
  }
  // a row's text colour: white on the selection bar, grey when it can't be chosen
  Menu.colour = (it, on) => {
    const grey = typeof it !== 'string' && it && it.disabled;
    return on ? (grey ? '#aeaac4' : G.UI.selText) : grey ? G.UI.grey : undefined;
  };
  PA.Menu = Menu;
  PA.menu = function* (items, opts) {
    const m = PA.push(new Menu(items, opts));
    while (!m.done) yield;
    return m.result;
  };
  // ask a question with YES/NO; returns true/false
  PA.yesno = function* (question, opts) {
    opts = opts || {};
    const tb = question ? yield* PA.say(question, { keep: true }) : null;
    const r = yield* PA.menu(opts.labels || ['YES', 'NO'], { x: opts.x === undefined ? 104 : opts.x, y: opts.y === undefined ? 56 : opts.y, w: opts.w || 56, cancel: 1 });
    if (tb) PA.close(tb);
    return r === 0;
  };
  // question + arbitrary choices
  PA.choose = function* (question, items, opts) {
    opts = opts || {};
    const tb = question ? yield* PA.say(question, { keep: true }) : null;
    const w = Math.ceil((Math.max(...items.map((s) => G.textWidth(s))) + 24) / 8) * 8;
    const h = items.length * 16 + 8;
    const r = yield* PA.menu(items, { x: 160 - w, y: Math.min(96 - h, 88 - h + 8), w, cancel: opts.cancel === undefined ? items.length - 1 : opts.cancel });
    if (tb) PA.close(tb);
    return r;
  };

  // ---------------------------------------------------------------- generic overlay helpers
  // a full-screen fade scene: fades to colour, runs mid callback, fades back
  PA.fadeOut = function* (colour, frames) {
    const f = { level: 0, colour: colour || '#ffffff', draw() { G.fade(this.level, this.colour); }, update() {} };
    PA.push(f);
    const n = frames || 16;
    for (let i = 0; i <= n; i++) { f.level = (i / n) * 4; yield; }
    return f;
  };
  PA.fadeIn = function* (f, frames) {
    const n = frames || 16;
    for (let i = n; i >= 0; i--) { f.level = (i / n) * 4; yield; }
    PA.pop(f);
  };
  // banner (area name)
  class Banner {
    constructor(text) { this.text = text; this.t = 0; this.passive = true; }
    update() { this.t++; if (this.t > 150) PA.pop(this); }
    draw() {
      const w = Math.min(160, Math.ceil((G.textWidth(this.text) + 16) / 8) * 8 + 4);
      let y = 0;
      if (this.t < 10) y = -32 + this.t * 3.2;
      else if (this.t > 130) y = -(this.t - 130) * 1.6;
      G.box(4, y + 4, w - 8 < 48 ? 48 : w - 8, 24);
      G.text(this.text, 12, y + 12);
    }
  }
  PA.Banner = Banner;
})(window.PA);
