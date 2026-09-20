"""Generate the two data assets the app ships.

    assets/data/world_outlines.bin   packed country outlines, for the map
    assets/data/countries.json       the country registry

Sources, both public domain / ODbL and fetched from npm so no CDN is involved:

    npm pack world-atlas@2        Natural Earth 1:50m, as TopoJSON
    npm pack world-countries@5    ISO 3166-1 codes, names, centroids, languages

Usage, from a directory holding the unpacked `package/` folders:

    python3 build_map_assets.py countries-50m.json ../assets/data

`SIMPLIFY_EPS` (degrees, default 0.04) trades outline detail against asset size
and per-frame cost; `MIN_RING_AREA` (square degrees) drops islands too small to
see. The defaults produce ~27k points in ~109 KB.
"""
import json, struct, sys, math, os

SRC = os.path.dirname(os.path.abspath(__file__))
TOPO = os.path.join(SRC, 'package', sys.argv[1] if len(sys.argv) > 1 else 'countries-50m.json')
WC   = os.path.join(SRC, 'package', 'countries.json')
OUT  = sys.argv[2] if len(sys.argv) > 2 else os.path.join(SRC, 'out')
os.makedirs(OUT, exist_ok=True)

topo = json.load(open(TOPO))
tr = topo['transform']
sx, sy = tr['scale']; tx, ty = tr['translate']

def decode_arc(arc):
    x = y = 0
    pts = []
    for dx, dy in arc:
        x += dx; y += dy
        pts.append((x * sx + tx, y * sy + ty))
    return pts

arcs = [decode_arc(a) for a in topo['arcs']]

def ring_points(ring_arcs):
    pts = []
    for i in ring_arcs:
        seg = arcs[~i][::-1] if i < 0 else arcs[i]
        pts.extend(seg[1:] if pts else seg)
    return pts

def polygons(geom):
    t = geom['type']
    if t == 'Polygon':
        return [geom['arcs']]
    if t == 'MultiPolygon':
        return geom['arcs']
    return []

def simplify(pts, eps):
    """Douglas-Peucker. The 50m source is finer than a phone screen can show;
    thinning it keeps the coastline honest and the frame budget intact."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        x1, y1 = pts[lo]; x2, y2 = pts[hi]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy)
        best, best_d = -1, eps
        for i in range(lo + 1, hi):
            x, y = pts[i]
            d = (abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm) if norm else math.hypot(x - x1, y - y1)
            if d > best_d:
                best, best_d = i, d
        if best > 0:
            keep[best] = True
            stack.append((lo, best)); stack.append((best, hi))
    return [p for p, k in zip(pts, keep) if k]


def ring_area(pts):
    """Shoelace area in square degrees — a ranking device, not a measurement."""
    a = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % len(pts)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0

# --- numeric ISO -> alpha-2, and the registry ------------------------------
wc = json.load(open(WC))
by_ccn3, registry = {}, []
for c in wc:
    a2 = c['cca2']
    if c.get('ccn3'):
        by_ccn3[str(int(c['ccn3']))] = a2
    lat, lng = (c.get('latlng') or [0, 0])[:2]
    registry.append({
        'code': a2,
        'name': c['name']['common'],
        'officialName': c['name']['official'],
        'lat': round(float(lat), 3),
        'lng': round(float(lng), 3),
        'region': c.get('region') or 'Other',
        'subregion': c.get('subregion') or '',
        'languages': sorted((c.get('languages') or {}).values())[:3],
        'independent': bool(c.get('independent')),
    })
registry.sort(key=lambda c: c['name'])

# --- pack the outlines ------------------------------------------------------
MIN_RING_AREA = float(os.environ.get('MIN_RING_AREA', '0.35'))  # square degrees
EPS = float(os.environ.get('SIMPLIFY_EPS', '0.04'))              # degrees
countries = []
for g in topo['objects']['countries']['geometries']:
    raw = g.get('id')
    a2 = by_ccn3.get(str(int(raw))) if raw not in (None, '') else None
    if not a2:
        continue
    rings = []
    for poly in polygons(g):
        if not poly:
            continue
        outer = ring_points(poly[0])          # holes are noise at this scale
        if len(outer) < 4:
            continue
        rings.append((ring_area(outer), simplify(outer, EPS)))
    if not rings:
        continue
    rings.sort(key=lambda r: -r[0])
    kept = [rings[0][1]] + [r[1] for r in rings[1:] if r[0] >= MIN_RING_AREA]
    packed = []
    for pts in kept:
        q, prev = [], None
        for lon, lat in pts:
            p = (max(-18000, min(18000, round(lon * 100))),
                 max(-9000, min(9000, round(lat * 100))))
            if p != prev:
                q.append(p); prev = p
        if len(q) >= 3:
            packed.append(q)
    if packed:
        countries.append((a2, packed))

countries.sort(key=lambda c: c[0])
buf = bytearray(b'ATLASMP1')
buf += struct.pack('<H', len(countries))
for a2, rings in countries:
    buf += a2.encode('ascii')
    buf += struct.pack('<H', len(rings))
    for pts in rings:
        buf += struct.pack('<H', len(pts))
        for x, y in pts:
            buf += struct.pack('<hh', x, y)

open(os.path.join(OUT, 'world_outlines.bin'), 'wb').write(bytes(buf))
json.dump(registry, open(os.path.join(OUT, 'countries.json'), 'w'),
          ensure_ascii=False, separators=(',', ':'))

pts_total = sum(len(p) for _, rs in countries for p in rs)
print(f'{os.path.basename(TOPO)}: {len(countries)} countries, '
      f'{sum(len(rs) for _, rs in countries)} rings, {pts_total} points, '
      f'{len(buf)/1024:.0f} KB binary, registry {len(registry)} countries '
      f'{os.path.getsize(os.path.join(OUT, "countries.json"))/1024:.0f} KB')
