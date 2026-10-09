Bitmap8 - original 8-bit font
Sheet: 128x56 px, 8x8 cells, 16 per row.
ASCII 32-126 at cell index (code - 32): row = index // 16, column = index % 16.
Extras from code 128 on the bottom row: cursor right, arrow down, cursor left, arrow up, heart, star, note, ellipsis, times, degree.
Glyphs are 5x7 drawn 1 px in from the cell's left edge; descenders use the 8th row.

Files
- bitmap_font_dark.svg / bitmap_font_light.svg: vector sheets. Each glyph is a group with id "glyph-<code>".
- bitmap_font_dark.png / bitmap_font_light.png: raster sheets.
- bitmap_font_dark.fnt / bitmap_font_light.fnt: BMFont (XML) descriptors; each points to its matching PNG.
- bitmap_font.json: per-glyph cell, glyph bounds and proportional advance width (line height 10, baseline 7).
- bitmap_font_preview.png: sample dialog box and full character set.
Light (white) versions are meant for tinting in-engine; dark uses the game's outline colour #22282B.
