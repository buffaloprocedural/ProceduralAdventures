#!/usr/bin/env python3
"""
The creature roster's battle sprites: art/creatures/*.svg (+ GULLET from art/mascot) -> src/gen/creatures.js

Every creature has a battle set laid out like art/mascot/gulliver_battle.svg (80x32): a 32x32 front view
at (0,0), a 32x32 back view at (32,0), and two 16x16 party-menu icon frames at (64,0) and (64,16).

Creatures with finished art use it as it is (art/creatures/<name>.svg, or a .png with the same layout).
The rest get a placeholder shape for framing: a flat silhouette in the colour of the creature's type (a
rough body shape - eared, round, tall or domed - with two eye dots on the front view), and corner marks
showing the 32x32 frame its art will fill. They are deliberately plain, so nobody mistakes them for designs.
Drop a finished sheet into art/creatures/ under the creature's lower-case name and rebuild to replace one.

usage: python3 tools/build_creatures.py
"""
import io, os, re, sys, json, base64
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_sheet import load_sheet  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'art', 'creatures')
OUT = os.path.join(ROOT, 'src', 'gen', 'creatures.js')
PREVIEW = os.path.join(ROOT, 'tools', 'preview')

# The creatures, their order (which gives each its number) and their types come from src/game/roster.js, and
# so do the type colours (PA.TYPE_COLOUR) - read from there, so the two can't drift apart. Here is only the
# rough shape of each placeholder; a creature with finished art in art/creatures (or GULLET's in art/mascot)
# needs none.
SHAPES = {}  # every creature on the roster has finished art (October 2026); a new one gets a shape here until it does


def read_roster():
    src = open(os.path.join(ROOT, 'src', 'game', 'roster.js'), encoding='utf-8').read()
    roster = re.findall(r"^    \['([A-Z]+)', '([A-Z]+)', '(?:diva|shy)'", src, re.M)
    block = src[src.index('PA.TYPE_COLOUR = {'):]
    block = block[:block.index('};')]
    colours = dict(re.findall(r"([A-Z]+): '(#[0-9a-fA-F]{6})'", block))
    if len(roster) < 2 or not colours:
        raise SystemExit('could not read the creatures or the type colours from src/game/roster.js')
    for _, t in roster:
        if t not in colours:
            raise SystemExit('roster.js: no colour for type %s' % t)
    return roster, colours


ROSTER, TYPE_COLOUR = read_roster()
for _n in SHAPES:
    if _n not in [r[0] for r in ROSTER]:
        raise SystemExit('SHAPES names %s, which is not in src/game/roster.js' % _n)
OUTLINE = (0x22, 0x28, 0x2b)
MARK = (0x9a, 0x96, 0xa4)


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def silhouette(shape, front):
    """A 32x32 mask of the rough shape, and where its two eyes go (front view only)."""
    im = Image.new('L', (32, 32), 0)
    d = ImageDraw.Draw(im)
    E = lambda cx, cy, rx, ry: d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=1)
    if shape == 'eared':
        E(16, 23, 8, 6); E(16, 13, 7, 6)
        d.polygon([(9, 10), (9, 3), (14, 8)], fill=1); d.polygon([(23, 10), (23, 3), (18, 8)], fill=1)
        eyes = 13
    elif shape == 'egg':
        E(16, 18, 9, 11)
        eyes = 13
    elif shape == 'tall':
        E(16, 21, 8, 7); E(16, 9, 5, 6); d.rectangle([10, 26, 12, 30], fill=1); d.rectangle([20, 26, 22, 30], fill=1)
        eyes = 8
    elif shape == 'dome':
        E(16, 21, 12, 8)
        eyes = 20
    else:  # round
        E(16, 19, 11, 10)
        eyes = 16
    return np.array(im) > 0, eyes


def view(shape, colour, front):
    mask, ey = silhouette(shape, front)
    out = np.zeros((32, 32, 4), np.uint8)
    out[mask, :3] = colour
    out[mask, 3] = 255
    edge = np.zeros_like(mask)
    edge[1:, :] |= mask[:-1, :]; edge[:-1, :] |= mask[1:, :]; edge[:, 1:] |= mask[:, :-1]; edge[:, :-1] |= mask[:, 1:]
    edge &= ~mask
    out[edge, :3] = OUTLINE
    out[edge, 3] = 255
    if front:
        for x in (12, 19):
            out[ey:ey + 2, x:x + 2, :3] = OUTLINE
    # corner marks: the 32x32 frame the finished art will fill
    for (x, y, dx, dy) in ((0, 0, 1, 1), (31, 0, -1, 1), (0, 31, 1, -1), (31, 31, -1, -1)):
        for k in range(4):
            for (px, py) in ((x + dx * k, y), (x, y + dy * k)):
                if out[py, px, 3] == 0:
                    out[py, px, :3] = MARK
                    out[py, px, 3] = 255
    return out


def icon(shape, colour, bob):
    big = view(shape, colour, True)
    small = np.array(Image.fromarray(big, 'RGBA').resize((16, 16), Image.NEAREST))
    # drop the frame marks from the icon; it is drawn on its own
    small[(small[..., :3] == MARK).all(-1)] = 0
    if bob:
        small = np.roll(small, 1, axis=0); small[0] = 0
    return small


def placeholder(type_, shape):
    c = lighten(rgb(TYPE_COLOUR[type_]))
    sheet = np.zeros((32, 80, 4), np.uint8)
    sheet[:, 0:32] = view(shape, c, True)
    sheet[:, 32:64] = view(shape, c, False)
    sheet[0:16, 64:80] = icon(shape, c, False)
    sheet[16:32, 64:80] = icon(shape, c, True)
    return sheet


def lighten(c, k=0.3):
    return tuple(int(v + (255 - v) * k) for v in c)


def finished(name):
    low = name.lower()
    if name == 'GULLET':
        return os.path.join(ROOT, 'art', 'mascot', 'gulliver_battle.svg')
    for ext in ('.svg', '.png'):
        p = os.path.join(ART, low + ext)
        if os.path.exists(p):
            return p
    return None


def png_uri(rgba):
    buf = io.BytesIO()
    Image.fromarray(rgba, 'RGBA').save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


def main():
    COLS = 5
    rows = (len(ROSTER) + COLS - 1) // COLS
    atlas = np.zeros((rows * 32, COLS * 80, 4), np.uint8)
    sets, done = {}, []
    for i, (name, type_) in enumerate(ROSTER):
        shape = SHAPES.get(name)
        src = finished(name)
        if src:
            sheet = load_sheet(src)
            if sheet.shape[:2] != (32, 80):
                raise SystemExit('%s: a battle set is 80x32 (front, back, two icons), got %dx%d' % (src, sheet.shape[1], sheet.shape[0]))
            done.append(name)
        else:
            if not shape:
                raise SystemExit('%s has no art in art/creatures and no placeholder shape' % name)
            sheet = placeholder(type_, shape)
        x0, y0 = (i % COLS) * 80, (i // COLS) * 32
        atlas[y0:y0 + 32, x0:x0 + 80] = sheet
        sets[name] = [x0, y0, 1 if src else 0]
    data = {'png': png_uri(atlas), 'size': 32, 'icon': 16, 'front': [0, 0], 'back': [32, 0], 'icons': [[64, 0], [64, 16]], 'sets': sets}
    with open(OUT, 'w') as f:
        f.write('// Generated by tools/build_creatures.py from art/creatures/ (and GULLET from art/mascot/) - do not edit.\n')
        f.write('// sets: NAME -> [x, y of its 80x32 battle set in the atlas, 1 = finished art / 0 = placeholder]\n')
        f.write('window.PA_CREATURES = ')
        json.dump(data, f, separators=(',', ':'))
        f.write(';\n')
    os.makedirs(PREVIEW, exist_ok=True)
    Image.fromarray(atlas, 'RGBA').resize((atlas.shape[1] * 3, atlas.shape[0] * 3), Image.NEAREST).save(os.path.join(PREVIEW, 'creatures.png'))
    print('wrote', OUT, os.path.getsize(OUT), 'bytes;', len(done), 'finished,', len(ROSTER) - len(done), 'placeholders')


if __name__ == '__main__':
    main()
