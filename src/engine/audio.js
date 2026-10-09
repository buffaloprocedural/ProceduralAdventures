// Procedural Adventures - chiptune audio: 4-channel GB-ish synth, procedural composer, jingles, sfx, cries
'use strict';
(function (PA) {
  const A = (PA.audio = { muted: false, ready: false, volume: 0.5 });
  let ac = null, master = null, musicGain = null, sfxGain = null;
  const waves = {};
  let noiseBuf = null;

  A.unlock = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = A.muted ? 0 : A.volume; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
    [0.125, 0.25, 0.5].forEach((duty) => {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) { re[k] = 0; im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); }
      waves[duty] = ac.createPeriodicWave(re, im);
    });
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let lfsr = 0x7fff;
    for (let i = 0; i < d.length; i++) { // GB-style LFSR noise
      const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); d[i] = (lfsr & 1) ? 0.6 : -0.6;
    }
    A.ready = true;
    setInterval(tick, 25);
    if (A._pending) { const p = A._pending; A._pending = null; A.play(p.name, p.song); }
    const led = document.getElementById('led'); if (led) led.classList.add('on');
  };
  A.toggleMute = function () {
    A.muted = !A.muted;
    if (master) master.gain.setTargetAtTime(A.muted ? 0 : A.volume, ac.currentTime, 0.02);
    try { localStorage.setItem('pa_muted', A.muted ? '1' : '0'); } catch (e) {}
  };
  try { A.muted = localStorage.getItem('pa_muted') === '1'; } catch (e) {}

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---------------------------------------------------------------- voices
  function tone(dest, t, dur, freq, opts) {
    opts = opts || {};
    const o = ac.createOscillator();
    const g = ac.createGain();
    if (opts.type === 'tri') o.type = 'triangle';
    else if (opts.type === 'sine') o.type = 'sine';
    else o.setPeriodicWave(waves[opts.duty || 0.5]);
    o.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t + dur);
    if (opts.vib) {
      const l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = 5.5; lg.gain.value = freq * 0.012;
      l.connect(lg); lg.connect(o.frequency); l.start(t + Math.min(0.12, dur * 0.4)); l.stop(t + dur + 0.05);
    }
    const v = opts.vol === undefined ? 0.2 : opts.vol;
    const env = opts.env || 'pluck';
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.006);
    if (env === 'pluck') g.gain.exponentialRampToValueAtTime(Math.max(0.0005, v * 0.35), t + Math.max(0.03, dur * 0.85));
    else g.gain.setValueAtTime(v * 0.85, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dest, t, dur, opts) {
    opts = opts || {};
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    s.playbackRate.value = opts.rate || 1;
    const f = ac.createBiquadFilter();
    f.type = opts.filter || 'highpass';
    f.frequency.value = opts.freq || 2000;
    if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, t + dur);
    const g = ac.createGain();
    const v = opts.vol || 0.15;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ---------------------------------------------------------------- sequencer
  // song: {bpm, steps (16th steps per bar=16), len (total steps), loop, tracks:[{v:'p1'|'p2'|'tri'|'noise', duty, vol, notes:[[step, midi|drum, len]]}]}
  let cur = null;       // {song, start, step, name}
  let stash = null;     // music paused by a jingle
  function tick() {
    if (!ac || !cur) return;
    const song = cur.song;
    const spb = 60 / song.bpm / 4; // seconds per 16th
    const ahead = ac.currentTime + 0.15;
    while (cur && cur.nextTime < ahead) {
      const st = cur.step;
      for (const tr of song.tracks) {
        const evs = tr.byStep[st];
        if (!evs) continue;
        for (const e of evs) playEvent(tr, e, cur.nextTime, spb);
      }
      cur.step++;
      cur.nextTime += spb * (song.swing && (st % 2 === 0) ? 1 + song.swing : song.swing && (st % 2 === 1) ? 1 - song.swing : 1);
      if (cur.step >= song.len) {
        if (song.loop) cur.step = song.loopStart || 0;
        else {
          const done = cur.onEnd; const endAt = cur.nextTime;
          cur = null;
          if (done) setTimeout(done, Math.max(0, (endAt - ac.currentTime) * 1000));
        }
      }
    }
  }
  function playEvent(tr, e, t, spb) {
    const dur = e[2] * spb;
    if (tr.v === 'noise') {
      const kind = e[1];
      if (kind === 'k') { tone(musicGain, t, 0.09, 140, { type: 'sine', slideTo: 45, vol: (tr.vol || 0.2) * 1.6 }); }
      else if (kind === 's') noise(musicGain, t, 0.12, { freq: 1500, vol: (tr.vol || 0.12) * 1.1, filter: 'bandpass' });
      else if (kind === 'h') noise(musicGain, t, 0.04, { freq: 7000, vol: (tr.vol || 0.12) * 0.55 });
      else if (kind === 'o') noise(musicGain, t, 0.18, { freq: 6000, vol: (tr.vol || 0.12) * 0.5 });
      return;
    }
    const f = mtof(e[1]);
    if (tr.v === 'tri') tone(musicGain, t, dur * 0.95, f, { type: 'tri', vol: tr.vol || 0.28, env: 'hold' });
    else tone(musicGain, t, dur * (tr.gate || 0.9), f, { duty: tr.duty || 0.5, vol: (tr.vol || 0.12) * (e[3] || 1), env: tr.env || 'pluck', vib: tr.vib && dur > 0.2 });
  }
  function prep(song) {
    if (song._prepped) return song;
    for (const tr of song.tracks) {
      tr.byStep = {};
      for (const n of tr.notes) (tr.byStep[n[0]] = tr.byStep[n[0]] || []).push(n);
    }
    song._prepped = true;
    return song;
  }
  A.current = () => (cur ? cur.name : stash ? stash.name : null);
  A.play = function (name, song) {
    if (!song) return;
    if (!A.ready) { A._pending = { name, song }; return; }
    if (cur && cur.name === name && song.loop) return;
    stash = null;
    prep(song);
    cur = { name, song, step: 0, nextTime: ac.currentTime + 0.05 };
  };
  A.stop = function () { cur = null; stash = null; };
  // jingle: pauses current loop, resumes after
  A.jingle = function (song, cb) {
    if (!A.ready) { if (cb) setTimeout(cb, 600); return; }
    prep(song);
    if (cur && cur.song.loop) stash = cur;
    cur = { name: '_jingle', song, step: 0, nextTime: ac.currentTime + 0.03, onEnd: () => {
      if (stash) { stash.nextTime = ac.currentTime + 0.05; stash.step = 0; cur = stash; stash = null; }
      if (cb) cb();
    } };
  };

  // ---------------------------------------------------------------- procedural composer
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
    mixo: [0, 2, 4, 5, 7, 9, 10], harm: [0, 2, 3, 5, 7, 8, 11], lydian: [0, 2, 4, 6, 7, 9, 11],
  };
  const PROGS = {
    major: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 0], [5, 3, 0, 4], [0, 3, 5, 4], [0, 2, 3, 4], [3, 4, 2, 5]],
    minor: [[0, 5, 2, 6], [0, 3, 4, 0], [0, 6, 5, 6], [0, 5, 3, 4], [0, 3, 6, 2], [5, 6, 0, 0]],
  };
  const MOODS = {
    title: { scale: 'major', bpm: [112, 124], drums: 'march', lead: 0.25, bassStyle: 'walk', arp: false },
    town: { scale: ['major', 'mixo', 'lydian'], bpm: [96, 112], drums: 'light', lead: 0.25, bassStyle: 'bounce', arp: false },
    route: { scale: ['major', 'mixo'], bpm: [128, 146], drums: 'pop', lead: 0.5, bassStyle: 'bounce', arp: true },
    battle: { scale: ['harm', 'minor'], bpm: [150, 166], drums: 'drive', lead: 0.25, bassStyle: 'drive', arp: true, dense: true },
    trainer: { scale: ['minor', 'dorian'], bpm: [152, 168], drums: 'drive', lead: 0.125, bassStyle: 'drive', arp: true, dense: true },
    boss: { scale: ['harm'], bpm: [164, 178], drums: 'drive', lead: 0.125, bassStyle: 'drive', arp: true, dense: true },
    rival: { scale: ['mixo', 'dorian'], bpm: [140, 152], drums: 'pop', lead: 0.25, bassStyle: 'drive', arp: true },
    cave: { scale: ['dorian', 'minor'], bpm: [82, 94], drums: 'sparse', lead: 0.125, bassStyle: 'slow', arp: true },
    forest: { scale: ['dorian', 'mixo'], bpm: [100, 112], drums: 'light', lead: 0.25, bassStyle: 'bounce', arp: true },
    house: { scale: ['major', 'lydian'], bpm: [92, 104], drums: 'none', lead: 0.5, bassStyle: 'slow', arp: false },
    center: { scale: ['major'], bpm: [104, 112], drums: 'light', lead: 0.125, bassStyle: 'bounce', arp: true },
    hall: { scale: ['major', 'mixo'], bpm: [118, 126], drums: 'march', lead: 0.25, bassStyle: 'walk', arp: true },
    tension: { scale: ['minor', 'harm'], bpm: [108, 118], drums: 'sparse', lead: 0.125, bassStyle: 'slow', arp: true },
    victory: { scale: ['major'], bpm: [132, 140], drums: 'pop', lead: 0.5, bassStyle: 'bounce', arp: true },
    ending: { scale: ['major', 'lydian'], bpm: [84, 92], drums: 'light', lead: 0.25, bassStyle: 'walk', arp: true },
    dusk: { scale: ['dorian', 'mixo'], bpm: [96, 106], drums: 'light', lead: 0.25, bassStyle: 'walk', arp: true },
  };
  const RHYTHMS = [ // 16-step onsets with lengths
    [[0, 4], [4, 2], [6, 2], [8, 4], [12, 4]],
    [[0, 3], [3, 3], [6, 2], [8, 6], [14, 2]],
    [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]],
    [[0, 6], [6, 2], [8, 4], [12, 2], [14, 2]],
    [[0, 4], [4, 4], [8, 8]],
    [[0, 2], [2, 2], [4, 2], [6, 2], [8, 4], [12, 4]],
    [[0, 3], [3, 1], [4, 4], [8, 3], [11, 1], [12, 4]],
  ];
  const DENSE = [
    [[0, 2], [2, 2], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]],
    [[0, 3], [3, 3], [6, 2], [8, 2], [10, 2], [12, 4]],
    [[0, 2], [2, 1], [3, 1], [4, 2], [6, 2], [8, 3], [11, 3], [14, 2]],
  ];
  const DRUMS = {
    none: [],
    light: [[0, 'k'], [8, 'h'], [12, 'h']],
    sparse: [[0, 'k'], [10, 'h']],
    march: [[0, 'k'], [4, 's'], [8, 'k'], [10, 'k'], [12, 's'], [14, 'h']],
    pop: [[0, 'k'], [2, 'h'], [4, 's'], [6, 'h'], [8, 'k'], [10, 'h'], [12, 's'], [14, 'h']],
    drive: [[0, 'k'], [2, 'h'], [4, 's'], [6, 'k'], [8, 'k'], [10, 'h'], [12, 's'], [14, 'h'], [15, 'h']],
  };

  A.compose = function (seed, moodName) {
    const r = new PA.RNG(seed + ':' + moodName);
    const M = MOODS[moodName] || MOODS.town;
    const scaleName = Array.isArray(M.scale) ? r.pick(M.scale) : M.scale;
    const scale = SCALES[scaleName];
    const minorish = scaleName === 'minor' || scaleName === 'harm' || scaleName === 'dorian';
    const prog = r.pick(PROGS[minorish ? 'minor' : 'major']);
    const progB = r.pick(PROGS[minorish ? 'minor' : 'major']);
    const root = 57 + r.int(0, 7); // A3..E4
    const bpm = r.int(M.bpm[0], M.bpm[1]);
    const deg = (d, oct) => { // scale degree -> midi
      const o = Math.floor(d / 7); const k = ((d % 7) + 7) % 7;
      return root + scale[k] + 12 * (o + (oct || 0));
    };
    const chordTones = (c) => [c, c + 2, c + 4];
    const bars = 16;
    const lead = [], harm = [], bass = [], drum = [];
    const motifR = r.pick(M.dense ? DENSE : RHYTHMS);
    const motifR2 = r.pick(M.dense ? DENSE : RHYTHMS);
    let last = 7 + r.int(0, 4);
    const sections = ['A', 'A2', 'B', 'A3'];
    for (let bar = 0; bar < bars; bar++) {
      const sec = sections[(bar / 4) | 0];
      const pb = sec === 'B' ? progB : prog;
      const chord = pb[bar % 4];
      const s0 = bar * 16;
      const isCad = bar % 4 === 3;
      const rhythm = sec === 'B' ? motifR2 : motifR;
      // melody
      rhythm.forEach(([on, len], i) => {
        let target;
        const strong = on % 8 === 0;
        const tones = chordTones(chord).map((t) => t + 7);
        if (isCad && i === rhythm.length - 1) target = tones[0];
        else if (strong) { // nearest chord tone to last
          target = tones.reduce((a, b) => (Math.abs(b - last) < Math.abs(a - last) ? b : a));
          if (r.chance(0.3)) target = r.pick(tones);
        } else target = last + r.pick([-2, -1, -1, 1, 1, 2, 0]);
        target = PA.clamp(target, 3, 15);
        if (sec === 'A3' && bar % 4 === 0 && i === 0) target = tones[2];
        if (isCad && on >= 8 && !(i === rhythm.length - 1)) target = PA.clamp(target, tones[0] - 2, tones[0] + 2);
        last = target;
        if (r.chance(M.dense ? 0.04 : 0.08) && !strong) return; // rest
        lead.push([s0 + on, deg(target), len, strong ? 1 : 0.85]);
      });
      // harmony / arp
      if (M.arp) {
        const tones = chordTones(chord);
        const pattern = M.dense ? [0, 1, 2, 1] : [0, 1, 2, 3];
        for (let k = 0; k < 16; k += (M.dense ? 1 : 2)) {
          const tt = tones[pattern[(k / (M.dense ? 1 : 2)) % pattern.length] % 3] + (pattern[(k / (M.dense ? 1 : 2)) % pattern.length] === 3 ? 7 : 0);
          harm.push([s0 + k, deg(tt), M.dense ? 1 : 2, 0.7]);
        }
      } else {
        const tones = chordTones(chord);
        harm.push([s0, deg(tones[1]), 8, 0.7]);
        harm.push([s0 + 8, deg(tones[2]), 8, 0.7]);
      }
      // bass
      const b0 = deg(chord, -1);
      if (M.bassStyle === 'drive') for (let k = 0; k < 16; k += 2) bass.push([s0 + k, k % 8 === 6 ? b0 + 7 : (k % 4 === 2 ? b0 + 12 : b0), 2]);
      else if (M.bassStyle === 'bounce') [[0, b0, 3], [4, b0 + 7, 2], [8, b0, 3], [12, b0 + 12, 2]].forEach((e) => bass.push([s0 + e[0], e[1], e[2]]));
      else if (M.bassStyle === 'walk') [[0, b0], [4, deg(chord + 2, -1)], [8, deg(chord + 4, -1)], [12, deg(chord + 5, -1)]].forEach((e) => bass.push([s0 + e[0], e[1], 4]));
      else bass.push([s0, b0, 8], [s0 + 8, b0 + 7, 8]);
      // drums
      for (const [on, k] of DRUMS[M.drums]) {
        if (bar % 4 === 3 && on >= 12 && M.drums !== 'none' && M.drums !== 'sparse') { drum.push([s0 + on, 's', 1]); if (on + 2 < 16) drum.push([s0 + on + 2, 's', 1]); }
        else drum.push([s0 + on, k, 1]);
      }
    }
    return {
      bpm, len: bars * 16, loop: true, swing: moodName === 'town' || moodName === 'house' ? 0.12 : 0,
      tracks: [
        { v: 'p1', duty: M.lead, vol: 0.11, notes: lead, vib: true, env: 'hold', gate: 0.88 },
        { v: 'p2', duty: M.arp ? 0.125 : 0.25, vol: M.arp ? 0.06 : 0.07, notes: harm },
        { v: 'tri', vol: 0.3, notes: bass },
        { v: 'noise', vol: 0.12, notes: drum },
      ],
    };
  };

  // fixed jingles (original)
  function jing(bpm, lead, bass) {
    return { bpm, loop: false, len: Math.max(...lead.map((n) => n[0] + n[2]), ...(bass || [[0, 0, 0]]).map((n) => n[0] + n[2])) + 2,
      tracks: [{ v: 'p1', duty: 0.25, vol: 0.13, notes: lead, env: 'hold' }, { v: 'tri', vol: 0.3, notes: bass || [] }] };
  }
  A.J = {
    heal: jing(150, [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 84, 4], [10, 79, 2], [12, 84, 8]], [[0, 48, 6], [6, 55, 6], [12, 48, 8]]),
    item: jing(160, [[0, 74, 2], [2, 74, 2], [4, 74, 2], [6, 79, 6], [12, 78, 2], [14, 79, 8]], [[0, 43, 6], [6, 47, 6], [12, 43, 10]]),
    key: jing(140, [[0, 67, 2], [2, 71, 2], [4, 74, 2], [6, 79, 2], [8, 83, 4], [12, 86, 10]], [[0, 43, 8], [8, 50, 14]]),
    level: jing(180, [[0, 76, 2], [2, 79, 2], [4, 84, 2], [6, 88, 6]], [[0, 52, 4], [4, 48, 8]]),
    // a new friend: up a major sixth, a little turn, and a long warm tonic
    friend: jing(132, [[0, 67, 3], [3, 76, 5], [8, 74, 2], [10, 72, 2], [12, 74, 2], [14, 79, 3], [17, 76, 2], [19, 72, 12]], [[0, 48, 8], [8, 45, 6], [14, 43, 5], [19, 48, 12]]),
    save: jing(200, [[0, 79, 2], [2, 84, 4]], []),
    act: jing(110, [[0, 67, 3], [3, 72, 3], [6, 76, 3], [9, 79, 6], [16, 77, 2], [18, 76, 2], [20, 74, 2], [22, 72, 10]], [[0, 48, 12], [12, 41, 12], [24, 43, 8]]),
    sting: jing(160, [[0, 63, 2], [2, 62, 2], [4, 70, 8]], [[0, 39, 12]]),
    spotted: jing(190, [[0, 81, 2], [2, 80, 2], [4, 81, 2], [6, 85, 6]], [[0, 45, 12]]),
  };

  // ---------------------------------------------------------------- sfx
  A.sfx = function (name) {
    if (!A.ready || !ac) return;
    const t = ac.currentTime + 0.005, g = sfxGain;
    switch (name) {
      case 'select': tone(g, t, 0.05, 1320, { duty: 0.5, vol: 0.12, env: 'hold' }); break;
      case 'menu': tone(g, t, 0.04, 990, { duty: 0.25, vol: 0.1 }); tone(g, t + 0.045, 0.06, 1480, { duty: 0.25, vol: 0.1 }); break;
      case 'bump': tone(g, t, 0.09, 110, { duty: 0.5, vol: 0.18, slideTo: 70 }); break;
      case 'door': noise(g, t, 0.25, { freq: 3000, sweepTo: 300, vol: 0.18, filter: 'lowpass' }); break;
      case 'exit': noise(g, t, 0.22, { freq: 400, sweepTo: 3000, vol: 0.16, filter: 'lowpass' }); break;
      case 'ledge': tone(g, t, 0.16, 300, { duty: 0.5, vol: 0.14, slideTo: 900 }); break;
      case 'hit': noise(g, t, 0.18, { freq: 900, vol: 0.32, filter: 'lowpass', sweepTo: 200 }); break;
      case 'hitSuper': noise(g, t, 0.12, { freq: 1600, vol: 0.34, filter: 'lowpass' }); noise(g, t + 0.13, 0.22, { freq: 900, vol: 0.34, filter: 'lowpass', sweepTo: 150 }); break;
      case 'hitWeak': noise(g, t, 0.1, { freq: 500, vol: 0.18, filter: 'lowpass' }); break;
      case 'faint': tone(g, t, 0.6, 600, { duty: 0.5, vol: 0.16, slideTo: 60 }); break;
      case 'heart': tone(g, t, 0.09, 1320, { type: 'sine', vol: 0.12 }); tone(g, t + 0.1, 0.16, 1760, { type: 'sine', vol: 0.1 }); break;
      case 'cross': tone(g, t, 0.12, 220, { duty: 0.5, vol: 0.12, slideTo: 140 }); noise(g, t, 0.1, { freq: 1500, vol: 0.12 }); break;
      case 'scratch': noise(g, t, 0.09, { freq: 2600, sweepTo: 500, vol: 0.22, filter: 'bandpass' }); noise(g, t + 0.1, 0.16, { freq: 700, sweepTo: 3200, vol: 0.18, filter: 'bandpass' }); break;
      case 'pop': noise(g, t, 0.14, { freq: 5000, vol: 0.2 }); tone(g, t, 0.12, 900, { duty: 0.25, vol: 0.1, slideTo: 300 }); break;
      case 'run': noise(g, t, 0.35, { freq: 500, sweepTo: 4000, vol: 0.15, filter: 'bandpass' }); break;
      case 'stat': for (let i = 0; i < 6; i++) tone(g, t + i * 0.05, 0.05, 500 + i * 120, { duty: 0.25, vol: 0.09 }); break;
      case 'statDown': for (let i = 0; i < 6; i++) tone(g, t + i * 0.05, 0.05, 1100 - i * 120, { duty: 0.25, vol: 0.09 }); break;
      case 'heal': for (let i = 0; i < 5; i++) tone(g, t + i * 0.06, 0.08, 700 + i * 180, { duty: 0.125, vol: 0.08 }); break;
      case 'status': tone(g, t, 0.25, 300, { duty: 0.125, vol: 0.1, slideTo: 260, vib: true }); break;
      case 'save': tone(g, t, 0.06, 1000, { duty: 0.5, vol: 0.1 }); tone(g, t + 0.08, 0.1, 1500, { duty: 0.5, vol: 0.1 }); break;
      case 'buy': tone(g, t, 0.05, 1500, { duty: 0.5, vol: 0.1 }); tone(g, t + 0.06, 0.1, 2000, { duty: 0.5, vol: 0.1 }); break;
      case 'flee': noise(g, t, 0.3, { freq: 3000, sweepTo: 600, vol: 0.14 }); break;
      case 'swoosh': noise(g, t, 0.22, { freq: 800, sweepTo: 5000, vol: 0.14, filter: 'bandpass' }); break;
      case 'fire': noise(g, t, 0.4, { freq: 600, vol: 0.25, filter: 'lowpass', sweepTo: 200, rate: 0.5 }); break;
      case 'water': for (let i = 0; i < 5; i++) tone(g, t + i * 0.06, 0.06, 400 + Math.random() * 600, { type: 'sine', vol: 0.12, slideTo: 900 }); break;
      case 'zap': for (let i = 0; i < 6; i++) noise(g, t + i * 0.04, 0.035, { freq: 4000, vol: 0.18 }); break;
      case 'beam': tone(g, t, 0.4, 1200, { duty: 0.125, vol: 0.09, slideTo: 300, vib: true }); break;
      case 'leaf': for (let i = 0; i < 4; i++) noise(g, t + i * 0.07, 0.06, { freq: 6000, vol: 0.12 }); break;
      case 'psy': tone(g, t, 0.5, 300, { duty: 0.25, vol: 0.09, slideTo: 1200, vib: true }); tone(g, t, 0.5, 450, { duty: 0.125, vol: 0.07, slideTo: 1800 }); break;
      case 'whoosh': noise(g, t, 0.3, { freq: 300, sweepTo: 2000, vol: 0.14, filter: 'bandpass' }); break;
      case 'tick': tone(g, t, 0.02, 2000, { duty: 0.5, vol: 0.05 }); break;
      case 'exp': tone(g, t, 0.05, 1600 + Math.random() * 200, { duty: 0.125, vol: 0.05 }); break;
      case 'lowhp': tone(g, t, 0.08, 1760, { duty: 0.5, vol: 0.06 }); tone(g, t + 0.12, 0.08, 1760, { duty: 0.5, vol: 0.06 }); break;
      case 'spark': for (let i = 0; i < 3; i++) tone(g, t + i * 0.05, 0.05, 2000 + i * 400, { duty: 0.125, vol: 0.06 }); break;
      default: break;
    }
  };
  // species cry: deterministic little sweep per species
  A.cry = function (id, pitchMul) {
    if (!A.ready || !ac) return;
    const r = new PA.RNG('cry' + id);
    const t = ac.currentTime + 0.01;
    const base = (180 + r.int(0, 520)) * (pitchMul || 1);
    const segs = r.int(2, 4);
    let tt = t;
    for (let i = 0; i < segs; i++) {
      const d = 0.08 + r.next() * 0.14;
      const to = base * (0.5 + r.next() * 1.4);
      tone(sfxGain, tt, d, i === 0 ? base : base * (0.7 + r.next() * 0.6), { duty: r.pick([0.125, 0.25, 0.5]), vol: 0.12, slideTo: to, env: 'hold' });
      if (r.chance(0.5)) noise(sfxGain, tt, d, { freq: 1500 + r.int(0, 3000), vol: 0.05, filter: 'bandpass' });
      tt += d * 0.9;
    }
  };
})(window.PA);
