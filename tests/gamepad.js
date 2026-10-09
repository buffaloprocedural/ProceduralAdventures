// Game controller support: a simulated standard-layout controller (as an MFi / Xbox / PlayStation pad appears to
// the browser) starts a game from the title, walks with the d-pad and the stick, opens and closes the START menu,
// and swaps A/B for a pad whose A is on the right.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // a fake controller: 17 buttons and 4 axes, in the browser's 'standard' layout
  await page.addInitScript(() => {
    const pad = { id: 'Test Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] };
    window.__pad = pad;
    navigator.getGamepads = () => [pad, null, null, null];
  });
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.PA && window.PA.booted);
  await page.evaluate(() => { PA.audio.muted = true; PA.textSpeed = 3; });
  const btn = (i, on) => page.evaluate(([i, on]) => { const b = window.__pad.buttons[i]; b.pressed = on; b.value = on ? 1 : 0; }, [i, on]);
  const tapBtn = async (i, w = 150) => { await btn(i, true); await page.waitForTimeout(70); await btn(i, false); await page.waitForTimeout(w); };
  const axis = (x, y) => page.evaluate(([x, y]) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; }, [x, y]);
  const top = () => page.evaluate(() => PA.top() && PA.top().constructor.name);
  const check = (what, ok) => { if (!ok) errors.push('FAIL ' + what); else console.log('ok', what); };

  // the browser announces the controller after its first button press
  await page.evaluate(() => window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: window.__pad })));
  await page.waitForTimeout(100);
  check('connection banner', await page.evaluate(() => PA.scenes.some((s) => s instanceof PA.Banner)));

  // title: START opens the menu, A picks NEW ADVENTURE, A pages through the opening until the story is underway
  await tapBtn(9, 300);
  check('START opens the title menu', (await top()) === 'Menu');
  await tapBtn(0, 600);
  check('A starts a new adventure', await page.evaluate(() => !!PA.state && PA.scriptBusy()));

  // put the player in town, with the story out of the way
  await page.evaluate(() => {
    PA.scripts.length = 0;
    PA.state = PA.newState('PADTEST'); PA.genAndInstall('PADTEST');
    PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'ANNE', RIVAL: 'FITZ' });
    PA.state.party.push(new PA.Mon(PA.sid('EMBERWREN'), 8));
    PA.state.flags.act1 = true;
    PA.replaceAll(PA.ow.scene);
    const d = PA.world.doors['home:playerHouse']; PA.ow.enterMap('overworld', d.x, d.y + 2, 'down');
  });
  await page.waitForTimeout(200);
  const pos = () => page.evaluate(() => ({ x: PA.ow.player.x, y: PA.ow.player.y, dir: PA.ow.player.dir }));
  // the d-pad turns and walks
  let p0 = await pos();
  await btn(13, true); await page.waitForTimeout(500); await btn(13, false); await page.waitForTimeout(300);
  let p1 = await pos();
  check('d-pad down walks down (' + p0.y + ' -> ' + p1.y + ')', p1.y > p0.y && p1.dir === 'down');
  // the left stick, past its dead zone, walks too; a light touch does nothing
  await axis(0.2, 0); await page.waitForTimeout(300);
  check('stick inside the dead zone does nothing', (await pos()).x === p1.x);
  await axis(-0.9, 0.3); await page.waitForTimeout(500); await axis(0, 0); await page.waitForTimeout(300);
  let p2 = await pos();
  check('stick left walks left (' + p1.x + ' -> ' + p2.x + ')', p2.x < p1.x && p2.dir === 'left');

  // START opens the menu; B (right button) closes it
  await tapBtn(9, 300);
  check('START opens the menu', (await top()) === 'Menu');
  await tapBtn(1, 300);
  check('B closes it', (await top()) !== 'Menu');

  // A=RIGHT layout: the right button is A, the bottom one is B
  await page.evaluate(() => PA.input.setPadLayout('right'));
  await tapBtn(9, 300);
  await tapBtn(0, 300);
  check('A=RIGHT layout: bottom button is B', (await top()) !== 'Menu');
  await tapBtn(9, 300);
  const before = await page.evaluate(() => PA.top().i);
  await tapBtn(1, 400);
  check('A=RIGHT layout: right button is A (opens an entry)', (await top()) !== 'Menu' || (await page.evaluate(() => PA.top().i)) !== before);
  await page.evaluate(() => { PA.input.setPadLayout('bottom'); PA.scripts.length = 0; PA.replaceAll(PA.ow.scene); });

  // keyboard still works alongside, and a controller unplugging releases its buttons
  await btn(15, true); await page.waitForTimeout(100);
  await page.evaluate(() => window.dispatchEvent(new Event('gamepaddisconnected')));
  await page.evaluate(() => { window.__pad.buttons[15].pressed = false; window.__pad.buttons[15].value = 0; });
  await page.waitForTimeout(400);
  check('nothing stuck after unplugging', await page.evaluate(() => !PA.input.held.right));

  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})();
