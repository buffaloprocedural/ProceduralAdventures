Sprite sheets: 48x64 px, 16x16 frames, transparent background.
Rows: down, up, left, right. Columns: stand, step 1, step 2.
Frame index = row*3 + column (0-2 down, 3-5 up, 6-8 left, 9-11 right).
Walk loop per direction: stand, step 1, stand, step 2.
Atlas: all_characters_atlas.png is 240x192, 5 sheets across, 3 down, in this order:
01 Rival
02 Scout
03 Twin buns
04 Professor
05 Knight
06 Wizard
07 Hiker
10 Medic
11 Angler
12 Chef
13 Pirate
15 Kid
16 Grandma
17 Bookworm
20 Mechanic
Use nearest-neighbor filtering when scaling.
