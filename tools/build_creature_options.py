#!/usr/bin/env python3
"""
Five design options for every creature still waiting for art, drawn with the vector rig (tools/creature_rig.py)
and written as drop-in sheets: art/creatures/options/<name>/<name>_<n>.svg (80x32: front, back, two icon
frames - the layout tools/build_creatures.py reads). To use one, copy it to art/creatures/<name>.svg and run
tools/build_creatures.py.

The designs themselves are in tools/creature_designs/*.py: one function per creature, drawing option 1-5.

usage: python3 tools/build_creature_options.py [NAME ...] [--sheet OUT.png]
       python3 tools/build_creature_options.py --picks     (writes the chosen options to art/creatures/)
       python3 tools/build_creature_options.py --ideas OUT.png   (the twenty new creature ideas: front views + a gallery)
"""
import os, sys, glob, importlib.util
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'creature_designs'))
import creature_rig as R  # noqa: E402

ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'art', 'creatures', 'options')

DESIGNS = {}
for f in sorted(glob.glob(os.path.join(HERE, 'creature_designs', '*.py'))):
    spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    DESIGNS.update(getattr(m, 'DESIGNS', {}))


def contact(names, path, scale=4):
    """every option of the given creatures, a row each, on paper"""
    pad, lab = 8, 14
    cw, ch = 80 * scale + pad, 32 * scale + pad
    W = pad + 5 * cw
    H = sum(lab + ch for _ in names) + pad
    im = Image.new('RGB', (W, H), (240, 236, 224))
    dr = ImageDraw.Draw(im)
    y = pad
    for n in names:
        dr.text((pad, y), n + '  (options 1-5: front, back, icons)', fill=(34, 40, 43))
        y += lab
        for k in range(5):
            arr = R.sheet(DESIGNS[n], {'v': k})
            s = Image.fromarray(arr, 'RGBA').resize((80 * scale, 32 * scale), Image.NEAREST)
            im.paste(s, (pad + k * cw, y), s)
            dr.text((pad + k * cw + 2, y + 32 * scale - 10), str(k + 1), fill=(120, 110, 100))
        y += ch
    im.save(path)


# The Society's choices (October 2026): final name -> (design, option 1-5, tweaks). --picks writes each to
# art/creatures/<final name>.svg, where tools/build_creatures.py picks it up.
PICKS = {
    'EMBERWREN': ('EMBERWREN', 4, {}),
    'PYRACAL': ('PYRACAL', 5, {}),
    'FOSSIRE': ('FOSSIRE', 1, {}),             # "with 4's eyes": options 1 and 4 share the same shy eyes
    'BLIZZPARD': ('BLIZZPARD', 5, {}),
    'CROYGEL': ('TARDIGEL', 4, {}),
    'PUFFLUKE': ('PUFFLUKE', 3, {}),
    'YAMMERS': ('DUMBOPUS', 5, {}),
    'MOSSAPO': ('MOSSAPO', 4, {'smile': True}),
    'MARGLEAF': ('MARGLEAF', 3, {}),
    'DUSTDASH': ('DUSTDASH', 4, {}),
    'DUNEKIT': ('DUNEKIT', 3, {}),
    'MONOCAT': ('MANULITH', 5, {}),
    'SHOEBOLT': ('SHOEBOLT', 4, {}),
    'PLATYPULSE': ('PLATYPULSE', 1, {}),  # (was 2, electric yellow: too close to a famous yellow duck)
    'SUCCESSGOAT': ('SAIGUST', 2, {}),
    'GLASSPRITE': ('GLASSPRITE', 3, {}),
}


# ...and the new creature ideas chosen to join the roster (art/creatures/ideas/; numbers as in its gallery)
IDEA_PICKS = ['GEMSTOAT', 'KITEFOX', 'DANDYGLIDE', 'MAGPLATE', 'COOLCARRION', 'PETALPOCA', 'MELEEFITE', 'SHOWMEER', 'BURROWL', 'VOLTALOTL']


def write_picks():
    for final, (design, k, tweak) in PICKS.items():
        arr = R.sheet(DESIGNS[design], dict(tweak, v=k - 1))
        path = os.path.join(ROOT, 'art', 'creatures', final.lower() + '.svg')
        open(path, 'w').write(R.to_svg(arr, '%s (%s, option %d)' % (final.title(), design.title(), k)))
    import ideas
    fns = {n: fn for n, *_rest, fn in ideas.IDEAS}
    for final in IDEA_PICKS:
        arr = R.sheet(fns[final], {'v': 0})
        open(os.path.join(ROOT, 'art', 'creatures', final.lower() + '.svg'), 'w').write(R.to_svg(arr, '%s (from the new creature ideas)' % final.title()))
    print(len(PICKS) + len(IDEA_PICKS), 'picks written to art/creatures/')


TYPE_COLOUR = {'KINDLE': '#d04018', 'BLOOM': '#287830', 'TIDE': '#2860c0', 'CURRENT': '#b08800', 'CHROME': '#607080', 'STONE': '#806838',
               'FROST': '#2890b0', 'BREEZE': '#5868b0', 'LOAM': '#987028', 'GLAM': '#c03880', 'BLIGHT': '#803898', 'HUSH': '#483868'}


def write_ideas(path):
    """the new creature ideas: each front view as an SVG (art/creatures/ideas/), and a gallery with their notes"""
    import textwrap
    from PIL import ImageFont
    import ideas
    out = os.path.join(ROOT, 'art', 'creatures', 'ideas')
    os.makedirs(out, exist_ok=True)
    font = lambda n, b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if b else ''), n)
    S, CW, CH, cols = 6, 330, 330, 4
    rows = (len(ideas.IDEAS) + cols - 1) // cols
    im = Image.new('RGB', (cols * CW + 20, rows * CH + 70), (240, 236, 224))
    dr = ImageDraw.Draw(im)
    dr.text((20, 18), 'Twenty new creature ideas (front views)', fill=(34, 40, 43), font=font(22, True))
    for i, (name, typ, temper, animal, blurb, fn) in enumerate(ideas.IDEAS):
        rig = R.Rig('front'); fn(rig, {'v': 0}); arr = rig.render()
        open(os.path.join(out, name.lower() + '.svg'), 'w').write(R.to_svg(arr, '%s - a new creature idea (%s, %s), front view only' % (name.title(), typ, temper)))
        x, y = 20 + (i % cols) * CW, 60 + (i // cols) * CH
        dr.rounded_rectangle((x, y, x + CW - 14, y + CH - 14), 10, fill=(250, 247, 238), outline=(214, 206, 190))
        spr = Image.fromarray(arr, 'RGBA').resize((32 * S, 32 * S), Image.NEAREST)
        im.paste(spr, (x + (CW - 14 - 32 * S) // 2, y + 8), spr)
        dr.text((x + 12, y + 32 * S + 12), '%d. %s' % (i + 1, name), fill=(34, 40, 43), font=font(17, True))
        tc = tuple(int(TYPE_COLOUR[typ][k:k + 2], 16) for k in (1, 3, 5))
        dr.text((x + 12, y + 32 * S + 34), typ, fill=tc, font=font(13, True))
        dr.text((x + 12 + dr.textlength(typ + '  ', font=font(13, True)), y + 32 * S + 34), '%s  ·  %s' % ('Diva' if temper == 'diva' else 'Shy One', animal), fill=(110, 104, 96), font=font(13))
        for k, line in enumerate(textwrap.wrap(blurb, 44)[:4]):
            dr.text((x + 12, y + 32 * S + 54 + k * 16), line, fill=(60, 60, 64), font=font(12))
    im.save(path)
    print(len(ideas.IDEAS), 'ideas ->', path)


def main(argv):
    if '--picks' in argv:
        return write_picks()
    if '--ideas' in argv:
        return write_ideas(argv[argv.index('--ideas') + 1])
    sheet = None
    if '--sheet' in argv:
        i = argv.index('--sheet'); sheet = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
    names = [a.upper() for a in argv] or sorted(DESIGNS)
    for n in names:
        d = os.path.join(OUT, n.lower())
        os.makedirs(d, exist_ok=True)
        for k in range(5):
            arr = R.sheet(DESIGNS[n], {'v': k})
            open(os.path.join(d, '%s_%d.svg' % (n.lower(), k + 1)), 'w').write(R.to_svg(arr, '%s, option %d of 5' % (n.title(), k + 1)))
    if sheet:
        contact(names, sheet)
    print(len(names), 'creatures x 5 options')


if __name__ == '__main__':
    main(sys.argv[1:])
