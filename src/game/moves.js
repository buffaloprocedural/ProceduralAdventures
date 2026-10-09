// Procedural Adventures - move data: the roster's attacks (src/game/roster.js) and their battle effects
'use strict';
(function (PA) {
  const D = window.PA_DATA;
  // physical or special is the move's own (roster.js marks each one P or S), not its type's
  PA.isSpecial = (d) => !!d.special;

  const cache = {};
  // Effects, as src/game/battle.js reads them (all optional):
  //   sec {status, p}       chance to inflict a status on a hit (BRN FRZ PAR PSN SLP, or CNF)
  //   secStat {stat, n, p}  chance to change the target's stat stage on a hit
  //   flinch p              chance the target flinches (only if the user moved first)
  //   self / foe [{stat,n}] stat stages a status move changes ('pow' = ATTACK and SPECIAL together)
  //   afterSelf [{stat,n}]  the user's stages after a damaging hit lands
  //   inflict               a status move's status
  //   drain, highCrit, hits [a,b], priority, heal, rest, sure, mirror
  //   charge (+ semiInv: out of reach; chargeGuard: blocks an attack) - a two-turn move
  //   guard text            blocks or dodges the next attack aimed at the user
  //   stun                  the target can't act on its next turn
  //   hesitate              the target flinches if the user moved first
  //   mark n                the user's next n hits on the target land for extra damage
  //   sureNext              the user's next attack can't miss
  //   retreat               flee a wild battle; otherwise slip away (+2 evasion)
  //   firstBoost x          power x if the user moved first
  //   thorns                anything that hits the user with a physical attack takes 1/8 of its HP
  //   desperate             power grows as the user's HP falls (40 at full, 120 near 0)
  //   temp {who, stat, n, t}  a stage change that wears off after t turns
  //   taunt t               the target can only attack for t turns
  //   say, chargeSay, afterSay, drainSay: the move's own line
  function derive(m) {
    const e = Object.assign({ name: m.n, type: m.t, power: m.p, acc: m.a, pp: m.pp, special: m.c === 'S' }, m.x || {});
    for (const k of ['self', 'foe', 'afterSelf']) if (e[k] && !Array.isArray(e[k])) e[k] = [e[k]];
    e.anim = animFor(m.n, m.t, e);
    return e;
  }
  function animFor(n, t, e) {
    if (e.power === 0) {
      if (e.inflict === 'PAR') return 'zapStatus';
      if (e.inflict) return 'powder';
      if (e.foe || e.temp && e.temp.who === 'foe' || e.mark || e.taunt) return 'down';
      return 'self';
    }
    if (/SWIPE|SCRATCH|MANICURE|SHRUG|FLOURISH/.test(n)) return 'slash';
    if (/POUNCE|STOMP|SLAM|KICK|CHARGE|SNAP|ROLL|PLUNGE|SHUFFLE|WADDLE|TOSS|POSE|SPIN|DIG|LEAP|SQUEEZE|SHOULDER/.test(n)) return 'hit';
    if (/CATCH|LASH/.test(n)) return 'bite';
    if (/QUILL|SPINE|TALON|ELBOW|BILL|TAP|CLATTER/.test(n)) return 'stab';
    if (/WAIL|HOOT|SQUAWK|SERENADE|TRUMPET|SIGH/.test(n)) return 'sound';
    return {
      KINDLE: 'fire', TIDE: 'water', BLOOM: 'leaf', FROST: 'ice', CURRENT: 'zap', STONE: 'rock', LOAM: 'rock', CHROME: 'slash',
      BREEZE: 'wind', GLAM: 'psy', HUSH: 'psy', BLIGHT: 'poison',
    }[t] || 'hit';
  }
  PA.moveData = function (name) {
    if (cache[name]) return cache[name];
    const m = D.moves[name] || (name === 'FLOUNDER' ? { n: 'FLOUNDER', t: '???', p: 50, a: 100, pp: 1, c: 'P', x: { recoil: 0.5 } } : { n: name, t: '???', p: 40, a: 100, pp: 10, c: 'P' });
    return (cache[name] = derive(m));
  };
  PA.allMoves = Object.keys(D.moves);
})(window.PA);
