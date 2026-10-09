#!/usr/bin/env python3
"""
The tied parcel (items lying in the field) drawn with the vector rig (tools/fx_rig.py) into the first cell of
art/objects/objects_and_emotes.png, in the sheet's own four colours. Then run tools/build_objects.py.
Five options are drawn to art/objects/parcel_options.png; PICK says which one goes into the sheet.

usage: python3 tools/build_parcel.py
"""
import os
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx_rig import FX, EMPTY  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'art', 'objects', 'objects_and_emotes.png')
COLOURS = [(255, 255, 255), (232, 232, 232), (162, 162, 162), (0, 0, 0)]  # shades 0..3, the sheet's own
PICK = 2


def p1(r):  # brown paper, string both ways, a bow on top
    r.rect(1, 1.0, 3.0, 7.0, 7.2)
    r.rect(2, 1.0, 5.8, 7.0, 7.2)
    r.line(3, [(4, 3.0), (4, 7.2)], 0.6)
    r.line(3, [(1.0, 5.0), (7.0, 5.0)], 0.6)
    r.ellipse(3, 2.9, 2.2, 1.3, 0.9, rot=-20)
    r.ellipse(3, 5.1, 2.2, 1.3, 0.9, rot=20)
    r.ellipse(0, 2.9, 2.2, 0.6, 0.35, rot=-20)
    r.ellipse(0, 5.1, 2.2, 0.6, 0.35, rot=20)


def p2(r):  # a squat box, seen a little from above
    r.poly(0, [(1.0, 3.0), (5.0, 2.0), (7.2, 3.0), (3.2, 4.0)])
    r.poly(1, [(1.0, 3.0), (3.2, 4.0), (3.2, 7.4), (1.0, 6.4)])
    r.poly(2, [(3.2, 4.0), (7.2, 3.0), (7.2, 6.4), (3.2, 7.4)])
    r.line(3, [(2.1, 3.5), (2.1, 6.9)], 0.5)
    r.line(3, [(5.2, 3.5), (5.2, 6.9)], 0.5)
    r.line(3, [(3.0, 2.5), (6.2, 3.5)], 0.5)
    r.ellipse(3, 3.6, 2.2, 0.9, 0.6, rot=-25)  # a little bow where the string crosses
    r.ellipse(3, 5.0, 2.4, 0.9, 0.6, rot=25)


def p3(r):  # a round sack, tied at the neck
    r.ellipse(1, 4, 5.2, 3.0, 2.4)
    r.poly(1, [(3.0, 3.2), (5.0, 3.2), (5.6, 1.4), (2.4, 1.4)])
    r.line(3, [(2.8, 3.0), (5.2, 3.0)], 0.7)
    r.ellipse(2, 4.6, 6.0, 2.0, 1.2)


def p4(r):  # a tall parcel with a label
    r.rect(1, 1.8, 1.6, 6.2, 7.4)
    r.line(3, [(4, 1.6), (4, 7.4)], 0.6)
    r.rect(0, 2.4, 4.6, 3.6, 5.8)
    r.rect(2, 1.8, 6.6, 6.2, 7.4)


def p5(r):  # a parcel with a big bow and long ends
    r.rect(1, 1.2, 3.6, 6.8, 7.2)
    r.line(3, [(4, 3.6), (4, 7.2)], 0.7)
    r.line(3, [(1.2, 5.4), (6.8, 5.4)], 0.7)
    r.circle(3, 2.6, 2.4, 1.2)
    r.circle(3, 5.4, 2.4, 1.2)
    r.circle(0, 2.6, 2.4, 0.5)
    r.circle(0, 5.4, 2.4, 0.5)
    r.line(3, [(4, 3.4), (2.8, 4.4)], 0.5)


OPTIONS = [p1, p2, p3, p4, p5]


def draw(fn):
    r = FX(16)
    fn(r)
    return r.render()


def rgba(tile):
    out = np.zeros((16, 16, 4), np.uint8)
    for s in range(4):
        out[tile == s] = COLOURS[s] + (255,)
    return out


if __name__ == '__main__':
    strip = np.zeros((16, 5 * 18, 4), np.uint8)
    for i, fn in enumerate(OPTIONS):
        strip[:, i * 18:i * 18 + 16] = rgba(draw(fn))
    Image.fromarray(strip, 'RGBA').resize((strip.shape[1] * 6, 16 * 6), Image.NEAREST).save(os.path.join(ROOT, 'art', 'objects', 'parcel_options.png'))
    sheet = np.array(Image.open(SHEET).convert('RGBA'))
    sheet[0:16, 0:16] = rgba(draw(OPTIONS[PICK - 1]))
    Image.fromarray(sheet, 'RGBA').save(SHEET)
    print('drew parcel option', PICK, 'into', os.path.relpath(SHEET, ROOT))
