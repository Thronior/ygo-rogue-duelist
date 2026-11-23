"""Card pictures for the Moth LV line (user design, 2026-11-23): Moth LV1/LV2/LV6/LV8, Cocoon of Evolution - S and
the Moth Token. Each is put together from real scans the way android/web/randomized-card-art.js draws randomized
cards (same layout fractions): a donor of the right frame, Level and Attribute gives the frame, stars and orb; the
moth card gives the illustration; the name, type line, text and ATK/DEF are painted over and written fresh. No rainbow
marks: these are custom cards, not randomized ones. The Moth Token is Petit Moth turned into a token card (user).

Usage: python tools/make_moth_lv_card_art.py   (writes assets/cards/<id>.jpg; card text comes from the data files)
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / 'assets/cards'
ART = (0.1148, 0.1822, 0.8803, 0.707)
NAME = (0.062, 0.043, 0.828, 0.1068)
TEXT = (0.072, 0.752, 0.928, 0.905)
TEXT_ST = (0.072, 0.752, 0.928, 0.94)
STATS = (0.42, 0.911, 0.924, 0.942)
NAME_FONT = str(ROOT / 'assets/fonts/SpectralSC-SemiBold.ttf')
TEXT_FONT = str(ROOT / 'assets/fonts/Spectral-Medium.ttf')

PETIT, LARVAE, COCOON, GREAT, PUGM = 58192742, 87756343, 40240595, 14141448, 48579379
LEGHUL, CASTLE_GATE, SNAKE_TOKEN, FEATHER = 12472242, 36931229, 86801872, 49140998
# id: (frame donor: right frame/Level/Attribute, illustration, type line or None for a Spell)
PLAN = {
    190000052: (LEGHUL, PETIT, '[Insect/Effect]'),
    190000053: (LARVAE, LARVAE, '[Insect/Effect]'),
    190000054: (CASTLE_GATE, GREAT, '[Insect/Effect]'),
    190000055: (PUGM, PUGM, '[Insect/Effect]'),
    190000056: (FEATHER, COCOON, None),
    190000057: (SNAKE_TOKEN, PETIT, '[Insect/Token]'),
}


def box(W, H, frac):
    x0, y0, x1, y1 = frac
    return round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H)


def median(im, frac):
    W, H = im.size
    px = sorted(im.crop(box(W, H, frac)).resize((32, 8)).get_flattened_data(), key=sum)
    return px[len(px) // 2]


def flat(im, frac, colour=None):
    """Paint a region with its median colour (or a given one), as the in-game renderer does."""
    W, H = im.size
    ImageDraw.Draw(im).rectangle(box(W, H, frac), fill=colour or median(im, frac))


def fit(draw, text, font_path, size, width):
    font = ImageFont.truetype(font_path, size)
    while draw.textlength(text, font=font) > width and size > 8:
        size -= 1
        font = ImageFont.truetype(font_path, size)
    return font


def wrap(draw, text, font, width):
    lines, line = [], ''
    for word in text.split(' '):
        nxt = f'{line} {word}' if line else word
        if draw.textlength(nxt, font=font) > width and line:
            lines.append(line)
            line = word
        else:
            line = nxt
    return lines + [line]


def make(cid, card):
    donor, art_id, type_line = PLAN[cid]
    im = Image.open(CARDS / f'{donor}.jpg').convert('RGB')
    W, H = im.size
    art = Image.open(CARDS / f'{art_id}.jpg').convert('RGB')
    aw, ah = art.size
    d = ImageDraw.Draw(im)
    # Name over the donor's name box.
    flat(im, NAME)
    x0, y0, x1, y1 = box(W, H, NAME)
    font = fit(d, card['name'], NAME_FONT, round(H * 0.046), (x1 - x0) - W * 0.03)
    d.text((x0 + W * 0.012, H * 0.0915), card['name'], font=font, fill='#fdfbf4' if type_line is None else '#16110c',
           anchor='ls', stroke_width=1 if type_line is None else 0, stroke_fill='#3a2a40')
    # Illustration, cut a little inside the art card's box so none of its border comes along.
    inset, bottom = 0.006, 0.014
    crop = (round((ART[0] + inset) * aw), round((ART[1] + inset) * ah), round((ART[2] - inset) * aw), round((ART[3] - bottom) * ah))
    b = box(W, H, ART)
    im.paste(art.crop(crop).resize((b[2] - b[0], b[3] - b[1]), Image.Resampling.LANCZOS), b[:2])
    # Text box: type line for monsters, then the text, shrunk until it fits.
    frac = TEXT if type_line else TEXT_ST
    paper = median(im, frac)
    flat(im, frac, paper)
    x0, y0, x1, y1 = box(W, H, frac)
    top = y0 + H * 0.004
    if type_line:
        d.text((x0 + W * 0.006, top + H * 0.019), type_line, font=ImageFont.truetype(NAME_FONT, round(H * 0.0215)), fill='#16110c', anchor='ls')
        top += H * 0.026
    width, room = (x1 - x0) - W * 0.014, y1 - top - H * 0.004
    size = H * 0.0215
    while size > H * 0.008:
        font = ImageFont.truetype(TEXT_FONT, round(size))
        lines, lh = wrap(d, card['desc'], font, width), size * 1.12
        if len(lines) * lh <= room:
            for i, line in enumerate(lines):
                d.text((x0 + W * 0.007, top + size + i * lh), line, font=font, fill='#16110c', anchor='ls')
            break
        size *= 0.94
    if type_line:
        # The whole stat strip in the text box's colour (its own median picked up the ruled line and came out grey).
        flat(im, (TEXT[0],) + STATS[1:], paper)
        x0, y0, x1, y1 = box(W, H, STATS)
        atk = '?' if card['atk'] < 0 else card['atk']
        df = '?' if card['defense'] < 0 else card['defense']
        d.text((x1 - W * 0.008, y1 - H * 0.007), f'ATK/{atk:>5}  DEF/{df:>5}', font=ImageFont.truetype(TEXT_FONT, round(H * 0.025)),
               fill='#16110c', anchor='rs')
    im.save(CARDS / f'{cid}.jpg', format='JPEG', quality=90, optimize=True)
    print('Wrote', cid, card['name'])


def main():
    cards = {c['id']: c for c in json.loads((ROOT / 'data/custom-cards.json').read_text(encoding='utf8'))}
    cards.update({t['id']: t for t in json.loads((ROOT / 'data/custom-tokens.json').read_text(encoding='utf8'))})
    for cid in PLAN:
        make(cid, cards[cid])


if __name__ == '__main__':
    main()
