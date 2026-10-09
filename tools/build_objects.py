#!/usr/bin/env python3
"""
Overworld objects and emote bubbles: art/objects/objects_and_emotes.png -> the 'chars' sheet in src/gen/assets.js

The sheet is 48x32, cells of 16x16:
  top row      ball (items on the ground, the lab's starters, the throw in battle), paper letter, jump shadow
  bottom row   emote bubbles: smile, '!', '?'
The game draws these in four shades and tints them with a palette (the ball red, and so on), so the sheet's
colours are ranked from lightest to darkest into those four shades (at most four distinct colours; transparent
stays transparent). They are written into the 160x32 sheet at the slots the game reads (PA.MISC / PA.SPR in
src/game/maps.js): row 0 frames 1, 8, 9 and row 1 frames 1, 2, 3. The other slots are blank.

Original pixel art made for Procedural Adventures, drawn by The Buffalo, New York Procedural Amusements Coding Society (October 2026).
usage: python3 tools/build_objects.py
"""
import os, io, json, base64
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'objects', 'objects_and_emotes.png')
ASSETS = os.path.join(ROOT, 'src', 'gen', 'assets.js')
SLOTS = [(0, 1), (0, 8), (0, 9), (1, 1), (1, 2), (1, 3)]  # (row, frame) for each cell, in sheet order
SHADES = [248, 176, 96, 24]  # what src/engine/gfx.js decodes as shades 0..3

im = np.array(Image.open(SRC).convert('RGBA'))
if im.shape[:2] != (32, 48):
    raise SystemExit('objects_and_emotes.png should be 48x32, got %dx%d' % (im.shape[1], im.shape[0]))
opaque = im[..., 3] >= 128
lum = (im[..., :3].astype(int) * [299, 587, 114]).sum(-1) // 1000
levels = sorted(set(lum[opaque].tolist()), reverse=True)
if len(levels) > 4:
    raise SystemExit('use at most four colours (they become the four shades the game tints); found %d' % len(levels))
# spread fewer than four colours across the range, lightest to darkest
pick = {1: [0], 2: [0, 3], 3: [0, 2, 3], 4: [0, 1, 2, 3]}[len(levels)] if levels else []
shade_of = {v: SHADES[pick[i]] for i, v in enumerate(levels)}

sheet = np.zeros((32, 160, 4), np.uint8)
for k, (row, frame) in enumerate(SLOTS):
    cy, cx = (k // 3) * 16, (k % 3) * 16
    for y in range(16):
        for x in range(16):
            if opaque[cy + y, cx + x]:
                g = shade_of[int(lum[cy + y, cx + x])]
                sheet[row * 16 + y, frame * 16 + x] = (g, g, g, 255)

buf = io.BytesIO()
Image.fromarray(sheet, 'RGBA').save(buf, 'PNG', optimize=True)
s = open(ASSETS, encoding='utf-8').read()
head, rest = s.split('window.PA_ASSETS = ', 1)
A = json.loads(rest.rstrip().rstrip(';'))
A['chars'] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
A['charRows'] = 2
open(ASSETS, 'w', encoding='utf-8').write(head + 'window.PA_ASSETS = ' + json.dumps(A, separators=(',', ':'), ensure_ascii=False) + ';\n')
print('wrote the objects and emotes into', ASSETS, '-', len(levels), 'colours ->', [shade_of[v] for v in levels])
