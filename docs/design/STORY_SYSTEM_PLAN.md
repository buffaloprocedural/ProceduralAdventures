# Story system overhaul — plan

Status: **built** (October 2026) — `src/game/tales.js` and the four decks in `src/game/tales/`. Starting point:
the Society's ideas in `story_ideas.txt`. See "As built" at the end for how the plan landed.

## The idea

Every new game rolls one option from each of four decks — **structure × setting × genre × cold open** — from
the seed, so the same seed always tells the same story. Those choices drive what the world generator builds,
who lives there, what they say, and what the player is trying to do. This replaces today's single storyline
(professor → starter → errand → villain).

**Rules for every story**
- **Opening: 20 seconds at most.** At most four text boxes or a short scene, then the player has control. No
  speeches. Choosing the protagonist (boy/girl, name) stays, as one quick screen.
- **Tell it through action.** After the opening, the goal sits in the journal ("Get 6 signatures") and the story
  moves forward through places, battles, and people the player meets. Each beat is a line or two, not a speech.
- **Three acts, still.** Act I: the problem appears. Act II: it gets complicated. Act III: resolution. Each act
  card is a one-line title, and the day-to-dusk palette shift stays.
- **Combinations must make sense.** Each option carries tags (needs a dungeon, needs water, modern/historic,
  serious/silly), and incompatible pairs are rerolled — for example, *1970s startup* can't go with *the king's
  dungeon*, unless the pairing is deliberately absurd.

## The decks

### Story structures (the Society's 3 + 10 new)
- A mysterious hero comes to town.
- The hero (protagonist) must leave town on important business.
- Dungeon crawl: something important awaits below the town!
- A rival has stolen something, and the trail leads three towns over.
- The hero must deliver a message before sundown.
- An election: win over every town before the vote.
- A tournament: beat the champion of each town.
- Escort duty: someone important must get home safely.
- A storm is coming, and the town must be ready in time.
- The hero is new in town and must find their place.
- A mystery: someone in town is not who they say they are.
- Homecoming: the hero returns after years away, and everything has changed.
- A race: reach the summit before the rival does.

### Settings (the Society's 7 + 10 new)
- Regency
- Medieval
- Waterfront Town
- 1990s Grad School
- 1970s Silicon Valley startup
- Whoops, all forest!
- The king's dungeon
- Victorian seaside resort
- Wild West frontier town
- 1980s shopping mall
- Space station hydroponics bay
- Roman provincial town
- Snowbound mountain village
- Travelling circus
- Sleepy suburban cul-de-sac
- Floating sky islands
- Underground mole kingdom

### Genres (the Society's 5 + 10 new)
- Romance
- Drama
- Slice of life
- Educational information about solar system
- Video game history
- Mystery
- Comedy of manners
- Heist
- Sports story
- Gentle ghost story
- Coming of age
- Cooking contest
- Mockumentary (a narrator who interviews the townsfolk)
- Educational: rocks, minerals and how mountains form
- Educational: life in the ocean

### Cold opens / premises (the Society's 5 + 10 new)
- The protagonist is about to fight the world's strongest creature with the weakest possible team. They inevitably lose, setting the plot in motion.
- Beach contest
- You need to collect all the signatures for your grad school assignment
- The court jester is sick
- The computer genius needs a rare ore from the mines
- The town's prize creature has vanished on the morning of the fair.
- Your best friend's wedding is tomorrow, and the ring is missing.
- You wake up in the wrong house, in the wrong town, wearing someone else's hat.
- The mayor declares a holiday, then immediately loses the town's only key.
- A meteor lands in the cabbage patch.
- The lighthouse goes dark on the night of the regatta.
- Your thesis advisor has gone missing, and so has your thesis.
- The arcade's high score has been beaten by someone nobody has ever met.
- A royal portrait must be painted, and the subject keeps running away.
- The last ferry leaves at sunset, and you have six errands to run first.

## How each deck plugs into the game

| Deck | What it controls | Built on |
| --- | --- | --- |
| Structure | the goal and how the three acts unfold: where the player must go and what ends each act | today's acts, journal, triggers and dungeon generator — generalised into "beats" (go to X, beat Y, collect N of Z, find W, deliver to V) |
| Setting | town/route/dungeon mix, which NPC sheets populate it, place names, building signs, music mood, palette | worldgen + `dress.js` + NPC rosters (regency, medieval and seaside sheets exist; the rest need art or reskins) |
| Genre | the voice of the dialogue pools, the episode title, what NPCs chat about (the educational genres put real facts into townsfolk lines and signs) | `text.js` pools, keyed by genre instead of one Austen voice |
| Cold open | the first 20 seconds and the concrete goal ("collect 6 signatures", "find the ore") | `openings.js` (already does short in-the-middle starts), simplified to ≤4 boxes |

A story is described as data, so new options are mostly writing, not code:
`{ id, deck, tags, needs, opening: [≤4 lines], goal, beats: [act1, act2, act3], lines: {…} }`.

## Build order (for when usage resets)

1. **Beat engine.** Generalise the quest/acts code into data-driven beats (go, fight, collect, find, deliver,
   escort) and a short-opening player; port today's Regency story onto it so nothing is lost.
2. **Decks and compatibility.** The four decks as data files, seeded rolls, tag rules for rerolls, the episode
   title from the combination, a `?story=` override for testing.
3. **Write the content.** Each option's opening, goal, beats and dialogue — the Society's 20 first, then the 40
   above. Settings that need new art (Wild West, space station, mall…) can use stand-in sheets until art
   arrives; the art list grows accordingly.
4. **Tests.** The story bot plays a sample of combinations end to end; a check that no opening runs longer than
   four boxes / 20 seconds; worldgen invariants per setting.

## Decisions (the Society, October 2026)

- **Odd combinations are allowed but uncommon.** Incompatible picks are rerolled most of the time. When an odd
  pair does come through (a 1970s startup in the king's dungeon), the game says so: a line in the opening,
  the episode title and a few NPCs remark on the silliness. Odd combinations are tagged so this text knows
  what is odd about them.
- **GULLIVER is in every story**, even if only as the smallest cameo (a seagull in a bobble hat on a rooftop, a
  line in the credits). His bigger parts (follower, party member, key NPC, the player) keep their odds.
- **Creature battles in most stories, not all.** Each structure/genre says whether battles are central,
  optional or absent. Stories without them resolve through other actions: finding, delivering, talking,
  collecting. Aim for battles in roughly 70–80% of rolled stories.
- Everything else in this plan is agreed.

## As built (October 2026)

- **The decks are data**: `src/game/tales/structures.js`, `settings.js`, `genres.js`, `premises.js` (the cold opens).
  Every option above is in, with its lines. Adding a card is writing, not code.
- **One set of bones** (`src/game/tales.js`): the cold open (cards dealt on screen, a quick name — and a partner
  creature when there are battles — then at most four boxes: two from the cold open with its scene between them,
  one from the structure, one if the hand is odd); **Act I** (someone in the second town points the way); **Act II**
  (collect 3–5 tokens from people around the county: talking, a question, a favour — they lost something on a nearby
  road — a creature to befriend or battle, or a battle; halfway, the structure's twist); the keeper at the gate wants
  the tokens; **Act III** at dusk (whoever waits at the end of the cave or wood, then the goal); finale back home and
  credits that list the cards. The structure dresses the bones (what the tokens are, how they're handed over, the
  twist, the foe); the cold open sets the client, the goal and the ending; the setting names everything and supplies
  the people; the genre supplies the chatter, a host in every town, the act and episode titles and the questions.
- **Dealing**: one deck leads (usually the setting or the cold open), dealt straight; the setting is chosen to suit
  it and the rest to suit the setting. Cards carry `needs`/`avoid` tags; misfits go back in the deck 93% of the time.
  A structure that can't tell a cold open (a theft needs something that can be stolen) is always redealt. Measured
  over 5,000 seeds: classic story 11.5%, battles in 77% of dealt stories, odd hands 10%.
- **Odd hands** own up: a cold-open line ("(Yes: a sick court jester, in a 1980s shopping mall. Nobody here finds that
  odd...)"), "(Somehow)" on the episode title, a townsperson who remarks on it, and "AN ODD HAND!" on the deal screen.
- **No battles**: no trainers, no wild encounters; battle tokens become questions, creatures are befriended, and the
  climax is two questions. The tournament structure and the weakest-team cold open always have battles.
- **GULLIVER** keeps his parts (player, follower, party member, client, messenger, narrator); otherwise he has a cameo
  in the second or third town, and a credits line either way. Without battles, his party part becomes following.
- **The classic story** (the professor, the rival, the villain, its six openings) is dealt about one game in eight,
  and always for `?story=classic`, `?opening=...`, and saves made before the decks existed.
- **Overrides**: `?story=structure.setting.genre.premise` (any part `*`), `?structure=`/`?setting=`/`?genre=`/
  `?premise=`, `?battles=0|1`. A save remembers its hand, so CONTINUE deals the same story.
- **Tests**: `tests/worldgen_test.js` checks every dealt story has its parts, no fighting without battles, short cold
  opens, the deal statistics, and that every card is dealt; `tests/story.js SEED --story=...` plays a hand to the
  credits.

**Still to come**: settings without their own art use stand-in NPC sheets and the shared tileset (a mall that looks
like a village, for now); the educational genres would love more facts; more structures could vary the bones
themselves (an escort that fails if you leave the VIP, a race with a real clock).
