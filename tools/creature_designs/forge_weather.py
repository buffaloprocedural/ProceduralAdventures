"""FORGE and WEATHER rings (and friends): TARDIGEL, DUSTDASH, TENTAMOLE, CASSOROCK, MOLEBRICK, THORNMOLOCH,
SHOEBOLT, PUNCHRIMP."""
from creature_rig import eyes, pix, deco, hexrgb, INK, WHITE
from common import flame, leafshape, shade


def pick(v, *a):
    return a[v]


# ---------------------------------------------------------------- TARDIGEL: a tardigrade of living ice (FROST, shy)
def tardigel(r, o):
    v = o['v']
    col, band = pick(v, ('#a8d8f0', '#78b8e0'), ('#a8ecd8', '#70c8b0'), ('#c8b8f0', '#9a88d8'), ('#b0e0f8', '#80c0e8'), ('#e8f0f8', '#b0c8e0'))
    back = r.view == 'back'
    r.part('leg', shade(col, 2), ink=True)
    r.part('claw', '#2a3040', flat=True)
    r.part('body', col)
    r.part('band', band, flat=True)
    r.part('snout', shade(col, 0), ink=True)
    if v == 3:  # curled into a crystal ball, peeking
        r.part('facet', '#e8f8ff', flat=True)
        r.circle('body', 16, 19, 11)
        for a, b in ((9, 12), (21, 13), (13, 25), (23, 23)):
            r.tri('facet', (a, b), (a + 2, b - 1.5), (a + 1.2, b + 1.5))
        if not back:
            r.ellipse('band', 16, 18, 6, 3.6)
            eyes(r, 'tiny', 13, 17, 18, 17)
            pix(r, [(12, 19), (19, 19)], '#e8a0b8')
        deco(r, 'sparkle', '#e8f8ff', [(2, 4), (26, 3)])
        deco(r, 'flake', '#a8e4f8', [(27, 26)])
        return
    # eight stubby legs (four show from the front)
    for x in (8, 12.5, 19.5, 24):
        r.capsule('leg', x, 24, x + (-1 if x < 16 else 1), 29, 2, 1.8)
        r.rect('claw', x + (-1.5 if x < 16 else 0.5), 29.5, x + (-0.5 if x < 16 else 1.5), 30.5)
    r.ellipse('body', 16, 19, 11, 8.5)
    for yy in (14.5, 19, 23.5) if back else (21, 24.5):
        r.ellipse('band', 16, yy, 10.5 if yy < 24 else 9, 0.5)
    if v == 2:  # crystal ridges along its back
        r.part('crystal', '#e8e0ff', ink=True)
        for x, h in ((10, 4), (14, 6), (18, 6), (22, 4)):
            r.tri('crystal', (x - 1.6, 12), (x, 12 - h), (x + 1.6, 12))
    if v == 4:
        r.part('snow', '#ffffff')
        r.ellipse('snow', 16, 11.5, 8, 2.4)
    if not back:
        r.ellipse('snout', 16, 18.5, 2.8, 2.2)
        pix(r, [(15, 18), (16, 18), (15, 19), (16, 19)], INK)  # the round little mouth
        eyes(r, pick(v, 'shy', 'big', 'round', 'big', 'shy'), 10, 13, 20, 13)
        if v in (0, 4):
            pix(r, [(8, 17), (23, 17)], '#e8a0b8')
    deco(r, 'flake', '#a8e4f8', [(2, 5), (27, 6)] if not back else [(3, 4)])


# ---------------------------------------------------------------- DUSTDASH: a roadrunner who admires its own dust (LOAM, diva)
def dustdash(r, o):
    v = o['v']
    body, belly, crest = pick(v, ('#8a6a48', '#e8dcc0', '#3a4a6a'), ('#c8a870', '#f4ecd8', '#8a6a48'), ('#6a5a50', '#d8d0c8', '#4878c8'),
                              ('#9a7048', '#efe2c8', '#2a3a5a'), ('#a88058', '#f0e4cc', '#c86a30'))
    back = r.view == 'back'
    run = v == 3
    r.part('tail', shade(body, 2), ink=True)
    r.part('leg', '#4a5a78', flat=True)
    r.part('body', body)
    r.part('speck', shade(body, 2), flat=True)
    r.part('belly', belly, shade=False)
    r.part('crest', crest, ink=True)
    r.part('head', body, ink=True)
    r.part('beak', '#3a3a40', ink=True)
    r.part('skin', '#5890e0', flat=True)
    if not back:
        # long tail held high, long legs, beak first: it is always facing somewhere faster
        r.capsule('tail', 21, 17, 29.5, 4 if not run else 9, 2.2, 1.6)
        if run:
            r.capsule('leg', 14, 23, 9, 28, 0.8, 0.8); r.capsule('leg', 17, 23, 22, 29, 0.8, 0.8)
        else:
            r.capsule('leg', 14, 22, 13, 30, 0.8, 0.8); r.capsule('leg', 18, 22, 19.5, 30, 0.8, 0.8)
        r.ellipse('body', 16, 18, 7.5, 5.5, rot=-15)
        r.ellipse('belly', 14.5, 20, 4.5, 3, rot=-15)
        for x, y in ((18, 15), (20, 17), (16, 15.5), (21, 19.5)):
            r.circle('speck', x, y, 0.6)
        for a in (-10, 10, 30):  # the crest
            leafshape(r, 'crest', 12 + a / 12, 6, a + 15, 5, 1.2)
        r.ellipse('head', 11.5, 10, 4.6, 4)
        r.poly('beak', [(8, 10), (1.5, 11.6), (8, 12.2)])
        r.ellipse('skin', 13.8, 9.6, 1.4, 1)
        eyes(r, pick(v, 'big', 'round', 'bigc', 'glare', 'bigc'), 9.5, 8.5, 14, 8.5, iris='#c83020')
    else:
        r.capsule('leg', 13.5, 22, 13, 30, 0.9, 0.9); r.capsule('leg', 18.5, 22, 19, 30, 0.9, 0.9)
        r.ellipse('body', 16, 19, 7, 6)
        for x, y in ((13, 17), (19, 18), (16, 21), (14, 22)):
            r.circle('speck', x, y, 0.6)
        r.ellipse('head', 16, 10, 4.4, 4)
        for a in (-15, 5, 25):
            leafshape(r, 'crest', 16 + a / 10, 7, a, 5, 1.2)
        r.capsule('tail', 16, 20, 17, 4, 2.4, 1.8)
    if v == 2:
        deco(r, 'sparkle', '#f8e070', [(26, 18), (2, 2)] if not back else [(3, 4)])
    deco(r, 'dust', '#c8a870', [(2, 27), (5, 29), (25, 28)] if not run else [(1, 24), (4, 27), (2, 29), (6, 30)])


# ---------------------------------------------------------------- TENTAMOLE: a star-nosed mole who blushes from the nose out (LOAM, shy)
def tentamole(r, o):
    v = o['v']
    fur, star = pick(v, ('#4a3a40', '#f080a0'), ('#5a6070', '#f890b0'), ('#e8dcd0', '#f06890'), ('#3a3030', '#f8a0b8'), ('#6a5048', '#f070a0'))
    back = r.view == 'back'
    r.part('dirt', '#8a6440', ink=False)
    r.part('body', fur)
    r.part('paw', '#f0a8b8', ink=True)
    r.part('star', star, ink=True)
    r.part('starc', shade(star, 0), flat=True)
    if v == 3:  # popping out of a fresh tunnel
        r.ellipse('dirt', 16, 29, 14, 4)
    r.ellipse('body', 16, 19, 10.5, 9.5 if v != 3 else 8.5)
    # big shovel paws
    for x, a in ((6, 30), (26, -30)):
        r.ellipse('paw', x, 25 if v != 3 else 24, 3.6, 2.6, rot=a)
    if not back:
        # the star: twenty-two pink feelers, roughly
        cx, cy = 16, 17
        import math
        n = 11
        for k in range(n):
            t = 2 * math.pi * k / n - math.pi / 2
            r.capsule('star', cx + 1.5 * math.cos(t), cy + 1.5 * math.sin(t), cx + 5 * math.cos(t), cy + 4.6 * math.sin(t), 0.8, 0.9)
        r.circle('starc', cx, cy, 1.8)
        eyes(r, 'dot', 11, 10, 20, 10)
        blush = v in (0, 4) or v == 2
        if blush:
            pix(r, [(9, 14), (10, 14), (21, 14), (22, 14)], '#f8a0b0')
        if v == 4:
            r.part('flower', '#f8e060', ink=True)
            r.circle('flower', 22, 9, 1.6)
    else:
        r.part('tail', shade(fur, 0), ink=True)
        r.capsule('tail', 16, 26, 16, 30, 1, 0.7)
    deco(r, 'dust', '#a88058', [(2, 26), (27, 27)] if not back else [(3, 27)])
    if v == 2:
        deco(r, 'sparkle', '#f8c0d0', [(2, 4)])


# ---------------------------------------------------------------- CASSOROCK: a cassowary whose stone crest is a crown (STONE, diva)
def cassorock(r, o):
    v = o['v']
    body, neck, casque = pick(v, ('#2a2a30', '#3a8ad8', '#a08868'), ('#2a2430', '#4a78e0', '#e8c048'), ('#686870', '#38a8a8', '#8a8a90'),
                              ('#8a6a48', '#b8a888', '#a89070'), ('#3a2a48', '#5a68e8', '#c0a070'))
    back = r.view == 'back'
    chick = v == 3
    r.part('leg', '#8a8a80', ink=True)
    r.part('talon', '#2a2a2a', flat=True)
    r.part('body', body)
    r.part('stripe', '#5a4030', flat=True)
    r.part('neck', neck, ink=True)
    r.part('wattle', '#e03838', ink=True)
    r.part('casque', casque, ink=True)
    r.part('gem', '#e04070', flat=True)
    # thick legs, big feet (they are the problem)
    for x in (12, 20):
        r.rect('leg', x - 1.5, 23, x + 1.5, 29)
        r.ellipse('leg', x + (-1 if x < 16 else 1), 30, 3.2, 1.4)
        if not back:
            r.rect('talon', x - 3.5, 30, x - 2.5, 31); r.rect('talon', x + 2.5, 30, x + 3.5, 31)
    # a shaggy body
    r.ellipse('body', 16, 19, 9.5 if not chick else 8.5, 6.5)
    r.poly('body', [(6.5, 19), (8, 26), (10, 23.5), (12, 26.5), (14, 24), (16, 27), (18, 24), (20, 26.5), (22, 23.5), (24, 26), (25.5, 19)])
    if chick:
        for x in (12, 16, 20):
            r.capsule('stripe', x, 14, x, 25, 0.6, 0.6)
    r.capsule('neck', 16, 17, 16, 11, 2.8, 2.6)
    # the crown (it believes)
    h = 6 if not chick else 3
    if v == 1:
        r.poly('casque', [(12, 7.5), (12, 2), (14, 4.5), (16, 0.5), (18, 4.5), (20, 2), (20, 7.5)])
        r.circle('gem', 16, 4.8, 1)
    else:
        r.poly('casque', [(12.8, 7.5), (14.2, 7.5 - h), (17.4, 7.5 - h - 1), (19.2, 7.5)])
    r.circle('neck', 16, 9.5, 4.8)
    if not back and not chick:
        r.ellipse('wattle', 14, 15.5, 1.2, 2.4); r.ellipse('wattle', 18, 15.5, 1.2, 2.4)
    if not back:
        eyes(r, 'glare' if v != 3 else 'round', 11.5, 8, 18.5, 8)
        r.part('beak', '#3a3a3a', ink=True)
        r.poly('beak', [(14.6, 10.5), (17.4, 10.5), (16, 13.5)])
    if v == 4:
        r.part('cape', '#7a2a5a', ink=True)
        r.poly('cape', [(9, 15), (23, 15), (25, 23), (7, 23)]) if back else None
    deco(r, 'diamond', '#c0a070' if v != 1 else '#e8c048', [(2, 4), (27, 9)] if not back else [(3, 5)])


# ---------------------------------------------------------------- MOLEBRICK: a naked mole-rat dressed in rocks (STONE, shy)
def molebrick(r, o):
    v = o['v']
    skin = pick(v, '#f0a8a0', '#e8a0a8', '#f4b8a8', '#e09890', '#f0b0b0')
    back = r.view == 'back'
    r.part('body', skin)
    r.part('wrinkle', shade(skin, 2), flat=True)
    r.part('head', skin, ink=True)
    r.part('tooth', '#fbf6e8', ink=True)
    r.part('rock', pick(v, '#8a8478', '#9a8a78', '#a09890', '#b06048', '#7a7a88'), ink=True)
    r.part('gem', '#58c8e0', flat=True)
    r.part('paw', shade(skin, 0), ink=True)
    r.ellipse('body', 16, 20, 8, 8.5)
    for yy in (17, 20, 23):
        r.capsule('wrinkle', 11, yy, 21, yy + 0.4, 0.4, 0.4)
    r.circle('head', 16, 11, 6.2)
    if not back:
        r.ellipse('paw', 10, 26, 2.2, 1.6); r.ellipse('paw', 22, 26, 2.2, 1.6)
        r.capsule('wrinkle', 12, 7.5, 20, 7.5, 0.35, 0.35)
        r.rect('tooth', 14.6, 13.5, 17.4, 17)
        eyes(r, 'tiny', 12, 10, 19, 10)
        pix(r, [(16, 13)], '#c06060')
        pix(r, [(10, 12), (21, 12)], '#e88080')
    else:
        r.part('tail', skin, ink=True)
        r.capsule('tail', 16, 26, 17, 30, 0.9, 0.6)
    # the outfit
    if v == 0:  # a rock skirt
        for x, y, rad in ((9, 26, 2.6), (13, 27.5, 2.6), (17, 28, 2.6), (21, 27, 2.6), (24, 25, 2.2)):
            r.circle('rock', x, y, rad)
    elif v == 1:  # a pebble hat and a pebble scarf
        for x in (11, 13.5, 16, 18.5, 21):
            r.circle('rock', x, 16.5, 1.6)
        r.ellipse('rock', 16, 5, 4, 2.2)
        r.circle('rock', 16, 2.5, 1.6)
    elif v == 2:  # just one pebble, held very carefully
        if not back:
            r.circle('rock', 16, 24, 2.6)
    elif v == 3:  # brick armour
        for x0, y0 in ((9, 18), (13, 18), (17, 18), (21, 18), (11, 21.5), (15, 21.5), (19, 21.5), (9, 25), (13, 25), (17, 25), (21, 25)):
            r.rect('rock', x0 - 1.8, y0, x0 + 1.8, y0 + 3)
    else:  # a gem-studded evening outfit
        for x, y in ((10, 22), (14, 24), (18, 24), (22, 22), (16, 20)):
            r.circle('rock', x, y, 2.1)
        if not back:
            for x, y in ((10, 22), (18, 24), (16, 20)):
                r.circle('gem', x, y, 0.8)
    deco(r, 'dust', '#a09080', [(2, 27), (27, 27)] if v != 4 else [])
    if v == 4:
        deco(r, 'sparkle', '#a8f0ff', [(2, 5), (26, 6)])


# ---------------------------------------------------------------- THORNMOLOCH: a thorny devil who avoids small talk (STONE, shy)
def thornmoloch(r, o):
    v = o['v']
    col, patch = pick(v, ('#d09050', '#8a4a28'), ('#c87848', '#6a3424'), ('#d8b070', '#9a6a38'), ('#b08060', '#5a3a2a'), ('#e0a060', '#a05028'))
    back = r.view == 'back'
    import math
    r.part('leg', col, ink=True)
    r.part('spike', shade(col, 0), ink=True)
    r.part('body', col)
    r.part('patch', patch, flat=True)
    r.part('head', col, ink=True)
    r.part('knob', col, ink=True)
    if v == 3:  # the thornball roll
        r.circle('body', 16, 19, 10)
        for k in range(14):
            t = 2 * math.pi * k / 14
            x, y = 16 + 10 * math.cos(t), 19 + 10 * math.sin(t)
            r.tri('spike', (x - 1.5 * math.sin(t), y + 1.5 * math.cos(t)), (16 + 13 * math.cos(t), 19 + 13 * math.sin(t)), (x + 1.5 * math.sin(t), y - 1.5 * math.cos(t)))
        for x, y in ((11, 15), (20, 16), (14, 23), (21, 23)):
            r.circle('patch', x, y, 1.6)
        if not back:
            eyes(r, 'shy', 13, 18, 18, 18)
        deco(r, 'dust', '#c8a070', [(2, 28), (27, 29)])
        return
    # low and wide, legs splayed
    for x0, y0, x1, y1 in ((9, 23, 4, 27), (23, 23, 28, 27), (11, 26, 8, 30), (21, 26, 24, 30)):
        r.capsule('leg', x0, y0, x1, y1, 1.6, 1.2)
    r.part('tail', col, ink=True)
    if not back:
        r.capsule('tail', 22, 26, 29, 22, 1.8, 0.8)
    r.ellipse('body', 16, 22, 10, 6)
    # spikes along every edge (that's the point)
    for k in range(6):
        x = 8.5 + k * 3
        y = 22 - 6 * math.sqrt(max(0, 1 - ((x - 16) / 10) ** 2))
        r.tri('spike', (x - 1.2, y + 1), (x, y - 2.4), (x + 1.2, y + 1))
    for x, y in ((10.5, 21.5), (21.5, 21), (13, 25.5), (19.5, 25.5)):
        r.ellipse('patch', x, y, 1.8, 1.1)
    if back:
        r.circle('knob', 16, 13, 2.6)  # the false head
        r.tri('spike', (15, 11.5), (16, 8.5), (17, 11.5))
        r.capsule('tail', 16, 26, 16, 31, 1.8, 0.8)
    else:
        r.circle('knob', 16, 10.5, 2.4)  # the false head, behind the real one
        r.tri('spike', (15, 9), (16, 6), (17, 9))
        r.ellipse('head', 16, 16.5, 7, 4.8)
        for x in (10.5, 21.5):
            r.tri('spike', (x - 1, 14), (x + (-1.6 if x < 16 else 1.6), 10.8), (x + 1, 14))
        eyes(r, pick(v, 'shy', 'big', 'round', 'shy', 'big'), 11, 14, 19, 14)
        pix(r, [(15, 19), (16, 19)], INK)
        if v == 4:  # sipping dew
            r.part('dew', '#a8e0f8', ink=True)
            r.circle('dew', 16, 22.5, 1.6)
        if v in (0, 4):
            pix(r, [(10, 18), (21, 18)], '#f0a090')
    deco(r, 'dust', '#c8a070', [(2, 28)] if not back else [(3, 28)])


# ---------------------------------------------------------------- SHOEBOLT: a shoebill, still as a statue, then lightning (CURRENT, shy)
def shoebolt(r, o):
    v = o['v']
    body, bill = pick(v, ('#7a8898', '#c8a878'), ('#5a6a90', '#d8c070'), ('#a8b0b8', '#d8c8a0'), ('#3a4458', '#a89070'), ('#8898a8', '#e0c070'))
    back = r.view == 'back'
    r.part('leg', '#3a3a40', flat=True)
    r.part('body', body)
    r.part('wing', shade(body, 2), ink=True)
    r.part('head', body, ink=True)
    r.part('bill', bill, ink=True)
    r.part('bolt', '#f8d830', flat=True)
    for x in (13, 19):
        r.rect('leg', x - 0.6, 24, x + 0.6, 30)
        r.rect('leg', x - 2.2, 30, x + 2.2, 31)
    r.ellipse('body', 16, 19.5, 7.5, 7.5)
    r.ellipse('wing', 9.5 if not back else 11, 20, 3, 6, rot=10)
    r.ellipse('wing', 22.5 if not back else 21, 20, 3, 6, rot=-10)
    if v == 1 and not back:  # lightning markings
        r.poly('bolt', [(15, 15), (18, 15), (16, 19), (18, 19), (14, 25), (15.5, 20), (13.5, 20)])
    r.circle('head', 16, 9, 6.2)
    if v == 4:
        r.part('tuft', body, ink=True)
        r.tri('tuft', (18, 4), (22, 1), (20, 5.5))
    if not back:
        # the bill: enormous, shoe-shaped, and the reason it never has to speak
        r.poly('bill', [(12.5, 10), (19.5, 10), (19.5, 15.5), (17, 18.5), (15, 18.5), (12.5, 15.5)])
        pix(r, [(16, 18), (15, 18)], shade(bill, 2))
        style = pick(v, 'round', 'bigc', 'round', 'wide', 'bigc')
        eyes(r, style, 11, 5.5, 18, 5.5, iris='#f8f080')
        if v == 3:
            pix(r, [(12, 7), (20, 7)], '#f8f060')  # eyes that glow before a storm
    deco(r, 'bolt', '#f8d830', [(2, 4), (27, 14)] if not back else [(3, 4)])


# ---------------------------------------------------------------- PUNCHRIMP: a mantis shrimp waiting for applause (CURRENT, diva)
def punchrimp(r, o):
    v = o['v']
    shell, club, leg, eye = pick(v, ('#4ab868', '#e84838', '#f08838', '#40a8e8'), ('#2aa8b8', '#2868d8', '#58d8c8', '#f8d040'),
                                 ('#f080b0', '#f8c840', '#f8a0c8', '#a868e8'), ('#38a858', '#e83030', '#f0a030', '#f8f8f8'), ('#8a58d8', '#f04898', '#58e8c8', '#f8e040'))
    back = r.view == 'back'
    r.part('fan', leg, ink=True)
    r.part('stalk', shade(shell, 2), ink=True)
    r.part('eye', eye, ink=True)
    r.part('body', shell)
    r.part('seg', shade(shell, 2), flat=True)
    r.part('arm', leg, ink=True)
    r.part('club', club, ink=True)
    r.part('belt', '#f8d040', ink=True)
    # tail fan at the bottom
    for a in (-30, 0, 30):
        leafshape(r, 'fan', 16, 27, 180 + a, 5, 2)
    r.ellipse('body', 16, 19, 6, 8.5)
    for yy in (16, 19.5, 23):
        r.capsule('seg', 11, yy, 21, yy, 0.4, 0.4)
    if v == 3 and not back:
        r.rect('belt', 10, 21, 22, 23)
    # stalked eyes, seeing twelve colours at once
    r.capsule('stalk', 14, 12, 11, 6, 1, 0.8); r.capsule('stalk', 18, 12, 21, 6, 1, 0.8)
    r.circle('eye', 10.5, 5, 2.6); r.circle('eye', 21.5, 5, 2.6)
    # the punch
    for s in (-1, 1):
        r.capsule('arm', 16 + s * 4, 16, 16 + s * 9, 19, 1.2, 1.2)
        r.ellipse('club', 16 + s * 10, 19 + (-3 if v == 3 and s > 0 else 0), 3.4, 3.1)
    if not back:
        pix(r, [(10, 4), (10, 5), (21, 4), (21, 5)], INK)  # pupils
        pix(r, [(11, 4), (22, 4)], WHITE)
        pix(r, [(15, 14), (16, 14)], INK)
    deco(r, 'bolt', '#f8d830', [(1, 9), (27, 10)] if not back else [(3, 12)])
    if v in (2, 4):
        deco(r, 'sparkle', '#f8e070', [(27, 24)])


DESIGNS = {'TARDIGEL': tardigel, 'DUSTDASH': dustdash, 'TENTAMOLE': tentamole, 'CASSOROCK': cassorock, 'MOLEBRICK': molebrick,
           'THORNMOLOCH': thornmoloch, 'SHOEBOLT': shoebolt, 'PUNCHRIMP': punchrimp}
