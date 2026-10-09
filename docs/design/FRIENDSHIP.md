# Friendship — how creatures join you (design)

A design note from The Buffalo, New York Procedural Amusements Coding Society.

The design of befriending, as built in `src/game/battle.js` (`befriend`), `src/game/roster.js` (`PA.CARE`) and
checked by `tests/friendship.js`. It replaced capture items in October 2026. The "Everything that changes" list is the
record of that change.

## The idea (the Society's rules)

1. **There are no capture items.** A wild creature joins you because it *chooses* to be your friend.
2. **Each creature can only be friends with one human.** A creature that already has a person (every trainer's
   and NPC's creature, the rival's, yours) can never be befriended by anyone else.
3. **Befriending only works before fighting.** You may try to befriend a wild creature as long as you haven't
   hurt it. Once you do any damage to it in that encounter, friendship is off the table for that encounter.
4. **Items lying in the field are tied parcels** (the Society liked this), not balls.

(The request said "defending a wild creature before fighting it"; this plan reads it as **befriending**.)

## Defaults for the open questions (the Society can override any of them)

| # | Question | Default |
|---|---|---|
| F1 | What counts as hurting it? | Any of **your** moves that *targets it and lands*: damage, an ailment (sleep, poison…), or lowering its stats. Your own self‑boosts, heals and screens don't count. Nor does damage it brings on itself: its own recoil, or thorns or spikes it runs into while *it* attacks *you* (including when it retaliates for a pet). |
| F2 | How does befriending work, turn by turn? | **Five approaches and a hearts meter** (below): COMPLIMENT, WAIT QUIETLY, PET, FEED, PLAY. It builds on the Diva and Shy temperaments plus a small care table per creature, and keeps the suspense the ball shakes used to give. |
| F3 | What happens if it goes badly? | A disliked approach may make it **leave** (the battle ends). Shy Ones leave more easily. |
| F4 | EXP for making a friend? | Yes: the same EXP as defeating it, shared the same way, so the peaceful path is never the weaker one. |
| F5 | Special creatures (the dungeon's freed creature, the climactic beast, legendaries)? | They need **5 hearts** instead of 3, and **never leave**: they "step out to meet you". |
| F6 | Should the almanac remember what a species likes? | Yes. The first time a species *loves* an approach, the almanac notes it ("Likes: compliments"). |
| F7 | Team icons in the battle panels? | Small **hearts**: full = healthy, amber = ailing, hollow grey = fainted, faint outline = empty slot. |
| F8 | "Spoken‑for" wild creatures (a lost companion of some NPC's, to be returned rather than befriended)? | **Not now.** It's a good later quest type, and rule 2 makes it natural. |
| F9 | Is food something you carry? | **No.** FEED asks *what* you offer (SEEDS, PELLETS or TREATS), from an endless supply, so there's no item to buy or run out of. Offering the right one is the puzzle. Food could become shop items later. |
| F10 | How hard does a creature that hates being petted hit back? | It **retaliates at once** with a full attack on your lead, *before* its normal turn, which still follows. So PET on a creature that hates it costs a turn and two hits. The almanac then remembers ("Doesn't like being petted"), so you only learn it once per species. |

## How it plays

**The battle commands** (with the battle-screen redesign **L1** of the release plan):
ATTACK · BEFRIEND · TEAM · BAG · LEAVE.
- BEFRIEND appears only in **wild** battles.
- If you choose it in a trainer battle (or if it's shown greyed there), the game says:
  "{NAME}'s {MON} already has its person."

**Choosing BEFRIEND** opens a list of five approaches, in the same window style as the attack list:

| Approach | Line (examples) | Flavour animation |
|---|---|---|
| COMPLIMENT | "{PLAYER} admires {MON}'s marvellous {feature}." | sparkles drift from you to it |
| WAIT QUIETLY | "{PLAYER} sits down and waits, very still." | a "…" speech bubble over the hero |
| PET | "{PLAYER} reaches out, slowly, to give {MON} a pat." | a little hand and hearts, or an anger bubble and a lunge |
| FEED | a second list: SEEDS / PELLETS / TREATS. "{PLAYER} offers a handful of seeds." | the food scatters in front of it, and it nibbles (or sniffs and turns away) |
| PLAY | "{LEAD} does a little hop. An invitation!" | your lead hops twice |

**What each creature likes** comes from three things:
1. **Temperament.**
   - **Divas** like COMPLIMENT and PLAY, and find WAIT QUIETLY dull: "{MON} yawns pointedly."
   - **Shy Ones** like WAIT QUIETLY, and find COMPLIMENT and PLAY too much: "{MON} hides its face."
2. **The care table** (below), one row per creature:
   - its **diet**: seeds, pellets or treats;
   - how it feels about being **petted**: *loves*, *fine* or *hates*;
   - its one **favourite** approach.
3. **The rules for PET and FEED:**
   - **PET**: *loves* counts as the favourite, *fine* counts as liked, and *hates* means it retaliates (F10).
   - **FEED**: the right food counts as liked, or as the favourite if FEED is its favourite. The wrong food does
     nothing: "{MON} sniffs the pellets and turns up its nose." It's never disliked, just not interesting.

**The rapport meter** is a row of hearts by its status panel: 3 hearts to fill, or 5 for special creatures.

| You chose | Chance it responds | If it does | If it doesn't |
|---|---|---|---|
| its favourite (or PET when it *loves* that) | `p + 0.25` | +2 hearts ("{MON} loves that!"); the almanac learns its favourite | "It isn't sure yet." (no change) |
| an approach it likes (temperament, PET when *fine*, the right food) | `p` | +1 heart ("{MON} seems to like that.") | "It isn't sure yet." |
| the wrong food | — | — | no change ("…turns up its nose."); the almanac doesn't learn anything |
| an approach it dislikes (temperament) | — | — | −1 heart ("{MON} looks away.") and a 30% chance it leaves (50% for a Shy One); special creatures never leave |
| PET when it *hates* being petted | — | — | it **retaliates** with an immediate attack on your lead (F10), −1 heart; the almanac learns it. It doesn't leave: it's cross, not scared |

Here `p = clamp(base × levelFactor × knownFactor + temperBonus, 0.08, 0.92)`:
- `base = friendRate(id) / 255`, where `friendRate` is today's `PA.catchRate` renamed: 45‑255 from base stats,
  so sturdier creatures are harder to win over;
- `levelFactor = clamp(1 + 0.05 × (yourLeadLevel − itsLevel), 0.6, 1.3)`;
- `knownFactor = 1.2` if you've befriended this species before (otherwise 1);
- `temperBonus = +0.08` if your lead has the same temperament as it.

**The almanac learns as you go:** its favourite approach, its diet and how it feels about petting, each the first
time you find out. These go in `state.likes[id] = { fav, diet, pet }`. Its page shows what you know so far:
- "Likes: being complimented"
- "Eats: seeds"
- "Doesn't like being petted"

### The care table (suggested; the Society can change any cell)

| Creature | Temperament | Diet | Petting | Favourite |
|---|---|---|---|---|
| EMBERWREN | diva | seeds | fine | COMPLIMENT |
| PYRACAL | diva | treats | fine | PLAY |
| FOSSIRE | shy | treats | loves | PET |
| GULLET (mascot; joins by story) | diva | treats (chips, he insists) | fine | FEED |
| HOARFOWL | shy | treats | fine | WAIT QUIETLY |
| BLIZZPARD | diva | treats | **hates** | COMPLIMENT |
| CROYGEL | shy | pellets | fine | WAIT QUIETLY |
| RIPTABBY | diva | treats | loves | PET |
| GLUMPH | shy | pellets | loves | FEED |
| PUFFLUKE | diva | pellets | fine | PLAY |
| YAMMERS | diva | pellets | loves | COMPLIMENT |
| MOSSAPO | shy | pellets | fine | WAIT QUIETLY |
| MARGLEAF | diva | treats | fine | COMPLIMENT |
| PETALPOCA | diva | pellets | loves | PET |
| MELEEFITE | shy | seeds | **hates** (spines) | FEED |
| DUSTDASH | diva | treats | fine | PLAY |
| DUNEKIT | shy | treats | loves | WAIT QUIETLY |
| SHOWMEER | diva | treats | fine | COMPLIMENT |
| BURROWL | shy | treats | fine | WAIT QUIETLY |
| MONOCAT | diva | treats | **hates** (famously) | FEED |
| GEMSTOAT | diva | treats | **hates** (bitey) | PLAY |
| SERVOLT | diva | treats | **hates** (static shock!) | PLAY |
| SHOEBOLT | shy | pellets | **hates** (it just stares) | WAIT QUIETLY |
| PLATYPULSE | shy | pellets | **hates** (the spur) | FEED |
| VOLTALOTL | diva | pellets | fine | COMPLIMENT |
| SUCCESSGOAT | diva | pellets | loves | COMPLIMENT |
| KITEFOX | diva | treats | loves | PLAY |
| DANDYGLIDE | shy | seeds | fine | WAIT QUIETLY |
| IRONPURR | shy | treats | fine | FEED |
| MAGPLATE | diva | seeds | fine | COMPLIMENT (shiny things) |
| POTOOM | shy | treats | fine | WAIT QUIETLY |
| HEXKIT | diva | treats | fine | PLAY |
| PRISMMER | diva | seeds | fine | COMPLIMENT |
| LUMIKIT | shy | treats | loves | PET |
| PINKADILLO | diva | pellets | loves | PLAY |
| GLASSPRITE | shy | pellets | fine | WAIT QUIETLY |
| LORISLURK | shy | treats | fine | FEED |
| COOLCARRION | diva | treats | **hates** | COMPLIMENT |

That's 8 that hate being petted, 10 that love it and 20 that are fine. Diets: 5 seeds, 12 pellets and 21 treats.
Every approach is some creature's favourite. It lives in `src/game/roster.js` as `PA.CARE = { NAME: [diet, pet,
favourite] }`, next to the creature table. A test checks every creature has a row.

**Each try takes your turn,** then it acts as normal: it may attack your lead. That is the cost and the tension of
befriending. If your lead faints, you send out another and may keep trying.

**When the hearts are full:**
1. Hearts rise.
2. It hops toward you.
3. A friendship jingle plays.
4. "{MON} wants to be {PLAYER}'s friend!"
5. A new species gets its almanac entry.
6. The nickname prompt appears (kept).
7. It joins the team, or the LODGING HOUSE if the team is full (see **N4** in the release plan).
8. The EXP from **F4** is awarded.

**Hurting it** (F1) ends befriending for this encounter:
- the BEFRIEND command greys out;
- the hearts disappear;
- the game says, once: "{MON} won't trust you now. Not today, anyway."

You can still win the fight (it then wanders off, as it does now) or LEAVE.

## Everything that changes

### Battle (`src/game/battle.js`)
- **B1** Track befriending on the wild side:
  - `E.v.hurt` is set in `damage()` when the attacker is the player's side, in the status‑inflicting path, and
    where stat drops are applied to E by P;
  - `E.v.hearts` (0..3 or 0..5) and `E.v.need`.

  Reset all three when a new wild creature enters (there's only ever one).
- **B2** Command menu: add BEFRIEND (see L1). `chooseAction` returns `{ type: 'befriend', approach }`. Hide it, or
  answer with the line above, in trainer battles. Grey it out when `E.v.hurt`.
- **B3** New `*befriend(approach, food)` in place of `*throwBall` (lines 357‑410), using the tables above and
  `PA.CARE`, and returning
  `'befriended'` or `'left'` (it leaves) or `'used'`. Reuse the join tail of `throwBall`: almanac, nickname,
  team or lodging, `this.caught = m`, `stats.caught++`.
- **B4** Remove `useItem`'s `'ball'` branch (339‑346), `u.ball` and its drawing (lines 92‑93), and the "already
  caught" ball mark (line 117). Replace the mark with a tiny heart beside the name when you have befriended that
  species.
- **B5** The turn loop (around line 200): handle `'befriended'` like today's `'caught'` (end the battle, with the
  result `'befriended'`). Handle `'left'` like a successful run: "{MON} wandered off."
- **B6** `drawBalls()` → `drawTeamHearts()` (F7). Draw a hearts meter by the foe's panel while befriending is
  possible and `hearts > 0`.
- **B7** EXP on befriending (F4): call the existing EXP‑award routine used on a win.
- **B8** `PA.testCatchAlways` → `PA.testFriendAlways`: the next approach always fills all the hearts. Used by the
  tests.
- **B9** Retaliation (F10). On PET with `pet === 'hates'`:
  1. show an anger bubble on it;
  2. it lunges;
  3. run one attack from it on your lead *immediately*, reusing the normal enemy‑move path (`enemyMove()` and the
     move executor, with its usual accuracy and damage);
  4. then the regular turn continues, so it acts again.

  None of this sets `E.v.hurt` (F1).
- **B10** The approach menu: reuse the `MoveMenu` layout, with five rows and a small info window that shows what
  the almanac already knows ("Likes: …", "Eats: …"). FEED opens a three‑row second list; B backs out without
  using the turn.

### Items, shops and loot
- **I1** Delete BALL, FINE BALL and GRAND BALL (`creature.js`) and PREMIER BALL (`menus.js:286‑289`,
  with the shop's "buy 10" bonus line).
- **I2** Remove the `'ball'` kind:
  - `menus.js:137` (bag sort), `:139` (battle filter) and `:248` ("nothing to throw it at");
  - `battle.js:312` (the item menu).
- **I3** Stocks and loot, replacing each ball with a useful item:
  - `quest.js`:
    - 457‑458 (shop stocks);
    - 509 (`FINE BALL` gift → `SUPER POTION`/`TONIC`);
    - 524 and 721 (loot);
    - 842 (`GRAND BALL` → `SUGARED ALMOND`);
    - 857.
  - `tales.js` 567, 676, 792 and 889 (`s.bag.BALL = 5` goes).
  - `openings.js`: drop `balls:` (38, 66, 111, 128) and line 171. Rewrite the bridge lines 62 and 92 ("handed
    over an ALMANAC and some BALLS" → "an ALMANAC and a few words of advice").
- **I4** Save migration in `src/main.js`: remove any `*BALL` bag entries and refund half their price as money,
  silently.

### Parcels in the field (the Society's pick)
- **P1** Draw a **tied parcel** (brown paper, string, a bow), 16×16, in four shades. Either draw it with the
  vector rig (a small `tools/object_designs.py` reusing `tools/fx_rig.py` at `n=16`) or have the Society draw it.
  It goes into the `ball` slot of `art/objects/objects_and_emotes.png` (row 0, frame 1); rebuild with
  `tools/build_objects.py`.
- **P2** Rename `PA.MISC.ball` → `PA.MISC.parcel` (`maps.js:36`). Update the uses:
  - `overworld.js:390` (items on the ground), drawn with a brown palette instead of `'cRed'`;
  - `quest.js:230` (the starters; see S1).
- **P3** Picking one up says "{PLAYER} untied the parcel. Inside: a {ITEM}!" (find the item‑pickup line in
  `overworld.js`).

### Starters and story
- **S1** The lab: no balls on the counter (`quest.js:228‑310`, `rooms.js:80`). The three starter creatures sit
  on cushions as NPC‑like figures drawn with their party icons. The professor says:
  - "Three of my young friends are looking for their person. Go and say hello."

  Talking to one shows its almanac page, then "Be friends with {MON}?". The rival's choice line becomes "Oh! This
  one likes ME!" instead of taking the counter type, if the story allows.
- **S2** Rule 2 in words: one line in the professor's intro and one almanac tip.
  - "A creature only ever has one person. Choose kindly, and be kind."
- **S3** The road‑blocker (`quest.js:632‑641`): after the music, MONOCAT is "merely cross". Befriending it
  (without fighting) or beating it both clear the road. Today's text already allows either.
- **S4** Every `res === 'caught'` check becomes `'befriended'`:
  - `overworld.js:673`;
  - `quest.js:641, 764`;
  - `tales.js:423` (the token creature: "tucked the {TOKEN} into {PLAYER}'s hand, very solemnly"), `741`, `824`.

  Also `PA.questAfterCatch` → `PA.questAfterFriend`, and the type‑quest line "Catch one, and we shall all go home"
  (`quest.js:768`) → "Make friends with one".
- **S5** The dungeon's freed type creature (`quest.js:762`) and the beast (`tales.js:740`, `824`) are special
  (F5): 5 hearts, never leave. The beast scene ("It wants a fair fight") stays a fight unless you befriend it
  first, which earns a new line: "The {BEAST} has never had a friend before."

### Words
- **W1** Tips, `text.js`:
  - 77 "Weaken a wild creature before throwing a ball" → "A creature you've hurt won't trust you. Make friends
    first, or battle. Not both."
  - 118‑120 rewritten without BALL.
- **W2** `mascot.js:48` "I'll just be in a BALL" → "I'll just be around. I'm always around."; `:92` comment.
- **W3** Almanac (`scenes.js:338`): "Catch it to learn more" → "Befriend one to learn more". Show "LIKES: …" once
  learned (F6, `state.likes[id]`). List counts (`menus.js:343‑344`): SEEN → SPOTTED, OWN → FRIENDS.
- **W4** The end‑credits stats (`scenes.js:412`): "CREATURES CAUGHT" → "FRIENDS MADE". The trainer card
  (`menus.js:401`): "ALMANAC/n" → "FRIENDS/n".
- **W5** Everywhere else, "catch/caught" in player‑facing text becomes "befriend/made friends". Find them with
  `git grep -n -i -E "catch|caught" -- src ':!src/gen'`. Keep "caught up" and "caught me" (not capture).
- **W6** Internal names may stay: `state.caught`, `PA.dexCatch` and `stats.caught` are saved data, so renaming
  needs a migration for no visible gain. Do rename the battle result string (S4) and the test hook (B8).

### Audio (`src/engine/audio.js`)
- **AU1** Rename the `caught` jingle to `friend` and recompose it warmer (a rising major sixth, then a held tonic).
- **AU2** Add an sfx `heart` (a soft two‑note chime) for each heart gained, and reuse `status` for "looks away".
  Remove `throw`, `shake` and `click` if nothing else uses them.

### Graphics
- **G1** Add effects to `tools/fx_designs.py`, five options each as before, then pick:
  - a `heart` (option 3 of *note* is already a good one), in the heart palette, for the rising hearts and the
    hearts meter;
  - a `food` effect with three frames, *seed*, *pellet* and *treat* (a little biscuit), scattered in front of the
    creature when you FEED, in a new warm palette;
  - a `hand` for PET (a small open palm).

  The anger bubble can be a new emote in `art/objects/` (the Society's sheet has room), or drawn as an effect.
- **G2** The team‑heart icons (B6) and the "befriended" mark (B4) are a few pixels each, drawn in code like the
  window kit.
- **G3** The parcel (P1).

### Tests
- **TS1** `tests/story.js` (lines 72‑80 and 202‑255): the type‑quest driver picks BEFRIEND (then any approach)
  instead of ITEM → BALL, with `PA.testFriendAlways = true`.
- **TS2** `tests/features.js:45`: check the ITEM step uses a heal item, not a ball.
- **TS3** `tests/ui_tour.js:31` (the bag contents) and `tests/press_shots.js`: no balls in the test bags.
- **TS4** New `tests/friendship.js` (one browser page, about 60 lines) checks:
  1. a forced success puts the creature on the team, in the almanac, with EXP awarded;
  2. after one damaging hit, BEFRIEND is greyed and refuses;
  3. a status move that lands also closes it, and a self‑buff does not;
  4. a trainer battle refuses;
  5. a disliked approach can make a non‑special creature leave, and a special one never leaves;
  5b. PET on a creature that hates it makes it attack your lead at once, and befriending stays open;
  5c. the wrong food changes nothing, and the right food can add a heart;
  5d. every creature has a `PA.CARE` row;
  6. a full team sends it to the lodging house;
  7. saving and continuing keeps it;
  8. the type quest's goal flag is set by befriending.

## Implementation order (inside phase 4 of the release plan, one session)

1. **Items and words first** (I1‑I4, W1‑W5, S4 strings) in one scripted pass. Check: syntax + smoke.
2. **Battle mechanics** (B1‑B10, and `PA.CARE` in `roster.js`) in one edit. Check: syntax + smoke + a quick headless battle that
   befriends (part of `tests/friendship.js`).
3. **Parcels, lab, story** (P1‑P3, S1‑S3, S5). Check: syntax + smoke.
4. **Audio and graphics** (AU1‑AU2, G1‑G3), then rebuild with `tools/build_fx.py` and `tools/build_objects.py`.
5. Run `tests/friendship.js` once. The full suite runs once in phase 8 of the release plan.

**If the battle screen redesign (L1) is skipped,** the command menu needs five slots: use a 2×3 grid of buttons
(ATTACK, BEFRIEND / TEAM, BAG / —, LEAVE) until L1 lands.
