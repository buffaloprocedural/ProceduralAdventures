#!/usr/bin/env python3
"""
Recolours finished creature sheets in art/creatures/ by swapping palette entries (old -> new fill colours), for
designs that read too close to a well-known creature from elsewhere. Safe to run twice: once a colour has been
swapped there is nothing left to swap. Then run tools/build_creatures.py.

usage: python3 tools/recolour_creatures.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECOLOUR = {
    # SERVOLT: from yellow to steel blue, with a pale ice-blue belly
    'servolt': {'#E8C048': '#5FA8C8', '#9A7A2A': '#2F6C8A', '#FFF4B0': '#CFEAF4'},
    # GLUMPH: from pink to sea green
    'glumph': {'#E8A0B4': '#7CC8A8', '#F8D8E0': '#C8EEDC'},
}

for name, swaps in RECOLOUR.items():
    p = os.path.join(ROOT, 'art', 'creatures', name + '.svg')
    s = open(p, encoding='utf-8').read()
    n = 0
    for a, b in swaps.items():
        s, k = re.subn('fill="' + re.escape(a) + '"', 'fill="' + b + '"', s, flags=re.I)
        n += k
    open(p, 'w', encoding='utf-8').write(s)
    print(name, n, 'fills recoloured')
