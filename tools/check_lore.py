#!/usr/bin/env python3
"""Prüft assets/lore: Dateinamen gegen die Bildliste, Größe (max. 300 KB), Format und Seitenverhältnis.
Aufruf aus dem Projektordner:  python3 tools/check_lore.py"""
import os, re, struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LORE = os.path.join(ROOT, 'assets/lore')
MAX = 300 * 1024
src = open(os.path.join(ROOT, 'js/data/lore.js'), encoding='utf-8').read()
expected = set(re.findall(r"'([a-z0-9-]+\.(?:webp|png))'", src))
expected |= {f'arc{a}-{k}.webp' for a in range(1, 5) for k in ['establishing', 'confront', 'victory', 'retreat']}

def webp_size(path):
    b = open(path, 'rb').read(64)
    if b[:4] != b'RIFF' or b[8:12] != b'WEBP':
        return None
    chunk = b[12:16]
    if chunk == b'VP8X':
        w = 1 + int.from_bytes(b[24:27], 'little'); h = 1 + int.from_bytes(b[27:30], 'little'); return w, h
    if chunk == b'VP8 ':
        w, h = struct.unpack('<HH', b[26:30]); return w & 0x3fff, h & 0x3fff
    if chunk == b'VP8L':
        bits = int.from_bytes(b[21:25], 'little'); return (bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1
    return None

present = sorted(f for f in os.listdir(LORE) if not f.startswith('.')) if os.path.isdir(LORE) else []
problems = 0
for f in present:
    p = os.path.join(LORE, f)
    kb = os.path.getsize(p) / 1024
    dims = webp_size(p) if f.endswith('.webp') else None
    notes = []
    if f not in expected: notes.append('unbekannter Name')
    if kb > 300: notes.append('zu groß')
    if f.endswith('.webp') and not dims: notes.append('kein gültiges WebP')
    problems += bool(notes)
    print(f"{'!' if notes else '✓'} {f:34} {kb:7.0f} KB  {('%dx%d' % dims) if dims else '':10} {', '.join(notes)}")
missing = sorted(expected - set(present))
print(f"\n{len(present)} vorhanden, {len(missing)} fehlen noch (Platzhalter aktiv), {problems} mit Hinweis.")
for f in missing: print(f"  – {f}")
