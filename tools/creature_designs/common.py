"""Shared body plans for the creature designs: a sitting cat (the roster has seven), and small helpers."""
from creature_rig import eyes, pix, deco, hexrgb, tones, INK, WHITE


def shade(colour, k=2):
    """a colour's light (0), mid (1) or dark (2) tone, as hex"""
    return '#%02x%02x%02x' % tones(colour)[k]


def flame(r, part, x, y, h, w=4, lean=0):
    """a flame tongue rising from (x, y), h tall"""
    r.poly(part, [(x - w, y), (x - w * 0.8 + lean * 0.3, y - h * 0.45), (x + lean, y - h), (x + w * 0.6 + lean * 0.4, y - h * 0.5), (x + w, y)])


def leafshape(r, part, x, y, ang, L=6, W=2.4):
    """a pointed leaf from (x, y) at angle ang (degrees, 0 = up)"""
    import math
    a = math.radians(ang)
    ux, uy = math.sin(a), -math.cos(a)
    px, py = -uy, ux
    tip = (x + ux * L, y + uy * L)
    mid = (x + ux * L * 0.45, y + uy * L * 0.45)
    r.poly(part, [(x, y), (mid[0] + px * W, mid[1] + py * W), tip, (mid[0] - px * W, mid[1] - py * W)])


def cat(r, P):
    """A sitting cat, front or back. P: fur, belly, ear_in, mark, ears, tail, marks, head (rx, ry), body (rx, ry),
    eyes, iris, muzzle (colour or None), nose, extra(r, back) for accessories, slim, tailcol"""
    back = r.view == 'back'
    fur = P['fur']; belly = P.get('belly', fur)
    r.part('tail', P.get('tailcol', shade(fur, 2) if back else fur), ink=back)  # from behind, the tail curls up in front
    r.part('body', fur)
    r.part('chest', belly, shade=False)
    r.part('ear', P.get('earcol', fur))
    r.part('earin', P.get('ear_in', '#e8a0a0'), flat=True)
    r.part('head', P.get('headcol', fur), ink=True)
    r.part('muzzle', P.get('muzzle') or belly, shade=False)
    r.part('mark', P.get('mark', '#3a3030'), flat=True)
    r.part('paw', P.get('pawcol', belly if P.get('socks') else fur), ink=True)
    hx, hy = P.get('head', (7.5, 6.5))
    bx, by = P.get('body', (8, 6.5))
    hc = 12.5 - (hy - 6.5) * 0.5
    slim = P.get('slim', 0)
    tail = P.get('tail', 'curl')
    tw = P.get('tailw', 2.2)

    def draw_tail():
        if tail == 'curl':
            r.capsule('tail', 22, 28.5, 27.5, 25, tw, tw)
            r.capsule('tail', 27.5, 25, 27, 17.5, tw, tw * 0.9)
        elif tail == 'thick':
            r.capsule('tail', 21, 29, 27, 26, 3.2, 3.2)
            r.capsule('tail', 27, 26, 27.5, 15.5, 3.2, 3.0)
        elif tail == 'long':
            r.capsule('tail', 22, 29, 29, 25, tw, tw)
            r.capsule('tail', 29, 25, 28.5, 12, tw, tw * 0.8)
        elif tail == 'wrap':
            r.capsule('tail', 22, 29.5, 8, 30, tw, tw)
        elif tail == 'up':
            r.capsule('tail', 22, 27, 27, 9, tw, tw * 0.8)

    def draw_tail_back():
        if tail in ('curl', 'thick', 'long', 'up'):
            w = 3.0 if tail == 'thick' else tw
            r.capsule('tail', 16, 30, 21, 26, w, w)
            r.capsule('tail', 21, 26, 21.5, 17 if tail != 'up' else 12, w, w * 0.85)
        elif tail == 'wrap':
            r.capsule('tail', 9, 29.5, 24, 29.5, tw, tw)

    if P.get('behind'):  # wings, props: anything behind the whole cat
        P['behind'](r, back)
    if not back:
        draw_tail()
    # body: torso and sitting haunches
    r.ellipse('body', 16, 23.5, bx - slim, by)
    r.ellipse('body', 10.5 + slim, 26.5, 4.5, 4)
    r.ellipse('body', 21.5 - slim, 26.5, 4.5, 4)
    if not back:
        r.ellipse('chest', 16, 22.5, 3.8 - slim * 0.4, 5)
    # ears (behind the head)
    ears = P.get('ears', 'pointy')
    shapes = {
        'pointy': ((9.3, 10), (9.5, 2.5), (14, 6.5)),
        'tuft': ((9.5, 10), (9.0, 1.5), (14, 6.5)),
        'big': ((8.0, 11), (6.5, 1.0), (14.5, 6.0)),
        'flat': ((8.0, 10.5), (5.5, 7.0), (12.5, 7.0)),
        'small': ((10.0, 9.5), (10.5, 4.5), (14, 7.0)),
    }
    if ears == 'round':
        for ex in (10.3, 21.7):
            r.circle('ear', ex, hc - 5.8, 2.9)
            if not back:
                r.circle('earin', ex, hc - 5.6, 1.5)
    elif ears in shapes:
        a, b, c = shapes[ears]
        for flip in (False, True):
            m = (lambda p: (32 - p[0], p[1])) if flip else (lambda p: p)
            r.tri('ear', m(a), m(b), m(c))
            if not back:
                ia = (a[0] + 1.6, a[1] - 1.2); ib = (b[0] + 0.9, b[1] + 2.4); ic = (c[0] - 1.6, c[1] + 0.6)
                r.tri('earin', m(ia), m(ib), m(ic))
            if ears == 'tuft':
                tp = (b[0], b[1])
                r.part('tuft', P.get('tuftcol', '#2a2020'), flat=True)
                r.capsule('tuft', *m(tp), *m((tp[0] - 0.8, tp[1] - 2.8)), 0.7, 0.5)
    # head
    r.ellipse('head', 16, hc, hx, hy)
    if P.get('ruff'):
        r.ellipse('head', 16, hc + 2.5, hx + 1.2, hy - 2.2)
    if back:
        draw_tail_back()
    # markings
    marks = P.get('marks', [])
    if 'spots' in marks:
        pts = [(11, 21), (20, 20), (9, 25), (23, 25), (15, 27)] if not back else [(12, 20), (19, 21), (16, 24), (10, 26), (22, 27), (14, 9), (18, 10)]
        for x, y in pts:
            r.circle('mark', x, y, 0.9)
        if not back:
            for x, y in ((12, hc - 3.6), (20, hc - 3.4), (16, hc - 4.8)):
                r.circle('mark', x, y, 0.75)
    if 'rosettes' in marks:
        pts = [(10.5, 21.5), (21, 21), (12, 26.5), (20.5, 27)] if not back else [(12, 20.5), (20, 21), (16, 25.5), (11, 27), (21.5, 27.5), (16, 10)]
        for x, y in pts:
            r.circle('mark', x, y, 1.5)
            r.circle('body', x, y, 0.6)
    if 'stripes' in marks:
        for x in (13, 16, 19):
            r.capsule('mark', x, hc - hy + 1.5, x, hc - hy + 3.2, 0.55, 0.45)
        if back:
            for y in (19, 22.5, 26):
                r.capsule('mark', 11, y, 21, y, 0.6, 0.6)
    if 'clouds' in marks:
        pts = [(10, 21.5, 2.3, 1.6), (22, 21, 2.0, 1.7), (11.5, 27, 2.0, 1.4)] if not back else [(11, 20, 2.6, 1.8), (21, 21, 2.4, 1.8), (16, 25.5, 2.5, 1.6), (16, 9.5, 2.2, 1.4)]
        r.part('cloud', P.get('mark', '#606878'), ink=False)
        for x, y, a, b in pts:
            r.ellipse('cloud', x, y, a, b)
            r.ellipse('body', x, y, a * 0.45, b * 0.45)
    if 'mask' in marks and not back:
        r.ellipse('mark', 16, hc - 1, hx - 1.5, 1.5)
    # face
    if not back:
        mz = P.get('muzzle_size', (3.2, 2.2))
        r.ellipse('muzzle', 16, hc + 3, mz[0], mz[1])
    # front paws
    if not back:
        r.ellipse('paw', 13.2 + slim * 0.3, 29.4, 2.2, 1.6)
        r.ellipse('paw', 18.8 - slim * 0.3, 29.4, 2.2, 1.6)
    if P.get('extra'):
        P['extra'](r, back, hc)
    if not back:
        ey = hc - 2
        es = P.get('eyes', 'big')
        if es in ('big',):
            eyes(r, 'big', 12, ey, 19, ey)
        elif es in ('bigc',):
            eyes(r, 'bigc', 11, ey, 19, ey, iris=P.get('iris'))
        elif es == 'wide':
            eyes(r, 'wide', 10, ey - 0.5, 18.5, ey - 0.5)
        elif es == 'glare':
            eyes(r, 'glare', 11, ey + 0.5, 19, ey + 0.5)
        else:
            eyes(r, es, 12, ey, 19, ey)
        nose = hexrgb(P.get('nose', '#d07080'))
        pix(r, [(15, int(hc + 2)), (16, int(hc + 2))], nose)
        mouth = P.get('mouth', 'w')
        if mouth == 'w':
            pix(r, [(14, int(hc + 4)), (17, int(hc + 4)), (15, int(hc + 3) + 1)], INK)
        elif mouth == 'frown':
            pix(r, [(14, int(hc + 4) + 1), (15, int(hc + 4)), (16, int(hc + 4)), (17, int(hc + 4) + 1)], INK)
        elif mouth == 'smile':
            pix(r, [(14, int(hc + 4)), (15, int(hc + 4) + 1), (16, int(hc + 4) + 1), (17, int(hc + 4))], INK)
        if P.get('blush'):
            pix(r, [(10, int(hc + 2)), (21, int(hc + 2))], P['blush'])
