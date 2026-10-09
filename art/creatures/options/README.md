# Creature art options

**Chosen (October 2026)** — now in `art/creatures/` (see `PICKS` in `tools/build_creature_options.py`):
EMBERWREN 4, PYRACAL 5, FOSSIRE 1, BLIZZPARD 5, CROYGEL (was TARDIGEL) 4, PUFFLUKE 3, YAMMERS (was DUMBOPUS) 5,
MOSSAPO 4 with a plain smile, MARGLEAF 3, DUSTDASH 4, DUNEKIT 3, MONOCAT (was MANULITH) 5, SHOEBOLT 4, PLATYPULSE 2,
SUCCESSGOAT (was SAIGUST) 2, GLASSPRITE 3. Retired: OKAPINE, TENTAMOLE, CASSOROCK, MOLEBRICK, THORNMOLOCH, PUNCHRIMP,
LYREWIND, NIMBUSPARD, QUILLCLERK, SCALANX, AYEGHAST, HOATOXIN. New ideas for their places: `art/creatures/ideas/`.

Five options for each of the 28 creatures still drawn as placeholder shapes. Each file is a drop-in battle set
in the game's layout (80x32: front 32x32, back 32x32, two 16x16 party-icon frames), pixel art stored as SVG.

**To use one:** copy it to `art/creatures/<name>.svg` (e.g. `options/okapine/okapine_3.svg` → `art/creatures/okapine.svg`)
and run `python3 tools/build_creatures.py`. Or just tell Claude the numbers you like ("Okapine 3, Pyracal 1…").
Mixing is fine too ("Blizzpard 2, but with option 4's scarf").

They were drawn with vectors — shapes in `tools/creature_designs/*.py`, rasterised to pixel art by
`tools/creature_rig.py` (three-tone shading, dark outline, hand-placed faces) — so any option can be adjusted
and regenerated: `python3 tools/build_creature_options.py NAME --sheet preview.png`.

| Creature | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| EMBERWREN | classic brown wren | chubby chick | ember red, charcoal wings | puffed chest, fanned triple flame | peach diva, pink flame crest |
| PYRACAL | tawny, glaring | bright orange, tail up | dark mask | pale gold, smiling | russet, big eyes |
| FOSSIRE | red-brown, shy | dark, with its campfire | chestnut, small ears | darkest, campfire, shy | sandy, ember-tipped tail |
| BLIZZPARD | snow-white, rosettes | blue-white, icicle tiara | cream, haughty | blue, with a scarf | lavender, spotted, wide-eyed |
| TARDIGEL | ice blue | mint | lilac, crystal ridges | curled into a crystal ball | snow-capped white |
| PUFFLUKE | classic puffin | rainbow beak, violet | navy, teal beak | grey and chubby | punk crest |
| DUMBOPUS | pink | lavender | coral | deep blue, glowing spots | cream and gold, with a bow |
| MOSSAPO | classic mossy green | lime, with flowers | dusky, sleepy (night) | mushroom on its head | fern sprouting |
| OKAPINE | classic | fern-sprout horns | chestnut, leaf garland | hiding in ferns | blue tongue out |
| MARGLEAF | golden, three-leaf crown | green fur, five leaves | orange, spotted | rosettes, four leaves | gold, crown with a flower |
| DUSTDASH | classic roadrunner | sandy | dusky, red eye, sparkles | mid-sprint | russet crest |
| DUNEKIT | pale sand, shy | striped | cream, red scarf | darker, striped | golden, wide-eyed |
| TENTAMOLE | dark brown, pink star | slate grey | cream (albino) | popping out of a tunnel | with a flower |
| CASSOROCK | classic black, stone casque | gold crown with a gem | granite and teal | chick (striped) | royal purple, cape |
| MANULITH | grey, grumpy | dark, on its rock | pale, half-asleep | slate, pebble on its head | sandy, on its rock |
| MOLEBRICK | rock skirt | pebble hat and scarf | holding one pebble | brick armour | gem-studded evening wear |
| THORNMOLOCH | classic sandy | red | pale gold | rolled into a thornball | sipping dew |
| SHOEBOLT | slate | storm blue, lightning mark | silver | dark, glowing eyes | crested |
| PUNCHRIMP | classic green/red | peacock blue | pink and gold | champion's belt | neon purple |
| PLATYPULSE | classic | electric yellow | dark, glowing blue bill | in its riverbank | golden bill |
| LYREWIND | bronze | blue, wind ribbons | lavender | gold costume | mid-song |
| NIMBUSPARD | tan, cloud spots | blue-grey, on a cloud | sandy | slate, on a cloud | pale, wide-eyed |
| SAIGUST | summer tan | winter white | dusty brown | trumpeting | with a bow |
| QUILLCLERK | classic secretary bird | steel blue | white, bow tie | spectacles and pen | navy and silver |
| SCALANX | bronze | steel blue | gold | rolled into a ball | rust red, riveted |
| AYEGHAST | dark, amber eyes | ghostly lavender | black, green eyes | peeking round a tree | dusk blue, glowing |
| GLASSPRITE | lime | mint | pale, see-through | under its leaf | on a dewdrop |
| HOATOXIN | classic | magenta mohawk | dark purple fumes | on its compost heap | chick with wing claws |
