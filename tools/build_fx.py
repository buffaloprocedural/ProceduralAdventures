#!/usr/bin/env python3
"""
Battle-effect tiles: vector designs (tools/fx_designs.py, drawn by tools/fx_rig.py) -> the 'fx' sheet in
src/gen/assets.js, plus 'fxTiles' (each effect's first tile index) for src/game/battle.js.

The sheet has two rows: every tile at 16x16 (y 0-15, tile i at x 16i), which the game draws when an effect is
shown at double size, and the same tile at 8x8 (y 16-23, x 8i) for effects drawn small.

  python3 tools/build_fx.py              write the picked option of every effect into the game,
                                         and art/fx/effects.png (the picks in colour, 4x)
  python3 tools/build_fx.py --options    draw all five options of every effect to art/fx/options/

The tiles are in four shades (white-ish, light, mid, dark) that the game tints with an effect palette.
Original pixel art made for Procedural Adventures (October 2026).
"""
import base64
import io
import json
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx_rig import draw, colourise, EMPTY  # noqa: E402
from fx_designs import EFFECTS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'src', 'gen', 'assets.js')
ART = os.path.join(ROOT, 'art', 'fx')
SHADES = [248, 176, 96, 24]  # what src/engine/gfx.js decodes as shades 0..3

# the option chosen for each effect (1-5); see art/fx/README.md
PICKS = {
    'impact': 1, 'note': 1, 'fang': 1, 'gust': 4, 'spike': 1, 'zzz': 3, 'bolt': 1, 'spark': 1,
    'leaf': 1, 'slash': 3, 'drop': 4, 'rock': 1, 'flame': 1, 'ice': 2, 'bubble': 1, 'swirl': 1,
    'heart': 1, 'food': 1, 'hand': 1, 'anger': 4,
}

# the effect palettes of src/game/battle.js (FXPAL), for the previews
FXPAL = {
    'fire': [[255, 255, 240], [248, 200, 64], [224, 80, 32], [64, 16, 8]], 'water': [[240, 248, 255], [128, 192, 248], [48, 104, 200], [16, 32, 72]],
    'ice': [[248, 255, 255], [168, 232, 248], [72, 160, 208], [16, 48, 80]], 'zap': [[255, 255, 230], [248, 232, 64], [200, 144, 16], [48, 32, 8]],
    'leaf': [[240, 255, 230], [136, 208, 96], [56, 128, 56], [16, 40, 16]], 'psy': [[255, 240, 255], [224, 144, 232], [152, 64, 176], [40, 16, 56]],
    'rock': [[248, 240, 224], [200, 168, 128], [128, 96, 64], [40, 24, 16]], 'poison': [[248, 240, 255], [184, 136, 216], [104, 56, 144], [32, 16, 48]],
    'normal': [[255, 255, 255], [200, 200, 208], [96, 96, 112], [16, 16, 24]], 'heart': [[255, 255, 255], [248, 160, 192], [216, 64, 112], [64, 16, 32]],
    'food': [[255, 250, 236], [240, 200, 132], [176, 112, 56], [56, 32, 16]],
}
BATTLE_BG = (248, 246, 236)


def frames(fn, n, size=16):
    return [draw(fn, f, n=size) for f in range(n)]


def up(rgba, k):
    return np.array(Image.fromarray(rgba, 'RGBA').resize((rgba.shape[1] * k, rgba.shape[0] * k), Image.NEAREST))


def option_sheets():
    """one PNG per effect: its five options (every frame) at 16x16, 4x, on the battle background, numbered;
    under each, the 8x8 version the game uses when it draws the effect small"""
    os.makedirs(os.path.join(ART, 'options'), exist_ok=True)
    K, gap = 4, 12
    for key, label, n, pal, opts in EFFECTS:
        cell = n * (16 * K + 4)
        W, H = 5 * (cell + gap) + gap, 24 * K + 2 * gap + 18
        im = Image.new('RGBA', (W, H), (40, 44, 52, 255))
        d = ImageDraw.Draw(im)
        for i, fn in enumerate(opts):
            x0 = gap + i * (cell + gap)
            d.text((x0, 4), str(i + 1) + (' *' if PICKS.get(key) == i + 1 else ''), fill=(255, 255, 255, 255))
            for j, (t, s8) in enumerate(zip(frames(fn, n), frames(fn, n, 8))):
                im.paste(Image.fromarray(up(colourise(t, FXPAL[pal], BATTLE_BG), K), 'RGBA'), (x0 + j * (16 * K + 4), 18))
                im.paste(Image.fromarray(up(colourise(s8, FXPAL[pal], BATTLE_BG), K), 'RGBA'), (x0 + j * (16 * K + 4), 22 + 16 * K))
        im.save(os.path.join(ART, 'options', key + '.png'))
    print('wrote', len(EFFECTS), 'option sheets to art/fx/options/')


def build():
    tiles, index = [], {}
    for key, label, n, pal, opts in EFFECTS:
        index[key] = len(tiles)
        tiles += frames(opts[PICKS[key] - 1], n)
    small = []
    for key, label, n, pal, opts in EFFECTS:
        small += frames(opts[PICKS[key] - 1], n, 8)
    sheet = np.zeros((24, 16 * len(tiles), 4), np.uint8)
    for i, (t, t8) in enumerate(zip(tiles, small)):
        for s in range(4):
            sheet[0:16, i * 16:i * 16 + 16][t == s] = (SHADES[s], SHADES[s], SHADES[s], 255)
            sheet[16:24, i * 8:i * 8 + 8][t8 == s] = (SHADES[s], SHADES[s], SHADES[s], 255)
    buf = io.BytesIO()
    Image.fromarray(sheet, 'RGBA').save(buf, 'PNG', optimize=True)
    s = open(ASSETS, encoding='utf-8').read()
    head, rest = s.split('window.PA_ASSETS = ', 1)
    A = json.loads(rest.rstrip().rstrip(';'))
    A['fx'] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    A['fxTiles'] = index
    open(ASSETS, 'w', encoding='utf-8').write(head + 'window.PA_ASSETS = ' + json.dumps(A, separators=(',', ':'), ensure_ascii=False) + ';\n')
    # a coloured preview of the sheet, each effect in its own palette
    os.makedirs(ART, exist_ok=True)
    prev = np.zeros((16, len(tiles) * 16, 4), np.uint8)
    for key, label, n, pal, opts in EFFECTS:
        for f in range(n):
            i = index[key] + f
            prev[:, i * 16:i * 16 + 16] = colourise(tiles[i], FXPAL[pal], BATTLE_BG)
    Image.fromarray(up(prev, 4), 'RGBA').save(os.path.join(ART, 'effects.png'))
    print('wrote', len(tiles), 'effect tiles into', os.path.relpath(ASSETS, ROOT), '-', index)


if __name__ == '__main__':
    if '--options' in sys.argv:
        option_sheets()
    else:
        build()
