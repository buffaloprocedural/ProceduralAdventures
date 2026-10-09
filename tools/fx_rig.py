"""
A tiny vector rig for the battle-effect tiles (tools/build_fx.py, tools/fx_designs.py).

A design draws shapes - polygons, ellipses, thick strokes, stars - in an 8x8 unit space, each in one of the four
shades the game tints with an effect palette (src/game/battle.js FXPAL):
    0 = the palette's near-white (cores, glints)   1 = light   2 = mid   3 = dark (outlines, shadows)
Later shapes paint over earlier ones. The same design renders at 16x16 (the size battles mostly show) or 8x8
(for the few small uses). The rig rasterises it the way a pixel artist would: each pixel is supersampled and
takes the shade covering most of it, and only becomes solid when the shapes cover enough of it. The silhouette
gets a 1px dark outline (it sits on a light battle background) unless a design opts out, and single pixels can be set by hand (in 8-unit space, so a hand pixel is
a 2x2 block at 16x16).
"""
import math
import numpy as np
from PIL import Image, ImageDraw

SS = 16       # supersampling per pixel
N = 8         # tile size
EMPTY = 255


class FX:
    def __init__(self, n=N):
        self.n = n
        self.u = n / 8                                    # pixels per unit
        self.img = Image.new('L', (n * SS, n * SS), 0)   # label = shade + 1; 0 = empty
        self.d = ImageDraw.Draw(self.img)
        self.fixes = []
        self.outline_shade = 3   # every effect gets a dark outline unless it opts out (plain())
        self.cover = 0.4

    def _p(self, pts):
        k = SS * self.u
        return [(x * k, y * k) for x, y in pts]

    # ---------------------------------------------------------------- shapes (shade 0..3, or None to erase)
    def _v(self, shade):
        return 0 if shade is None else shade + 1

    def poly(self, shade, pts):
        self.d.polygon(self._p(pts), fill=self._v(shade))

    def ellipse(self, shade, cx, cy, rx, ry, rot=0, n=40):
        a = math.radians(rot)
        pts = [(cx + rx * math.cos(t) * math.cos(a) - ry * math.sin(t) * math.sin(a),
                cy + rx * math.cos(t) * math.sin(a) + ry * math.sin(t) * math.cos(a))
               for t in (2 * math.pi * i / n for i in range(n))]
        self.poly(shade, pts)

    def circle(self, shade, cx, cy, r):
        self.ellipse(shade, cx, cy, r, r)

    def rect(self, shade, x0, y0, x1, y1):
        self.poly(shade, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])

    def line(self, shade, pts, w):
        """a stroke of width w through pts (round joins and caps)"""
        v = self._v(shade)
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            dx, dy = x1 - x0, y1 - y0
            L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L * w / 2, dx / L * w / 2
            self.d.polygon(self._p([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)]), fill=v)
        k = SS * self.u
        for x, y in pts:
            r = w / 2 * k
            self.d.ellipse([x * k - r, y * k - r, x * k + r, y * k + r], fill=v)

    def arc(self, shade, cx, cy, r, a0, a1, w, steps=16):
        pts = [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / steps)),
                cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / steps))) for i in range(steps + 1)]
        self.line(shade, pts, w)

    def spiral(self, shade, cx, cy, r0, r1, a0, turns, w, steps=40):
        pts = []
        for i in range(steps + 1):
            t = i / steps
            a = math.radians(a0 + 360 * turns * t)
            r = r0 + (r1 - r0) * t
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        self.line(shade, pts, w)

    def star(self, shade, cx, cy, ro, ri, n, rot=0, jitter=None):
        pts = []
        for i in range(2 * n):
            r = ro if i % 2 == 0 else ri
            if jitter and i % 2 == 0:
                r *= jitter[(i // 2) % len(jitter)]
            a = math.radians(rot - 90 + 180 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        self.poly(shade, pts)

    # ---------------------------------------------------------------- finishing
    def outline(self, shade=3):
        self.outline_shade = shade

    def plain(self):
        """no outline (for shapes that are already dark)"""
        self.outline_shade = None

    def px(self, rows, x0=0, y0=0):
        """hand-set pixels: rows of '0'-'3' (a shade), '.' (clear) or ' ' (leave)"""
        u = int(self.u)
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != ' ':
                    for dy in range(u):
                        for dx in range(u):
                            self.fixes.append(((x0 + i) * u + dx, (y0 + j) * u + dy, EMPTY if ch == '.' else int(ch)))

    def render(self):
        a = np.array(self.img).reshape(self.n, SS, self.n, SS).transpose(0, 2, 1, 3).reshape(self.n, self.n, SS * SS)
        out = np.full((self.n, self.n), EMPTY, np.uint8)
        for y in range(self.n):
            for x in range(self.n):
                v = a[y, x]
                full = v[v > 0]
                if len(full) < self.cover * SS * SS:
                    continue
                out[y, x] = np.bincount(full, minlength=5)[1:].argmax()
        if self.outline_shade is not None:
            solid = out != EMPTY
            grow = np.zeros_like(solid)
            grow[1:] |= solid[:-1]; grow[:-1] |= solid[1:]; grow[:, 1:] |= solid[:, :-1]; grow[:, :-1] |= solid[:, 1:]
            out[grow & ~solid] = self.outline_shade
        for x, y, v in self.fixes:
            if 0 <= x < self.n and 0 <= y < self.n:
                out[y, x] = v
        return out


def draw(fn, *args, n=N):
    r = FX(n)
    fn(r, *args)
    return r.render()


def colourise(tile, pal, bg=None):
    """an 8x8 shade tile -> RGBA, in an effect palette (list of four RGB)"""
    h, w = tile.shape
    im = np.zeros((h, w, 4), np.uint8)
    if bg is not None:
        im[..., :3] = bg; im[..., 3] = 255
    for s in range(4):
        m = tile == s
        im[m, :3] = pal[s]; im[m, 3] = 255
    return im
