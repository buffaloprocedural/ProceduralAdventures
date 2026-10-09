"""Twenty new creature ideas (front views), to fill the twelve places left by retired creatures (October 2026).
Weighted toward the thinnest types: STONE, BREEZE, CHROME and BLIGHT have one creature each.
Not in the options set (no DESIGNS here): tools/build_creature_options.py --ideas draws them as a gallery."""
import math
from creature_rig import eyes, pix, deco, hexrgb, INK, WHITE
from common import cat, flame, leafshape, shade


# ---------------------------------------------------------------- STONE
def granitort(r, o):
    """a tortoise whose shell is a granite boulder, with a garden on top"""
    r.part('leg', '#8a9a58', ink=True)
    r.part('shell', '#9a9690')
    r.part('speck', '#6a6660', flat=True)
    r.part('rim', '#7a766e', ink=True)
    r.part('head', '#9aaa60', ink=True)
    r.part('moss', '#5a9a40')
    r.part('flower', '#f8d040', ink=True)
    for x in (7, 25):
        r.ellipse('leg', x, 27.5, 3, 2.4)
    r.ellipse('shell', 16, 17, 12.5, 10)
    for x, y in ((9, 15), (13, 11), (19, 12), (22, 17), (12, 20), (17, 18), (24, 13), (8, 20)):
        r.circle('speck', x, y, 0.6)
    r.ellipse('rim', 16, 25, 12, 2.4)
    r.ellipse('head', 16, 25.5, 4.5, 3.6)
    r.ellipse('moss', 16, 8, 7, 2.6)
    r.circle('flower', 13, 6, 1.3); r.circle('flower', 19, 5.5, 1.1)
    eyes(r, 'shy', 13, 25, 17, 25)
    pix(r, [(12, 27), (20, 27)], '#e8a0a0')


def gemstoat(r, o):
    """a stoat in its white winter coat, with a geode crest and a black-tipped tail"""
    back = r.view == 'back'

    def crest(r, back, hc):
        r.part('gem', '#a868e8', ink=True)
        r.part('gem2', '#e0c0ff', flat=True)
        for x, h in ((13.5, 4), (16, 6), (18.5, 4.5)):
            r.poly('gem', [(x - 1.6, hc - 4.8), (x, hc - 4.8 - h), (x + 1.6, hc - 4.8)])
        r.tri('gem2', (15.4, hc - 5.5), (16, hc - 9.5), (16.6, hc - 5.5))
        r.part('tip', '#2a2228')
        r.circle('tip', 28.6 if not back else 21.5, 12.5 if not back else 17, 2)
    cat(r, dict(fur='#f4f2f0', belly='#fbf6e8', ears='round', ear_in='#e8b8c0', tail='long', tailw=1.9, head=(6.6, 5.6), body=(7, 6.8), slim=1.4,
                eyes='bigc', iris='#7848c8', mouth='smile', nose='#d07888', muzzle_size=(3, 2), extra=crest))
    deco(r, 'sparkle', '#d0a8ff', [(2, 5), (27, 20)] if not back else [(3, 5)])


def brickwomb(r, o):
    """a wombat that builds walls of perfect stone cubes"""
    r.part('cube', '#b0a898', ink=True)
    r.part('body', '#8a6a50')
    r.part('ear', '#8a6a50', ink=True)
    r.part('head', '#8a6a50', ink=True)
    r.part('nose', '#3a2a24', ink=True)
    r.part('paw', '#6a5040', ink=True)
    r.ellipse('body', 13, 22, 9.5, 7.5)
    r.circle('ear', 8, 8.5, 2.2); r.circle('ear', 20, 8.5, 2.2)
    r.ellipse('head', 14, 14, 7.5, 6.2)
    r.ellipse('nose', 14, 16.2, 2, 1.4)
    r.ellipse('paw', 9, 28.5, 2.6, 1.6); r.ellipse('paw', 19, 28.5, 2.6, 1.6)
    r.part('cube2', '#b0a898', ink=True)
    r.part('cube3', '#b0a898', ink=True)
    for part, (x0, y0) in zip(('cube', 'cube2', 'cube3'), ((21.5, 26.5), (26.3, 26.5), (23.9, 21.6))):  # its latest wall, very square
        r.rect(part, x0, y0, x0 + 4, y0 + 4)
    eyes(r, 'dot', 10, 12, 17, 12)
    pix(r, [(8, 15), (19, 15)], '#d89080')
    deco(r, 'dust', '#a09080', [(2, 4), (28, 13)])


# ---------------------------------------------------------------- BREEZE
def kitefox(r, o):
    """a fox with kite-shaped ears and ribbons tied to its tail"""
    def ribbons(r, back, hc):
        r.part('ribbon', '#f0607a', ink=True)
        r.part('ribbon2', '#f8d040', ink=True)
        tx, ty = (28, 12) if not back else (21.5, 13)
        r.capsule('ribbon', tx, ty, tx + 2.5, ty + 5, 0.6, 0.5)
        r.capsule('ribbon2', tx - 0.5, ty + 0.5, tx - 2.5, ty - 8, 0.6, 0.5)
        r.part('diamond', '#f8f4ff', flat=True)
        for x in (10.5, 21.5):
            r.poly('diamond', [(x, hc - 9.5), (x + 1.2, hc - 7.8), (x, hc - 6.1), (x - 1.2, hc - 7.8)])
    cat(r, dict(fur='#8aa0e0', belly='#f4f6ff', ears='big', earcol='#6a80d0', ear_in='#3a4a98', tail='up', tailw=2.6,
                head=(7.6, 6.2), eyes='bigc', iris='#3a4ab0', mouth='smile', nose='#3a3050', muzzle='#f4f6ff', extra=ribbons))
    deco(r, 'swirl', '#a8c0f0', [(1, 8), (1, 22)] if r.view != 'back' else [(1, 8)])


def dandyglide(r, o):
    """a sugar glider drifting about on a dandelion clock"""
    back = r.view == 'back'
    r.part('stem', '#78a848', flat=True)
    r.part('puff', '#ffffff')
    r.part('seed', '#d8d0c0', flat=True)
    r.part('tail', '#8a8498', ink=True)
    r.part('membrane', '#a8a0b8', ink=True)
    r.part('body', '#b8b4c4')
    r.part('belly', '#f4f0f0', shade=False)
    r.part('ear', '#b8b4c4', ink=True)
    r.part('earin', '#f0b8c8', flat=True)
    r.part('head', '#b8b4c4', ink=True)
    r.part('stripe', '#4a4458', flat=True)
    r.part('paw', '#f0d8d8', ink=True)
    sx = 24.5 if not back else 8
    r.capsule('stem', 22 if not back else 10, 20, sx, 7, 0.45, 0.45)
    r.circle('puff', sx, 6, 5.2)
    for k in range(8):
        t = 2 * math.pi * k / 8
        r.capsule('seed', sx, 6, sx + 4 * math.cos(t), 6 + 4 * math.sin(t), 0.3, 0.3)
    r.ellipse('membrane', 15, 22, 10, 4.5)
    r.ellipse('body', 15, 22.5, 6, 6.5)
    if not back:
        r.ellipse('belly', 15, 24, 3.6, 4.2)
    for x in (9, 21):
        r.circle('ear', x, 10, 3.2)
        if not back:
            r.circle('earin', x, 10.3, 1.7)
    r.ellipse('head', 15, 14.5, 6.6, 5.5)
    r.capsule('stripe', 15, 9.2, 15, 12.5 if not back else 26, 0.6, 0.6)
    if back:
        r.capsule('tail', 15, 27, 17, 31, 1.8, 1.4)
    else:
        r.ellipse('paw', 21.5, 20, 1.6, 1.3)
    eyes(r, 'night', 9, 12, 16, 12, iris='#2a2430')
    pix(r, [(14, 17), (15, 17)], '#d08090')
    pix(r, [(10, 17), (19, 17)], '#f0a8b8')


def fanbat(r, o):
    """a fruit bat that fans itself with its own wings"""
    r.part('wing', '#8a4a88', ink=True)
    r.part('rib', '#5a2a5a', flat=True)
    r.part('body', '#c87a40')
    r.part('ear', '#c87a40', ink=True)
    r.part('earin', '#f0b090', flat=True)
    r.part('head', '#c87a40', ink=True)
    r.part('muzzle', '#e8b080', shade=False)
    for s in (-1, 1):  # pleated, like a folding fan
        cx, cy = 16 + s * 4, 19
        pts = [(cx, cy)] + [(cx + s * 13 * math.sin(math.radians(a)), cy - 13 * math.cos(math.radians(a))) for a in range(20, 141, 15)]
        r.poly('wing', pts)
        for a in range(35, 141, 25):
            r.capsule('rib', cx, cy, cx + s * 12 * math.sin(math.radians(a)), cy - 12 * math.cos(math.radians(a)), 0.35, 0.35)
    r.ellipse('body', 16, 21.5, 5.5, 7)
    for x in (11, 21):
        r.tri('ear', (x - 2.2, 10), (x + (-1 if x < 16 else 1), 3.5), (x + 2.2, 9))
        r.tri('earin', (x - 1, 9.5), (x + (-0.6 if x < 16 else 0.6), 5.5), (x + 1, 9.2))
    r.circle('head', 16, 12, 5.6)
    r.ellipse('muzzle', 16, 14.5, 2.8, 2)
    eyes(r, 'bigc', 12, 10, 18, 10, iris='#4a2a20')
    pix(r, [(15, 14), (16, 14)], INK)
    pix(r, [(11, 14), (20, 14)], '#f08080')
    deco(r, 'swirl', '#d8a8e0', [(0, 26), (27, 26)])


# ---------------------------------------------------------------- CHROME
def tinhermit(r, o):
    """a hermit crab that lives in a tin can, and peeks out of it"""
    r.part('can', '#c8d0d8')
    r.part('label', '#e05050', flat=True)
    r.part('rim', '#9aa4b0', ink=True)
    r.part('dark', '#2a3038', flat=True)
    r.part('stalk', '#e07848', ink=True)
    r.part('eye', '#2a2028', flat=True)
    r.part('claw', '#f08a50', ink=True)
    r.ellipse('can', 16, 18, 12.5, 11.5)
    r.poly('label', [(5, 22), (27, 22), (26, 26), (6, 26)])
    r.ellipse('rim', 16, 17, 9.5, 8.5)
    r.ellipse('dark', 16, 17, 8, 7)
    r.part('crab', '#f08a50', ink=True)
    r.ellipse('crab', 16, 21, 5.5, 3.6)
    r.capsule('stalk', 14, 19, 12.5, 13, 0.7, 0.6); r.capsule('stalk', 18, 19, 19.5, 13, 0.7, 0.6)
    r.part('eyeb', '#f8f4ec', ink=True)
    r.circle('eyeb', 12.5, 12, 2.2); r.circle('eyeb', 19.5, 12, 2.2)
    r.ellipse('claw', 10, 23.5, 3.4, 2.4, rot=20); r.ellipse('claw', 22, 23.5, 3.4, 2.4, rot=-20)
    pix(r, [(12, 12), (13, 12), (19, 12), (20, 12)], INK)
    pix(r, [(15, 22), (16, 22)], INK)
    deco(r, 'diamond', '#c8d0d8', [(2, 3), (27, 4)])


def magplate(r, o):
    """a magpie with steel-plated wings, and something shiny it found"""
    back = r.view == 'back'
    r.part('tail', '#2a3048', ink=True)
    r.part('leg', '#2a2a30', flat=True)
    r.part('body', '#2a2a34')
    r.part('belly', '#f4f4f0', shade=False)
    r.part('wing', '#7890b8', ink=True)
    r.part('plate', '#b8c8e0', flat=True)
    r.part('head', '#2a2a34', ink=True)
    r.part('beak', '#3a3a40', ink=True)
    r.part('spoon', '#e8e8f0', ink=True)
    if not back:
        r.capsule('tail', 18, 24, 27, 30, 1.8, 1.4)
    for x in (14, 18):
        r.rect('leg', x - 0.5, 26, x + 0.5, 30); r.rect('leg', x - 1.5, 30, x + 1.5, 31)
    r.ellipse('body', 16, 20, 7, 7)
    if not back:
        r.ellipse('belly', 16, 22, 4.2, 4.6)
    for s in (-1, 1):
        r.ellipse('wing', 16 + s * (7 if not back else 4.5), 20, 3 if not back else 4, 6.5, rot=s * 12)
        for y in (17, 20, 23):
            x0 = 16 + s * (6 if not back else 3.5)
            r.capsule('plate', x0, y, x0 + s * 2, y + 0.5, 0.35, 0.35)
    r.circle('head', 16, 11, 5.2)
    if back:
        r.capsule('tail', 16, 22, 16, 31, 1.8, 1.4)
        return
    r.poly('beak', [(14.5, 12), (17.5, 12), (16, 15.5)])
    r.capsule('spoon', 17, 14.5, 23, 17, 0.6, 0.6); r.ellipse('spoon', 24.5, 17.8, 2.2, 1.6)
    r.part('eyering', '#f4f4f0', flat=True)
    if r.view == 'front':
        r.circle('eyering', 13, 10.5, 1.8); r.circle('eyering', 19, 10.5, 1.8)
    else:
        eyes(r, 'dot', 13, 10, 19, 10)
    pix(r, [(12, 10), (13, 10), (12, 11), (13, 11), (18, 10), (19, 10), (18, 11), (19, 11)], INK)
    pix(r, [(13, 10), (19, 10)], '#7890b8')
    deco(r, 'sparkle', '#e8f0ff', [(24, 12), (2, 5), (27, 3)])


def knightbug(r, o):
    """a rhinoceros beetle in polished armour, its horn a lance, with a red plume"""
    r.part('leg', '#2a3040', ink=True)
    r.part('shell', '#6a88b8')
    r.part('seam', '#2a3448', flat=True)
    r.part('head', '#4a6090', ink=True)
    r.part('horn', '#8aa8d8', ink=True)
    r.part('plume', '#e04040', ink=True)
    for s in (-1, 1):
        for y, dx in ((18, 9), (22, 10), (26, 9)):
            r.capsule('leg', 16 + s * 6, y, 16 + s * (dx + 3), y + 3, 0.7, 0.6)
    r.ellipse('shell', 16, 21.5, 9.5, 8)
    r.rect('seam', 15.6, 14, 16.4, 29)
    r.ellipse('head', 16, 13.5, 5.6, 4.2)
    r.capsule('horn', 16, 12, 16, 4, 1.8, 1.0)
    r.capsule('horn', 16, 4, 18, 2, 1.0, 0.6)
    r.ellipse('plume', 22.5, 10, 2, 3, rot=30)
    eyes(r, 'glare', 12, 13, 18, 13)
    pix(r, [(10, 23), (21, 21), (12, 18)], '#d8e8ff')
    deco(r, 'diamond', '#a8c0e8', [(2, 4), (27, 26)])


# ---------------------------------------------------------------- BLIGHT
def stinkerbelle(r, o):
    """a skunk with fairy wings; the sparkles are mostly smell"""
    def wings(r, back):
        r.part('fwing', '#e0c8f8', ink=True)
        for s in (-1, 1):
            r.ellipse('fwing', 16 + s * 9, 13, 5, 3.6, rot=s * -30)
            r.ellipse('fwing', 16 + s * 8, 19.5, 3.6, 2.6, rot=s * 30)

    def stripe(r, back, hc):
        r.part('stripe', '#f4f2f0', flat=True)
        r.capsule('stripe', 16, hc - 6, 16, hc - 1.5, 0.9, 0.7)
        r.capsule('stripe', 27.2, 26, 27.6, 16, 0.9, 0.8)
        r.part('wand', '#f8d040', ink=True)
        r.capsule('wand', 21, 26, 24, 21, 0.4, 0.4)
        r.poly('wand', [(24, 18.6), (25, 20.4), (26.8, 20.6), (25.4, 21.8), (25.8, 23.6), (24, 22.6), (22.2, 23.6), (22.6, 21.8), (21.2, 20.6), (23, 20.4)])
    cat(r, dict(fur='#2e2e3a', belly='#3e3e4c', ears='small', earcol='#2e2e3a', ear_in='#e8a0b0', tail='thick',
                head=(7.4, 6.2), eyes='bigc', iris='#58c878', mouth='smile', nose='#e8a0b0', muzzle='#e8e4f0', blush='#e070a0',
                behind=wings, extra=stripe))
    deco(r, 'sparkle', '#98e070', [(1, 3), (27, 2)])
    deco(r, 'swirl', '#98e070', [(1, 25)])


def toadstoolie(r, o):
    """a warty toad hiding under its own toadstool"""
    r.part('leg', '#7a8a4a', ink=True)
    r.part('body', '#8a9a50')
    r.part('wart', '#a8a860', flat=True)
    r.part('belly', '#d8d0a0', shade=False)
    r.part('bulge', '#8a9a50', ink=True)
    r.part('stem', '#f0e8d0', ink=True)
    r.part('cap', '#a83a8a', ink=True)
    r.part('spot', '#f4e8f0', flat=True)
    for s in (-1, 1):
        r.ellipse('leg', 16 + s * 10, 27, 3.5, 2.6, rot=s * 20)
    r.ellipse('body', 16, 23.5, 11, 6.5)
    r.ellipse('belly', 16, 26, 6, 3)
    for x, y in ((8, 21), (24, 22), (12, 19), (20, 19.5), (6, 25), (26, 25.5)):
        r.circle('wart', x, y, 0.8)
    for x in (10.5, 21.5):
        r.circle('bulge', x, 17, 3.2)
    r.rect('stem', 14.5, 10, 17.5, 17)
    r.ellipse('cap', 16, 9.5, 12, 6)
    for x, y, rr in ((10, 8, 1.6), (16, 6, 1.4), (22, 8.5, 1.7), (13, 11, 1), (19.5, 11.2, 1)):
        r.circle('spot', x, y, rr)
    eyes(r, 'shy', 9, 17, 20, 17)
    pix(r, [(14, 23), (15, 24), (16, 24), (17, 23)], INK)
    deco(r, 'swirl', '#a878c8', [(1, 20), (27, 18)])


def coolcarrion(r, o):
    """a vulture in a feather boa; a scavenger, but make it fashion"""
    back = r.view == 'back'
    r.part('leg', '#d8b8a8', flat=True)
    r.part('body', '#3a3040')
    r.part('wing', '#2a2230', ink=True)
    r.part('neck', '#f0a8a0', ink=True)
    r.part('boa', '#f070b0', ink=True)
    r.part('boa2', '#f8b8d8', flat=True)
    r.part('head', '#f0a8a0', ink=True)
    r.part('beak', '#e8d8b0', ink=True)
    for x in (13, 19):
        r.rect('leg', x - 0.6, 26, x + 0.6, 30); r.rect('leg', x - 2, 30, x + 2, 31)
    if not back:
        r.ellipse('wing', 8.5, 21, 3.5, 7, rot=10); r.ellipse('wing', 23.5, 21, 3.5, 7, rot=-10)
    r.ellipse('body', 16, 21, 7.5, 7.5)
    if back:
        r.ellipse('wing', 12, 21, 4.5, 7.5, rot=10); r.ellipse('wing', 20, 21, 4.5, 7.5, rot=-10)
    r.capsule('neck', 16, 15, 16, 10, 1.6, 1.6)
    for k in range(9):  # the boa
        t = math.pi * (k / 8) * (-1 if back else 1)
        r.circle('boa', 16 + 8 * math.cos(t), 16 + 2.6 * math.sin(t), 2.1)
    for k in range(5):
        t = math.pi * (k / 4) * (-1 if back else 1)
        r.circle('boa2', 16 + 7.5 * math.cos(t), 16.5 + 2.2 * math.sin(t), 0.7)
    r.circle('head', 16, 8, 4.4)
    if not back:
        r.poly('beak', [(14.6, 9), (17.4, 9), (17.2, 11.5), (16, 12.6), (14.8, 11.5)])
    eyes(r, 'sleepy', 12, 6.5, 18, 6.5)
    pix(r, [(12, 7), (13, 7), (18, 7), (19, 7)], '#a87898')  # eyeshadow
    deco(r, 'sparkle', '#f8b8d8', [(2, 4), (27, 5)] if not back else [(3, 4)])
    deco(r, 'swirl', '#a878c8', [(1, 26)])


# ---------------------------------------------------------------- BLOOM
def petalpoca(r, o):
    """an alpaca whose fleece is all petals"""
    back = r.view == 'back'
    r.part('leg', '#e8d8c8', ink=True)
    r.part('hoof', '#6a5048', flat=True)
    r.part('fleece', '#f8c8d8', ink=False)
    r.part('petal', '#f0a0c0', flat=True)
    r.part('neck', '#f8e8e0', ink=True)
    r.part('ear', '#f8e8e0', ink=True)
    r.part('head', '#f8e8e0', ink=True)
    r.part('top', '#f8c8d8')
    r.part('flower', '#f8e060', ink=True)
    for x in (11, 14.5, 17.5, 21):
        r.rect('leg', x - 1, 25, x + 1, 30); r.rect('hoof', x - 1, 30, x + 1, 31)
    if back:  # neck and head first: from behind, the fleecy rump is in front
        r.capsule('neck', 16, 19, 16, 11, 3, 2.8)
        r.ellipse('ear', 11.5, 4, 1.2, 2.6, rot=-15); r.ellipse('ear', 20.5, 4, 1.2, 2.6, rot=15)
        r.ellipse('head', 16, 9, 4.6, 4.4)
        for x, y in ((13.5, 5), (16, 4), (18.5, 5), (16, 7)):
            r.circle('top', x, y, 2)
    for x, y, rr in ((10, 22, 4), (15, 20.5, 4.6), (21, 22, 4.2), (13, 25, 3.4), (19, 25, 3.4)) + (((16, 17.5, 4),) if back else ()):
        r.circle('fleece', x, y, rr)
    for x, y in ((10, 21), (15, 19), (21, 21), (13, 24), (19, 24), (17, 22)):
        r.circle('petal', x, y, 0.9)
    if back:
        r.circle('fleece', 16, 25.5, 1.8)  # a little fluff of a tail
        deco(r, 'sparkle', '#f8b0d0', [(3, 3)])
        return
    r.capsule('neck', 16, 19, 16, 11, 3, 2.8)
    r.ellipse('ear', 11.5, 4, 1.2, 2.6, rot=-15); r.ellipse('ear', 20.5, 4, 1.2, 2.6, rot=15)
    r.ellipse('head', 16, 9, 4.6, 4.4)
    for x, y in ((13.5, 5), (16, 4), (18.5, 5)):
        r.circle('top', x, y, 2)
    r.circle('flower', 18.8, 4, 1.2)
    eyes(r, 'bigc', 13, 7.5, 17, 7.5, iris='#6a3a50')
    pix(r, [(15, 11), (16, 12), (17, 11)], INK)
    deco(r, 'leaf', '#68b858', [(2, 10), (27, 12)])
    deco(r, 'sparkle', '#f8b0d0', [(26, 2)])


def meleefite(r, o):
    """a hedgehog whose spines are succulent leaves; it curls up into a rosette"""
    back = r.view == 'back'
    r.part('leaf', '#78b878', ink=True)
    r.part('leaf2', '#a8d0a0', ink=True)
    r.part('tip', '#d87890', flat=True)
    r.part('face', '#f0d8b8', ink=True)
    r.part('nose', '#3a2a28', flat=True)
    r.part('paw', '#e8c8a0', ink=True)
    for a in range(-90, 91, 22):
        leafshape(r, 'leaf', 16, 22, a, 11.5, 2.6)
    for a in range(-79, 80, 22):
        leafshape(r, 'leaf2', 16, 22, a, 8, 2.2)
    for a in range(-90, 91, 22):
        t = math.radians(a)
        r.circle('tip', 16 + 11 * math.sin(t), 22 - 11 * math.cos(t), 0.6)
    if back:  # from behind it is all rosette
        for a in range(-60, 61, 30):
            leafshape(r, 'leaf', 16, 27, a, 9, 2.6)
        r.ellipse('paw', 12, 29.5, 2, 1.3); r.ellipse('paw', 20, 29.5, 2, 1.3)
        return
    r.ellipse('face', 16, 22.5, 6.5, 5.5)
    r.ellipse('paw', 12, 28.5, 2, 1.4); r.ellipse('paw', 20, 28.5, 2, 1.4)
    r.circle('nose', 16, 24.5, 0.9)
    eyes(r, 'shy', 12, 21, 18, 21)
    pix(r, [(11, 24), (20, 24)], '#f0a0a0')
    deco(r, 'sparkle', '#d0f0b0', [(2, 4)])


# ---------------------------------------------------------------- LOAM
def showmeer(r, o):
    """a meerkat standing sentry, mostly so people can see it standing sentry"""
    back = r.view == 'back'
    r.part('tail', '#b89060', ink=True)
    r.part('body', '#d0a870')
    r.part('belly', '#f0dcb0', shade=False)
    r.part('arm', '#c09860', ink=True)
    r.part('head', '#d0a870', ink=True)
    r.part('glasses', '#2a2228', flat=True)
    r.part('lens', '#f05080', flat=True)
    r.part('stripe', '#9a7448', flat=True)
    r.part('foot', '#a88050', flat=True)
    if not back:
        r.capsule('tail', 20, 29, 27, 25, 1.4, 0.9)
    r.ellipse('body', 16, 21, 5.5, 9)
    if not back:
        r.ellipse('belly', 16, 22, 3.4, 7)
    r.ellipse('arm', 12.5, 17, 1.4, 3, rot=25); r.ellipse('arm', 19.5, 17, 1.4, 3, rot=-25)
    r.ellipse('head', 16, 8.5, 4.6, 4.2)
    for x in (13, 19):
        r.ellipse('foot', x, 30, 2, 1.1)
    if back:
        for y in (16, 19, 22, 25):
            r.capsule('stripe', 13, y, 19, y, 0.4, 0.4)
        r.capsule('tail', 16, 27, 17, 31, 1.4, 0.9)
        r.rect('glasses', 11.5, 7.5, 20.5, 8.3)  # the strap of its sunglasses: it never takes them off
        deco(r, 'sparkle', '#f8e070', [(2, 3), (26, 2)])
        return
    r.ellipse('head', 16, 11, 2.4, 2)
    # star-shaped sunglasses: of course
    for x in (13.5, 18.5):
        r.poly('glasses', [(x, 5.4), (x + 0.9, 7), (x + 2.4, 7.2), (x + 1.3, 8.4), (x + 1.6, 10), (x, 9.2), (x - 1.6, 10), (x - 1.3, 8.4), (x - 2.4, 7.2), (x - 0.9, 7)])
        r.circle('lens', x, 7.9, 0.8)
    r.rect('glasses', 14.8, 7.3, 17.2, 8.1)
    if r.view == 'icon':
        eyes(r, 'dot', 13.5, 8, 18.5, 8)
    pix(r, [(15, 11), (16, 11)], INK)
    pix(r, [(15, 13), (16, 13)], INK)
    deco(r, 'sparkle', '#f8e070', [(2, 3), (26, 2), (2, 18)])
    deco(r, 'dust', '#c8a870', [(25, 28)])


def burrowl(r, o):
    """a burrowing owl peeking out of its hole"""
    back = r.view == 'back'
    r.part('mound', '#8a6440')
    r.part('hole', '#2a2018', flat=True)
    r.part('body', '#a8805a')
    r.part('spot', '#f0e4c8', flat=True)
    r.part('head', '#a8805a', ink=True)
    r.part('disc', '#d8c0a0', shade=False)
    r.part('brow', '#f8f4ec', flat=True)
    r.part('beak', '#d8c070', ink=True)
    r.part('wing', '#8a6444', ink=True)
    r.ellipse('mound', 16, 28.5, 15, 4.5)
    r.ellipse('hole', 16, 26.5, 8.5, 2.6)
    r.ellipse('body', 16, 21, 6.5, 6)
    for x, y in ((13, 19), (19, 20), (16, 22.5), (12, 23), (20, 23.5)):
        r.circle('spot', x, y, 0.6)
    r.circle('head', 16, 12, 7)
    if back:
        r.ellipse('wing', 12.5, 21, 3, 5, rot=10); r.ellipse('wing', 19.5, 21, 3, 5, rot=-10)
        for x, y in ((12, 9), (20, 9), (16, 7), (14, 13), (18, 13), (16, 16)):
            r.circle('spot', x, y, 0.6)
        deco(r, 'dust', '#a88058', [(2, 22)])
        return
    r.ellipse('disc', 16, 13, 5.5, 4.4)
    r.capsule('brow', 10, 9.5, 14.5, 10.5, 0.6, 0.5); r.capsule('brow', 22, 9.5, 17.5, 10.5, 0.6, 0.5)
    r.poly('beak', [(15, 14), (17, 14), (16, 16.4)])
    eyes(r, 'bigc', 11, 11, 18, 11, iris='#f0c020')
    for x, y in ((11, 7), (21, 7), (16, 6)):
        r.circle('spot', x, y, 0.5)
    deco(r, 'dust', '#a88058', [(2, 22), (27, 21)])


# ---------------------------------------------------------------- HUSH
def velvetmoth(r, o):
    """a moth with velvet wings it wears like an opera cape"""
    r.part('wing', '#4a3a6a', ink=True)
    r.part('wing2', '#3a2a50', ink=True)
    r.part('moon', '#e8d8a0', flat=True)
    r.part('ant', '#c8b0d8', ink=True)
    r.part('body', '#6a5888')
    r.part('ruff', '#f0e8f8')
    r.part('head', '#6a5888', ink=True)
    for s in (-1, 1):
        r.ellipse('wing', 16 + s * 9, 13, 8, 6.5, rot=s * -20)
        r.ellipse('wing2', 16 + s * 8, 23, 6, 4.8, rot=s * 25)
        r.circle('moon', 16 + s * 10.5, 12.5, 2.2)
        r.circle('wing', 16 + s * 11.2, 12, 1.4)
        leafshape(r, 'ant', 16 + s * 2, 7, s * 30, 6, 1.6)
    r.ellipse('body', 16, 21, 4, 7)
    for k in range(7):
        t = math.pi * k / 6
        r.circle('ruff', 16 + 4.5 * math.cos(t), 14.5 + 1.6 * math.sin(t), 1.8)
    r.circle('head', 16, 11, 3.8)
    eyes(r, 'big', 13, 10, 18, 10)
    deco(r, 'diamond', '#9a88c0', [(1, 27), (28, 28), (14, 0)])


def tarsigh(r, o):
    """a tarsier with enormous eyes, clinging to a branch and sighing"""
    r.part('branch', '#7a5a38', ink=True)
    r.part('body', '#a88870')
    r.part('ear', '#a88870', ink=True)
    r.part('earin', '#e0b8a8', flat=True)
    r.part('head', '#a88870', ink=True)
    r.part('finger', '#c8a890', ink=True)
    r.part('eyeball', '#e8b050', ink=True)
    r.part('pupil', '#2a1c14', flat=True)
    r.rect('branch', 22, 0, 26, 32)
    r.ellipse('body', 17, 23, 6, 7)
    for x in (8, 24):
        r.ellipse('ear', x, 6, 3, 3.4)
        r.ellipse('earin', x, 6.2, 1.6, 2)
    r.ellipse('head', 16, 12, 8.2, 7)
    for s in (-1, 1):
        r.circle('eyeball', 16 + s * 4, 11.5, 3.9)
        r.circle('pupil', 16 + s * 4, 11.8, 1.3)
    r.capsule('finger', 21, 18, 24, 17, 0.6, 0.6); r.capsule('finger', 21, 20, 24.5, 20, 0.6, 0.6)
    r.capsule('finger', 21, 26, 24.5, 25, 0.6, 0.6)
    pix(r, [(11, 9), (19, 9)], WHITE)
    pix(r, [(15, 16), (16, 16)], '#6a4a40')
    deco(r, 'diamond', '#8a7898', [(2, 24), (3, 2)])


# ---------------------------------------------------------------- CURRENT, KINDLE
def voltalotl(r, o):
    """an axolotl whose gill fronds crackle with current"""
    back = r.view == 'back'
    r.part('gill', '#f8d838', ink=True)
    r.part('gilltip', '#48d8f8', flat=True)
    r.part('tail', '#f0a0b8', ink=True)
    r.part('body', '#f8b8c8')
    r.part('belly', '#fde0e8', shade=False)
    r.part('leg', '#f0a0b8', ink=True)
    r.part('head', '#f8b8c8', ink=True)
    r.part('fin', '#f8d0dc', flat=True)
    for s in (-1, 1):
        for k, a in enumerate((-60, -35, -10)):
            t = math.radians(a)
            x0, y0 = 16 + s * 7, 11
            x1, y1 = x0 + s * 7 * math.cos(t), y0 + 7 * math.sin(t)
            r.capsule('gill', x0, y0, x1, y1, 1.1, 0.9)
            r.circle('gilltip', x1, y1, 1)
    if not back:
        r.capsule('tail', 20, 26, 28, 29, 2, 1)
    r.ellipse('body', 16, 23, 7, 5.5)
    if not back:
        r.ellipse('belly', 16, 24.5, 4, 3)
    for x in (10, 22):
        r.ellipse('leg', x, 28, 2, 1.3)
    r.ellipse('head', 16, 13, 9, 6)
    if back:
        r.capsule('fin', 16, 17, 16, 27, 0.8, 0.8)
        r.capsule('tail', 16, 26, 16, 31, 2.2, 1.2)
    eyes(r, 'dot', 11, 12, 20, 12)
    pix(r, [(12, 16), (13, 17), (14, 17), (15, 17), (16, 17), (17, 17), (18, 17), (19, 16)], INK)
    pix(r, [(10, 15), (21, 15)], '#f07090')
    deco(r, 'bolt', '#f8d830', [(1, 20), (27, 18)] if not back else [(2, 20)])


def pandaflare(r, o):
    """a red panda that hides behind its glowing, ember-ringed tail"""
    def tail_front(r, back, hc):
        r.part('ptail', '#c85a28', ink=True)
        r.part('ring', '#6a2a18', flat=True)
        r.part('ember', '#f8c040')
        r.capsule('ptail', 7, 29, 23, 23.5, 3.2, 3.2)
        for x, y in ((11, 27.5), (15, 26), (19, 24.8)):
            r.capsule('ring', x - 0.6, y - 3.2, x + 0.6, y + 3.2, 0.6, 0.6)
        r.circle('ember', 24, 23, 2.6)
    cat(r, dict(fur='#c85a28', belly='#5a2a1a', ears='round', earcol='#c85a28', ear_in='#f4f0e8', tail='none',
                head=(7.8, 6.6), headcol='#d06a30', muzzle='#f4f0e8', muzzle_size=(3.6, 2.4), eyes='shy', mouth='w',
                nose='#2a1c18', pawcol='#3a1c14', blush='#f08070', extra=tail_front))
    deco(r, 'flame', '#f07020', [(2, 6), (27, 8)], '#f8d040')


IDEAS = [
    ('GRANITORT', 'STONE', 'shy', 'tortoise', 'Its shell is a granite boulder with a small garden on top. Has been mistaken for scenery so often that it now just goes with it.', granitort),
    ('GEMSTOAT', 'STONE', 'diva', 'stoat', 'Grows a geode crest every winter and spends the spring pointing at it.', gemstoat),
    ('BRICKWOMB', 'STONE', 'shy', 'wombat', 'Builds walls of perfect stone cubes, then hides behind them. Nobody knows how it gets the corners so square.', brickwomb),
    ('KITEFOX', 'BREEZE', 'diva', 'fox', 'Its ears catch the wind like kites. Ties ribbons to its own tail so everyone can see which way it went.', kitefox),
    ('DANDYGLIDE', 'BREEZE', 'shy', 'sugar glider', 'Drifts from tree to tree on dandelion clocks, which saves it from having to say goodbye.', dandyglide),
    ('FANBAT', 'BREEZE', 'diva', 'fruit bat', 'Fans itself with its own wings whenever anyone looks at it, which is constantly, because it fans itself.', fanbat),
    ('TINHERMIT', 'CHROME', 'shy', 'hermit crab', 'Lives in a tin can and peeks out of the end. Has been politely declining invitations from it for years.', tinhermit),
    ('MAGPLATE', 'CHROME', 'diva', 'magpie', 'Its wings are plated steel and its nest is a museum of spoons. Says every shiny thing was a gift.', magplate),
    ('KNIGHTBUG', 'CHROME', 'diva', 'rhinoceros beetle', 'Polishes its armour every morning and challenges its reflection every afternoon. The reflection has never won.', knightbug),
    ('STINKERBELLE', 'BLIGHT', 'diva', 'skunk', 'Has fairy wings and a wand and believes in itself completely. The sparkles it leaves are mostly smell.', stinkerbelle),
    ('TOADSTOOLIE', 'BLIGHT', 'shy', 'cane toad', 'Hides under its own toadstool. If you can see its eyes, it has already seen you, and is mortified.', toadstoolie),
    ('COOLCARRION', 'BLIGHT', 'diva', 'vulture', 'A scavenger, but make it fashion. Never seen without its feather boa, even at dinner, especially at dinner.', coolcarrion),
    ('PETALPOCA', 'BLOOM', 'diva', 'alpaca', 'Its fleece is all petals, and it sheds a new colour every week. Hums when admired, which is all the time.', petalpoca),
    ('MELEEFITE', 'BLOOM', 'shy', 'hedgehog', 'Its spines are succulent leaves. Curls into a perfect rosette when startled and is usually potted by someone.', meleefite),
    ('SHOWMEER', 'LOAM', 'diva', 'meerkat', 'Stands sentry on every rock it can find, mostly so people can see it standing sentry. Wears the sunglasses at night.', showmeer),
    ('BURROWL', 'LOAM', 'shy', 'burrowing owl', 'Lives in a hole and peeks out at the world. Bobs its head at strangers, then drops out of sight, very fast.', burrowl),
    ('VELVETMOTH', 'HUSH', 'diva', 'moth', 'Wears its velvet wings like an opera cape and sweeps into every room that has a lamp in it.', velvetmoth),
    ('TARSIGH', 'HUSH', 'shy', 'tarsier', 'Its eyes are bigger than its brain and it knows it. Clings to a branch and sighs at anything that happens.', tarsigh),
    ('VOLTALOTL', 'CURRENT', 'diva', 'axolotl', 'Its gill fronds crackle with current and it never stops smiling. Lights up the whole pond when it laughs.', voltalotl),
    ('PANDAFLARE', 'KINDLE', 'shy', 'red panda', 'Its ringed tail glows like embers. Hides behind it whenever anyone looks, which only makes it glow brighter.', pandaflare),
]
