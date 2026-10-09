# Battle effects

Original pixel art for the attack animations, drawn with vectors (`tools/fx_designs.py`, rasterised by
`tools/fx_rig.py`) and built into the game by `python3 tools/build_fx.py`.

Each effect is a 16x16 tile (with an 8x8 copy for when it is drawn small) in four shades that the battle tints
with the attack's palette. `options/` has five options of each (`python3 tools/build_fx.py --options`), the
16x16 version on top and the 8x8 one under it; `effects.png` shows the ones in the game.

**Chosen (October 2026)** — `PICKS` in `tools/build_fx.py`:

| Effect | Used for | Pick | Why |
|---|---|---|---|
| impact | hits, powders, power-ups, anything else | 1, eight-point burst | the clearest hit flash, reads at both sizes |
| note | sound attacks | 1, eighth note | unmistakably a note |
| fang | bites (flipped for the lower jaw) | 1, two fangs from a gum | reads as a jaw closing |
| gust | wind (4 frames) | 4, whirl | turns visibly from frame to frame |
| spike | stabs | 1, horn | a clean point that flies across |
| zzz | sleep | 3, shaded italic Z | the most legible Z |
| bolt | shocks, paralysis | 1, zigzag bolt | the classic shape, white core |
| spark | shocks (second tile) | 1, cross sparkle | pairs with the bolt |
| leaf | leaf attacks | 1, almond leaf | lit, with a midrib |
| slash | slashes (2 tiles) | 3, blade arc | the strongest edge on a light background |
| drop | water, beams | 4, orb | works as a droplet and as a beam bead |
| rock | rock attacks | 1, faceted boulder | weighty, lit from the top left |
| flame | fire (3 frames) | 1, teardrop flame | flickers well, hot white core |
| ice | ice attacks | 2, crystal shard | crisp facets |
| bubble | poison and other ailments (3 frames) | 1, bubble that pops | the animation tells the story |
| swirl | confusion | 1, spiral | dizzy at a glance |
| heart | befriending: hearts rise and fill the meter | 1, plump heart | bold and cheerful at both sizes |
| food | FEED (3 tiles: seed, pellet, treat) | 1, chunky | the three foods are told apart at a glance |
| hand | PET | 1, open palm | reads as a hand reaching out |
| anger | a creature that hates being petted | 4, exclamation burst | alarming in a single frame |
