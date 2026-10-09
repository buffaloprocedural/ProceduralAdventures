Medieval character sprite sheets: 48x64 px, 16x16 frames, transparent background.
Rows: down, up, left, right. Columns: stand, step 1, step 2.
Frame index = row*3 + column (0-2 down, 3-5 up, 6-8 left, 9-11 right).
Walk loop per direction: stand, step 1, stand, step 2.
medieval_atlas.png is 240x256: 5 sheets across, 4 down, in this order:
01 King
02 Queen
03 Princess
04 Prince
05 Knight
06 Page
07 Archer
08 Monk
09 Nun
10 Blacksmith
11 Peasant
12 Villager
13 Jester
14 Bard
15 Alchemist
16 Herbalist
17 Merchant
18 Guard
19 Alewife
20 Falconer
Notes: characters in floor-length gowns, robes or capes walk with a hem sway instead of leg steps.
Held items (bow, spear, lute, falcon, hammer, tankards) stay put while walking; right-facing frames are mirrored except the jester, whose colours swap sides.
Use nearest-neighbor filtering when scaling.
