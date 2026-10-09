"""
Battle-effect designs: five options for each of the 16 effects the battles draw (tools/build_fx.py).

Each option is a function (rig, frame) drawing one 8x8 tile in shades 0-3 (see tools/fx_rig.py). Effects with
several frames (gust 4, flame 3, bubble 3, slash 2) get the frame number and move or change with it.
Battles usually draw these at double size, tinted with an effect palette.
"""
import math


# ------------------------------------------------------------------ impact (hit, powder, self, default)
def impact_1(r, f):  # eight-point burst, white core
    r.star(2, 4, 4, 3.9, 1.7, 8, rot=0)
    r.star(0, 4, 4, 2.3, 1.0, 8, rot=22.5)


def impact_2(r, f):  # four-point sparkle
    r.star(1, 4, 4, 4.0, 1.0, 4)
    r.star(0, 4, 4, 2.4, 0.7, 4)
    r.outline()


def impact_3(r, f):  # jagged pow
    r.star(3, 4, 4, 3.6, 1.9, 7, rot=10, jitter=[1, .8, 1.05, .85, 1, .78, .95])
    r.star(1, 4, 4, 2.7, 1.4, 7, rot=10, jitter=[1, .8, 1.05, .85, 1, .78, .95])
    r.circle(0, 4, 4, 1.0)


def impact_4(r, f):  # impact lines round a dot
    for a in range(0, 360, 45):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        r.line(2 if a % 90 else 3, [(4 + 2.2 * c, 4 + 2.2 * s), (4 + 3.6 * c, 4 + 3.6 * s)], 1.0)
    r.circle(0, 4, 4, 1.3)


def impact_5(r, f):  # fat five-point star
    r.star(3, 4, 4.3, 4.0, 2.0, 5)
    r.star(1, 4, 4.3, 2.8, 1.4, 5)
    r.px(['0'], 3, 3)


# ------------------------------------------------------------------ note (sound)
def note_1(r, f):  # eighth note
    r.plain()
    r.ellipse(3, 2.8, 6.0, 1.6, 1.2, rot=-20)
    r.rect(3, 3.6, 1.0, 4.4, 6.0)
    r.line(3, [(4.2, 1.2), (6.4, 2.6), (6.4, 3.8)], 1.0)
    r.px(['0'], 2, 5)


def note_2(r, f):  # two beamed notes
    r.plain()
    r.ellipse(3, 1.8, 6.4, 1.3, 1.0, rot=-20)
    r.ellipse(3, 5.8, 5.6, 1.3, 1.0, rot=-20)
    r.rect(3, 2.6, 2.0, 3.4, 6.2)
    r.rect(3, 6.6, 1.2, 7.4, 5.4)
    r.poly(3, [(2.6, 1.0), (7.4, 0.2), (7.4, 1.6), (2.6, 2.4)])


def note_3(r, f):  # a heart
    r.circle(2, 2.6, 3.0, 1.9)
    r.circle(2, 5.4, 3.0, 1.9)
    r.poly(2, [(0.8, 3.6), (7.2, 3.6), (4, 7.2)])
    r.circle(1, 2.4, 2.6, 0.9)
    r.px(['0'], 2, 2)
    r.outline()


def note_4(r, f):  # quarter note with a glint
    r.ellipse(2, 3.0, 5.6, 1.9, 1.4, rot=-25)
    r.rect(3, 4.1, 0.6, 5.0, 5.4)
    r.ellipse(1, 2.5, 5.2, 0.8, 0.5, rot=-25)
    r.px(['0'], 2, 5)
    r.px(['3'], 1, 6)


def note_5(r, f):  # sound waves
    for k, rad in enumerate((1.6, 3.4, 5.2)):
        r.arc(3 - (k == 2), 0.6, 4, rad, -50, 50, 1.0)
    r.circle(0, 0.6, 4, 0.9)


# ------------------------------------------------------------------ fang (bite; flipped for the lower jaw)
def fang_1(r, f):  # two fangs from a gum
    r.rect(3, 0, 0, 8, 1.6)
    for x in (1.2, 4.8):
        r.poly(0, [(x, 1.4), (x + 2.2, 1.4), (x + 0.8, 6.2)])
    r.px(['1 ', '1 ', ' 1'], 2, 2)
    r.px(['1 ', '1 ', ' 1'], 5, 2)


def fang_2(r, f):  # a row of three teeth
    r.rect(3, 0, 0, 8, 1.4)
    for x in (0.3, 2.9, 5.5):
        r.poly(0, [(x, 1.2), (x + 2.4, 1.2), (x + 1.2, 5.6)])
        r.poly(1, [(x + 1.3, 1.2), (x + 2.4, 1.2), (x + 1.25, 5.4)])


def fang_3(r, f):  # one big curved fang
    r.poly(0, [(1.5, 0.5), (6.5, 0.5), (5.8, 3.5), (4.0, 6.6), (2.7, 7.6), (3.0, 4.4)])
    r.poly(1, [(4.8, 0.5), (6.5, 0.5), (5.8, 3.5), (4.0, 6.6), (2.7, 7.6), (4.6, 3.6)])
    r.rect(3, 1.0, 0, 7.0, 1.0)
    r.outline()


def fang_4(r, f):  # a jaw of zigzag teeth
    r.arc(3, 4, -4.5, 6.2, 40, 140, 1.6)
    pts = [(0.2, 2.2)]
    for i in range(4):
        pts += [(0.2 + 2 * i + 1, 5.4), (0.2 + 2 * i + 2, 2.4)]
    r.poly(0, pts + [(8, 1.6), (0, 1.6)])
    r.px(['3' * 8], 0, 1)


def fang_5(r, f):  # two outlined fangs
    for x in (1.4, 4.6):
        r.poly(0, [(x, 0.2), (x + 2.2, 0.2), (x + 1.0, 6.6)])
        r.poly(1, [(x + 1.2, 0.2), (x + 2.2, 0.2), (x + 1.0, 6.4)])
    r.outline()


# ------------------------------------------------------------------ gust (wind, 4 frames turning)
def gust_1(r, f):  # a comma curl turning a quarter each frame
    a = 90 * f
    r.arc(2, 4, 4, 2.4, a, a + 260, 1.3)
    r.circle(0, 4 + 2.4 * math.cos(math.radians(a)), 4 + 2.4 * math.sin(math.radians(a)), 1.0)


def gust_2(r, f):  # three streaks drifting
    for k, y in enumerate((1.5, 4.0, 6.5)):
        x = (f * 2 + k * 3) % 8
        r.line(1 if k != 1 else 0, [(x - 3, y), (x + 1.5, y)], 1.0)
        r.line(1 if k != 1 else 0, [(x - 3 + 8, y), (x + 1.5 + 8, y)], 1.0)


def gust_3(r, f):  # a crescent swoosh turning
    a = 90 * f
    r.arc(1, 4, 4, 2.9, a, a + 200, 1.6)
    r.arc(0, 4, 4, 2.9, a + 60, a + 150, 0.9)


def gust_4(r, f):  # a whirl
    r.spiral(2, 4, 4, 0.4, 3.4, 90 * f, 1.4, 1.0)
    r.circle(0, 4, 4, 0.8)


def gust_5(r, f):  # two wisps passing each other
    a = 90 * f
    for k in (0, 180):
        r.arc(1, 4, 4, 3.0, a + k, a + k + 110, 1.2)
        r.arc(0, 4, 4, 1.4, a + k + 40, a + k + 140, 0.9)


# ------------------------------------------------------------------ spike (stab, points right)
def spike_1(r, f):  # a horn
    r.poly(2, [(0.2, 1.6), (7.8, 4.0), (0.2, 6.4)])
    r.poly(1, [(0.2, 1.6), (7.8, 4.0), (0.2, 3.8)])
    r.line(0, [(1.0, 3.0), (5.6, 3.6)], 0.7)
    r.rect(3, 0, 1.4, 1.0, 6.6)


def spike_2(r, f):  # a spear tip
    r.rect(3, 0, 3.4, 4.0, 4.6)
    r.poly(1, [(3.4, 4.0), (5.6, 1.4), (7.9, 4.0), (5.6, 6.6)])
    r.poly(0, [(4.4, 4.0), (5.6, 2.6), (6.8, 4.0)])
    r.outline()


def spike_3(r, f):  # a drill
    r.poly(2, [(0.2, 0.8), (7.9, 4.0), (0.2, 7.2)])
    for x in (1.0, 3.2, 5.2):
        w = (7.9 - x) / 7.7 * 3.2
        r.line(0, [(x, 4 - w), (x + 1.2, 4 + w * 0.7)], 0.8)


def spike_4(r, f):  # a needle with a glint
    r.poly(1, [(0, 3.0), (7.9, 4.0), (0, 5.0)])
    r.poly(0, [(0, 3.4), (6.0, 3.9), (0, 4.0)])
    r.outline()
    r.px(['0'], 6, 1)
    r.px(['0', '0'], 6, 5)


def spike_5(r, f):  # an arrowhead with speed lines
    r.poly(1, [(3.0, 1.0), (7.9, 4.0), (3.0, 7.0), (4.4, 4.0)])
    r.poly(0, [(4.2, 2.6), (6.6, 4.0), (4.6, 4.0)])
    for y in (2.0, 4.0, 6.0):
        r.line(3, [(0.2, y), (2.4 if y == 4 else 1.8, y)], 0.9)


# ------------------------------------------------------------------ zzz (sleep)
def zzz_1(r, f):  # a big Z, outlined
    r.poly(0, [(1, 1), (7, 1), (7, 2.4), (3.2, 5.6), (7, 5.6), (7, 7), (1, 7), (1, 5.6), (4.8, 2.4), (1, 2.4)])
    r.outline(3)


def zzz_2(r, f):  # Z and a little z
    r.plain()
    r.poly(3, [(0.4, 2.6), (5.0, 2.6), (5.0, 3.6), (2.0, 6.4), (5.0, 6.4), (5.0, 7.6), (0.4, 7.6), (0.4, 6.6), (3.4, 3.8), (0.4, 3.8)])
    r.px(['333', ' 3 ', '333'], 5, 0)


def zzz_3(r, f):  # italic Z
    r.poly(2, [(2.0, 0.6), (7.6, 0.6), (7.0, 2.0), (2.8, 5.8), (6.6, 5.8), (6.0, 7.4), (0.4, 7.4), (1.0, 6.0), (5.2, 2.2), (1.4, 2.2)])
    r.poly(1, [(2.0, 0.6), (7.6, 0.6), (7.3, 1.3), (1.7, 1.3)])
    r.px(['0'], 3, 1)


def zzz_4(r, f):  # a sleep bubble
    r.circle(1, 4, 4.2, 3.4)
    r.circle(0, 4, 4.2, 2.6)
    r.arc(1, 4, 4.2, 1.8, 20, 160, 0.8)
    r.px(['0'], 2, 2)
    r.outline(2)


def zzz_5(r, f):  # three z's climbing
    r.plain()
    r.px(['22  ', ' 2  ', '22  '], 5, 0)
    r.px(['333', '  3', ' 3 ', '333'], 2, 2)
    r.px(['33', '33'], 0, 6)


# ------------------------------------------------------------------ bolt (zap, paralysis)
def bolt_1(r, f):  # a classic zigzag bolt
    r.poly(1, [(4.6, 0.2), (1.4, 4.4), (3.8, 4.4), (2.4, 7.8), (6.8, 3.0), (4.2, 3.0), (6.2, 0.2)])
    r.poly(0, [(4.9, 0.8), (2.6, 3.9), (4.6, 3.9), (3.6, 6.4)])
    r.outline(3)


def bolt_2(r, f):  # a slim bolt with a white core
    r.line(1, [(5.6, 0.2), (2.8, 3.6), (5.0, 4.2), (2.4, 7.8)], 1.8)
    r.line(0, [(5.4, 0.4), (2.9, 3.6), (5.0, 4.2), (2.6, 7.4)], 0.7)


def bolt_3(r, f):  # a forked bolt
    r.line(2, [(4.4, 0.0), (3.0, 3.0), (4.8, 4.0), (3.4, 7.8)], 1.3)
    r.line(1, [(4.8, 4.0), (7.6, 5.6)], 1.0)
    r.line(0, [(4.4, 0.4), (3.2, 3.0)], 0.6)


def bolt_4(r, f):  # a chunky three-step bolt
    r.poly(1, [(3, 0), (7, 0), (5, 2.6), (7, 2.6), (2, 8), (3.4, 4.4), (1.2, 4.4)])
    r.poly(0, [(3.6, 0.6), (6.0, 0.6), (4.2, 3.2), (5.4, 3.2), (3.2, 6.0), (4.0, 3.8), (2.4, 3.8)])
    r.outline(3)


def bolt_5(r, f):  # a crackling ball
    r.star(1, 4, 4, 3.9, 2.0, 6, rot=15, jitter=[1, .75, 1, .85, .95, .7])
    r.circle(0, 4, 4, 1.5)
    r.outline(2)


# ------------------------------------------------------------------ spark (zap, the second tile)
def spark_1(r, f):
    r.star(1, 4, 4, 3.8, 0.9, 4, rot=45)
    r.star(0, 4, 4, 2.2, 0.6, 4, rot=45)


def spark_2(r, f):  # a plus spark with dots
    r.star(1, 4, 4, 3.6, 0.9, 4)
    r.circle(0, 4, 4, 0.9)
    r.px(['2'], 1, 1); r.px(['2'], 6, 6); r.px(['2'], 6, 1); r.px(['2'], 1, 6)


def spark_3(r, f):  # a little zig
    r.line(1, [(1.0, 1.5), (4.6, 3.6), (3.2, 4.6), (7.0, 6.6)], 1.3)
    r.line(0, [(4.6, 3.6), (3.2, 4.6)], 0.7)


def spark_4(r, f):  # a small six-point burst
    r.star(2, 4, 4, 3.4, 1.4, 6)
    r.star(0, 4, 4, 1.9, 0.8, 6, rot=30)


def spark_5(r, f):  # a ring of sparks
    for a in range(0, 360, 60):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        r.circle(1 if a % 120 else 0, 4 + 2.9 * c, 4 + 2.9 * s, 0.75)
    r.circle(1, 4, 4, 1.1)


# ------------------------------------------------------------------ leaf
def leaf_1(r, f):  # an almond leaf with a midrib
    r.ellipse(2, 4, 4, 3.9, 2.0, rot=-40)
    r.ellipse(1, 3.4, 3.4, 2.6, 1.1, rot=-40)
    r.line(3, [(1.2, 6.8), (6.0, 2.0)], 0.7)


def leaf_2(r, f):  # a round leaf with a stem
    r.circle(2, 4.6, 3.4, 2.9)
    r.circle(1, 3.9, 2.7, 1.6)
    r.line(3, [(0.6, 7.4), (4.6, 3.4)], 0.8)
    r.px(['0'], 4, 2)


def leaf_3(r, f):  # a three-lobed leaf
    for a in (-90, -20, -160):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        r.ellipse(2, 4 + 1.7 * c, 4.4 + 1.7 * s, 2.2, 1.3, rot=a)
    r.circle(1, 4, 3.2, 1.0)
    r.line(3, [(4, 7.8), (4, 4.4)], 0.8)


def leaf_4(r, f):  # a slim willow leaf
    r.ellipse(1, 4, 4, 4.2, 1.4, rot=-35)
    r.line(2, [(1.0, 6.1), (6.8, 2.0)], 0.6)
    r.outline(3)


def leaf_5(r, f):  # a petal
    r.poly(2, [(4, 7.6), (0.8, 3.6), (1.4, 1.0), (4, 2.4), (6.6, 1.0), (7.2, 3.6)])
    r.poly(1, [(4, 6.0), (1.8, 3.4), (2.2, 2.0), (4, 3.2)])
    r.px(['0'], 2, 2)


# ------------------------------------------------------------------ slash (two tiles, alternating)
def slash_1(r, f):  # a crescent streak (thick, then thin)
    w = 1.8 if f == 0 else 1.1
    r.arc(1, 9.0, -1.0, 8.0, 100, 170, w)
    r.arc(0, 9.0, -1.0, 8.0, 115, 155, w * 0.5)


def slash_2(r, f):  # claw marks
    for k in range(3 - f):
        o = k * 2.4 + f * 1.2
        r.line(1, [(o + 0.4, 7.6), (o + 3.0, 0.4)], 1.0)
        r.line(0, [(o + 1.0, 5.2), (o + 2.2, 2.0)], 0.6)


def slash_3(r, f):  # a white blade arc with a dark edge
    r.arc(3, 8.5, 8.5, 7.0, 185, 265, 1.8 if f == 0 else 1.3)
    r.arc(0, 8.4, 8.4, 6.6, 190, 260, 1.0 if f == 0 else 0.7)


def slash_4(r, f):  # a straight cut with a glint
    r.line(2, [(0.4, 7.6), (7.6, 0.4)], 1.2 if f == 0 else 0.9)
    r.line(0, [(2.0, 6.0), (6.0, 2.0)], 0.6)
    if f == 0:
        r.px(['0', '000', ' 0'], 5, 0)


def slash_5(r, f):  # a moon slice
    r.circle(1, 4.4, 3.6, 3.6)
    r.circle(None, 5.8 + f * 0.5, 2.4 - f * 0.4, 3.4)
    r.px(['0'], 1, 5)


# ------------------------------------------------------------------ drop (water, beams)
def drop_1(r, f):  # a teardrop
    r.circle(2, 4, 5.0, 2.6)
    r.poly(2, [(1.6, 4.4), (4, 0.2), (6.4, 4.4)])
    r.circle(1, 3.4, 4.6, 1.3)
    r.px(['0'], 3, 4)
    r.outline(3)


def drop_2(r, f):  # a bubble orb
    r.circle(1, 4, 4, 3.6)
    r.circle(0, 4, 4, 2.5)
    r.circle(1, 4.5, 4.5, 1.6)
    r.px(['0'], 2, 2)


def drop_3(r, f):  # a splash droplet
    r.circle(1, 4, 4.4, 2.2)
    r.circle(0, 3.4, 3.8, 0.9)
    for x, y in ((0.8, 1.0), (7.2, 1.4), (1.0, 7.2), (7.0, 7.0)):
        r.circle(2, x, y, 0.7)


def drop_4(r, f):  # an outlined orb with a glint
    r.circle(2, 4, 4, 3.0)
    r.circle(1, 3.6, 3.6, 2.0)
    r.px(['00', '0 '], 2, 2)
    r.outline(3)


def drop_5(r, f):  # a diamond of energy
    r.poly(1, [(4, 0.2), (7.8, 4), (4, 7.8), (0.2, 4)])
    r.poly(0, [(4, 1.8), (6.2, 4), (4, 6.2), (1.8, 4)])
    r.poly(2, [(4, 6.2), (6.2, 4), (7.8, 4), (4, 7.8)])


# ------------------------------------------------------------------ rock
def rock_1(r, f):  # an angular boulder, faceted
    r.poly(2, [(1.2, 2.6), (3.6, 0.8), (6.6, 1.6), (7.6, 4.6), (6.0, 7.2), (2.2, 7.2), (0.6, 5.0)])
    r.poly(1, [(1.2, 2.6), (3.6, 0.8), (6.6, 1.6), (4.6, 3.6), (2.0, 4.2)])
    r.poly(3, [(4.6, 3.6), (7.6, 4.6), (6.0, 7.2), (4.4, 7.2)])
    r.px(['0'], 3, 2)
    r.outline(3)


def rock_2(r, f):  # a round pebble with a crack
    r.ellipse(2, 4, 4.4, 3.6, 3.0)
    r.ellipse(1, 3.2, 3.4, 2.0, 1.4)
    r.line(3, [(4.6, 2.0), (5.0, 3.8), (4.0, 5.0)], 0.6)
    r.outline(3)


def rock_3(r, f):  # a pointed shard
    r.poly(2, [(4.4, 0.2), (7.4, 6.0), (5.0, 7.8), (1.2, 7.2), (0.8, 4.6)])
    r.poly(1, [(4.4, 0.2), (3.6, 7.4), (1.2, 7.2), (0.8, 4.6)])
    r.line(0, [(4.0, 1.4), (2.0, 4.6)], 0.5)


def rock_4(r, f):  # two stones
    r.ellipse(2, 5.0, 5.0, 2.8, 2.4)
    r.ellipse(1, 4.4, 4.4, 1.5, 1.1)
    r.ellipse(2, 2.2, 2.4, 1.9, 1.6)
    r.px(['1'], 1, 1)
    r.outline(3)


def rock_5(r, f):  # a chunky block
    r.poly(1, [(1.0, 2.6), (3.6, 0.8), (7.2, 1.8), (4.6, 3.6)])
    r.poly(2, [(1.0, 2.6), (4.6, 3.6), (4.6, 7.4), (1.0, 6.2)])
    r.poly(3, [(4.6, 3.6), (7.2, 1.8), (7.2, 5.6), (4.6, 7.4)])
    r.px(['0'], 3, 1)


# ------------------------------------------------------------------ flame (3 frames)
def flame_1(r, f):  # a teardrop flame, tip flickering
    tip = [(4.6, 0.2), (3.0, 0.4), (5.4, 0.8)][f]
    r.circle(2, 4, 5.4, 2.5)
    r.poly(2, [(1.5, 5.2), tip, (6.5, 5.2)])
    r.circle(1, 4, 5.8, 1.6)
    r.poly(1, [(2.5, 5.6), (tip[0], tip[1] + 2.4), (5.5, 5.6)])
    r.circle(0, 4, 6.2, 0.8)


def flame_2(r, f):  # three tongues
    hs = [(1.2, .4, .9), (.7, 1.0, .5), (1.0, .6, 1.1)][f]
    for k, x in enumerate((1.6, 4.0, 6.4)):
        top = 0.4 + hs[k] * 2.4
        r.poly(2, [(x - 1.8, 7.6), (x, top), (x + 1.8, 7.6)])
    r.ellipse(1, 4, 6.2, 2.6, 1.6)
    r.ellipse(0, 4, 6.8, 1.2, 0.8)


def flame_3(r, f):  # a fireball with a tail
    r.poly(2, [(4.5, 2.5), (0.2, 0.4 + f), (2.6, 4.4), (0.4, 6.8 - f * 0.6), (5.5, 7.2)])
    r.circle(2, 5.0, 4.8, 2.7)
    r.circle(1, 5.3, 4.6, 1.8)
    r.circle(0, 5.6, 4.4, 0.9)


def flame_4(r, f):  # a tall narrow flame
    sway = [0, 0.8, -0.8][f]
    r.poly(2, [(2.2, 7.6), (2.0, 4.0), (4 + sway, 0.0), (6.0, 4.0), (5.8, 7.6)])
    r.poly(1, [(3.0, 7.4), (3.0, 4.6), (4 + sway * 0.6, 2.0), (5.0, 4.6), (5.0, 7.4)])
    r.poly(0, [(3.6, 7.2), (3.6, 5.4), (4 + sway * 0.3, 4.0), (4.4, 5.4), (4.4, 7.2)])
    r.outline(3)


def flame_5(r, f):  # a round flame, licking upward
    lick = [(2.4, 1.0), (4.0, 0.2), (5.6, 1.0)][f]
    r.circle(2, 4, 5.2, 2.7)
    r.poly(2, [(1.4, 4.8), lick, (6.6, 4.8)])
    r.poly(2, [(4.6, 3.0), (6.6, 1.4 + f * 0.4), (6.4, 4.4)])
    r.circle(1, 4, 5.6, 1.7)
    r.circle(0, 4, 6.0, 0.9)


# ------------------------------------------------------------------ ice
def ice_1(r, f):  # a six-armed snowflake
    for a in range(0, 180, 60):
        c, s = math.cos(math.radians(a + 90)), math.sin(math.radians(a + 90))
        r.line(1, [(4 - 3.5 * c, 4 - 3.5 * s), (4 + 3.5 * c, 4 + 3.5 * s)], 1.0)
    r.circle(0, 4, 4, 1.1)
    r.px(['0'], 4, 0)


def ice_2(r, f):  # a crystal shard
    r.poly(1, [(4, 0.2), (6.6, 2.8), (6.6, 5.6), (4, 7.8), (1.4, 5.6), (1.4, 2.8)])
    r.poly(0, [(4, 0.2), (4, 7.8), (1.4, 5.6), (1.4, 2.8)])
    r.poly(2, [(4, 7.8), (6.6, 5.6), (6.6, 4.4), (4, 5.6)])
    r.outline(3)


def ice_3(r, f):  # an ice cube
    r.rect(1, 1.0, 1.0, 7.0, 7.0)
    r.poly(0, [(1.0, 1.0), (7.0, 1.0), (5.6, 2.4), (2.4, 2.4), (2.4, 5.6), (1.0, 7.0)])
    r.px(['0'], 4, 4)
    r.outline(2)


def ice_4(r, f):  # an icicle
    r.poly(1, [(1.0, 0.2), (7.0, 0.2), (4.4, 7.8)])
    r.poly(0, [(2.4, 0.4), (4.2, 0.4), (4.0, 5.4)])
    r.rect(2, 1.0, 0, 7.0, 1.0)


def ice_5(r, f):  # a faceted diamond
    r.poly(1, [(1.0, 2.8), (2.8, 0.8), (5.2, 0.8), (7.0, 2.8), (4, 7.6)])
    r.poly(0, [(1.0, 2.8), (2.8, 0.8), (4.0, 2.8)])
    r.poly(2, [(4.0, 2.8), (7.0, 2.8), (4, 7.6)])
    r.outline(3)


# ------------------------------------------------------------------ bubble (poison, other status; 3 frames)
def bubble_1(r, f):  # a bubble growing, then popping
    if f < 2:
        rad = 2.2 + f * 1.2
        r.circle(2, 4, 4.2, rad)
        r.circle(1, 4, 4.2, rad - 0.9)
        r.px(['0'], 3 - f, 3 - f)
    else:
        for a in range(0, 360, 45):
            c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
            r.circle(2, 4 + 3.0 * c, 4 + 3.0 * s, 0.6)


def bubble_2(r, f):  # sludge drips
    r.ellipse(2, 4, 1.6, 3.8, 1.6)
    for k, x in enumerate((1.6, 4.0, 6.2)):
        ln = 2.0 + ((k + f) % 3) * 1.6
        r.line(2, [(x, 1.6), (x, 1.6 + ln)], 1.2)
        r.circle(2, x, 1.6 + ln, 0.9)
    r.px(['0'], 2, 1)


def bubble_3(r, f):  # a toxic droplet, wobbling
    w = [0, 0.4, -0.3][f]
    r.circle(2, 4, 5.0, 2.6 + w * 0.5)
    r.poly(2, [(1.6 - w, 4.6), (4 + w, 0.8), (6.4 + w, 4.6)])
    r.circle(1, 3.3, 4.6, 1.0)
    r.px(['0'], 3, 4)
    r.outline(3)


def bubble_4(r, f):  # a cluster of bubbles
    sets = [((2.4, 5.2, 1.9), (5.6, 3.4, 1.4), (5.4, 6.6, 0.9)),
            ((2.8, 4.6, 2.1), (5.8, 2.6, 1.6), (5.0, 6.6, 1.1)),
            ((2.4, 4.0, 1.7), (5.4, 2.2, 1.2), (5.6, 6.0, 1.4))][f]
    for x, y, s in sets:
        r.circle(3, x, y, s + 0.6)
    for x, y, s in sets:
        r.circle(1, x, y, s)
        r.px(['0'], int(x - s * 0.5), int(y - s * 0.5))


def bubble_5(r, f):  # a fume puff
    for x, y, s in ((2.4, 5.0, 2.2), (5.0, 4.4, 2.4), (3.8, 2.4, 1.8)):
        r.circle(2, x, y - f * 0.4, s)
    r.circle(1, 3.6, 3.8 - f * 0.4, 1.4)
    r.px(['0'], 3, 3)


# ------------------------------------------------------------------ swirl (confusion)
def swirl_1(r, f):  # a spiral
    r.spiral(2, 4, 4, 0.3, 3.4, 0, 1.6, 1.0)
    r.circle(0, 4, 4, 0.7)


def swirl_2(r, f):  # two little stars
    r.star(1, 2.4, 2.6, 2.3, 0.9, 5)
    r.star(1, 5.8, 5.6, 1.9, 0.8, 5, rot=20)
    r.px(['0'], 2, 2)
    r.outline(3)


def swirl_3(r, f):  # a loop ring with a dot
    r.arc(2, 4, 4, 2.8, 0, 300, 1.1)
    r.circle(0, 4 + 2.8 * math.cos(math.radians(300)), 4 + 2.8 * math.sin(math.radians(300)), 1.0)
    r.circle(1, 4, 4, 0.9)


def swirl_4(r, f):  # a thick swirl
    r.spiral(1, 4, 4, 0.6, 3.2, 180, 1.2, 1.5)
    r.outline(3)


def swirl_5(r, f):  # an orbit of three dots
    r.ellipse(2, 4, 4, 3.4, 1.6, rot=-15)
    r.ellipse(None, 4, 4, 2.6, 0.9, rot=-15)
    for x, y in ((1.0, 4.8), (6.8, 3.0)):
        r.circle(0, x, y, 0.9)
    r.circle(1, 4, 2.0, 0.8)


# ------------------------------------------------------------------ friendship: heart, food (3 frames), hand, anger
def heart_1(r, f):  # a plump heart with a shine
    r.circle(2, 2.7, 3.1, 2.0)
    r.circle(2, 5.3, 3.1, 2.0)
    r.poly(2, [(0.75, 3.7), (7.25, 3.7), (4, 7.4)])
    r.circle(1, 2.4, 2.7, 1.0)
    r.px(['0'], 2, 2)


def heart_2(r, f):  # a slim heart
    r.circle(1, 2.9, 3.0, 1.7)
    r.circle(1, 5.1, 3.0, 1.7)
    r.poly(1, [(1.25, 3.5), (6.75, 3.5), (4, 6.9)])
    r.px(['0'], 2, 2)


def heart_3(r, f):  # a heart with a darker lower half
    r.circle(1, 2.7, 3.1, 2.0)
    r.circle(1, 5.3, 3.1, 2.0)
    r.poly(1, [(0.75, 3.7), (7.25, 3.7), (4, 7.4)])
    r.poly(2, [(0.9, 4.4), (7.1, 4.4), (4, 7.4)])
    r.px(['0'], 2, 2)


def heart_4(r, f):  # two little hearts
    for (x, y, k) in ((2.6, 2.6, 1.0), (5.6, 5.0, 0.8)):
        r.circle(2, x - 0.9 * k, y, 1.1 * k)
        r.circle(2, x + 0.9 * k, y, 1.1 * k)
        r.poly(2, [(x - 2.0 * k, y + 0.5 * k), (x + 2.0 * k, y + 0.5 * k), (x, y + 2.4 * k)])


def heart_5(r, f):  # a pixel heart, square and bold
    r.px(['.22.22..', '2112112.', '2111112.', '2111112.', '.21112..', '..212...', '...2....'], 0, 0)
    r.px(['0'], 1, 1)


def food_1(r, f):  # seed / pellet / biscuit, chunky
    if f == 0:
        r.ellipse(2, 4, 4, 1.6, 2.6, rot=20)
        r.ellipse(1, 3.6, 3.4, 0.6, 1.4, rot=20)
    elif f == 1:
        r.ellipse(2, 4, 4.2, 2.6, 2.0)
        r.ellipse(1, 3.4, 3.6, 1.2, 0.8)
    else:
        r.rect(1, 1.2, 1.6, 6.8, 6.4)
        for x, y in ((2.6, 3.0), (5.0, 3.0), (3.8, 4.6), (2.6, 5.4), (5.2, 5.4)):
            r.circle(2, x, y, 0.45)


def food_2(r, f):  # a small scatter of each
    pts = [(2.2, 3.0), (5.4, 2.6), (3.8, 5.6)]
    for (x, y) in pts:
        if f == 0:
            r.ellipse(2, x, y, 0.9, 1.4, rot=30)
        elif f == 1:
            r.circle(2, x, y, 1.1)
        else:
            r.rect(1, x - 1.2, y - 1.0, x + 1.2, y + 1.0)


def food_3(r, f):  # sunflower seed / round pellet / heart-shaped biscuit
    if f == 0:
        r.poly(3, [(4, 0.8), (6.0, 4.6), (4, 7.4), (2.0, 4.6)])
        r.poly(1, [(4, 1.8), (5.0, 4.6), (4, 6.4), (3.0, 4.6)])
    elif f == 1:
        r.circle(2, 4, 4, 2.6)
        r.circle(1, 3.4, 3.4, 1.0)
    else:
        r.circle(1, 2.9, 3.2, 1.9)
        r.circle(1, 5.1, 3.2, 1.9)
        r.poly(1, [(1.0, 3.8), (7.0, 3.8), (4, 7.0)])
        r.px(['2', ' ', '2'], 3, 3)


def food_4(r, f):  # in a little dish
    r.ellipse(2, 4, 6.2, 3.6, 1.3)
    if f == 0:
        for x in (2.6, 4.0, 5.4):
            r.ellipse(1, x, 5.0, 0.6, 1.0, rot=25)
    elif f == 1:
        for x in (2.6, 4.0, 5.4):
            r.circle(1, x, 5.0, 0.8)
    else:
        r.rect(1, 2.0, 3.8, 6.0, 5.6)


def food_5(r, f):  # a paper twist, open at the top
    r.poly(1, [(1.6, 2.6), (6.4, 2.6), (5.0, 7.4), (3.0, 7.4)])
    r.line(2, [(2.2, 4.4), (5.8, 4.4)], 0.5)
    c = [2, 2, 1][f]
    for x in (2.8, 4.0, 5.2):
        if f == 2:
            r.rect(c, x - 0.6, 1.0, x + 0.6, 2.4)
        else:
            r.circle(c, x, 1.9, 0.7)


def hand_1(r, f):  # an open palm, fingers up
    r.ellipse(1, 4, 5.2, 2.6, 2.2)
    for x in (2.0, 3.3, 4.6, 5.9):
        r.line(1, [(x, 4.6), (x, 1.4 + abs(x - 4) * 0.4)], 1.1)
    r.line(1, [(1.6, 6.0), (0.6, 4.4)], 1.1)


def hand_2(r, f):  # a palm, side on, patting
    r.ellipse(1, 4.4, 4.0, 3.2, 1.8, rot=-10)
    r.line(1, [(1.6, 3.0), (0.6, 2.0)], 1.0)
    r.line(2, [(3.0, 5.0), (6.6, 4.4)], 0.5)


def hand_3(r, f):  # a mitten
    r.ellipse(1, 4.4, 4.4, 2.6, 3.0)
    r.ellipse(1, 1.8, 4.6, 1.0, 1.6, rot=-30)
    r.rect(2, 2.4, 6.6, 6.4, 7.6)


def hand_4(r, f):  # a palm with motion lines
    r.ellipse(1, 4.8, 4.8, 2.2, 2.0)
    for x in (3.4, 4.6, 5.8):
        r.line(1, [(x, 4.2), (x, 1.8)], 1.0)
    for y in (2.0, 4.0):
        r.line(2, [(0.4, y), (1.6, y)], 0.6)


def hand_5(r, f):  # a paw-print pat
    r.ellipse(1, 4, 5.2, 2.0, 1.6)
    for x, y in ((2.0, 2.8), (3.4, 1.8), (4.8, 1.8), (6.2, 2.8)):
        r.circle(1, x, y, 0.9)


def anger_1(r, f):  # the cross-vein mark
    for (cx, cy, a0) in ((0.8, 0.8, 0), (7.2, 0.8, 90), (7.2, 7.2, 180), (0.8, 7.2, 270)):
        r.arc(2, cx, cy, 2.6, a0, a0 + 90, 1.2)


def anger_2(r, f):  # a puff of steam
    for x, y, s in ((3.0, 4.6, 2.0), (5.2, 3.6, 1.6), (4.6, 6.0, 1.4)):
        r.circle(1, x, y, s)
    r.px(['0'], 2, 4)


def anger_3(r, f):  # a jagged scribble
    r.line(2, [(0.8, 5.6), (2.4, 2.0), (3.6, 5.6), (5.0, 2.0), (6.4, 5.6), (7.4, 2.6)], 1.0)


def anger_4(r, f):  # an exclamation burst
    r.star(1, 4, 4, 3.8, 2.4, 9)
    r.rect(3, 3.4, 1.6, 4.6, 4.8)
    r.rect(3, 3.4, 5.6, 4.6, 6.6)


def anger_5(r, f):  # a storm cloud
    r.circle(2, 2.6, 4.0, 1.8)
    r.circle(2, 4.6, 3.2, 2.2)
    r.circle(2, 6.0, 4.4, 1.6)
    r.rect(2, 1.4, 4.4, 6.8, 5.8)
    r.line(1, [(4.4, 5.6), (3.6, 7.0), (4.6, 7.0), (3.8, 7.8)], 0.7)


# ------------------------------------------------------------------ the table: key, label, frames, palette, options
EFFECTS = [
    ('impact', 'Impact (hits, powders, power-ups, default)', 1, 'normal', [impact_1, impact_2, impact_3, impact_4, impact_5]),
    ('note', 'Note (sound attacks)', 1, 'heart', [note_1, note_2, note_3, note_4, note_5]),
    ('fang', 'Fang (bites)', 1, 'normal', [fang_1, fang_2, fang_3, fang_4, fang_5]),
    ('gust', 'Gust (wind, 4 frames)', 4, 'normal', [gust_1, gust_2, gust_3, gust_4, gust_5]),
    ('spike', 'Spike (stabs)', 1, 'normal', [spike_1, spike_2, spike_3, spike_4, spike_5]),
    ('zzz', 'Zzz (sleep)', 1, 'normal', [zzz_1, zzz_2, zzz_3, zzz_4, zzz_5]),
    ('bolt', 'Bolt (shocks, paralysis)', 1, 'zap', [bolt_1, bolt_2, bolt_3, bolt_4, bolt_5]),
    ('spark', 'Spark (shocks, second tile)', 1, 'zap', [spark_1, spark_2, spark_3, spark_4, spark_5]),
    ('leaf', 'Leaf', 1, 'leaf', [leaf_1, leaf_2, leaf_3, leaf_4, leaf_5]),
    ('slash', 'Slash (2 tiles)', 2, 'normal', [slash_1, slash_2, slash_3, slash_4, slash_5]),
    ('drop', 'Drop (water, beams)', 1, 'water', [drop_1, drop_2, drop_3, drop_4, drop_5]),
    ('rock', 'Rock', 1, 'rock', [rock_1, rock_2, rock_3, rock_4, rock_5]),
    ('flame', 'Flame (3 frames)', 3, 'fire', [flame_1, flame_2, flame_3, flame_4, flame_5]),
    ('ice', 'Ice', 1, 'ice', [ice_1, ice_2, ice_3, ice_4, ice_5]),
    ('bubble', 'Bubble (poison and other ailments, 3 frames)', 3, 'poison', [bubble_1, bubble_2, bubble_3, bubble_4, bubble_5]),
    ('swirl', 'Swirl (confusion)', 1, 'psy', [swirl_1, swirl_2, swirl_3, swirl_4, swirl_5]),
    ('heart', 'Heart (friendship)', 1, 'heart', [heart_1, heart_2, heart_3, heart_4, heart_5]),
    ('food', 'Food (3 tiles: seed, pellet, treat)', 3, 'food', [food_1, food_2, food_3, food_4, food_5]),
    ('hand', 'Hand (petting)', 1, 'food', [hand_1, hand_2, hand_3, hand_4, hand_5]),
    ('anger', 'Anger (it hates being petted)', 1, 'fire', [anger_1, anger_2, anger_3, anger_4, anger_5]),
]
