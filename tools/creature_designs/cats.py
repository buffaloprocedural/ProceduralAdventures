"""The roster's cats: PYRACAL, FOSSIRE, BLIZZPARD, MARGLEAF, DUNEKIT, MANULITH, NIMBUSPARD (5 options each)."""
from creature_rig import deco
from common import cat, flame, leafshape


def pick(v, *opts):
    return opts[v]


# ---------------------------------------------------------------- PYRACAL: a caracal whose ear tufts burn (KINDLE, diva)
def pyracal(r, o):
    v = o['v']
    fur, belly = pick(v, ('#c88a4a', '#f2dcb4'), ('#d8763a', '#f8e2c0'), ('#b86a40', '#efd0a8'), ('#e0a060', '#fbe8c8'), ('#a85a3a', '#f0c8a0'))

    def tufts(r, back, hc):
        r.part('fire', '#f06020'); r.part('fire2', '#f8c840', flat=True)
        h = pick(v, 6, 8, 5, 7, 9)
        for x in (9.3, 22.7):
            lean = -1.5 if x < 16 else 1.5
            flame(r, 'fire', x, 4, h, 1.8, lean)
            flame(r, 'fire2', x, 3.5, h * 0.5, 0.9, lean * 0.6)
    cat(r, dict(fur=fur, belly=belly, ears='tuft', tuftcol='#2a1c18', ear_in='#4a2a20', tail=pick(v, 'curl', 'up', 'curl', 'long', 'curl'),
                marks=['mask'] if v == 2 else [], mark='#7a4a2a', eyes=pick(v, 'glare', 'bigc', 'glare', 'big', 'bigc'), iris='#e8a020',
                head=pick(v, (7.5, 6.5), (8.2, 7), (7.2, 6.3), (8, 6.8), (7.6, 6.5)), slim=pick(v, 0.5, 0, 1, 0, 0.5),
                mouth=pick(v, 'frown', 'w', 'frown', 'smile', 'w'), extra=tufts))
    if v in (1, 4):
        deco(r, 'flame', '#f06020', [(2, 18), (27, 4)] if r.view == 'front' else [(3, 6)], '#f8c840')
    if v == 3:
        deco(r, 'sparkle', '#f8c840', [(2, 5), (27, 20)])


# ---------------------------------------------------------------- FOSSIRE: a fossa who lights tiny campfires (KINDLE, shy)
def fossire(r, o):
    v = o['v']
    fur, belly = pick(v, ('#8a4a30', '#c88a60'), ('#6a3a2a', '#b07858'), ('#a05a3a', '#d8a078'), ('#5a3a34', '#a8705a'), ('#9a6040', '#e0b080'))

    def extra(r, back, hc):
        if v in (1, 3) and r.view != 'back':  # a little campfire it is too nervous to sit beside
            r.part('log', '#5a3a28', ink=True); r.part('cf', '#f07020'); r.part('cf2', '#f8d040', flat=True)
            r.capsule('log', 25, 30, 30, 29, 0.8, 0.8)
            flame(r, 'cf', 27.5, 29, 5, 2.2); flame(r, 'cf2', 27.5, 29, 2.8, 1.1)
        if v == 4:  # ember-tipped tail
            r.part('ember', '#f06020')
            if not back:
                r.circle('ember', 28.3, 12.5, 1.8)
    cat(r, dict(fur=fur, belly=belly, ears='round' if v != 2 else 'small', ear_in='#c07060', tail='long' if v not in (1, 3) else 'wrap', tailw=1.8,
                head=pick(v, (6.6, 5.6), (6.4, 5.6), (6.8, 5.8), (6.2, 5.4), (6.8, 5.8)), body=(7.2, 6.8), slim=1.2,
                eyes=pick(v, 'shy', 'round', 'big', 'shy', 'round'), mouth='w', muzzle_size=(3.4, 2.4), extra=extra,
                blush='#e08080' if v in (0, 3) else None))
    if v in (0, 2):
        deco(r, 'flame', '#f07020', [(25, 4)] if r.view == 'front' else [(4, 4)], '#f8d040')


# ---------------------------------------------------------------- BLIZZPARD: a snow leopard; each spot a frozen compliment (FROST, diva)
def blizzpard(r, o):
    v = o['v']
    fur, belly, mark = pick(v, ('#e4e8ec', '#ffffff', '#6a7888'), ('#d8e8f4', '#ffffff', '#4878a8'), ('#f0ece4', '#ffffff', '#7a7068'),
                            ('#c8dcec', '#f4fbff', '#3a6a98'), ('#e8eef8', '#ffffff', '#8a90b8'))

    def extra(r, back, hc):
        if v == 1 and not back:  # an icicle tiara
            r.part('ice', '#a8e4f8', ink=True)
            for x, h in ((12.5, 3), (16, 4.5), (19.5, 3)):
                r.tri('ice', (x - 1.2, hc - 5.6), (x, hc - 5.6 - h), (x + 1.2, hc - 5.6))
        if v == 3:
            r.part('scarf', '#6ab8e0', ink=True)
            if not back:
                r.ellipse('scarf', 16, hc + 6, 6.5, 1.8)
    cat(r, dict(fur=fur, belly=belly, mark=mark, ears=pick(v, 'round', 'round', 'small', 'round', 'round'), ear_in='#c8d0e0',
                tail='thick', marks=['rosettes'] if v != 4 else ['spots'], eyes=pick(v, 'bigc', 'bigc', 'glare', 'big', 'wide'), iris='#58a8d8',
                head=pick(v, (7.8, 6.6), (8, 6.8), (7.4, 6.2), (7.8, 6.6), (8.4, 7.2)), mouth=pick(v, 'w', 'smile', 'frown', 'w', 'w'),
                nose='#9890a8', extra=extra))
    deco(r, 'flake', '#a8e4f8', [(2, 4), (27, 8), (3, 20)] if r.view == 'front' else [(3, 5), (27, 6)])
    if v == 4:
        deco(r, 'sparkle', '#ffffff', [(26, 19)])


# ---------------------------------------------------------------- MARGLEAF: a margay with a leaf crown (BLOOM, diva)
def margleaf(r, o):
    v = o['v']
    fur, belly, mark = pick(v, ('#c8a050', '#f4e2b8', '#4a3420'), ('#a8b850', '#ecf0c0', '#3a4a20'), ('#d09048', '#f6dcb0', '#5a3018'),
                            ('#b89868', '#efe0c0', '#2a3a28'), ('#d8b060', '#fff0c8', '#305028'))

    def crown(r, back, hc):
        r.part('leaf', pick(v, '#48a040', '#68b838', '#3a8a40', '#2a7a48', '#58b050'), ink=True)
        n = pick(v, 3, 5, 3, 4, 5)
        angs = {3: (-35, 0, 35), 4: (-45, -15, 15, 45), 5: (-50, -25, 0, 25, 50)}[n]
        for a in angs:
            leafshape(r, 'leaf', 16 + a / 12, hc - 5.2, a, 6.5 if a == 0 else 5.2, 2.2)
        if v == 4 and not back:
            r.part('bloom', '#f070a0', ink=True)
            r.circle('bloom', 16, hc - 9.5, 1.6)
    cat(r, dict(fur=fur, belly=belly, mark=mark, ears='round', ear_in='#e8a888', tail='long', tailw=2.0,
                marks=['spots', 'stripes'] if v != 3 else ['rosettes'], eyes=pick(v, 'wide', 'bigc', 'wide', 'big', 'bigc'), iris='#68a838',
                head=(8.2, 6.8), mouth=pick(v, 'smile', 'w', 'smile', 'w', 'smile'), extra=crown, blush='#e89080' if v == 4 else None))
    deco(r, 'leaf', '#58b050', [(2, 6), (27, 18)] if r.view == 'front' else [(3, 8)])


# ---------------------------------------------------------------- DUNEKIT: a sand cat that leaves no footprints (LOAM, shy)
def dunekit(r, o):
    v = o['v']
    fur, belly = pick(v, ('#e0c890', '#f8ecd0'), ('#d8b878', '#f6e6c4'), ('#e8d4a8', '#fff6e0'), ('#c8a870', '#efdcb4'), ('#f0d8a0', '#fff4dc'))

    def extra(r, back, hc):
        if v == 2 and not back:
            r.part('scarf', '#c06040', ink=True)
            r.ellipse('scarf', 16, hc + 6, 6, 1.6)
    cat(r, dict(fur=fur, belly=belly, mark='#a08050', ears='big', ear_in='#e8b0a0', tail=pick(v, 'wrap', 'curl', 'wrap', 'curl', 'wrap'),
                marks=['stripes'] if v in (1, 3) else [], head=pick(v, (7.4, 6.2), (7.2, 6), (7.6, 6.4), (7, 6), (7.8, 6.6)),
                body=(7.4, 6.2), eyes=pick(v, 'shy', 'big', 'round', 'shy', 'wide'), mouth='w', extra=extra, blush='#e8a090' if v in (0, 4) else None))
    deco(r, 'dust', '#c8a870', [(3, 27), (26, 27), (28, 22)] if r.view == 'front' else [(3, 27)])


# ---------------------------------------------------------------- MANULITH: a Pallas's cat, permanently unimpressed (STONE, diva)
def manulith(r, o):
    v = o['v']
    fur, belly, mark = pick(v, ('#9a9488', '#d8d2c4', '#5a5248'), ('#8a8478', '#cfc8b8', '#4a4238'), ('#a8a090', '#e4ddd0', '#6a6050'),
                            ('#7a7a80', '#c8c4c0', '#3a3a44'), ('#b0a090', '#e8dccc', '#6a5848'))

    def extra(r, back, hc):
        if v in (1, 4):  # a slab of stone it sits on (it is very heavy)
            r.part('rock', '#7a7068', ink=True)
            r.ellipse('rock', 16, 30.5, 13, 2.2)
        if v == 3 and not back:
            r.part('pebble', '#6a6a70', ink=True)
            r.circle('pebble', 16, hc - 7.2, 1.8)
    cat(r, dict(fur=fur, belly=belly, mark=mark, ears='flat', ear_in='#a89888', tail='thick', marks=['stripes'],
                head=pick(v, (9, 6.8), (9.4, 7), (8.8, 6.6), (9, 6.6), (9.6, 7.2)), body=(9, 6.8), ruff=True,
                eyes='glare' if v != 2 else 'sleepy', mouth='frown', nose='#8a7070', muzzle_size=(3.6, 2.4), extra=extra))
    if v in (0, 2):
        deco(r, 'diamond', '#a8a090', [(2, 6), (28, 10)] if r.view == 'front' else [(3, 6)])


# ---------------------------------------------------------------- NIMBUSPARD: a clouded leopard who lives in low cloud (BREEZE, shy)
def nimbuspard(r, o):
    v = o['v']
    fur, belly, mark = pick(v, ('#c8b898', '#efe6d4', '#6a7898'), ('#b8c4d8', '#eef2fa', '#5868a8'), ('#d0c0a0', '#f4ecdc', '#7a6a58'),
                            ('#a8b8d0', '#e8eef8', '#48589a'), ('#d8d0c8', '#faf6f0', '#8a8cb0'))

    def extra(r, back, hc):
        if v in (1, 3):  # sits on a little cloud
            r.part('cloud', '#f8fbff', ink=False)
            for x, rad in ((7, 3.2), (12, 3.8), (18, 4), (24, 3.4)):
                r.circle('cloud', x, 30.5, rad)
    cat(r, dict(fur=fur, belly=belly, mark=mark, ears='round', ear_in='#d8b8b8', tail='long', tailw=2.4, marks=['clouds'],
                head=pick(v, (7.4, 6.2), (7.6, 6.4), (7.2, 6.0), (7.8, 6.6), (7.4, 6.4)),
                eyes=pick(v, 'shy', 'round', 'big', 'shy', 'wide'), mouth='w', extra=extra, blush='#e8a8b8' if v in (0, 3) else None))
    deco(r, 'swirl', '#a8b8e0', [(2, 8), (26, 4)] if r.view == 'front' else [(3, 5)])


DESIGNS = {'PYRACAL': pyracal, 'FOSSIRE': fossire, 'BLIZZPARD': blizzpard, 'MARGLEAF': margleaf, 'DUNEKIT': dunekit,
           'MANULITH': manulith, 'NIMBUSPARD': nimbuspard}
