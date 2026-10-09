"""
A small vector rig for drawing creature sprites (tools/build_creature_options.py).

A design draws shapes - ellipses, polygons, capsules, rectangles - in a 32x32 space, each into a named PART
(body, belly, ear, tail...) with a base colour. The rig rasterises them the way a pixel artist would at this
size: shapes are supersampled and each pixel takes the part that covers most of it; each part is shaded in three
tones (lit from the top left, shadowed bottom right); parts marked ink=True get a dark line where they sit in
front of another part; the silhouette gets a 1px dark outline; then eyes, mouths and sparkles are stamped on
pixel by pixel, since at this size a face is a handful of hand-placed pixels.

The same design is drawn three ways: 'front' (32x32), 'back' (32x32, no face, a little closer) and 'icon'
(16x16, two frames), into the 80x32 sheet layout the game reads (art/creatures/*.svg).
"""
import colorsys
import numpy as np
from PIL import Image, ImageDraw

INK = (0x22, 0x28, 0x2b)
WHITE = (0xf6, 0xf4, 0xee)
SS = 8  # supersampling


def hexrgb(h):
    if isinstance(h, tuple):
        return h
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def tones(base):
    """light, mid, dark tones of a colour (hue-shifted a little, as pixel artists do: warm lights, cool darks)"""
    r, g, b = [c / 255 for c in hexrgb(base)]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    def mk(dh, dl, ds):
        rr, gg, bb = colorsys.hls_to_rgb((h + dh) % 1, max(0, min(1, l + dl)), max(0, min(1, s + ds)))
        return (round(rr * 255), round(gg * 255), round(bb * 255))
    light = mk(-0.015, 0.13 if l < 0.75 else 0.07, -0.04)
    dark = mk(0.025, -0.16 if l > 0.25 else -0.08, 0.06)
    return light, mk(0, 0, 0), dark


class Rig:
    def __init__(self, view):
        self.view = view               # 'front' | 'back' | 'icon'
        self.size = 16 if view == 'icon' else 32
        self.parts = {}                # name -> dict(colour, ink, flat, z)
        self.shapes = []               # (z, kind, data, part)
        self.stamps = []               # (x, y, rows, colours) in 32-space
        self.z = 0
        # the back view sits a little closer; the icon is the whole creature at half size
        self.scale = {'front': 1.0, 'back': 1.1, 'icon': 0.5}[view]
        self.dy = 0

    # ---------------------------------------------------------------- parts and shapes
    def part(self, name, colour, ink=False, flat=False, shade=True):
        self.parts[name] = dict(colour=colour, ink=ink, flat=flat, shade=shade)
        return name

    def _xy(self, x, y):
        s = self.scale
        if self.view == 'back':  # grow about the bottom centre
            return (16 + (x - 16) * s) * SS, (31 + (y - 31) * s) * SS
        return x * s * SS, (y * s + self.dy) * SS

    def ellipse(self, part, cx, cy, rx, ry, rot=0, n=48):
        a = np.radians(rot)
        pts = []
        for k in range(n):
            t = 2 * np.pi * k / n
            x, y = rx * np.cos(t), ry * np.sin(t)
            pts.append((cx + x * np.cos(a) - y * np.sin(a), cy + x * np.sin(a) + y * np.cos(a)))
        return self.poly(part, pts)

    def circle(self, part, cx, cy, r):
        return self.ellipse(part, cx, cy, r, r)

    def poly(self, part, pts):
        self.z += 1
        self.shapes.append((self.z, 'poly', [self._xy(x, y) for x, y in pts], part))
        return self

    def rect(self, part, x0, y0, x1, y1):
        return self.poly(part, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])

    def capsule(self, part, x0, y0, x1, y1, r0, r1=None):
        """a limb: a rounded tube from (x0,y0) to (x1,y1), radius r0 tapering to r1"""
        r1 = r0 if r1 is None else r1
        dx, dy = x1 - x0, y1 - y0
        L = max(1e-6, (dx * dx + dy * dy) ** 0.5)
        nx, ny = -dy / L, dx / L
        pts = []
        base = np.arctan2(dy, dx)
        for k in range(13):  # cap at end 1
            t = base - np.pi / 2 + np.pi * k / 12
            pts.append((x1 + r1 * np.cos(t), y1 + r1 * np.sin(t)))
        for k in range(13):  # cap at end 0
            t = base + np.pi / 2 + np.pi * k / 12
            pts.append((x0 + r0 * np.cos(t), y0 + r0 * np.sin(t)))
        return self.poly(part, pts)

    def tri(self, part, a, b, c):
        return self.poly(part, [a, b, c])

    # ---------------------------------------------------------------- pixel stamps (faces, sparkles)
    def stamp(self, x, y, rows, cmap):
        """rows: strings; each char is a key of cmap (a colour), '.' is skip. (x, y) in the 32 grid of this view"""
        self.stamps.append((x, y, rows, cmap))
        return self

    def at(self, x, y):
        """a 32-space point -> this view's pixel grid"""
        X, Y = self._xy(x, y)
        return int(round(X / SS - 0.0001)), int(round(Y / SS - 0.0001))

    # ---------------------------------------------------------------- rasterise
    def render(self):
        N = self.size
        big = Image.new('I', (N * SS, N * SS), 0)
        dr = ImageDraw.Draw(big)
        names = list(self.parts)
        zof = {}
        for z, kind, pts, part in sorted(self.shapes, key=lambda s: s[0]):
            idx = names.index(part) + 1
            zof[idx] = max(zof.get(idx, 0), z)
            dr.polygon(pts, fill=idx)
        L = np.array(big, dtype=np.int32).reshape(N, SS, N, SS).transpose(0, 2, 1, 3).reshape(N, N, SS * SS)
        lab = np.zeros((N, N), dtype=np.int32)
        for y in range(N):
            for x in range(N):
                v = L[y, x]
                nz = v[v > 0]
                if len(nz) >= SS * SS * 0.42:
                    vals, cnt = np.unique(nz, return_counts=True)
                    lab[y, x] = vals[np.argmax(cnt)]
        img = np.zeros((N, N, 4), dtype=np.uint8)
        get = lambda x, y: lab[y, x] if 0 <= x < N and 0 <= y < N else 0
        for y in range(N):
            for x in range(N):
                p = lab[y, x]
                if not p:
                    continue
                P = self.parts[names[p - 1]]
                light, mid, dark = tones(P['colour'])
                c = mid
                if P['shade'] and not P['flat']:
                    br = get(x + 1, y) != p or get(x, y + 1) != p
                    tl = get(x - 1, y) != p or get(x, y - 1) != p
                    if br and not tl:
                        c = dark
                    elif tl and not br and get(x + 1, y + 1) == p:
                        c = light
                    elif br and tl:
                        c = dark if (get(x + 1, y) != p and get(x, y + 1) != p) else mid
                # an inked part draws a line where it sits in front of another part
                if P['ink']:
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        q = get(nx, ny)
                        if q and q != p and zof.get(q, 0) < zof.get(p, 0):
                            c = INK
                            break
                img[y, x, :3] = c
                img[y, x, 3] = 255
        # silhouette outline
        filled = img[:, :, 3] > 0
        out = img.copy()
        for y in range(N):
            for x in range(N):
                if filled[y, x]:
                    continue
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < N and 0 <= ny < N and filled[ny, nx]:
                        out[y, x, :3] = INK
                        out[y, x, 3] = 255
                        break
        # stamps
        for sx, sy, rows, cmap in self.stamps:
            for j, row in enumerate(rows):
                for i, ch in enumerate(row):
                    if ch == '.' or ch not in cmap:
                        continue
                    X, Y = sx + i, sy + j
                    if 0 <= X < N and 0 <= Y < N:
                        col = cmap[ch]
                        if col is None:
                            out[Y, X] = 0
                        else:
                            out[Y, X, :3] = col
                            out[Y, X, 3] = 255
        return out


# ---------------------------------------------------------------- faces and sparkles
EYES = {
    # each: rows for the 32 grid; k = ink, w = highlight, c = iris colour
    'big': ['kk', 'kw', 'kk'],                 # the Society's sprites: tall dark eyes with a glint
    'bigc': ['kkk', 'kcw', 'kck', '.k.'],
    'round': ['.k.', 'kwk', 'kkk', '.k.'],
    'dot': ['k', 'k'],
    'tiny': ['k'],
    'shy': ['k.k', '.k.'][::-1],               # closed, smiling arcs
    'sleepy': ['kkk'],
    'wide': ['.kk.', 'kwkk', 'kkkk', '.kk.'],
    'glare': ['kkk', '.kk'],
    'night': ['.kkk.', 'kcccw', 'kckcc', 'kcccc', '.kkk.'],   # huge round night eyes
}


def eyes(rig, style, lx, ly, rx, ry, iris=None, mirror=True):
    """two eyes at 32-space points (left, right); in the icon they shrink to single pixels"""
    if rig.view == 'back':
        return
    if rig.view == 'icon':
        for (x, y) in ((lx, ly), (rx, ry)):
            X, Y = rig.at(x, y)
            rig.stamp(X, Y, ['k'] if style not in ('shy', 'sleepy') else ['k'], {'k': INK})
        return
    rows = EYES[style]
    cmap = {'k': INK, 'w': WHITE, 'c': hexrgb(iris) if iris else INK}
    for (x, y), flip in (((lx, ly), True), ((rx, ry), False)):
        r = rows
        if mirror and flip:
            r = [row[::-1] for row in rows]
        X, Y = rig.at(x, y)
        rig.stamp(X, Y, r, cmap)


def pix(rig, pts, colour):
    """single pixels (32-space) - mouths, nostrils, glints; front view only (icon: skipped)"""
    if rig.view != 'front':
        return
    for x, y in pts:
        rig.stamp(x, y, ['k'], {'k': colour if isinstance(colour, tuple) else hexrgb(colour)})


SPARKLE = ['..k..', '.kak.', 'kaaak', '.kak.', '..k..']
DIAMOND = ['.k.', 'kak', '.k.']
FLAME = ['..k.', '.kak', 'kaak', 'kabk', '.kk.']
FLAKE = ['k.k', '.a.', 'k.k']
BOLT = ['.kk', 'kak', 'kk.', 'ak.', 'k..']
LEAF = ['.kk', 'kak', 'ka.', 'k..']
DROP = ['.k.', 'kak', 'kak', '.k.']
DUST = ['.k', 'kk']
SWIRL = ['kkk.', '...k', '.kk.']


def deco(rig, kind, colour, spots, colour2=None):
    """type decorations floating around the creature (front and back views; not the icon)"""
    if rig.view == 'icon':
        return
    pat = {'sparkle': SPARKLE, 'diamond': DIAMOND, 'flame': FLAME, 'flake': FLAKE, 'bolt': BOLT,
           'leaf': LEAF, 'drop': DROP, 'dust': DUST, 'swirl': SWIRL}[kind]
    a = hexrgb(colour)
    b = hexrgb(colour2) if colour2 else tones(colour)[0]
    for x, y in spots:
        rig.stamp(x, y, pat, {'k': INK, 'a': a, 'b': b})


# ---------------------------------------------------------------- sheets
def sheet(design, opt):
    """draw a design (fn(rig, opt)) in all three views -> 80x32 RGBA array"""
    out = np.zeros((32, 80, 4), dtype=np.uint8)
    f = Rig('front'); design(f, opt); out[:, 0:32] = f.render()
    b = Rig('back'); design(b, opt); out[:, 32:64] = b.render()
    i1 = Rig('icon'); design(i1, opt); out[0:16, 64:80] = i1.render()
    i2 = Rig('icon'); i2.dy = -1; design(i2, opt); out[16:32, 64:80] = i2.render()  # a little hop
    return out


def to_svg(arr, title):
    """pixel art -> a crisp SVG (one path per colour, runs of pixels as rectangles), like art/creatures"""
    H, W = arr.shape[:2]
    by = {}
    for y in range(H):
        x = 0
        while x < W:
            if arr[y, x, 3] < 128:
                x += 1
                continue
            col = '#%02X%02X%02X' % tuple(arr[y, x, :3])
            x0 = x
            while x < W and arr[y, x, 3] >= 128 and '#%02X%02X%02X' % tuple(arr[y, x, :3]) == col:
                x += 1
            by.setdefault(col, []).append('M%d %dh%dv1h-%dz' % (x0, y, x - x0, x - x0))
    body = '\n'.join('<path fill="%s" d="%s"/>' % (c, ''.join(d)) for c, d in by.items())
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" shape-rendering="crispEdges">\n'
            '<!-- %s. Layout: front 32x32 at (0,0); back 32x32 at (32,0); menu icon 16x16 frame 1 at (64,0), frame 2 at (64,16). -->\n'
            '%s\n</svg>\n') % (W, H, W, H, title, body)
