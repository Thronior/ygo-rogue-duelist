"""World map for the 10K survey results page (android/web/survey-results.js, user 2026-11-27: "an interactive map that
on click or hover shows the number of players from a country").

Usage:
  python -B tools/survey_map.py <ne_50m_admin_0_countries.geojson>

Source: Natural Earth 1:50m Admin 0 countries (public domain), from github.com/nvkelso/natural-earth-vector. Writes
android/web/survey-map.json: {"w","h","paths":[[ISO2, d], ...],"dots":[[ISO2, x, y], ...]}. Equal Earth projection,
Antarctica left out, simplified to whole-ish pixels at 1000 px wide. Countries too small to see (Singapore, Malta…)
also get a dot so they can be hovered or tapped. Loaded only when the results page opens.
"""
import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'android/web/survey-map.json'
WIDTH, TOLERANCE, MIN_RING = 1000, .45, .6  # px; rings smaller than MIN_RING px² are dropped (except a country's largest)
A1, A2, A3, A4, M = 1.340264, -0.081106, 0.000893, 0.003796, math.sqrt(3) / 2
X_MAX = 2.7066297319215575


def equal_earth(lon, lat):
    lam, phi = math.radians(lon), math.radians(lat)
    th = math.asin(M * math.sin(phi)); t2 = th * th; t6 = t2 * t2 * t2
    x = lam * math.cos(th) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)))
    y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2))
    s = WIDTH / (2 * X_MAX)
    return (x + X_MAX) * s, -y * s


def simplify(points, tol):
    """Douglas-Peucker on a closed ring."""
    if len(points) < 4:
        return points
    keep = [False] * len(points); keep[0] = keep[-1] = True; stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop(); (ax, ay), (bx, by) = points[a], points[b]; dx, dy = bx - ax, by - ay; n = math.hypot(dx, dy) or 1e-9
        best, at = 0, -1
        for i in range(a + 1, b):
            px, py = points[i]; d = abs(dy * px - dx * py + bx * ay - by * ax) / n if n > 1e-9 else math.hypot(px - ax, py - ay)
            if d > best: best, at = d, i
        if best > tol and at > 0:
            keep[at] = True; stack += [(a, at), (at, b)]
    return [p for p, k in zip(points, keep) if k]


def area(ring):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))) / 2


def main():
    data = json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
    rings_by_code = {}
    for f in data['features']:
        p = f['properties']; code = p.get('ISO_A2_EH') or p.get('ISO_A2')
        if code in (None, '-99'): code = ''
        if code == 'AQ': continue
        g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            for k, ring in enumerate(poly):
                rings_by_code.setdefault(code, []).append([equal_earth(lon, lat) for lon, lat in ring])
    ys = [y for rings in rings_by_code.values() for r in rings for _, y in r]; top, bottom = min(ys) - 4, max(ys) + 4
    paths, dots = [], []
    for code, rings in sorted(rings_by_code.items()):
        rings = [[(x, y - top) for x, y in r] for r in rings]
        largest = max(rings, key=area)
        kept = []
        for r in rings:
            if r is not largest and area(r) < MIN_RING: continue
            s = simplify(r, TOLERANCE); s = [(round(x, 1), round(y, 1)) for x, y in s]
            s = [pt for i, pt in enumerate(s) if i == 0 or pt != s[i - 1]]
            if len(s) >= 3: kept.append(s)
        d = ''.join('M' + 'L'.join(f'{x:g} {y:g}' for x, y in r) + 'Z' for r in kept)
        if d: paths.append([code, d])
        xs = [x for x, _ in largest]; yy = [y for _, y in largest]
        if code and max(max(xs) - min(xs), max(yy) - min(yy)) < 3:
            dots.append([code, round(sum(xs) / len(xs), 1), round(sum(yy) / len(yy), 1)])
    out = {'w': WIDTH, 'h': round(bottom - top), 'paths': paths, 'dots': dots}
    OUT.write_text(json.dumps(out, separators=(',', ':')), encoding='utf8')
    print(f'Wrote {OUT.relative_to(ROOT)}: {len(paths)} shapes, {len(dots)} dots, {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
