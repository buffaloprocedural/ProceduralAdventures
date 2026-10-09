"""The rest: PLATYPULSE, LYREWIND, SAIGUST, QUILLCLERK, SCALANX, AYEGHAST, GLASSPRITE, HOATOXIN."""
import math
from creature_rig import eyes, pix, deco, hexrgb, INK, WHITE
from common import flame, leafshape, shade


def pick(v, *a):
    return a[v]


# ---------------------------------------------------------------- PLATYPULSE: a platypus that feels everyone's heartbeat (CURRENT, shy)
def platypulse(r, o):
    v = o['v']
    fur, bill = pick(v, ('#8a5a38', '#7a8898'), ('#c8a040', '#506888'), ('#5a3a2a', '#58a8e8'), ('#b08a68', '#8898a8'), ('#7a4a30', '#f0c040'))
    back = r.view == 'back'
    r.part('mound', '#7a5a38')
    r.part('tail', shade(fur, 2), ink=True)
    r.part('foot', shade(bill, 0), ink=True)
    r.part('body', fur)
    r.part('belly', shade(fur, 0), shade=False)
    r.part('head', fur, ink=True)
    r.part('bill', bill, ink=True)
    if v == 3:  # at home in the riverbank
        r.ellipse('mound', 16, 30, 15, 3.5)
    if not back:
        r.ellipse('tail', 25, 27, 5, 2.6, rot=-20)
    for x in (9, 23):
        r.ellipse('foot', x, 29, 3, 1.6)
    r.ellipse('body', 16, 21, 9.5, 7.5)
    if not back:
        r.ellipse('belly', 16, 23, 5.5, 4.5)
    r.ellipse('head', 16, 12, 6.5, 5.5)
    if not back:
        # the bill: flat, rubbery, and wired like a radio
        r.ellipse('bill', 16, 16, 6, 2.6)
        pix(r, [(14, 15), (18, 15)], shade(bill, 2))
        eyes(r, pick(v, 'shy', 'dot', 'round', 'shy', 'dot'), 12, 10, 19, 10)
        if v in (0, 3):
            pix(r, [(10, 12), (21, 12)], '#e8a0a0')
    else:
        r.ellipse('tail', 16, 27, 5.5, 3.2)
        for yy in (25.5, 27, 28.5):
            r.capsule('tail', 12, yy, 20, yy, 0.25, 0.25)
    deco(r, 'bolt', '#f8d830' if v != 2 else '#68c8f8', [(2, 10), (27, 9)] if not back else [(3, 6)])


# ---------------------------------------------------------------- LYREWIND: a lyrebird that imitates everything, loudly (BREEZE, diva)
def lyrewind(r, o):
    v = o['v']
    body, plume, lace = pick(v, ('#7a5a40', '#a87048', '#f0e8d8'), ('#6a6a8a', '#5890d8', '#f0f4ff'), ('#8a6a8a', '#b088c8', '#f4ecf8'),
                             ('#8a6038', '#e0a838', '#f8f0c8'), ('#6a5040', '#c87050', '#f4e8dc'))
    back = r.view == 'back'
    r.part('lace', lace)
    r.part('rib', shade(plume, 0), flat=True)
    r.part('plume', plume, ink=True)
    r.part('leg', '#3a3030', flat=True)
    r.part('body', body)
    r.part('head', body, ink=True)
    r.part('beak', '#3a3030', flat=True)
    # the tail: a great lacy fan, framed by two lyre-shaped plumes curling out at the tips
    fan = [(16, 23)] + [(16 + 14 * math.sin(math.radians(t)), 23 - 14 * math.cos(math.radians(t))) for t in range(-80, 81, 10)]
    r.poly('lace', fan)
    for t in range(-60, 61, 20):
        a_ = math.radians(t)
        r.capsule('rib', 16 + 4 * math.sin(a_), 23 - 4 * math.cos(a_), 16 + 13 * math.sin(a_), 23 - 13 * math.cos(a_), 0.45, 0.45)
    for s_ in (-1, 1):
        pts = [(16 + s_ * 5, 22), (16 + s_ * 11, 16), (16 + s_ * 14, 9), (16 + s_ * 14.5, 4), (16 + s_ * 12.5, 2.5)]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            r.capsule('plume', x0, y0, x1, y1, 1.2, 1)
    if v == 1:  # streamers of wind
        r.part('ribbon', '#a8d8f8', ink=True)
        r.capsule('ribbon', 3, 14, 7, 20, 0.6, 0.6); r.capsule('ribbon', 29, 14, 25, 20, 0.6, 0.6)
    for x in (14, 18):
        r.rect('leg', x - 0.5, 26, x + 0.5, 30.5)
        r.rect('leg', x - 1.5, 30, x + 1.5, 31)
    r.ellipse('body', 16, 23, 6.5, 5.5)
    r.circle('head', 16, 15.5, 4.8)
    if not back:
        r.tri('beak', (15, 17.5), (17, 17.5), (16, 19.5))
        eyes(r, pick(v, 'big', 'bigc', 'big', 'bigc', 'wide'), 12.5, 13.5, 18, 13.5, iris='#4880c8')
        if v == 4:  # mid-song
            pix(r, [(16, 20)], '#d04050')
    if v == 4:
        r.part('note', INK, flat=True)
        for x, y in ((3, 5), (27, 18)):
            r.circle('note', x, y + 3, 1.2); r.rect('note', x + 0.6, y, x + 1.4, y + 3)
    deco(r, 'swirl', '#a8b8e8', [(1, 24), (26, 26)] if not back else [(2, 25)])
    if v == 3:
        deco(r, 'sparkle', '#f8e070', [(27, 22)])


# ---------------------------------------------------------------- SAIGUST: a saiga, very proud of its nose (BREEZE, diva)
def saigust(r, o):
    v = o['v']
    fur, nose = pick(v, ('#d8b078', '#e8c898'), ('#f0ece4', '#f8f4ee'), ('#b08858', '#c8a070'), ('#d0a068', '#e4bc88'), ('#e0b880', '#f0d0a0'))
    back = r.view == 'back'
    r.part('leg', shade(fur, 2), ink=True)
    r.part('body', fur)
    r.part('ear', fur, ink=True)
    r.part('horn', '#e8d8a8', ink=True)
    r.part('ring', '#b8a070', flat=True)
    r.part('head', fur, ink=True)
    r.part('nose', shade(fur, 2) if v != 1 else '#c8b8b0', ink=True)
    r.part('nostril', '#5a3a30', flat=True)
    winter = v == 1
    for x in (10, 14, 18, 22):
        r.rect('leg', x - 1, 24, x + 1, 30.5)
    r.ellipse('body', 16, 21.5, 9.5 if not winter else 10.5, 5.5 if not winter else 6.5)
    # ridged amber horns
    for s in (-1, 1):
        r.capsule('horn', 16 + s * 2.5, 7, 16 + s * 3.5, 0.5, 1.2, 0.8)
        for yy in (2, 3.5, 5):
            r.rect('ring', 16 + s * 3.1 - 1, yy, 16 + s * 3.1 + 1, yy + 0.6)
    r.ellipse('ear', 9, 8.5, 3.2, 1.4, rot=-15); r.ellipse('ear', 23, 8.5, 3.2, 1.4, rot=15)
    r.ellipse('head', 16, 10.5, 5.5, 5)
    if not back:
        # the nose: enormous, drooping, magnificent, aimed at you
        r.ellipse('nose', 16, 17.5, 4, 5)
        pix(r, [(14, 20), (17, 20), (14, 21), (17, 21)], '#3a2018')
        eyes(r, pick(v, 'glare', 'big', 'glare', 'big', 'bigc'), 11.5, 8.5, 18.5, 8.5, iris='#7a5030')
        if v == 4:
            r.part('bow', '#e04880', ink=True)
            r.tri('bow', (12.5, 2), (10, 0.5), (10.5, 3.5))
    if v == 3:
        r.part('note', INK, flat=True)
        for x, y in ((2, 6), (27, 3)):
            r.circle('note', x, y + 3, 1.2); r.rect('note', x + 0.6, y, x + 1.4, y + 3)
    deco(r, 'swirl', '#c8b080', [(1, 15), (27, 14)] if not back else [(2, 12)])
    if v == 2:
        deco(r, 'dust', '#b09068', [(2, 27), (27, 27)])


# ---------------------------------------------------------------- QUILLCLERK: a secretary bird that signs its victories (CHROME, diva)
def quillclerk(r, o):
    v = o['v']
    body, legs, face, quill = pick(v, ('#b8bcc0', '#2a2a30', '#f08030', '#3a3a44'), ('#98a8c0', '#2a3048', '#e86848', '#c0d0e0'),
                                   ('#f4f2ec', '#2a2a30', '#f09050', '#3a3a44'), ('#a8a8a8', '#303034', '#f07830', '#5a5a64'), ('#4a5878', '#1a2030', '#f0a040', '#d8dce4'))
    back = r.view == 'back'
    r.part('quill', quill, ink=True)
    r.part('tail', '#2a2a30', ink=True)
    r.part('shin', '#e8b0a0', flat=True)
    r.part('thigh', legs, ink=True)
    r.part('body', body)
    r.part('wing', shade(body, 2), ink=True)
    r.part('head', body, ink=True)
    r.part('face', face, flat=True)
    r.part('beak', '#5a5a60', ink=True)
    # steel quills tucked behind its head like pens
    for a in (-60, -40, -20, 20, 40, 60):
        leafshape(r, 'quill', 16 + a / 12, 6, a, 7, 0.9)
    if not back:
        r.capsule('tail', 16, 20, 16, 30, 1.2, 1.2)
    for x in (13.5, 18.5):  # long legs in black trousers
        r.rect('shin', x - 0.6, 24, x + 0.6, 30)
        r.rect('shin', x - 1.8, 30, x + 1.8, 31)
        r.ellipse('thigh', x, 22, 1.8, 3)
    r.ellipse('body', 16, 16.5, 6.5, 5.5)
    r.ellipse('wing', 10.5 if not back else 12, 16.5, 2.4, 5, rot=10)
    r.ellipse('wing', 21.5 if not back else 20, 16.5, 2.4, 5, rot=-10)
    r.circle('head', 16, 8.5, 4.4)
    if not back:
        r.ellipse('face', 16, 8.5, 3.4, 2.2)
        r.poly('beak', [(14.8, 10), (17.2, 10), (16.6, 12), (16, 12.6)])
        eyes(r, pick(v, 'glare', 'glare', 'bigc', 'big', 'glare'), 13, 7, 18, 7, iris='#6a4a2a')
        if v == 2:  # formal
            r.part('tie', '#c02838', ink=True)
            r.tri('tie', (16, 14), (13.5, 12.8), (13.5, 15.2)); r.tri('tie', (16, 14), (18.5, 12.8), (18.5, 15.2))
        if v == 3:  # spectacles and a pen
            pix(r, [(12, 7), (15, 7), (17, 7), (20, 7), (16, 7)], '#c8a040')
            r.part('pen', '#3a3a44', ink=True)
            r.capsule('pen', 24, 20, 28, 12, 0.6, 0.4)
    else:
        r.capsule('tail', 16, 18, 16, 29, 1.6, 1.2)
    deco(r, 'diamond', '#c0c8d0', [(2, 4), (27, 22)] if not back else [(3, 4)])


# ---------------------------------------------------------------- SCALANX: a pangolin who rolls up at a throat-clear (CHROME, shy)
def scalanx(r, o):
    v = o['v']
    scale, skin = pick(v, ('#a87a50', '#e8c8b0'), ('#7888a0', '#e0d0c8'), ('#c8a040', '#f0d8c0'), ('#9a8070', '#e8c8b8'), ('#a85a40', '#f0c8b0'))
    back = r.view == 'back'
    r.part('body', shade(scale, 2))
    r.part('scale', scale)
    r.part('rivet', '#e8e0d0', flat=True)
    r.part('skin', skin, ink=True)
    r.part('claw', '#4a3a3a', flat=True)

    def scales(cx, cy, rx, ry, rows):
        # rows from the top down, each overlapping the one above, like an artichoke
        for j in range(rows):
            y = cy - ry + 1.5 + (2 * ry - 2) * j / max(1, rows - 1)
            w = rx * math.sqrt(max(0.08, 1 - ((y - cy) / ry) ** 2))
            n = max(1, int(round(w / 2.4)))
            for i in range(n + 1):
                x = cx - w + (2 * w) * i / n + (1.2 if j % 2 else 0)
                if abs(x - cx) <= w + 0.5:
                    r.ellipse('scale', x, y, 2.3, 2)
                    if v == 4 and (i + j) % 3 == 0 and r.view != 'icon':
                        r.circle('rivet', x, y - 0.6, 0.45)
    if v == 3:  # rolled into a perfect ball
        r.circle('body', 16, 19, 10.5)
        scales(16, 19, 9.5, 9.5, 6)
        if not back:
            r.ellipse('skin', 16, 21, 3.2, 2.2)
            eyes(r, 'shy', 14, 20, 17, 20)
        deco(r, 'diamond', '#c0c8d0', [(2, 5), (27, 6)])
        return
    if not back:
        r.part('tail', scale, ink=True)
        r.capsule('tail', 22, 27, 29, 21, 2.6, 1.6)
        for x in (10, 22):
            r.ellipse('skin', x, 28.5, 2.2, 1.6)
            r.rect('claw', x - 1.5, 29.5, x - 0.5, 30.5); r.rect('claw', x + 0.5, 29.5, x + 1.5, 30.5)
    r.ellipse('body', 16, 20, 9.5, 8.5)
    scales(16, 20, 8.8, 7.8, 5)
    if not back:
        # a small, worried face poking out of its armour
        r.ellipse('skin', 16, 15, 4.2, 3.6)
        r.ellipse('skin', 16, 18, 2.2, 1.6)
        eyes(r, pick(v, 'shy', 'dot', 'round', 'shy', 'dot'), 13, 14, 18, 14)
        pix(r, [(15, 18), (16, 18)], '#c07070')
        if v in (0, 2):
            pix(r, [(12, 16), (19, 16)], '#f0a0a0')
    else:
        r.part('tail', scale, ink=True)
        r.capsule('tail', 16, 26, 16, 31, 2.8, 1.8)
    deco(r, 'diamond', '#c0c8d0', [(2, 5), (27, 8)] if not back else [(3, 4)])


# ---------------------------------------------------------------- AYEGHAST: an aye-aye who knocks, then flees (HUSH, shy)
def ayeghast(r, o):
    v = o['v']
    fur, iris = pick(v, ('#4a4048', '#f8b830'), ('#a8a0c8', '#f8e070'), ('#2a2a30', '#68e070'), ('#5a4a48', '#f8a030'), ('#6a6080', '#a8f0f8'))
    back = r.view == 'back'
    r.part('trunk', '#6a4a30', ink=True)
    r.part('tail', fur, ink=True)
    r.part('ear', fur, ink=True)
    r.part('earin', '#c09090', flat=True)
    r.part('body', fur)
    r.part('head', fur, ink=True)
    r.part('face', shade(fur, 0), shade=False)
    r.part('finger', shade(fur, 0), ink=True)
    if v == 3 and not back:  # peeking from behind a tree
        r.rect('trunk', 0, 0, 7, 32)
        r.part('bark', '#4a3020', flat=True)
        for y in (5, 13, 22):
            r.rect('bark', 2, y, 4, y + 3)
    if not back:
        r.capsule('tail', 22, 27, 28, 20, 2.8, 3.2)
        r.capsule('tail', 28, 20, 27, 11, 3.2, 2.6)
    for s in (-1, 1):  # bat-wing ears
        r.ellipse('ear', 16 + s * 9, 6.5, 4.6, 4.2)
        if not back:
            r.ellipse('earin', 16 + s * 9, 6.5, 2.8, 2.6)
    r.ellipse('body', 16, 23, 7.5, 7)
    r.circle('head', 16, 11, 7)
    if not back:
        r.ellipse('face', 16, 13.5, 4.2, 3.4)
        # huge round night eyes
        eyes(r, 'night', 9, 7.5, 18, 7.5, iris=iris)
        pix(r, [(15, 15), (16, 15)], '#d08080')
        # the long tapping finger
        r.capsule('finger', 21, 24, 24, 16, 0.6, 0.5)
        r.ellipse('finger', 20, 24.5, 1.8, 1.4)
    else:
        r.capsule('tail', 16, 27, 21, 22, 3, 3.2)
        r.capsule('tail', 21, 22, 21, 13, 3.2, 2.6)
    if v == 1:
        deco(r, 'sparkle', '#e8e0ff', [(2, 18), (26, 26)])
    elif v == 4:
        r.part('glow', '#a8f0f8', flat=True)
        if not back:
            r.circle('glow', 26, 26, 2)
    deco(r, 'diamond', pick(v, '#6a5a78', '#c8c0e8', '#3a3a48', '#6a5a78', '#8a80a8'), [(26, 2), (2, 24)] if not back else [(3, 3)])


# ---------------------------------------------------------------- GLASSPRITE: a glass frog with its heart on show (GLAM, shy)
def glassprite(r, o):
    v = o['v']
    skin, belly, iris = pick(v, ('#98d858', '#d8f0c0', '#f8c830'), ('#88e0c0', '#d8f8ec', '#f8d050'), ('#c8ecc0', '#f4fff0', '#e8b030'),
                            ('#a8d860', '#e0f4c8', '#f8c830'), ('#90d870', '#e8fbe0', '#f8a0c8'))
    back = r.view == 'back'
    r.part('leaf', '#3a9a48', ink=True)
    r.part('drop', '#c8ecf8', ink=True)
    r.part('leg', skin, ink=True)
    r.part('body', skin)
    r.part('belly', belly, shade=False)
    r.part('heart', '#e83848', flat=True)
    r.part('bulge', skin, ink=True)
    r.part('eyeball', iris, ink=True)
    r.part('spot', '#f8f8e8', flat=True)
    if v == 3:  # sheltering under a leaf, hoping nobody looks up
        r.poly('leaf', [(3, 9), (10, 3), (22, 2), (30, 7), (26, 10), (6, 11)])
    if v == 4:  # sitting on a dewdrop
        r.ellipse('drop', 16, 28.5, 9, 3.2)
    for s in (-1, 1):
        r.ellipse('leg', 16 + s * 9, 25, 3.4, 2.4, rot=s * 25)
        r.ellipse('leg', 16 + s * 7, 28.5, 2.6, 1.6)
    r.ellipse('body', 16, 23, 8.5, 6)
    if not back:
        r.ellipse('belly', 16, 24.5, 5.2, 3.6)
        # you can see its heart beating, which is mortifying
        r.circle('heart', 15.3, 24, 0.9); r.circle('heart', 16.8, 24, 0.9); r.tri('heart', (14.4, 24.2), (17.7, 24.2), (16, 26))
    r.ellipse('body', 16, 17, 8, 4.8)
    for s in (-1, 1):
        r.circle('bulge', 16 + s * 5, 13.5, 3.4)
        if not back:
            r.circle('eyeball', 16 + s * 5, 13.5, 2.3)
    if not back:
        pix(r, [(10, 13), (11, 13), (21, 13), (22, 13)], INK)
        pix(r, [(11, 12), (22, 12)], WHITE)
        pix(r, [(14, 19), (17, 19), (15, 20), (16, 20)] if v == 0 else [(15, 19), (16, 19)], INK)
        if v in (0, 2, 4):
            pix(r, [(9, 17), (22, 17)], '#f8a0b0')
    else:
        for x, y in ((12, 17), (19, 18), (16, 21), (13, 23), (20, 24)):
            r.circle('spot', x, y, 0.7)
    deco(r, 'sparkle', pick(v, '#f8f0a0', '#c8fff0', '#ffffff', '#f8f0a0', '#f8c0e0'), [(2, 4), (27, 18)] if not back else [(3, 5)])


# ---------------------------------------------------------------- HOATOXIN: a hoatzin; smells like compost, calls it a fragrance (BLIGHT, diva)
def hoatoxin(r, o):
    v = o['v']
    body, chest, crest, skin = pick(v, ('#7a4a30', '#e8c890', '#c86a30', '#58a8e8'), ('#5a3a40', '#e8b8d0', '#f040a0', '#68d8e8'),
                                    ('#4a3050', '#c8a8d8', '#8a48b8', '#58c8a8'), ('#8a5a38', '#f0d0a0', '#d87838', '#4898e0'), ('#9a6a48', '#f0d8b0', '#e08840', '#70b8e8'))
    back = r.view == 'back'
    r.part('heap', '#6a5a30', ink=True)
    r.part('tail', shade(body, 2), ink=True)
    r.part('leg', '#4a4040', flat=True)
    r.part('body', body)
    r.part('chest', chest, shade=False)
    r.part('wing', shade(body, 2), ink=True)
    r.part('crest', crest, ink=True)
    r.part('head', body, ink=True)
    r.part('skin', skin, flat=True)
    r.part('beak', '#5a4a40', ink=True)
    if v == 3:  # its tiny compost heap (a fragrance, it insists)
        r.ellipse('heap', 16, 30, 13, 3)
    if not back:
        r.ellipse('tail', 23, 24, 3, 6, rot=-25)
    for x in (13.5, 18.5):
        r.rect('leg', x - 0.6, 26, x + 0.6, 30.5); r.rect('leg', x - 1.8, 30, x + 1.8, 31)
    r.ellipse('body', 16, 21, 7.5, 6.5)
    if not back:
        r.ellipse('chest', 15, 22, 4.5, 4.5)
        r.ellipse('wing', 9.5, 21, 2.6, 5, rot=10)
        if v == 4:  # a chick, with claws on its wings
            r.part('claw', INK, flat=True)
            r.rect('claw', 7, 17, 8, 18); r.rect('claw', 24, 17, 25, 18)
        r.ellipse('wing', 22.5, 21, 2.6, 5, rot=-10)
    else:
        r.ellipse('wing', 12, 20, 3.5, 6, rot=10); r.ellipse('wing', 20, 20, 3.5, 6, rot=-10)
        r.ellipse('tail', 16, 26, 5, 3)
    # the crest: restyled every morning
    n, h = pick(v, (5, 6), (3, 8), (6, 5), (5, 6), (3, 3.5))
    for k in range(n):
        a = -45 + 90 * k / max(1, n - 1)
        leafshape(r, 'crest', 16 + a / 15, 7.5, a, h, 1.1)
    r.circle('head', 16, 11, 5)
    if not back:
        r.ellipse('skin', 12.5, 10.5, 2, 1.8); r.ellipse('skin', 19.5, 10.5, 2, 1.8)
        eyes(r, 'bigc', 12, 9, 19, 9, iris='#d02828')
        r.tri('beak', (14.8, 12.5), (17.2, 12.5), (16, 14.5))
    deco(r, 'swirl', pick(v, '#a878c8', '#f070c0', '#58c8a8', '#a878c8', '#a878c8'), [(1, 4), (26, 16), (2, 20)] if not back else [(2, 6), (26, 5)])


DESIGNS = {'PLATYPULSE': platypulse, 'LYREWIND': lyrewind, 'SAIGUST': saigust, 'QUILLCLERK': quillclerk, 'SCALANX': scalanx,
           'AYEGHAST': ayeghast, 'GLASSPRITE': glassprite, 'HOATOXIN': hoatoxin}
