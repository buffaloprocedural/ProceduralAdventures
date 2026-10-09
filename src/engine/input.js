// Procedural Adventures - input: keyboard + touch + game controllers -> GB buttons
'use strict';
(function (PA) {
  const BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
  const I = (PA.input = { held: {}, pressed: {}, released: {}, repeat: {}, any: false, last: null });
  const hold = {}; // frames held
  const KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
    z: 'a', Z: 'a', ' ': 'a', Enter: 'start', j: 'a', J: 'a',
    x: 'b', X: 'b', Backspace: 'b', k: 'b', K: 'b',
    Escape: 'start', Shift: 'select', Tab: 'select',
  };
  const raw = {};
  const queue = [];
  I.onAnyKey = null;
  window.addEventListener('keydown', (e) => {
    if (I.typing && I.onType) { // naming screen keyboard typing comes first, so M and F are letters there
      if (I.onType(e)) { e.preventDefault(); return; }
    }
    if (e.key === 'm' || e.key === 'M') { PA.audio && PA.audio.toggleMute(); return; }
    if (e.key === 'f' || e.key === 'F') { toggleFull(); return; }
    const b = KEYMAP[e.key];
    if (b) {
      e.preventDefault();
      if (!raw[b]) queue.push([b, true]);
      raw[b] = true;
      // Enter doubles as A in text contexts (handled by consumers via 'start' or 'a')
    }
    if (I.onAnyKey) I.onAnyKey();
  });
  window.addEventListener('keyup', (e) => {
    const b = KEYMAP[e.key];
    if (b) { raw[b] = false; queue.push([b, false]); }
  });
  window.addEventListener('blur', () => { BTN.forEach((b) => (raw[b] = false)); });

  function toggleFull() {
    const d = document;
    if (!d.fullscreenElement) {
      (d.documentElement.requestFullscreen || function () {}).call(d.documentElement);
      d.body.classList.add('full');
    } else { d.exitFullscreen && d.exitFullscreen(); d.body.classList.remove('full'); }
    setTimeout(() => PA.gfx.resize(), 120);
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) document.body.classList.remove('full');
    setTimeout(() => PA.gfx.resize(), 120);
  });

  // touch buttons
  I.bindTouch = function () {
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouch) document.body.classList.add('touch');
    const btns = document.querySelectorAll('[data-btn]');
    const active = new Map(); // pointerId -> btn element
    function press(el, on) {
      const b = el.dataset.btn;
      if (on && !raw[b]) queue.push([b, true]);
      if (!on && raw[b]) queue.push([b, false]);
      raw[b] = on;
      el.classList.toggle('pressed', on);
      if (on && I.onAnyKey) I.onAnyKey();
    }
    btns.forEach((el) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture && el.setPointerCapture(e.pointerId); active.set(e.pointerId, el); press(el, true); });
      const up = (e) => { const a = active.get(e.pointerId); if (a) { press(a, false); active.delete(e.pointerId); } };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    // d-pad sliding: re-evaluate which arrow is under the finger
    const dpad = document.getElementById('dpad');
    if (dpad) dpad.addEventListener('pointermove', (e) => {
      const cur = active.get(e.pointerId);
      if (!cur || !cur.classList.contains('d')) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el !== cur && el.dataset && el.dataset.btn && el.classList.contains('d')) {
        press(cur, false); active.set(e.pointerId, el); press(el, true);
      }
    });
    if (isTouch) PA.gfx.resize();
  };

  // ---------------------------------------------------------------- game controllers
  // Any controller the browser sees through the Gamepad API: on iPhone/iPad, MFi pads and the Xbox,
  // PlayStation and Switch Pro controllers paired over Bluetooth. Buttons are read by position
  // (the 'standard' layout): bottom face = A, right face = B - so on a pad whose labels are the other way
  // round, OPTION > PAD switches to A=RIGHT to make the button labelled A be A. Menu/Options/+ is
  // START, View/Share/- is SELECT; the d-pad and the left stick both move. Browsers only reveal a controller
  // after one of its buttons is pressed on the page. The Home/PS button belongs to the system.
  const pad = {}; // button -> held on any controller
  I.padLayout = 'bottom'; // which face button is A: 'bottom' or 'right'
  try { if (localStorage.getItem('pa_pad') === 'right') I.padLayout = 'right'; } catch (e) {}
  I.setPadLayout = (l) => { I.padLayout = l; try { localStorage.setItem('pa_pad', l); } catch (e) {} };
  I.padName = null; // the last controller seen, for the OPTION menu
  const DEAD = 0.5;
  function readPads() {
    const now = {};
    let pads = [];
    try { pads = (navigator.getGamepads && navigator.getGamepads()) || []; } catch (e) { pads = []; }
    for (const g of pads) {
      if (!g || !g.connected) continue;
      I.padName = g.id;
      const on = (i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5));
      const [a, b] = I.padLayout === 'right' ? [1, 0] : [0, 1];
      if (on(a)) now.a = true;
      if (on(b)) now.b = true;
      if (on(9)) now.start = true;
      if (on(8)) now.select = true;
      if (on(12)) now.up = true;
      if (on(13)) now.down = true;
      if (on(14)) now.left = true;
      if (on(15)) now.right = true;
      const x = g.axes[0] || 0, y = g.axes[1] || 0; // left stick: its stronger axis wins, so diagonals don't jitter
      if (Math.abs(x) > DEAD || Math.abs(y) > DEAD) {
        if (Math.abs(x) > Math.abs(y)) now[x < 0 ? 'left' : 'right'] = true; else now[y < 0 ? 'up' : 'down'] = true;
      }
    }
    for (const b of BTN) {
      const was = !!pad[b], is = !!now[b];
      if (is === was) continue;
      pad[b] = is;
      if (!raw[b]) queue.push([b, is]); // keyboard/touch already holding it: no new edge
      if (is && I.onAnyKey) I.onAnyKey();
    }
  }
  window.addEventListener('gamepadconnected', (e) => {
    I.padName = e.gamepad && e.gamepad.id;
    if (PA.onPadConnected) PA.onPadConnected(I.padName);
  });
  window.addEventListener('gamepaddisconnected', () => { BTN.forEach((b) => { if (pad[b] && !raw[b]) queue.push([b, false]); pad[b] = false; }); });

  // called once per frame by the main loop
  I.update = function () {
    readPads();
    BTN.forEach((b) => { I.pressed[b] = false; I.released[b] = false; I.repeat[b] = false; });
    // apply queued edges so very quick taps are never lost
    const seen = {};
    while (queue.length) {
      const [b, on] = queue.shift();
      if (on) { I.pressed[b] = true; I.repeat[b] = true; hold[b] = 0; seen[b] = true; }
      else I.released[b] = true;
    }
    I.any = false;
    BTN.forEach((b) => {
      const down = !!raw[b] || !!pad[b];
      I.held[b] = down || (I.pressed[b] && !I.released[b]);
      if (I.pressed[b] && I.released[b] && !down) I.held[b] = true; // tap within one frame
      if (down) {
        hold[b] = (hold[b] || 0) + 1;
        if (!seen[b] && hold[b] > 18 && (hold[b] - 18) % 5 === 0) I.repeat[b] = true;
      } else hold[b] = 0;
      if (I.pressed[b]) { I.any = true; I.last = b; }
    });
  };
  // convenience
  I.ok = () => I.pressed.a;
  I.cancel = () => I.pressed.b;
  const D4 = ['up', 'down', 'left', 'right'];
  I.dir = function () { // currently held direction (most recent press wins)
    for (const d of D4) if (I.pressed[d]) { I._lastDir = d; return d; }
    if (I._lastDir && I.held[I._lastDir]) return I._lastDir;
    for (const d of D4) if (I.held[d]) { I._lastDir = d; return d; }
    return null;
  };
  I.clear = function () { BTN.forEach((b) => { I.pressed[b] = false; I.repeat[b] = false; }); queue.length = 0; };
})(window.PA);
