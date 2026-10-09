// Screenshots of every UI screen, from a quickly-built mid-game state.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots_ui');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForFunction(() => window.PA && window.PA.booted);
  let n = 0;
  const shot = async (name, wait = 250) => { await page.waitForTimeout(wait); await page.locator('#screen').screenshot({ path: path.join(OUT, String(++n).padStart(2, '0') + '_' + name + '.png') }); };
  const press = async (k, w = 80) => { await page.keyboard.down(k); await page.waitForTimeout(40); await page.keyboard.up(k); await page.waitForTimeout(w); };
  const clear = async () => { for (let i = 0; i < 80; i++) { const busy = await page.evaluate(() => PA.scriptBusy() || PA.scenes.length > 1 && !(PA.scenes.length === 2 && PA.scenes[1] instanceof PA.Banner)); if (!busy) return; await press('x', 40); await press('z', 40); } };
  await page.evaluate(() => {
    PA.audio.muted = true;
    PA.state = PA.newState('MERYTON');
    PA.genAndInstall('MERYTON');
    PA.state.name = 'ELIZA'; PA.state.rival = 'DARCY'; PA.state.femme = true;
    PA.vars = Object.assign({}, PA.world.vars, { PLAYER: 'ELIZA', RIVAL: 'DARCY' });
    for (const [n, lv] of [['EMBERWREN', 18], ['SERVOLT', 15], ['MARGLEAF', 17], ['IRONPURR', 14], ['LUMIKIT', 12], ['PLATYPULSE', 13]]) { const id = PA.sid(n); const m = new PA.Mon(id, lv); PA.state.party.push(m); PA.dexCatch(id); }
    PA.state.party[1].hp = 9; PA.state.party[2].status = 'PSN'; PA.state.party[3].hp = 0;
    for (const n of ['EMBERWREN', 'CROYGEL', 'PUFFLUKE', 'MONOCAT', 'YAMMERS', 'HEXKIT', 'GLASSPRITE']) PA.dexSee(PA.sid(n));
    Object.assign(PA.state.bag, { TONIC: 4, 'SMELLING SALTS': 2, 'STRONG TONIC': 1, ANTIDOTE: 2, 'MOONSTONE BROOCH': 1, 'WORLD MAP': 1, 'ALMANAC': 1, INVITATION: 1 });
    PA.state.flags = { act1: true, starter: true, rival1: true, dex: true, quest: true, townMap: true, coldOpen: true, labIntro: true };
    PA.state.journal = ['A new day in LONGBOURN. PROF. BENNET wants to see me.', 'MISS JANE needs the LACE BONNET.', 'Head through ROUTE 2 to MERYTON.'];
    PA.state.visited = { 0: 1, 1: 1, 2: 1 };
    PA.state.time = 60 * 60 * 17;
    PA.replaceAll(PA.ow.scene);
    const d = PA.world.doors['home:playerHouse'];
    PA.ow.enterMap('overworld', d.x, d.y + 2, 'down');
  });
  await shot('overworld_girl', 600);
  await press('Enter'); await shot('start_menu');
  await press('ArrowDown'); await press('z'); await shot('party');
  await press('z'); await shot('party_submenu'); await press('z'); await shot('stats1'); await press('z'); await shot('stats2'); await press('z');
  await press('x'); await press('x', 200);
  await page.evaluate(() => PA.ow.mapId); await clear();
  await press('Enter'); await press('ArrowDown'); await press('ArrowDown'); await press('z'); await shot('bag');
  await press('x'); await clear();
  await press('Enter'); await press('ArrowDown'); await press('ArrowDown'); await press('ArrowDown'); await press('z'); await shot('diary'); await press('z'); await clear();
  await press('Enter'); await press('z'); await shot('almanac'); await press('z'); await shot('dex_entry'); await press('z'); await press('x'); await clear();
  await press('Enter'); for (let i = 0; i < 4; i++) await press('ArrowDown'); await press('z'); await shot('trainer_card'); await press('z'); await clear();
  await page.evaluate(() => PA.script(PA.menus.worldMap())); await shot('world_map', 400); await press('ArrowUp'); await shot('world_map2'); await press('z'); await clear();
  await page.evaluate(() => PA.script(PA.scenesApi.actCard(1))); await shot('act1_card', 1800); await press('z'); await page.waitForTimeout(800); await clear();
  await page.evaluate(() => PA.script(PA.scenesApi.actCard(2))); await shot('act2_card', 1800); await press('z'); await page.waitForTimeout(800); await clear();
  await page.evaluate(() => PA.script(PA.scenesApi.actCard(3))); await shot('act3_card', 1800); await press('z'); await page.waitForTimeout(800); await clear();
  await shot('overworld_dusk', 300);
  await page.evaluate(() => PA.script(PA.scenesApi.caption('LATER, AT LONGBOURN...'))); await shot('caption', 600); await clear();
  // trainer battle
  await page.evaluate(() => PA.script(PA.ow.trainerBattle({ cls: 'GENTLEMAN', name: 'MR. HURST', team: [[PA.sid('IRONPURR'), 15], [PA.sid('SUCCESSGOAT'), 16]], prize: 300, spr: PA.SPR.gentleman, pal: 'cNavy', lose: 'I am all astonishment!' })));
  await shot('trainer_intro', 700);
  for (let i = 0; i < 6; i++) await press('z', 200);
  await shot('trainer_sendout', 500);
  for (let i = 0; i < 6; i++) await press('z', 250);
  await shot('battle_menu', 300);
  await press('z'); await shot('move_menu');
  await press('z', 300); await shot('attack_anim', 450); await shot('attack_anim2', 300);
  await clear();
  // evolution
  await page.evaluate(() => PA.script(PA.scenesApi.dexEntry(PA.sid('BLIZZPARD')))); await shot('dex_entry_new', 400); await press('z'); await clear();
  // level stats
  await page.evaluate(() => { const m = PA.state.party[1]; PA.script(PA.scenesApi.levelStats(m, { atk: m.atk - 3, def: m.def - 2, spd: m.spd - 4, spc: m.spc - 2 })); });
  await shot('level_stats'); await press('z'); await clear();
  // shop
  await page.evaluate(() => PA.script(PA.ow.shop(['TONIC', 'ANTIDOTE', 'LINIMENT', 'HACKNEY TOKEN']))); await shot('shop', 600); await press('z', 300); await press('z', 300); await shot('shop_buy', 300); await press('x'); await press('x'); await clear();
  // naming
  await page.evaluate(() => PA.script(PA.scenesApi.naming('Nickname?', 'SPARKY', 10, 25))); await shot('naming', 300); await press('Enter'); await clear();
  // credits
  await page.evaluate(() => PA.script(PA.scenesApi.credits())); await shot('credits', 2500);
  await page.keyboard.down('z'); await page.waitForTimeout(6000); await shot('credits_mid', 10); await page.waitForTimeout(9000); await page.keyboard.up('z'); await shot('credits_late', 300);
  // title with save present
  await page.evaluate(() => { PA.saveGame(); PA.replaceAll(new PA.Title()); });
  await shot('title2', 800);
  await press('Enter'); await shot('title_menu', 400);
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'NO ERRORS');
  await browser.close();
})();
