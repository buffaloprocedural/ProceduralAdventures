"""
Read a full-colour sprite sheet into an RGBA numpy array (height x width x 4, uint8).

Accepts:
  * PNG (any mode; converted to RGBA). The most robust format to export.
  * "Pixel SVG": a grid of <rect>s, as drawn by hand or exported by pixel editors.
    Supported: rect (x/y/width/height, default fill black), nested <g>, translate()
    transforms, fill as attribute or style ("#abc", "#aabbcc", "rgb(r,g,b)", "none"),
    fill-opacity and opacity (composited "over" what is below), viewBox with any origin.
    Also <path>s made only of straight horizontal and vertical lines on the pixel grid
    (M/m, H/h, V/v, L/l, Z/z - e.g. "M3 1h10v1h-10z"), the way some pixel editors pack rects.
    Ignored: defs, clipPath, mask, pattern, symbol, metadata, title, desc.

Anything else (curves, circles, images, rotations, half-pixel rects...) stops the build
with a message naming the element, rather than producing a subtly wrong sheet.
"""
import re
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image

SKIP = {'defs', 'clipPath', 'mask', 'pattern', 'symbol', 'metadata', 'title', 'desc', 'style'}
NAMED = {'black': (0, 0, 0), 'white': (255, 255, 255)}


class SheetError(ValueError):
    pass


def _tag(el):
    return el.tag.rsplit('}', 1)[-1]


def _px(v, what, src):
    """A coordinate that must sit on the pixel grid (tolerates float noise like 3.0000001)."""
    f = float(re.sub(r'px$', '', str(v).strip()))
    r = round(f)
    if abs(f - r) > 0.01:
        raise SheetError('%s: %s=%s is not on the pixel grid' % (src, what, v))
    return int(r)


def _colour(v, src):
    v = v.strip()
    if v in ('none', 'transparent'):
        return None
    if v in NAMED:
        return NAMED[v]
    m = re.fullmatch(r'#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})', v)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    m = re.fullmatch(r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', v)
    if m:
        return tuple(int(x) for x in m.groups())
    raise SheetError('%s: unsupported colour %r' % (src, v))


def _style(el):
    """Presentation attributes, with style="" taking precedence."""
    out = {k: el.get(k) for k in ('fill', 'fill-opacity', 'opacity') if el.get(k) is not None}
    for part in (el.get('style') or '').split(';'):
        if ':' in part:
            k, v = part.split(':', 1)
            if k.strip() in ('fill', 'fill-opacity', 'opacity'):
                out[k.strip()] = v.strip()
    return out


def _translate(el, src):
    t = (el.get('transform') or '').strip()
    if not t:
        return 0, 0
    m = re.fullmatch(r'translate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)', t)
    if not m:
        raise SheetError('%s: unsupported transform %r (only translate() is allowed)' % (src, t))
    return _px(m.group(1), 'translate', src), _px(m.group(2) or 0, 'translate', src)


def _path_mask(d, w, h, ox, oy, dx, dy, src):
    """Pixels inside a path of axis-aligned lines on the pixel grid (each subpath filled, then united)."""
    toks = re.findall(r'[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?', d)
    out = np.zeros((h, w), bool)
    i, x, y, sx, sy, cmd, pts, first = 0, 0, 0, 0, 0, None, [], True

    def num():
        nonlocal i
        if i >= len(toks) or toks[i].isalpha():
            raise SheetError('%s: path data ends early' % src)
        i += 1
        return _px(toks[i - 1], 'path', src)

    def close():
        nonlocal pts
        if len(pts) > 2:
            m = np.zeros((h, w), bool)
            ring = pts + [pts[0]]
            for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
                if x0 != x1 and y0 != y1:
                    raise SheetError('%s: a diagonal line in a path' % src)
                if x0 == x1 and y0 != y1:  # even-odd: toggle every pixel left of a vertical edge
                    a, b = sorted((y0, y1))
                    a, b, xe = max(a - oy, 0), min(b - oy, h), min(max(x0 - ox, 0), w)
                    if a < b and xe > 0:
                        m[a:b, :xe] ^= True
            out[:] |= m
        pts = []
    while i < len(toks):
        if toks[i].isalpha():
            cmd = toks[i]
            i += 1
        if cmd in 'Mm':
            close()
            nx, ny = num(), num()
            x, y = (nx + dx, ny + dy) if cmd == 'M' or first else (x + nx, y + ny)  # a leading m is absolute
            first = False
            sx, sy = x, y
            pts = [(x, y)]
            cmd = 'l' if cmd == 'm' else 'L'
        elif cmd in 'Hh':
            v = num(); x = v + dx if cmd == 'H' else x + v; pts.append((x, y))
        elif cmd in 'Vv':
            v = num(); y = v + dy if cmd == 'V' else y + v; pts.append((x, y))
        elif cmd in 'Ll':
            a, b = num(), num(); x, y = (a + dx, b + dy) if cmd == 'L' else (x + a, y + b); pts.append((x, y))
        elif cmd in 'Zz':
            close()
            x, y = sx, sy
            cmd = None
        else:
            raise SheetError('%s: unsupported path command %r (only straight lines on the grid)' % (src, cmd))
    close()
    return out


def _load_svg(path):
    root = ET.parse(path).getroot()
    vb = root.get('viewBox')
    if vb:
        ox, oy, w, h = (float(x) for x in re.split(r'[\s,]+', vb.strip()))
        ox, oy = _px(ox, 'viewBox', path), _px(oy, 'viewBox', path)
    else:
        ox = oy = 0
        w, h = root.get('width'), root.get('height')
        if w is None or h is None:
            raise SheetError('%s: needs a viewBox or width/height' % path)
    w, h = _px(w, 'width', path), _px(h, 'height', path)
    acc = np.zeros((h, w, 4), np.float64)  # premultiplied RGBA, 0..1

    def walk(el, dx, dy, inherited):
        tag = _tag(el)
        if tag in SKIP:
            return
        tx, ty = _translate(el, path)
        dx, dy = dx + tx, dy + ty
        st = dict(inherited)
        own = _style(el)
        if 'fill' in own:
            st['fill'] = own['fill']
        if 'fill-opacity' in own:
            st['fill-opacity'] = own['fill-opacity']
        if 'opacity' in own:  # multiplies down the tree
            st['opacity'] = float(st.get('opacity', 1)) * float(own['opacity'])
        if tag in ('svg', 'g'):
            for ch in el:
                walk(ch, dx, dy, st)
            return
        if tag == 'path':
            col = _colour(st.get('fill', 'black'), path)
            a = float(st.get('fill-opacity', 1)) * float(st.get('opacity', 1))
            if col is None or a <= 0:
                return
            m = _path_mask(el.get('d') or '', w, h, ox, oy, dx, dy, '%s <path id=%s>' % (path, el.get('id')))
            acc[m] = np.array([c / 255 * a for c in col] + [a]) + acc[m] * (1 - a)
            return
        if tag != 'rect':
            raise SheetError('%s: unsupported element <%s> - export the sheet as PNG instead' % (path, tag))
        src = '%s <rect x=%s y=%s>' % (path, el.get('x'), el.get('y'))
        x = _px(el.get('x', 0), 'x', src) + dx - ox
        y = _px(el.get('y', 0), 'y', src) + dy - oy
        rw, rh = _px(el.get('width', 0), 'width', src), _px(el.get('height', 0), 'height', src)
        col = _colour(st.get('fill', 'black'), src)
        a = float(st.get('fill-opacity', 1)) * float(st.get('opacity', 1))
        if col is None or a <= 0 or rw <= 0 or rh <= 0:
            return
        x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + rw, w), min(y + rh, h)
        if x0 >= x1 or y0 >= y1:
            return
        src_px = np.array([c / 255 * a for c in col] + [a])
        region = acc[y0:y1, x0:x1]
        region[:] = src_px + region * (1 - a)  # "over"

    walk(root, 0, 0, {})
    alpha = acc[..., 3:4]
    rgb = np.where(alpha > 0, acc[..., :3] / np.maximum(alpha, 1e-9), 0)
    out = np.concatenate([rgb, alpha], -1)
    return np.round(out * 255).astype(np.uint8)


def load_sheet(path):
    if path.lower().endswith('.svg'):
        return _load_svg(path)
    return np.array(Image.open(path).convert('RGBA'))
