// Procedural Adventures - the creature roster: 12 types in four rings, 38 creatures (22 Divas, 16 Shy
// Ones), three attacks each. From docs/design/creature_roster_notes.txt. Sprites: src/gen/creatures.js
// (tools/build_creatures.py). These fill PA_DATA's species, moves and type chart; the rest of
// the game reads them from there, so it loads before src/game/creature.js.
'use strict';
(function (PA) {
  const D = window.PA_DATA;

  // ---------------------------------------------------------------- types
  // Inside a ring each type beats the next and loses to the one before it; against the other rings it is
  // neutral.
  const RINGS = {
    HEARTH: ['KINDLE', 'BLOOM', 'TIDE'],    // fire burns the garden, plants drink the water, water douses flame
    FORGE: ['CURRENT', 'CHROME', 'STONE'],  // charge shorts out metal, steel cuts rock, rock grounds charge
    WEATHER: ['FROST', 'BREEZE', 'LOAM'],   // cold stills the air, wind erodes the soil, earth buries the cold
    STAGE: ['GLAM', 'BLIGHT', 'HUSH'],      // sparkle scrubs grime, fumes seep into hiding spots, the quiet one upstages
  };
  const TYPES = [].concat(...Object.values(RINGS));
  const chart = {};
  for (const atk of TYPES) chart[atk] = TYPES.map(() => 1);
  for (const ring of Object.values(RINGS)) ring.forEach((t, i) => {
    chart[t][TYPES.indexOf(ring[(i + 1) % 3])] = 2;   // beats the next
    chart[t][TYPES.indexOf(ring[(i + 2) % 3])] = 0.5; // loses to the one before
  });
  PA.TYPE_COLOUR = {
    KINDLE: '#d04018', BLOOM: '#287830', TIDE: '#2860c0', CURRENT: '#b08800', CHROME: '#607080', STONE: '#806838',
    FROST: '#2890b0', BREEZE: '#5868b0', LOAM: '#987028', GLAM: '#c03880', BLIGHT: '#803898', HUSH: '#483868',
  };
  // status a type shrugs off (a burn can't hurt a KINDLE-type, and so on)
  PA.STATUS_IMMUNE = { BRN: 'KINDLE', FRZ: 'FROST', PSN: 'BLIGHT', PAR: 'STONE' };

  // ---------------------------------------------------------------- moves
  // [name, type, power, accuracy, pp, P(hysical)/S(pecial), effects]. The effects are read by
  // src/game/moves.js and src/game/battle.js. 'pow' raises (or lowers) ATTACK and SPECIAL together - the
  // creature's attacks, whichever kind they are.
  const M = (n, t, p, a, pp, c, x) => ({ n, t, p, a, pp, c, x: x || {} });
  const MOVES = [
    // KINDLE
    M('TAIL TORCH', 'KINDLE', 40, 100, 30, 'S', { sec: { status: 'BRN', p: 0.1 } }),
    M('HOT GOSSIP', 'KINDLE', 0, 80, 15, 'S', { inflict: 'CNF', say: ' whispered something scandalous!' }),
    M('CURTAIN OF SPARKS', 'KINDLE', 60, 90, 10, 'S', { afterSelf: [{ stat: 'pow', n: 1 }] }),
    M('TUFT FLARE', 'KINDLE', 40, 100, 30, 'S', { sec: { status: 'BRN', p: 0.1 } }),
    M('HAUGHTY SWIPE', 'KINDLE', 60, 100, 20, 'P', { highCrit: true }),
    M('SMOULDER STARE', 'KINDLE', 50, 100, 15, 'S', { secStat: { stat: 'def', n: -1, p: 1 } }),
    M('COAL POUNCE', 'KINDLE', 40, 100, 30, 'P'),
    M('TREELINE HIDE', 'KINDLE', 0, 100, 20, 'S', { self: [{ stat: 'eva', n: 1 }] }),
    M('ASH VEIL', 'KINDLE', 80, 100, 10, 'S', { charge: true, semiInv: true, chargeSay: ' vanished into its own smoke!' }),
    // FROST
    M('COLD SHOULDER', 'FROST', 40, 100, 30, 'P'),
    M('BRAIN FREEZE', 'FROST', 60, 100, 20, 'S', { sec: { status: 'CNF', p: 0.2 } }),
    M('BIG THUMBS UP', 'FROST', 0, 100, 15, 'S', { self: [{ stat: 'spd', n: 1 }], hesitate: true }),
    M('SNOWBLIND FLAP', 'FROST', 40, 100, 30, 'S', { secStat: { stat: 'acc', n: -1, p: 0.3 } }),
    M('MUFFLED HOOT', 'FROST', 60, 100, 20, 'S', { sec: { status: 'SLP', p: 0.1 } }),
    M('FEATHER DRIFT', 'FROST', 0, 100, 20, 'S', { self: [{ stat: 'eva', n: 1 }], say: ' hid in a flurry!' }),
    M('WHITEOUT POUNCE', 'FROST', 45, 100, 30, 'P'),
    M('ICICLE MANICURE', 'FROST', 65, 95, 20, 'P', { highCrit: true }),
    M('GLACIER GLARE', 'FROST', 50, 90, 10, 'S', { stun: true }),
    M('CRYSTAL CURL', 'FROST', 0, 100, 20, 'S', { self: [{ stat: 'def', n: 1 }] }),
    M('EIGHT-LEG SHUFFLE', 'FROST', 50, 100, 25, 'P'),
    M('DEEP FREEZE NAP', 'FROST', 0, 100, 10, 'S', { rest: true, say: ' went dormant!' }),
    // TIDE
    M('PAW PLUNGE', 'TIDE', 40, 100, 30, 'P'),
    M('CATCH OF THE DAY', 'TIDE', 65, 95, 20, 'P', { drain: 0.5, drainSay: ' had a snack!' }),
    M('WET LOOK', 'TIDE', 0, 100, 15, 'S', { self: [{ stat: 'pow', n: 2 }], say: ' soaked itself. It\'s a fashion choice.' }),
    M('DEEP SIGH', 'TIDE', 40, 100, 30, 'S', { secStat: { stat: 'pow', n: -1, p: 0.3 } }),
    M('PRESSURE POUT', 'TIDE', 60, 100, 20, 'S', { secStat: { stat: 'def', n: -1, p: 0.3 } }),
    M('SINK AWAY', 'TIDE', 0, 100, 10, 'S', { guard: ' sank out of reach!' }),
    M('BILL BOAST', 'TIDE', 40, 100, 30, 'P'),
    M('WAVE WINK', 'TIDE', 60, 100, 20, 'S', { sec: { status: 'CNF', p: 0.2 } }),
    M('RAINBOW BEAK', 'TIDE', 55, 100, 15, 'S', { secStat: { stat: 'acc', n: -1, p: 1 } }),
    M('EAR FLUTTER', 'TIDE', 40, 100, 30, 'S'),
    M('INK KISS', 'TIDE', 60, 95, 20, 'S', { secStat: { stat: 'acc', n: -1, p: 0.3 } }),
    M('RUNWAY GLIDE', 'TIDE', 40, 100, 20, 'S', { priority: 1, afterSelf: [{ stat: 'eva', n: 1 }] }),
    // BLOOM
    M('MIDNIGHT WADDLE', 'BLOOM', 40, 100, 30, 'P'),
    M('SPORE MUMBLE', 'BLOOM', 0, 75, 15, 'S', { inflict: 'SLP' }),
    M('MOSS CLOAK', 'BLOOM', 0, 100, 15, 'S', { self: [{ stat: 'def', n: 1 }, { stat: 'eva', n: 1 }], say: ' froze still and blended into the moss!' }),
    M('LEAF PIROUETTE', 'BLOOM', 40, 100, 30, 'S'),
    M('CANOPY LEAP', 'BLOOM', 65, 95, 20, 'P'),
    M('VERDANT VOGUE', 'BLOOM', 0, 100, 15, 'S', { self: [{ stat: 'spd', n: 1 }, { stat: 'pow', n: 1 }], say: ' struck a pose!' }),
    M('LEAF LEAP', 'BLOOM', 55, 100, 20, 'P'),
    M('PETAL SPIT', 'BLOOM', 40, 100, 30, 'S'),
    M('FLEECE FLUFF', 'BLOOM', 0, 100, 15, 'S', { screen: 'def' }),
    M('BLOOM SHOWER', 'BLOOM', 75, 95, 15, 'S', { drain: 0.5, drainSay: ' soaked up the applause!' }),
    M('LEAF PRICK', 'BLOOM', 40, 100, 30, 'P'),
    M('POTTED', 'BLOOM', 0, 100, 15, 'S', { self: [{ stat: 'def', n: 2 }], say: ' curled up into a rosette!' }),
    M('SPINE ROSETTE', 'BLOOM', 60, 100, 15, 'P', { thorns: true }),
    // LOAM
    M('DUST TRAIL', 'LOAM', 40, 100, 30, 'P', { secStat: { stat: 'acc', n: -1, p: 0.3 } }),
    M('GRIT KICK', 'LOAM', 65, 95, 20, 'P'),
    M('SHOW-OFF SPRINT', 'LOAM', 0, 100, 15, 'S', { self: [{ stat: 'spd', n: 2 }], say: ' ran a lap of honour!' }),
    M('DUNE POUNCE', 'LOAM', 40, 100, 30, 'P'),
    M('SAND BURROW', 'LOAM', 60, 100, 20, 'P'),
    M('FOOTPRINT FIB', 'LOAM', 0, 100, 10, 'S', { guard: ' left a trail of false footprints!' }),
    M('SENTRY KICK', 'LOAM', 40, 100, 30, 'P'),
    M('SPOTLIGHT POSE', 'LOAM', 0, 100, 15, 'S', { self: [{ stat: 'pow', n: 2 }], say: ' struck a pose on the highest rock!' }),
    M('DUST ENCORE', 'LOAM', 70, 100, 15, 'P', { firstBoost: 1.5 }),
    M('TALON TAP', 'LOAM', 40, 100, 30, 'P'),
    M('BURROW BOB', 'LOAM', 0, 100, 10, 'S', { guard: ' bobbed back down its burrow!' }),
    M('SANDBANK SNEAK', 'LOAM', 60, 100, 15, 'P', { priority: 1 }),
    // STONE
    M('GRUMBLE SLAM', 'STONE', 45, 100, 30, 'P'),
    M('PEBBLE HISS', 'STONE', 60, 100, 20, 'P', { flinch: 0.2 }),
    M('BOULDER SULK', 'STONE', 0, 100, 15, 'S', { self: [{ stat: 'def', n: 2 }], say: ' refused to budge!' }),
    M('CREST JAB', 'STONE', 40, 100, 30, 'P'),
    M('WINTER COAT', 'STONE', 0, 100, 15, 'S', { self: [{ stat: 'def', n: 1 }, { stat: 'eva', n: 1 }], say: ' changed into its winter coat!' }),
    M('GEODE GLEAM', 'STONE', 70, 95, 15, 'S', { highCrit: true, secStat: { stat: 'acc', n: -1, p: 0.3 } }),
    // CURRENT
    M('EAR BOLT', 'CURRENT', 40, 100, 30, 'S', { sec: { status: 'PAR', p: 0.1 } }),
    M('SKY POUNCE', 'CURRENT', 65, 95, 20, 'P'),
    M('VOLUME UP', 'CURRENT', 0, 100, 15, 'S', { self: [{ stat: 'pow', n: 2 }], say: ' turned its ears up to full!' }),
    M('BILL CLATTER', 'CURRENT', 40, 100, 30, 'P'),
    M('LIGHTNING STARE', 'CURRENT', 0, 90, 15, 'S', { inflict: 'PAR' }),
    M('STATUE STANCE', 'CURRENT', 110, 100, 10, 'S', { charge: true, chargeSay: ' stood perfectly still...' }),
    M('RIPPLE SHOCK', 'CURRENT', 40, 100, 30, 'S', { sec: { status: 'PAR', p: 0.1 } }),
    M('BURROW BUZZ', 'CURRENT', 60, 100, 20, 'S'),
    M('BILL SENSE', 'CURRENT', 0, 100, 10, 'S', { guard: ' read its opponent\'s heartbeat!' }),
    M('GILL ZAP', 'CURRENT', 40, 100, 30, 'S', { sec: { status: 'PAR', p: 0.1 } }),
    M('SMILE CHARGE', 'CURRENT', 0, 100, 15, 'S', { self: [{ stat: 'pow', n: 1 }, { stat: 'spd', n: 1 }], say: ' smiled so hard it crackled!' }),
    M('POND LIGHTS', 'CURRENT', 90, 90, 10, 'S', { sec: { status: 'PAR', p: 0.3 } }),
    // BREEZE
    M('STAMPEDE GUST', 'BREEZE', 45, 100, 30, 'P'),
    M('DUST-DEVIL STRUT', 'BREEZE', 60, 100, 20, 'P', { secStat: { stat: 'acc', n: -1, p: 0.3 } }),
    M('NOSE TRUMPET', 'BREEZE', 75, 95, 15, 'S', { flinch: 0.3 }),
    M('GUST NIP', 'BREEZE', 40, 100, 30, 'P'),
    M('RIBBON TWIRL', 'BREEZE', 55, 100, 20, 'S', { secStat: { stat: 'acc', n: -1, p: 0.3 } }),
    M('HIGH FLYER', 'BREEZE', 80, 95, 10, 'S', { charge: true, semiInv: true, chargeSay: ' rode the wind up out of reach!' }),
    M('SEED SCATTER', 'BREEZE', 18, 100, 20, 'S', { hits: [2, 5] }),
    M('DRIFT AWAY', 'BREEZE', 0, 100, 15, 'S', { self: [{ stat: 'eva', n: 2 }], say: ' drifted off on a dandelion clock!' }),
    M('SOFT LANDING', 'BREEZE', 0, 100, 10, 'S', { heal: 0.5, say: ' floated gently down and had a rest!' }),
    // CHROME
    M('RIVET SCRATCH', 'CHROME', 40, 100, 30, 'P'),
    M('CLANK SWIPE', 'CHROME', 60, 100, 20, 'P'),
    M('PLATE UP', 'CHROME', 0, 100, 15, 'S', { self: [{ stat: 'def', n: 2 }], say: ' retreated inside its plates!' }),
    M('SHINY PECK', 'CHROME', 40, 100, 30, 'P'),
    M('SPOON SWIPE', 'CHROME', 60, 100, 20, 'P', { highCrit: true }),
    M('FINDERS KEEPERS', 'CHROME', 0, 100, 10, 'S', { mirror: true, say: ' took a shine to its opponent\'s attack!' }),
    // HUSH
    M('MIDNIGHT WAIL', 'HUSH', 40, 100, 30, 'S', { flinch: 0.1 }),
    M('WIDE-EYE STARE', 'HUSH', 0, 100, 20, 'S', { foe: [{ stat: 'spd', n: -2 }] }),
    M('BRANCH DISGUISE', 'HUSH', 0, 100, 10, 'S', { guard: ' pretended to be a branch!' }),
    M('VELVET SWIPE', 'HUSH', 40, 100, 30, 'P'),
    M('DRAMATIC EXIT', 'HUSH', 60, 100, 20, 'S'),
    M('BLACK CAT CROSS', 'HUSH', 0, 100, 10, 'S', { temp: { who: 'foe', stat: 'acc', n: -2, t: 3 }, say: ' crossed its opponent\'s path!' }),
    // GLAM
    M('PRISM FLUTTER', 'GLAM', 40, 100, 30, 'S'),
    M('SUGAR RUSH', 'GLAM', 50, 100, 20, 'S', { afterSelf: [{ stat: 'spd', n: 1 }] }),
    M('RAINBOW RUNWAY', 'GLAM', 0, 100, 15, 'S', { self: [{ stat: 'eva', n: 1 }], foe: [{ stat: 'acc', n: -1 }], say: ' scattered light everywhere!' }),
    M('TINY TWINKLE', 'GLAM', 40, 100, 30, 'S'),
    M('STARLIGHT NAP', 'GLAM', 0, 100, 10, 'S', { heal: 0.5, say: ' took a little nap!' }),
    M('BLUSH GLOW', 'GLAM', 40, 100, 10, 'S', { desperate: true, secStat: { stat: 'acc', n: -1, p: 0.3 } }),
    M('PINK SHELL SHINE', 'GLAM', 40, 100, 30, 'S', { secStat: { stat: 'acc', n: -1, p: 0.2 } }),
    M('SPARKLE DIG', 'GLAM', 60, 100, 20, 'P'),
    M('ROLL CALL', 'GLAM', 0, 100, 10, 'S', { self: [{ stat: 'def', n: 1 }], taunt: 3, say: ' rolled into a glittering ball!' }),
    M('DEWDROP GLINT', 'GLAM', 40, 100, 30, 'S'),
    M('SEE-THROUGH', 'GLAM', 0, 100, 10, 'S', { self: [{ stat: 'eva', n: 2 }], say: ' turned nearly invisible!' }),
    // BLIGHT
    M('SLOW SQUEEZE', 'BLIGHT', 40, 100, 30, 'P', { secStat: { stat: 'spd', n: -1, p: 0.3 } }),
    M('BIG-EYE FREEZE', 'BLIGHT', 0, 100, 20, 'S', { foe: [{ stat: 'spd', n: -2 }] }),
    M('ELBOW VENOM', 'BLIGHT', 65, 100, 15, 'P', { priority: -1, sec: { status: 'PSN', p: 1 } }),
    M('BOA FLICK', 'BLIGHT', 40, 100, 30, 'S', { sec: { status: 'PSN', p: 0.2 } }),
    M('SCAVENGE', 'BLIGHT', 65, 95, 20, 'P', { drain: 0.5, drainSay: ' helped itself to a snack!' }),
    M('FASHIONABLY LATE', 'BLIGHT', 90, 100, 10, 'P', { priority: -1, sec: { status: 'PSN', p: 0.3 } }),
  ];

  // ---------------------------------------------------------------- creatures
  // [name, type, temperament, [hp, atk, def, spd, spc], [attack, attack, signature], height, weight, flavour]
  const C = [
    ['EMBERWREN', 'KINDLE', 'diva', [48, 62, 45, 78, 72], ['TAIL TORCH', 'HOT GOSSIP', 'CURTAIN OF SPARKS'], '0\' 6"', '1 lbs',
      'Fluffs its burning tail before every battle and won\'t fight until someone says it looks lovely.'],
    ['PYRACAL', 'KINDLE', 'diva', [55, 78, 50, 82, 65], ['TUFT FLARE', 'HAUGHTY SWIPE', 'SMOULDER STARE'], '2\' 0"', '30 lbs',
      'Its ear tufts burn hotter the more it\'s ignored. Wild PYRACAL have scorched their own reflections out of jealousy.'],
    ['FOSSIRE', 'KINDLE', 'shy', [50, 58, 55, 65, 80], ['COAL POUNCE', 'TREELINE HIDE', 'ASH VEIL'], '2\' 4"', '20 lbs',
      'Lights tiny campfires high in the canopy, then is too nervous to sit beside them.'],
    ['GULLET', 'FROST', 'diva', [65, 70, 65, 95, 80], ['COLD SHOULDER', 'BRAIN FREEZE', 'BIG THUMBS UP'], '2\' 3"', '19 lbs',
      'Combs its ice pompadour with a fish bone between rounds. Insists it was born cool, which is technically true.'],
    ['HOARFOWL', 'FROST', 'shy', [60, 50, 60, 70, 85], ['SNOWBLIND FLAP', 'MUFFLED HOOT', 'FEATHER DRIFT'], '2\' 0"', '5 lbs',
      'So quiet it startles itself. Melts into a snowbank whenever more than two people look its way.'],
    ['BLIZZPARD', 'FROST', 'diva', [70, 90, 60, 95, 75], ['WHITEOUT POUNCE', 'ICICLE MANICURE', 'GLACIER GLARE'], '3\' 7"', '99 lbs',
      'Won\'t step outside without a fresh snowfall. Each spot on its coat is said to be a frozen compliment.'],
    ['CROYGEL', 'FROST', 'shy', [80, 45, 95, 30, 75], ['CRYSTAL CURL', 'EIGHT-LEG SHUFFLE', 'DEEP FREEZE NAP'], '1\' 0"', '9 lbs',
      'Can survive almost anything except eye contact. Curls into a crystal ball when complimented and stays that way for days.'],
    ['RIPTABBY', 'TIDE', 'diva', [55, 72, 52, 78, 63], ['PAW PLUNGE', 'CATCH OF THE DAY', 'WET LOOK'], '2\' 7"', '26 lbs',
      'Fishes with one paw and poses with every catch. Refuses to battle on days its fur is frizzy.'],
    ['GLUMPH', 'TIDE', 'shy', [85, 45, 70, 35, 70], ['DEEP SIGH', 'PRESSURE POUT', 'SINK AWAY'], '1\' 0"', '21 lbs',
      'Looks perfectly fine at the bottom of the sea. Knows exactly what it looks like on land and would rather not discuss it.'],
    ['PUFFLUKE', 'TIDE', 'diva', [50, 58, 50, 80, 72], ['BILL BOAST', 'WAVE WINK', 'RAINBOW BEAK'], '1\' 0"', '1 lbs',
      'Repaints its beak every spring and won\'t leave the burrow until the stripes are perfect.'],
    ['YAMMERS', 'TIDE', 'diva', [60, 55, 60, 85, 85], ['EAR FLUTTER', 'INK KISS', 'RUNWAY GLIDE'], '0\' 8"', '13 lbs',
      'Glides through the deep like it\'s on a catwalk. Waves its ear-fins at anything that might be an audience, including rocks.'],
    ['MOSSAPO', 'BLOOM', 'shy', [70, 50, 75, 30, 80], ['MIDNIGHT WADDLE', 'SPORE MUMBLE', 'MOSS CLOAK'], '2\' 0"', '9 lbs',
      'Too round to fly and too shy to walk in daylight. Holds perfectly still when spotted and hopes the moss does the rest.'],
    ['MARGLEAF', 'BLOOM', 'diva', [52, 70, 48, 88, 62], ['LEAF PIROUETTE', 'CANOPY LEAP', 'VERDANT VOGUE'], '2\' 0"', '9 lbs',
      'Leaps between branches purely to be seen leaping. Grows a fresh leaf crown before every important battle.'],
    ['PETALPOCA', 'BLOOM', 'diva', [70, 62, 60, 65, 85], ['PETAL SPIT', 'FLEECE FLUFF', 'BLOOM SHOWER'], '3\' 11"', '120 lbs',
      'Its fleece is all petals, and it sheds a new colour every week. Hums when admired, which is all the time.'],
    ['MELEEFITE', 'BLOOM', 'shy', [75, 70, 90, 35, 55], ['LEAF PRICK', 'POTTED', 'SPINE ROSETTE'], '0\' 8"', '2 lbs',
      'Its spines are succulent leaves. Curls into a perfect rosette when startled and is usually potted by someone.'],
    ['DUSTDASH', 'LOAM', 'diva', [50, 70, 45, 100, 45], ['DUST TRAIL', 'GRIT KICK', 'SHOW-OFF SPRINT'], '1\' 8"', '1 lbs',
      'Runs circles around opponents for no tactical reason, then stops mid-battle to admire its own dust cloud.'],
    ['DUNEKIT', 'LOAM', 'shy', [48, 64, 50, 80, 60], ['DUNE POUNCE', 'SAND BURROW', 'FOOTPRINT FIB'], '1\' 8"', '7 lbs',
      'Never leaves real footprints, partly by instinct and partly so nobody can follow it home.'],
    ['SHOWMEER', 'LOAM', 'diva', [55, 75, 55, 90, 60], ['SENTRY KICK', 'SPOTLIGHT POSE', 'DUST ENCORE'], '1\' 0"', '2 lbs',
      'Stands sentry on every rock it can find, mostly so people can see it standing sentry. Wears the sunglasses at night.'],
    ['BURROWL', 'LOAM', 'shy', [60, 62, 65, 60, 72], ['TALON TAP', 'BURROW BOB', 'SANDBANK SNEAK'], '0\' 9"', '0 lbs',
      'Lives in a hole and peeks out at the world. Bobs its head at strangers, then drops out of sight, very fast.'],
    ['MONOCAT', 'STONE', 'diva', [85, 70, 95, 30, 55], ['GRUMBLE SLAM', 'PEBBLE HISS', 'BOULDER SULK'], '2\' 0"', '10 lbs',
      'Permanently unimpressed. Its sulks are so heavy they leave dents in the ground.'],
    ['GEMSTOAT', 'STONE', 'diva', [58, 82, 70, 88, 60], ['CREST JAB', 'WINTER COAT', 'GEODE GLEAM'], '1\' 0"', '1 lbs',
      'Grows a geode crest every winter and spends the spring pointing at it.'],
    ['SERVOLT', 'CURRENT', 'diva', [55, 75, 50, 90, 80], ['EAR BOLT', 'SKY POUNCE', 'VOLUME UP'], '2\' 0"', '29 lbs',
      'Its huge ears catch every whisper about it. It answers praise with sparks and criticism with bigger sparks.'],
    ['SHOEBOLT', 'CURRENT', 'shy', [70, 60, 70, 30, 95], ['BILL CLATTER', 'LIGHTNING STARE', 'STATUE STANCE'], '4\' 7"', '13 lbs',
      'Can stand motionless for hours to avoid being noticed. When it finally moves, it does so all at once, with lightning.'],
    ['PLATYPULSE', 'CURRENT', 'shy', [60, 55, 62, 62, 75], ['RIPPLE SHOCK', 'BURROW BUZZ', 'BILL SENSE'], '1\' 8"', '5 lbs',
      'Feels other creatures\' heartbeats through its bill, and gets so flustered by how many there are that it hides in the riverbank.'],
    ['VOLTALOTL', 'CURRENT', 'diva', [65, 60, 60, 80, 90], ['GILL ZAP', 'SMILE CHARGE', 'POND LIGHTS'], '0\' 10"', '1 lbs',
      'Its gill fronds crackle with current and it never stops smiling. Lights up the whole pond when it laughs.'],
    ['SUCCESSGOAT', 'BREEZE', 'diva', [70, 82, 60, 82, 55], ['STAMPEDE GUST', 'DUST-DEVIL STRUT', 'NOSE TRUMPET'], '2\' 7"', '88 lbs',
      'Considers its enormous nose its best feature and points it at anyone who\'ll look. Its trumpeting carries across three valleys.'],
    ['KITEFOX', 'BREEZE', 'diva', [55, 70, 52, 95, 75], ['GUST NIP', 'RIBBON TWIRL', 'HIGH FLYER'], '1\' 8"', '9 lbs',
      'Its ears catch the wind like kites. Ties ribbons to its own tail so everyone can see which way it went.'],
    ['DANDYGLIDE', 'BREEZE', 'shy', [52, 55, 55, 85, 78], ['SEED SCATTER', 'DRIFT AWAY', 'SOFT LANDING'], '0\' 6"', '0 lbs',
      'Drifts from tree to tree on dandelion clocks, which saves it from having to say goodbye.'],
    ['IRONPURR', 'CHROME', 'shy', [60, 65, 95, 50, 55], ['RIVET SCRATCH', 'CLANK SWIPE', 'PLATE UP'], '1\' 8"', '66 lbs',
      'Wears its own armour like a blanket fort and peeks through the gaps when it thinks nobody is watching.'],
    ['MAGPLATE', 'CHROME', 'diva', [60, 80, 75, 72, 62], ['SHINY PECK', 'SPOON SWIPE', 'FINDERS KEEPERS'], '1\' 6"', '3 lbs',
      'Its wings are plated steel and its nest is a museum of spoons. Says every shiny thing was a gift.'],
    ['POTOOM', 'HUSH', 'shy', [55, 45, 60, 50, 90], ['MIDNIGHT WAIL', 'WIDE-EYE STARE', 'BRANCH DISGUISE'], '1\' 4"', '1 lbs',
      'Spends the day pretending to be a tree stump. Its night-time wail is the loudest thing about it, which mortifies it too.'],
    ['HEXKIT', 'HUSH', 'diva', [55, 70, 52, 85, 82], ['VELVET SWIPE', 'DRAMATIC EXIT', 'BLACK CAT CROSS'], '1\' 4"', '9 lbs',
      'Makes an entrance even when leaving. Claims every bad thing that happens nearby, purely for the reputation.'],
    ['PRISMMER', 'GLAM', 'diva', [45, 50, 45, 105, 85], ['PRISM FLUTTER', 'SUGAR RUSH', 'RAINBOW RUNWAY'], '0\' 4"', '0 lbs',
      'Hovers wherever the light is best. Has been seen refusing nectar from flowers that clash with its wings.'],
    ['LUMIKIT', 'GLAM', 'shy', [50, 45, 50, 70, 90], ['TINY TWINKLE', 'STARLIGHT NAP', 'BLUSH GLOW'], '0\' 8"', '2 lbs',
      'Glows whenever it\'s embarrassed, which makes hiding impossible and embarrasses it even more.'],
    ['PINKADILLO', 'GLAM', 'diva', [55, 62, 75, 60, 70], ['PINK SHELL SHINE', 'SPARKLE DIG', 'ROLL CALL'], '0\' 4"', '0 lbs',
      'Polishes its pink shell with sand until it sparkles. Only digs back underground to make a dramatic re-entrance.'],
    ['GLASSPRITE', 'GLAM', 'shy', [50, 48, 50, 80, 82], ['DEWDROP GLINT', 'LEAF LEAP', 'SEE-THROUGH'], '0\' 1"', '0 lbs',
      'You can see its heart beating through its belly, which it finds deeply embarrassing. Spends most days under a leaf, hoping nobody looks up.'],
    ['LORISLURK', 'BLIGHT', 'shy', [62, 66, 64, 42, 72], ['SLOW SQUEEZE', 'BIG-EYE FREEZE', 'ELBOW VENOM'], '1\' 0"', '2 lbs',
      'Moves so slowly that nobody notices it, which is exactly the point. Hugging it is not recommended; the venom is in its elbows.'],
    ['COOLCARRION', 'BLIGHT', 'diva', [70, 78, 60, 62, 75], ['BOA FLICK', 'SCAVENGE', 'FASHIONABLY LATE'], '2\' 6"', '18 lbs',
      'A scavenger, but make it fashion. Never seen without its feather boa, even at dinner, especially at dinner.'],
  ];
  // the level each creature learns its signature attack at (its other two it knows from the start)
  PA.SIGNATURE_LV = 9;

  const moves = {};
  for (const m of MOVES) {
    if (moves[m.n]) throw new Error('roster: move ' + m.n + ' twice');
    moves[m.n] = m;
  }
  const species = C.map(([n, t, temper, s, mv, h, w, d]) => {
    for (const x of mv) if (!moves[x]) throw new Error('roster: ' + n + ' has no move ' + x);
    return { n, t: [t], temper, g: 'mfast', s, h, w, d, l: [[1, mv[0]], [1, mv[1]], [PA.SIGNATURE_LV, mv[2]]], sig: mv[2] };
  });
  D.types = TYPES;
  D.chart = chart;
  D.moves = moves;
  D.species = species;
  PA.isDiva = (id) => species[id - 1] && species[id - 1].temper === 'diva';
  PA.isShy = (id) => species[id - 1] && species[id - 1].temper === 'shy';
  // Saves remember the roster by name (src/main.js), so a creature keeps its identity when the roster changes.
  // The first roster, for saves made before that: 40 creatures, some since renamed or retired.
  PA.ROSTER_NAMES = species.map((s) => s.n);
  PA.ROSTER_V1 = ['EMBERWREN:KINDLE', 'PYRACAL:KINDLE', 'FOSSIRE:KINDLE', 'GULLET:FROST', 'HOARFOWL:FROST', 'BLIZZPARD:FROST', 'TARDIGEL:FROST',
    'RIPTABBY:TIDE', 'GLUMPH:TIDE', 'PUFFLUKE:TIDE', 'DUMBOPUS:TIDE', 'MOSSAPO:BLOOM', 'MARGLEAF:BLOOM', 'OKAPINE:BLOOM', 'DUSTDASH:LOAM',
    'DUNEKIT:LOAM', 'TENTAMOLE:LOAM', 'CASSOROCK:STONE', 'MANULITH:STONE', 'MOLEBRICK:STONE', 'THORNMOLOCH:STONE', 'SERVOLT:CURRENT',
    'SHOEBOLT:CURRENT', 'PUNCHRIMP:CURRENT', 'PLATYPULSE:CURRENT', 'LYREWIND:BREEZE', 'NIMBUSPARD:BREEZE', 'SAIGUST:BREEZE', 'IRONPURR:CHROME',
    'QUILLCLERK:CHROME', 'SCALANX:CHROME', 'POTOOM:HUSH', 'HEXKIT:HUSH', 'AYEGHAST:HUSH', 'PRISMMER:GLAM', 'LUMIKIT:GLAM', 'PINKADILLO:GLAM',
    'GLASSPRITE:GLAM', 'LORISLURK:BLIGHT', 'HOATOXIN:BLIGHT'];
  // How each creature likes to be befriended (docs/FRIENDSHIP_PLAN.md): its diet (seeds, pellets or treats), how it
  // feels about being petted (loves, fine, hates: a creature that hates it bites back) and its favourite approach
  // (COMPLIMENT, WAIT, PET, FEED or PLAY). Divas also like compliments and play; Shy Ones like being waited for.
  PA.CARE = {
    EMBERWREN: ['seeds', 'fine', 'COMPLIMENT'], PYRACAL: ['treats', 'fine', 'PLAY'], FOSSIRE: ['treats', 'loves', 'PET'],
    GULLET: ['treats', 'fine', 'FEED'], HOARFOWL: ['treats', 'fine', 'WAIT'], BLIZZPARD: ['treats', 'hates', 'COMPLIMENT'],
    CROYGEL: ['pellets', 'fine', 'WAIT'], RIPTABBY: ['treats', 'loves', 'PET'], GLUMPH: ['pellets', 'loves', 'FEED'],
    PUFFLUKE: ['pellets', 'fine', 'PLAY'], YAMMERS: ['pellets', 'loves', 'COMPLIMENT'], MOSSAPO: ['pellets', 'fine', 'WAIT'],
    MARGLEAF: ['treats', 'fine', 'COMPLIMENT'], PETALPOCA: ['pellets', 'loves', 'PET'], MELEEFITE: ['seeds', 'hates', 'FEED'],
    DUSTDASH: ['treats', 'fine', 'PLAY'], DUNEKIT: ['treats', 'loves', 'WAIT'], SHOWMEER: ['treats', 'fine', 'COMPLIMENT'],
    BURROWL: ['treats', 'fine', 'WAIT'], MONOCAT: ['treats', 'hates', 'FEED'], GEMSTOAT: ['treats', 'hates', 'PLAY'],
    SERVOLT: ['treats', 'hates', 'PLAY'], SHOEBOLT: ['pellets', 'hates', 'WAIT'], PLATYPULSE: ['pellets', 'hates', 'FEED'],
    VOLTALOTL: ['pellets', 'fine', 'COMPLIMENT'], SUCCESSGOAT: ['pellets', 'loves', 'COMPLIMENT'], KITEFOX: ['treats', 'loves', 'PLAY'],
    DANDYGLIDE: ['seeds', 'fine', 'WAIT'], IRONPURR: ['treats', 'fine', 'FEED'], MAGPLATE: ['seeds', 'fine', 'COMPLIMENT'],
    POTOOM: ['treats', 'fine', 'WAIT'], HEXKIT: ['treats', 'fine', 'PLAY'], PRISMMER: ['seeds', 'fine', 'COMPLIMENT'],
    LUMIKIT: ['treats', 'loves', 'PET'], PINKADILLO: ['pellets', 'loves', 'PLAY'], GLASSPRITE: ['pellets', 'fine', 'WAIT'],
    LORISLURK: ['treats', 'fine', 'FEED'], COOLCARRION: ['treats', 'hates', 'COMPLIMENT'],
  };
  PA.care = (id) => { const c = PA.CARE[PA.species(id).n] || ['treats', 'fine', 'PLAY']; return { diet: c[0], pet: c[1], fav: c[2] }; };
  PA.ROSTER_RENAMED = { TARDIGEL: 'CROYGEL', DUMBOPUS: 'YAMMERS', MANULITH: 'MONOCAT', SAIGUST: 'SUCCESSGOAT' };
  PA.sid = (name) => { const i = species.findIndex((s) => s.n === name); if (i < 0) throw new Error('roster: no creature ' + name); return i + 1; };
})(window.PA);
