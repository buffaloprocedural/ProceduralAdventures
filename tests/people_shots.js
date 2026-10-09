// The original NPC sprites (art/npcs): checks every frame of every character draws, and screenshots
// them in context - a contact sheet, the lab, a town, a clinic, a trainer battle and the intro.
// Exits non-zero on page errors or blank frames.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots_people');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', (m) => { if (m.type() === 'error' || /^Procedural Adventures/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => window.PA && window.PA.booted);
  const shot = async (n, w = 250) => { await p.waitForTimeout(w); await p.locator('#screen').screenshot({ path: path.join(OUT, n + '.png') }); };
  const settle = async () => { for (let i = 0; i < 200; i++) { if (!(await p.evaluate(() => PA.scriptBusy()))) return; await p.keyboard.down('z'); await p.waitForTimeout(30); await p.keyboard.up('z'); await p.waitForTimeout(60); } };

  // 1) every frame draws something
  const blank = await p.evaluate(() => {
    const G = PA.gfx, out = [];
    for (const who of Object.keys(window.PA_PEOPLE.chars)) for (const dir of ['down', 'up', 'left', 'right']) for (const step of [0, 1, 2]) {
      G.clear('#000000'); G.person(who, dir, step, 0, 0);
      const d = G.ctx.getImageData(0, 0, 16, 16).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i - 3] || d[i - 2] || d[i - 1]) n++;
      if (n < 20) out.push(who + ' ' + dir + ' ' + step);
    }
    return out;
  });
  if (blank.length) errs.push('blank frames: ' + blank.join(', '));

  // 2) contact sheets: each character facing down, up, left, right (two per row, 16 per page)
  const pages = await p.evaluate(() => Math.ceil(Object.keys(window.PA_PEOPLE.chars).length / 16));
  for (let pg = 0; pg < pages; pg++) {
    await p.evaluate((pg) => {
      PA.audio.muted = true; PA.textSpeed = 3;
      const names = Object.keys(window.PA_PEOPLE.chars).slice(pg * 16, pg * 16 + 16);
      PA.replaceAll({ opaque: true, update() {}, draw() {
        const G = PA.gfx; G.clear('#e8f0d0');
        names.forEach((who, i) => ['down', 'up', 'left', 'right'].forEach((dir, j) => G.person(who, dir, 0, (i % 2) * 80 + 8 + j * 16, 1 + Math.floor(i / 2) * 18)));
      } });
    }, pg);
    await shot('01_contact_sheet_' + (pg + 1));
  }

  // 3) in the world
  await p.evaluate(() => {
    PA.forceTale = 'classic'; // the classic story's cast
    PA.state = PA.newState('PEOPLE'); PA.genAndInstall('PEOPLE');
    PA.state.name = 'ELIZA'; PA.state.rival = 'FITZ'; PA.state.party.push(new PA.Mon(PA.sid('BLIZZPARD'), 40)); // strong enough to win the test battles
    PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'ELIZA', RIVAL: 'FITZ' });
    PA.state.flags.act1 = true; PA.state.flags.coldOpen = true; PA.state.flags.labIntro = true;
    PA.replaceAll(PA.ow.scene);
    PA.ow.enterMap('lab', 5, 6, 'up');
  });
  await shot('02_lab_professor_rival', 400);
  await p.evaluate(() => { const d = PA.world.doors['town2:clinic']; if (d) PA.ow.enterMap('clinic_town2', 4, 5, 'up'); });
  await shot('03_clinic_medic', 400);
  await p.evaluate(() => {
    // stand next to a town folk NPC in town 2 or 3
    const ow = PA.world.maps.overworld, n = ow.npcSpecs.find((s) => /^folk/.test(s.key) && PA.isPerson(s.spr)) || ow.npcSpecs.find((s) => PA.isPerson(s.spr));
    PA.ow.enterMap('overworld', n.x, n.y + 1, 'up');
  });
  await shot('04_town_folk', 400);
  await p.evaluate(() => { const n = PA.world.maps.overworld.npcSpecs.find((s) => s.key === 'blocker'); if (n) PA.ow.enterMap('overworld', n.x, n.y + 1, 'up'); });
  await shot('05_gate_blocker', 400);
  await p.evaluate(() => PA.ow.enterMap('home1', 6, 4, 'left'));
  await shot('05b_home_mother', 400);
  // 4) a trainer battle intro with a new sprite
  await p.evaluate(() => PA.script(PA.ow.trainerBattle({ cls: 'RAMBLER', name: 'BOB', team: [[PA.sid('MONOCAT'), 5]], prize: 50, spr: PA.SPR.hiker, pal: 'cBrown', lose: 'Rocks!' })));
  await shot('06_battle_hiker', 1100);
  await settle();
  await p.evaluate(() => PA.script(PA.ow.trainerBattle({ cls: 'LACKEY', name: 'LACKEY', team: [[PA.sid('LORISLURK'), 5]], prize: 50, spr: PA.SPR.grunt_f, pal: 'cPurple', lose: 'Second impressions!' })));
  await shot('06b_battle_grunt', 1100);
  await settle();
  // 5) the client at the start of a story
  await p.evaluate(() => { PA.replaceAll(PA.ow.scene); PA.forceTale = null; PA.script(PA.newGame('PEOPLE2')); });
  for (let i = 0; i < 60 && !(await p.evaluate(() => PA.ow.npcs.some((n) => n.key === 'clientOpen'))); i++) { await p.keyboard.press('z'); await p.waitForTimeout(150); }
  await shot('07_setup_client', 900);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
