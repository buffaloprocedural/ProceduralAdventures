Regency character sprite sheets: 48x64 px, 16x16 frames, transparent background.
Rows: down, up, left, right. Columns: stand, step 1, step 2.
Frame index = row*3 + column (0-2 down, 3-5 up, 6-8 left, 9-11 right).
Walk loop per direction: stand, step 1, stand, step 2.
regency_atlas.png is 240x256: 5 sheets across, 4 down, in this order:
01 Mother
02 Sister
03 Lady
04 Mrs Bennet
05 Gentleman
06 Old man A
07 Old man B
08 Debutante
09 Sir William
10 Miss Mary
11 Col. Forster
12 Woman
13 Prejudice boss
14 Grunt (m)
15 Grunt (f)
16 Parson
17 Butler
18 Farmer
19 Milkmaid
20 Redcoat
Notes: characters in floor-length gowns, robes or capes walk with a hem sway instead of leg steps.
The milkmaid's pails swing (one lifts per step), and her yoke uses the full 16 px frame width.
Use nearest-neighbor filtering when scaling.
