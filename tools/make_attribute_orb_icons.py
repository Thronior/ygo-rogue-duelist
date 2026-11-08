"""Builds the small Attribute icons used by the Type/Attribute pickers.

The six Attribute Orb relics are 500 px cut-outs; pickers show them at ~50 px, so they get
128 px copies. DIVINE has no Orb, so a matching gold orb is drawn here with the same layout
(label on top, white kanji in the middle).

  python/python.exe tools/make_attribute_orb_icons.py
then run tools/build_android.py --sync-only to copy them into android/web/assets.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/icons/attribute-orbs'
ORBS = {'wind': 'Gale', 'water': 'Tide', 'earth': 'Earth', 'fire': 'Ember', 'dark': 'Dark', 'light': 'Light'}
SIZE = 128
FONTS = Path('C:/Windows/Fonts')


def divine_orb(size=500):
    """A gold orb in the style of the Orb relics: shaded sphere, rim, label and 神."""
    scale = 2
    s = size * scale
    sphere = Image.new('RGBA', (s, s))
    px = sphere.load()
    cx, cy, r = s / 2, s / 2, s * .47
    lx, ly = s * .38, s * .33  # light source
    for y in range(s):
        for x in range(s):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** .5
            if d > r:
                continue
            t = min(1, ((x - lx) ** 2 + (y - ly) ** 2) ** .5 / (r * 1.45))
            stops = [(0, (255, 244, 190)), (.45, (238, 178, 46)), (.8, (176, 98, 14)), (1, (96, 44, 6))]
            for (a, ca), (b, cb) in zip(stops, stops[1:]):
                if t <= b:
                    k = (t - a) / (b - a)
                    px[x, y] = tuple(round(ca[i] + (cb[i] - ca[i]) * k) for i in range(3)) + (255,)
                    break
    draw = ImageDraw.Draw(sphere)
    # Faint sun rays from the centre.
    rays = Image.new('L', (s, s))
    rd = ImageDraw.Draw(rays)
    for i in range(24):
        a0 = i * 15
        rd.pieslice((cx - r, cy - r, cx + r, cy + r), a0, a0 + 6, fill=38)
    rays = rays.filter(ImageFilter.GaussianBlur(s * .01))
    sphere.paste((255, 250, 220, 255), (0, 0), Image.composite(rays, Image.new('L', (s, s)), sphere.split()[3]))
    # Rim: a bright inner line and a dark outer edge.
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(80, 36, 4, 255), width=round(s * .012))
    draw.ellipse((cx - r * .975, cy - r * .975, cx + r * .975, cy + r * .975), outline=(255, 236, 170, 200), width=round(s * .008))
    # Gloss highlight.
    gloss = Image.new('L', (s, s))
    ImageDraw.Draw(gloss).ellipse((s * .2, s * .1, s * .62, s * .38), fill=110)
    gloss = gloss.filter(ImageFilter.GaussianBlur(s * .04))
    sphere.paste((255, 255, 255, 255), (0, 0), Image.composite(gloss, Image.new('L', (s, s)), sphere.split()[3]))
    # Outer glow so it sits like the other cut-outs.
    glow = Image.new('L', (s, s))
    ImageDraw.Draw(glow).ellipse((cx - r * 1.02, cy - r * 1.02, cx + r * 1.02, cy + r * 1.02), fill=170)
    glow = glow.filter(ImageFilter.GaussianBlur(s * .012))
    orb = Image.new('RGBA', (s, s), (255, 214, 120, 0))
    orb.putalpha(glow)
    orb.alpha_composite(sphere)

    def text(value, font, centre_y, stroke):
        layer = Image.new('RGBA', (s, s))
        d = ImageDraw.Draw(layer)
        box = d.textbbox((0, 0), value, font=font, stroke_width=stroke)
        x = cx - (box[0] + box[2]) / 2
        y = centre_y - (box[1] + box[3]) / 2
        shadow = Image.new('RGBA', (s, s))
        ImageDraw.Draw(shadow).text((x + s * .006, y + s * .01), value, font=font, fill=(40, 16, 0, 200), stroke_width=stroke, stroke_fill=(40, 16, 0, 200))
        orb.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(s * .008)))
        d.text((x, y), value, font=font, fill=(255, 255, 255, 255), stroke_width=stroke, stroke_fill=(30, 14, 0, 255))
        orb.alpha_composite(layer)

    text('DIVINE', ImageFont.truetype(str(FONTS / 'timesbd.ttf'), round(s * .125)), s * .15, round(s * .008))
    text('神', ImageFont.truetype(str(FONTS / 'YuGothB.ttc'), round(s * .53)), s * .57, 0)
    return orb.resize((size, size), Image.Resampling.LANCZOS)


def save(image, name):
    image = image.convert('RGBA')
    image.thumbnail((SIZE, SIZE), Image.Resampling.LANCZOS)
    image.save(OUT / f'{name}.png', optimize=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for attribute, orb in ORBS.items():
        with Image.open(ROOT / f'assets/relics/{orb} Orb.png') as im:
            save(im, attribute)
    save(divine_orb(), 'divine')
    print('Wrote', ', '.join(sorted(p.name for p in OUT.glob('*.png'))))


if __name__ == '__main__':
    main()
