// Procedural Adventures - attributions. Shown from the title menu (CREDITS) and at the end of every story.
'use strict';
(function (PA) {
  const G = PA.gfx, I = PA.input;

  // Each section: a heading and its lines. Keep lines short; they are wrapped to the 160px screen.
  PA.CREDITS = [
    { h: 'PROCEDURAL', h2: 'ADVENTURES', title: true, lines: ['A creature-collecting', 'adventure, made', 'anew from every', 'seed.'] },
    { h: 'MADE BY', lines: ['The Buffalo, New', 'York Procedural', 'Amusements Coding', 'Society.'] },
    { h: 'MASCOT', lines: ['GULLIVER, the cool', 'seagull. Original', 'pixel art made for', 'this game.'] },
    { h: 'CHARACTER SPRITES', lines: ['The hero and all 39', 'townsfolk: original', 'pixel art made for', 'this game.'] },
    { h: 'TILES', lines: ['Towns, routes,', 'caves, woods and', 'every room:', 'original pixel art', 'made for this game.'] },
    { h: 'CREATURES', lines: ['38 Divas and Shy', 'Ones, designed for', 'this game, in', 'original pixel art.'] },
    { h: 'FONT', lines: ['Bitmap8, an', 'original font made', 'for this game.'] },
    { h: 'WORDS', lines: ['After Jane Austen', '(1813). Public', 'domain, via', 'Project Gutenberg.'] },
    { h: 'OTHER GRAPHICS', lines: ['Objects, bubbles,', 'battle effects and', 'windows: original,', 'made for this game.'] },
    { h: 'ENGINE & STORY', h2: 'WORLDS & MUSIC', lines: ['Written for this', 'project. Every', 'world, plot and', 'tune is generated', 'from its seed.'] },
  ];

  // flatten to display lines (headings marked); skipTitle drops the game-title section (the end roll has its own)
  PA.creditLines = function (opts) {
    const out = [];
    for (const s of PA.CREDITS) {
      if (s.title && opts && opts.skipTitle) continue;
      out.push({ t: s.h, h: true });
      if (s.h2) out.push({ t: s.h2, h: true });
      for (const l of s.lines) PA.wrap(l, 19)[0].forEach((x) => out.push({ t: x }));
      out.push({ t: '' });
    }
    return out;
  };

  // Title-menu credits: a scrolling page you can drive with the D-pad; A/B/START to leave.
  PA.scenesApi.creditsPage = function* () {
    const lines = PA.creditLines();
    const total = lines.length * 10;
    const sc = { y: 0, t: 0, done: false, opaque: true, update() {
      this.t++;
      const max = Math.max(0, total - 112);
      if (I.held.down) this.y = Math.min(max, this.y + 2);
      else if (I.held.up) this.y = Math.max(0, this.y - 2);
      else if (this.t > 90 && this.y < max) this.y += 0.25;
      if (I.pressed.a || I.pressed.b || I.pressed.start) { PA.audio.sfx('select'); this.done = true; }
    }, draw() {
      G.clear('#141024');
      for (let i = 0; i < 30; i++) G.rect((i * 71 + 13) % 160, (i * 37 + 7) % 144, 1, 1, i % 5 ? '#5a4a8a' : '#f8e8b0');
      G.ctx.save(); G.ctx.beginPath(); G.ctx.rect(0, 8, 160, 120); G.ctx.clip();
      lines.forEach((l, k) => {
        const y = Math.round(12 + k * 10 - this.y);
        if (y < 0 || y > 136) return;
        G.textC(l.t, 80, y, l.h ? '#f8d860' : '#efe6ff');
      });
      G.ctx.restore();
      G.textC('↑↓ scroll  A back', 80, 134, '#8a8494');
    } };
    PA.push(sc);
    while (!sc.done) yield;
    PA.pop(sc);
  };
})(window.PA);
