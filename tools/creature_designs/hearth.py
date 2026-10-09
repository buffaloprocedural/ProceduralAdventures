"""HEARTH ring designs: KINDLE, BLOOM, TIDE. Each function draws option o['v'] (0-4) of one creature."""
from creature_rig import eyes, pix, deco, hexrgb, INK, WHITE
from common import flame, leafshape, cat, shade

FIRE = '#e86a20'; GOLD = '#f6c040'


# ---------------------------------------------------------------- EMBERWREN: a wren with a burning tail (diva)
def emberwren(r, o):
    v = o['v']
    body, belly, wing, beak = [('#9a5a30', '#f0d4a0', '#6e3c20', '#e8b040'),   # classic brown wren
                               ('#b86a3a', '#f8e0b8', '#8a4a28', '#f0c040'),   # chubby chick
                               ('#c03828', '#f4c890', '#5a2a30', '#f0d060'),   # ember red, charcoal wings
                               ('#8a5a3a', '#f8e8c8', '#5c3a26', '#f0b040'),   # puffed and proud
                               ('#e8a088', '#fff0dc', '#c8705c', '#f8d070')][v]  # peach diva
    r.part('tail', FIRE if v != 4 else '#f06090')
    r.part('tail2', GOLD)
    r.part('body', body)
    r.part('belly', belly, shade=False)
    r.part('wing', wing, ink=True)
    r.part('beak', beak, flat=True)
    r.part('leg', '#c8783c', flat=True)
    back = r.view == 'back'
    fat = [1.0, 1.25, 1.0, 1.15, 1.05][v]
    def tailfire():
        if v == 3:  # fanned: three flames
            for dx, h, ln in ((-3, 15, -3), (2, 18, 1), (7, 14, 4)):
                flame(r, 'tail', (20 if not back else 14) + dx, 20, h, 3.2, ln)
            flame(r, 'tail2', 22 if not back else 16, 18, 9, 2, 1)
        else:
            tx = 22 if not back else 16
            flame(r, 'tail', tx, 21, [17, 12, 19, 0, 16][v], [5, 4, 4.5, 0, 4.5][v], 3)
            flame(r, 'tail2', tx + 1, 19, [9, 6, 11, 0, 8][v], 2.3, 2)
    if not back:
        tailfire()
    # body and head (a wren is mostly one round body)
    r.ellipse('body', 15, 21, 9.5 * fat, 8.5 * fat if v != 1 else 9.5)
    r.circle('body', 13 if not back else 15, 13 if v != 1 else 14, 6.5 if v != 1 else 7)
    if not back:
        r.ellipse('belly', 14, 23, 5.5 * fat, 5 * fat)
        if v == 3:
            r.ellipse('belly', 13.5, 19.5, 5.5, 4)  # the puffed chest
        r.ellipse('wing', 21.5, 21, 3.8, 5.5, rot=-25)
    else:
        r.ellipse('wing', 9.5, 21, 3.6, 6, rot=20)
        r.ellipse('wing', 21, 21, 3.6, 6, rot=-20)
        tailfire()
    if v == 2:
        r.part('crest', '#5a2a30')
        r.tri('crest', (11, 8), (13, 4), (15, 8))
    if v == 4:
        r.part('crest', '#f06090', ink=True)
        flame(r, 'crest', 13, 8, 5, 2)
    # legs
    for lx in (12, 17):
        r.rect('leg', lx, 28.5, lx + 1, 31)
    # face
    if not back:
        eyes(r, ['big', 'round', 'glare', 'big', 'bigc'][v], 9, 11, 14, 11, iris='#7a3010')
        r.tri('beak', (10, 15), (13, 15), (11.5, 17.5))
        if v == 4:
            pix(r, [(8, 14), (16, 14)], '#f08080')  # blush
    if v in (0, 4):
        deco(r, 'sparkle', GOLD, [(26, 4), (2, 22)] if not back else [(3, 5)])
    if v == 2:
        deco(r, 'flame', FIRE, [(2, 4), (27, 24)], GOLD)



def pick(v, *a):
    return a[v]


# ---------------------------------------------------------------- PUFFLUKE: a puffin who repaints its beak (TIDE, diva)
def puffluke(r, o):
    v = o['v']
    back_c, face, stripes = pick(v, ('#2a2c38', '#f4f2ec', ('#f0b030', '#7a8aa0', '#e85a28')),
                                 ('#3a3450', '#fbf4ff', ('#f8d040', '#58c0e8', '#f060a8')),
                                 ('#1c3a5a', '#eef4f8', ('#e8d050', '#3aa8a8', '#e86040')),
                                 ('#585c68', '#e8e6e0', ('#e8c070', '#a0a0b0', '#e8904a')),
                                 ('#28283a', '#f8f0f4', ('#f8e060', '#a060e8', '#f04070')))
    back = r.view == 'back'
    r.part('feet', '#f07a30', flat=True)
    r.part('body', back_c)
    r.part('belly', face, shade=False)
    r.part('wing', back_c, ink=True)
    r.part('head', back_c, ink=True)
    r.part('face', face, shade=False)
    r.part('b0', stripes[0], flat=True); r.part('b1', stripes[1], flat=True); r.part('b2', stripes[2], flat=True)
    fat = 1.15 if v == 3 else 1.0
    for fx in (12, 20):
        r.ellipse('feet', fx, 30, 3, 1.4)
    r.ellipse('body', 16, 21, 8.5 * fat, 8.5)
    if not back:
        r.ellipse('belly', 16, 22.5, 6 * fat, 6.5)
        r.ellipse('wing', 7.8, 21, 2.6, 6, rot=12)
        r.ellipse('wing', 24.2, 21, 2.6, 6, rot=-12)
    else:
        r.ellipse('wing', 10, 21, 3.5, 7, rot=10)
        r.ellipse('wing', 22, 21, 3.5, 7, rot=-10)
    r.ellipse('head', 16, 10.5, 7, 6.3)
    if v == 4:  # a punk crest
        r.part('crest', '#f8e060', ink=True)
        for a in (-20, 0, 20):
            r.poly('crest', [(16 + a / 10 - 1, 5), (16 + a / 4, 0.5), (16 + a / 10 + 1, 5)])
    if not back:
        r.ellipse('face', 16, 11, 5.3, 4.6)
        # the beak, seen from the front: striped, and the pride of its life
        r.poly('b2', [(13.2, 12), (18.8, 12), (17.6, 17), (16, 19), (14.4, 17)])
        r.poly('b1', [(13.4, 12), (18.6, 12), (18.2, 14.4), (13.8, 14.4)])
        r.rect('b0', 13.3, 12, 18.7, 13)
        eyes(r, pick(v, 'big', 'bigc', 'big', 'round', 'bigc'), 11, 9, 19, 9, iris='#a060e8')
        pix(r, [(10, 8), (21, 8)], '#9098a8')  # the puffin's eyeliner
        if v in (1, 4):
            pix(r, [(10, 13), (21, 13)], '#f8a0b8')
    deco(r, 'drop', '#58a8e8', [(2, 6), (27, 18)] if not back else [(3, 6)])
    if v in (1, 4):
        deco(r, 'sparkle', '#f8e060', [(26, 3)])


# ---------------------------------------------------------------- DUMBOPUS: a dumbo octopus on the catwalk (TIDE, diva)
def dumbopus(r, o):
    v = o['v']
    col, fin = pick(v, ('#f0a0a8', '#f8c8c0'), ('#c8a8e8', '#e8d0f8'), ('#f08870', '#f8c0a0'), ('#5a68c8', '#8aa8f0'), ('#f8e0c0', '#f8c870'))
    back = r.view == 'back'
    r.part('web', shade(col, 2) if v != 3 else '#3a3a98')
    r.part('fin', fin, ink=True)
    r.part('body', col)
    r.part('spot', pick(v, '#f8d8d8', '#f8f0ff', '#f8e0c8', '#a8f0f8', '#ffffff'), flat=True)
    # arms and their web, a scalloped skirt
    for x in (8, 12, 16, 20, 24):
        r.circle('web', x, 25 + (1 if x in (12, 20) else 0), 3.2)
    for x in (6.5, 25.5):
        r.capsule('web', x + (1 if x < 16 else -1), 24, x, 29, 1.6, 1.0)
    # ear-fins: it waves them at anything that might be an audience
    tilt = pick(v, 20, 35, 10, 25, 40)
    r.ellipse('fin', 6, 10, 4.2, 2.8, rot=-tilt)
    r.ellipse('fin', 26, 10, 4.2, 2.8, rot=tilt)
    r.ellipse('body', 16, 14, 9.2, 9.6)
    if v == 3:  # glowing spots, from the deep
        for x, y in ((11, 8), (20, 7), (16, 5), (23, 13)) if not back else ((12, 9), (19, 8), (16, 13), (11, 16), (21, 16)):
            r.circle('spot', x, y, 1)
    elif not back:
        r.circle('spot', 12, 7, 1.6)
    if v == 4:
        r.part('bow', '#f05080', ink=True)
        r.tri('bow', (16, 5.5), (12, 3.5), (12, 7.5)); r.tri('bow', (16, 5.5), (20, 3.5), (20, 7.5))
    if not back:
        eyes(r, pick(v, 'wide', 'bigc', 'wide', 'round', 'bigc'), 9.5, 13, 18.5, 13, iris='#7040a0')
        pix(r, [(15, 19), (16, 19)], INK)
        pix(r, [(9, 18), (22, 18)], '#f070a0')
    deco(r, 'sparkle', pick(v, '#f8c0d0', '#e8c8ff', '#f8d0a0', '#a8f0f8', '#f8e060'), [(1, 20), (27, 21)] if not back else [(2, 3)])


# ---------------------------------------------------------------- MOSSAPO: a kakapo too shy for daylight (BLOOM, shy)
def mossapo(r, o):
    v = o['v']
    body, face, moss = pick(v, ('#6a9a40', '#c8c890', '#3a7a30'), ('#88c040', '#e0e0a0', '#58a038'), ('#4a6a38', '#a8a878', '#2a5a28'),
                            ('#7a9848', '#d8d098', '#4a7a38'), ('#9ab850', '#e8e0a8', '#5a9030'))
    back = r.view == 'back'
    r.part('feet', '#a8a8a0', flat=True)
    r.part('body', body)
    r.part('moss', moss, ink=False)
    r.part('wing', shade(body, 2), ink=True)
    r.part('face', face, ink=True)
    r.part('beak', '#d8d0c0', ink=True)
    for fx in (11, 21):
        r.ellipse('feet', fx, 30.2, 2.8, 1.3)
    r.ellipse('body', 16, 19.5, 11, 10.5)
    # mottled moss, the disguise it hopes will work
    pts = [(9, 15), (22, 13), (12, 24), (21, 24), (16, 10)] if back else [(7, 18), (25, 19), (8, 25), (24, 25)]
    for x, y in pts:
        r.ellipse('moss', x, y, 2.2, 1.6)
    if not back:
        r.ellipse('wing', 6.8, 21, 2.6, 5.5, rot=10)
        r.ellipse('wing', 25.2, 21, 2.6, 5.5, rot=-10)
        r.ellipse('face', 16, 13, 7.2, 5.8)
        if o.get('smile'):  # a plain, happy smile instead of the beak
            pix(r, [(13, 15), (14, 16), (15, 16), (16, 16), (17, 16), (18, 15)], INK)
        else:
            r.poly('beak', [(14.5, 14), (17.5, 14), (16.8, 17.5), (16, 18.2), (15.2, 17.5)])
        eyes(r, pick(v, 'dot', 'round', 'sleepy', 'shy', 'dot'), 12, 11, 19, 11)
        pix(r, [(9, 14), (10, 15), (22, 14), (21, 15)], shade(face, 2))  # whisker feathers
        if v in (0, 3):
            pix(r, [(10, 13), (21, 13)], '#e8a0a0')
    else:
        r.ellipse('wing', 10, 18, 4, 8, rot=8)
        r.ellipse('wing', 22, 18, 4, 8, rot=-8)
    # what grows on its head
    if v == 1:
        r.part('flower', '#f8a0c8', ink=True)
        r.circle('flower', 11, 8, 1.6); r.circle('flower', 20, 7, 1.4)
    if v == 3:
        r.part('cap', '#d05040', ink=True); r.part('stem', '#f0e8d0')
        r.rect('stem', 18.5, 6, 20.5, 9)
        r.ellipse('cap', 19.5, 6, 3.6, 2.2)
        pix(r, [(18, 5), (21, 5)], '#ffffff')
    if v == 4:
        r.part('fern', '#3a8a30', ink=True)
        leafshape(r, 'fern', 16, 9.5, -20, 7, 2); leafshape(r, 'fern', 17, 9.5, 25, 6, 1.8)
    if v == 2:
        deco(r, 'sparkle', '#f8f0b0', [(2, 3), (26, 5)])  # stars: it only comes out at night
    else:
        deco(r, 'leaf', '#58a038', [(2, 8), (27, 24)] if not back else [(3, 6)])


# ---------------------------------------------------------------- OKAPINE: an okapi that vanishes into the ferns (BLOOM, shy)
def okapine(r, o):
    v = o['v']
    coat, face = pick(v, ('#5a2e28', '#e8d8c0'), ('#4a2a30', '#efe0c8'), ('#7a4030', '#f0dcc0'), ('#3e2a2a', '#e0d0b8'), ('#6a3428', '#f4e4cc'))
    back = r.view == 'back'
    r.part('legb', shade('#f4ece0', 2))
    r.part('leg', '#f4ece0', ink=True)
    r.part('stripe', '#2a1c1c', flat=True)
    r.part('body', coat)
    r.part('ear', coat, ink=True)
    r.part('earin', '#c89890', flat=True)
    r.part('horn', coat, ink=True)
    r.part('head', coat, ink=True)
    r.part('face', face, shade=False)
    r.part('nose', '#2a1c1c', flat=True)
    r.part('hoof', '#2a1c1c', flat=True)

    def striped_leg(x, y0, y1, w, part='leg'):
        r.rect(part, x - w, y0, x + w, y1)
        for yy in range(int(y0) + 2, int(y1) - 1, 2):
            r.rect('stripe', x - w, yy, x + w, yy + 0.8)
        r.rect('hoof', x - w, y1, x + w, y1 + 1)

    if not back:
        striped_leg(10, 22, 30, 1.4, 'legb'); striped_leg(22, 22, 30, 1.4, 'legb')  # hind legs, behind
        r.ellipse('body', 16, 21, 8.5, 4.6)
        striped_leg(13, 23, 30, 1.5); striped_leg(19, 23, 30, 1.5)
        # big ears, little horns (or fern sprouts), and that pale face it hides behind
        r.ellipse('ear', 8, 9, 4.2, 2.1, rot=-20); r.ellipse('ear', 24, 9, 4.2, 2.1, rot=20)
        r.ellipse('earin', 8.5, 9, 2.4, 1, rot=-20); r.ellipse('earin', 23.5, 9, 2.4, 1, rot=20)
        if v == 1:
            r.part('fern', '#58a040', ink=True)
            leafshape(r, 'fern', 13, 6, -20, 5.5, 1.7); leafshape(r, 'fern', 19, 6, 20, 5.5, 1.7)
        else:
            r.capsule('horn', 13, 6.5, 12.5, 3.5, 1, 0.9); r.capsule('horn', 19, 6.5, 19.5, 3.5, 1, 0.9)
        r.ellipse('head', 16, 11, 6.6, 6)
        r.ellipse('face', 16, 12.2, 4.8, 4.4)
        r.ellipse('nose', 16, 15.6, 2.2, 1.2)
        eyes(r, pick(v, 'shy', 'round', 'big', 'shy', 'big'), 12, 10, 19, 10)
        if v in (0, 3):
            pix(r, [(11, 13), (20, 13)], '#e8a0a0')
        if v == 4:  # the long blue tongue
            r.part('tongue', '#5878d0', flat=True)
            r.capsule('tongue', 17, 17, 19.5, 19, 0.8, 0.7)
        if v == 2:
            r.part('garland', '#58a040', ink=True)
            for x, a in ((11, 110), (14, 150), (18, 210), (21, 250)):
                leafshape(r, 'garland', x, 17.5, a, 3.4, 1.3)
        if v == 3:  # hiding in the ferns, as usual
            r.part('ferns', '#3a8a40', ink=True)
            for x, a in ((3, -15), (7, 12), (25, -12), (29, 15), (5, 35), (27, -35)):
                leafshape(r, 'ferns', x, 31, a, 12, 2.4)
    else:
        # from behind: the striped rump, which is the whole point
        r.ellipse('body', 16, 19.5, 9.5, 6.5)
        for x in (11, 21):
            r.rect('leg', x - 2.4, 20, x + 2.4, 30)
            for yy in (21, 23.5, 26, 28.5):
                r.rect('stripe', x - 2.4, yy, x + 2.4, yy + 1)
            r.rect('hoof', x - 2.4, 30, x + 2.4, 31)
        r.ellipse('ear', 9, 7, 4, 2, rot=-20); r.ellipse('ear', 23, 7, 4, 2, rot=20)
        if v == 1:
            r.part('fern', '#58a040', ink=True)
            leafshape(r, 'fern', 13.5, 5, -20, 5, 1.6); leafshape(r, 'fern', 18.5, 5, 20, 5, 1.6)
        else:
            r.capsule('horn', 13.5, 5, 13, 2.5, 1, 0.9); r.capsule('horn', 18.5, 5, 19, 2.5, 1, 0.9)
        r.ellipse('head', 16, 8.5, 5.6, 4.8)
        r.part('tail', shade(coat, 2), ink=True)
        r.capsule('tail', 16, 17, 16, 23, 0.9, 0.7)
    deco(r, 'leaf', '#4a9a40', [(2, 3), (27, 15)] if not back else [(2, 4)])


DESIGNS = {'EMBERWREN': emberwren, 'PUFFLUKE': puffluke, 'DUMBOPUS': dumbopus, 'MOSSAPO': mossapo, 'OKAPINE': okapine}
