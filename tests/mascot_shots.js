// GULLIVER, the mascot: the title screen, and at the head of your party from the start of every story (on the
// team screen, his stats, leading a battle), plus a wild GULLET's front view.
// Screenshots go to tests/shots_mascot; exits non-zero on page errors or failed checks.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots_mascot');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const p = await b.newPage({ viewport: { width: 900, height: 800 } });
  p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => window.PA && window.PA.booted);
  await p.evaluate(() => { PA.audio.muted = true; PA.textSpeed = 3; });
  const shot = async (n, w = 300) => { await p.waitForTimeout(w); await p.locator('#screen').screenshot({ path: path.join(OUT, n + '.png') }); };
  const press = async (k, w = 120) => { await p.keyboard.down(k); await p.waitForTimeout(40); await p.keyboard.up(k); await p.waitForTimeout(w); };
  const expect = async (what, fn, want, arg) => { const got = await p.evaluate(fn, arg); if (JSON.stringify(got) !== JSON.stringify(want)) errs.push(what + ': expected ' + JSON.stringify(want) + ', got ' + JSON.stringify(got)); };
  const settle = async () => { for (let i = 0; i < 300 && (await p.evaluate(() => PA.scriptBusy())); i++) await press('z', 60); };

  // 1. title screen
  await shot('01_title', 1800);
  await expect('GULLIVER is a GULLET, a FROST-type Diva from the roster', () => [PA.species(PA.GULL_ID).n, PA.species(PA.GULL_ID).t[0], PA.species(PA.GULL_ID).temper], ['GULLET', 'FROST', 'diva']);

  // 2. a new game, with battles and without: he leads the party from the first moment
  for (const [seed, battles] of [['GULLWITH', 1], ['GULLWITHOUT', 0]]) {
    await p.goto('file://' + path.join(__dirname, '..', 'index.html') + '?battles=' + battles);
    await p.waitForFunction(() => window.PA && window.PA.booted);
    await p.evaluate((s) => { PA.audio.muted = true; PA.textSpeed = 3; PA.script(PA.newGame(s)); }, seed);
    await p.waitForTimeout(500);
    await settle();
    await expect(seed + ': GULLIVER leads the party', () => [PA.state.party[0].name, PA.state.party[0].id === PA.GULL_ID], ['GULLIVER', true]);
    await expect(seed + ': party size', () => PA.state.party.length, battles ? 2 : 1);
  }
  await p.evaluate(() => PA.script(PA.menus.party({})));
  await shot('02_party_screen', 500);
  await p.evaluate(() => { PA.scripts.length = 0; PA.replaceAll(PA.ow.scene); PA.script(PA.menus.stats(PA.state.party[0])); });
  await shot('03_stats_screen', 500);
  await p.evaluate(() => { PA.scripts.length = 0; PA.replaceAll(PA.ow.scene); PA.script(PA.ow.wildBattle(PA.sid('MONOCAT'), 4)); });
  for (let i = 0; i < 40 && (await p.evaluate(() => !(PA.top() && PA.top().constructor.name === 'BattleMenu'))); i++) await press('z', 100);
  await shot('04_party_battle', 200);
  await expect('he leads the battle', () => PA.scenes.find((s) => s instanceof PA.Battle).pm.id === PA.GULL_ID, true);
  await p.evaluate(() => { PA.scripts.length = 0; PA.replaceAll(PA.ow.scene); PA.script(PA.ow.wildBattle(PA.GULL_ID, 10)); });
  for (let i = 0; i < 40 && (await p.evaluate(() => !(PA.top() && PA.top().constructor.name === 'BattleMenu'))); i++) await press('z', 100);
  await shot('05_wild_gullet_front', 200);

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close();
  process.exitCode = errs.length ? 1 : 0;
})();
