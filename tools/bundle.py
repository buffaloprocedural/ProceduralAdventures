#!/usr/bin/env python3
"""Inline index.html's stylesheet and scripts into one self-contained file: dist/procedural-adventures.html"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()


def css(m):
    return '<style>\n' + open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read() + '\n</style>'


def js(m):
    code = open(os.path.join(ROOT, m.group(1)), encoding='utf-8').read()
    return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>'


out = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, src)
out = re.sub(r'<script src="([^"]+)"></script>', js, out)
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
path = os.path.join(ROOT, 'dist', 'procedural-adventures.html')
open(path, 'w', encoding='utf-8').write(out)
print('wrote', path, os.path.getsize(path) // 1024, 'KB')
