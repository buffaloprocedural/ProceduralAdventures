// Procedural Adventures - GULLIVER, the cool seagull: the game's mascot.
// Art: art/mascot (src/gen/mascot.js). He starts every story at the head of your party (src/game/tales.js).
'use strict';
(function (PA) {
  const L = PA.Lines;

  // ---------------------------------------------------------------- the species: GULLET, a FROST-type Diva
  // (one of the roster's 40, src/game/roster.js). The wild never offers one - there is only one GULLIVER - so
  // the encounter pools and trainer teams in src/game/dungeon.js leave him out.
  PA.GULL_ID = PA.sid('GULLET');
  PA.isMascot = (id) => id === PA.GULL_ID;
  PA.SPR.gulliver = 'gulliver';
  PA.GULL_NAME = 'GULLIVER';

  // ---------------------------------------------------------------- his lines
  // Laconic, unbothered, ice-cold and warm-hearted. He knows he's the mascot. He doesn't make a thing of it.
  // (Joining is only for a game saved in the classic story before he led every party: src/game/quest.js.)
  L.GULL = {
    join: [
      'Outside the lab, a seagull in a bobble hat is waiting. It gives you a thumbs up. You are not sure where it got a thumb.',
      'GULLIVER: Heard you were starting an adventure. Thought you might want somebody cool on the team.\fNo pressure. ...I\'ll just be around. I\'m always around.',
    ],
    joined: '{PLAYER} and GULLIVER are now friends. Officially.',
  };

  // ---------------------------------------------------------------- scripts
  PA.gullJoin = function* () {
    if (PA.flag('gullJoined')) return;
    PA.setFlag('gullJoined');
    const n = PA.ow.spawnNear({ key: 'gullJoin', x: 0, y: 0, dir: 'down', spr: PA.SPR.gulliver, move: 'still', temp: true });
    if (n) { PA.ow.faceNPCToPlayer(n); PA.ow.facePlayerTo(n); }
    for (const l of L.GULL.join) yield* PA.say(l);
    if (n) { PA.audio.sfx('pop'); PA.ow.npcs.splice(PA.ow.npcs.indexOf(n), 1); } // off he flies, to wait in the wings
    const lv = Math.max(6, ...PA.state.party.map((m) => m.level));
    const g = new PA.Mon(PA.GULL_ID, lv, { ot: 'GULLIVER', nick: 'GULLIVER', goodDV: true });
    PA.dexSee(PA.GULL_ID); PA.state.caught[PA.GULL_ID] = true;
    PA.audio.cry(PA.GULL_ID);
    if (PA.state.party.length < 6) PA.state.party.unshift(g); else PA.state.box.push(g);
    yield* PA.say('GULLIVER joined {PLAYER}\'s party!' + (PA.state.party.includes(g) ? '' : ' (He\'s waiting at the LODGINGS. He says that\'s cool.)'));
    yield* PA.say(L.GULL.joined);
    PA.ow.addJournal('GULLIVER joined the party. He insists it was his idea.');
  };
})(window.PA);
