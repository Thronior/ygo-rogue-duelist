"""Checks the text of a full round of dealt randomized cards (Discord bug reports, Nov 20): every card with an effect
has text, no placeholder is left unfilled, a name it is treated as is named, a lone setup piece ("Place 1 counter on
this card during each of your Standby Phases") never stands alone, and a Trap that becomes a monster has stats.
Also (review of a full deal, Nov 20): dealt card names are in quotes, no phrase is said twice, no Fusion/Ritual Monster
has a Flip timing, no "?" stat line without its effect, no monster that can never be Summoned, no lone board piece.

Usage: python/python.exe tools/test_randomizer_texts.py [seed]
"""
import random, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import randomizer as R

seed = int(sys.argv[1]) if len(sys.argv) > 1 else 5
rng = random.Random(seed)
ids = iter(range(R.FIRST_ID, R.FIRST_ID + 900000))
used = set()
cards = []
while True:
    batch = R.make_card(random.Random(rng.random()), lambda: next(ids), used)
    if R._DEALERS[-1][1].rounds > 1:
        break
    cards += batch

BAD = [
    (re.compile(r'[{}]'), 'unfilled placeholder'),
    (re.compile(r'\bNone\b'), '"None" in the text'),
    (re.compile(r'treated as \.|treated as\s*$'), 'name it is treated as is missing'),
    (re.compile(r'  '), 'double space'),
    (re.compile(r'\ban (?:WATER|WIND|FIRE|DARK|LIGHT)\b|\ba EARTH\b'), 'wrong article before an Attribute'),
    # Nov 20 review of a full deal
    (re.compile(r'\b(up to|any number of|and shuffle) \1\b'), 'a phrase said twice'),
    (re.compile(r'\b[Cc]hoose \d+ [^,.;]{0,80} and (?:return|send|banish|shuffle|place|destroy) \d+\b'), 'old "choose N ... and return N" wording'),
    (re.compile(r'\bchoose 1 this card\b|\b[Tt]arget (?:face-up|face-down) '), 'missing count'),
    (re.compile(r'[Yy]our all |\b(?:gains?|loses?) \d+ (?:ATK|DEF) and 0 (?:ATK|DEF)\b|\b(?:gains?|loses?) 0 (?:ATK|DEF)\b'), 'broken stat wording'),
    (re.compile(r'only be placed on the field by its board effect'), 'board piece that can never be played'),
    (re.compile(r'\bremember it until\b'), 'internal marker text'),
]
SETUP_ALONE = re.compile(r'^Place 1 counter on this card during each of your Standby Phases\.$')
problems = []
dealt_names = {c['name'] for c in cards}
for card in cards:
    game = R.as_game_card(card)['card']
    text = (game.get('desc') or '').strip()
    kind = game.get('type', '')
    if not text and kind != 'Normal Monster':
        problems.append((card['id'], game['name'], kind, 'no text'))
        continue
    if kind == 'Normal Monster':
        continue   # flavor text from real cards ("None can survive ...")
    for rx, why in BAD:
        if rx.search(text):
            problems.append((card['id'], game['name'], kind, why + ': ' + text[:120]))
    names = [n for e in card.get('effects') or [] for c in R.CATEGORIES for q in e.get(c, []) for n in (q.get('names') or [])]
    for n in names:
        if n in dealt_names and '"' not in n and n in text and f'"{n}"' not in text:
            problems.append((card['id'], game['name'], kind, f'card name without quotes: {n}'))
    if card.get('slot') in ('m_fusion', 'm_ritual') and re.search(r'Flip Summoned|\bFLIP:', text):
        problems.append((card['id'], game['name'], kind, 'Fusion/Ritual Monster with a Flip timing'))
    if card.get('kind') == 'monster' and (game['data']['attack'] < 0 or game['data']['defense'] < 0):
        problems.append((card['id'], game['name'], kind, '"?" ATK/DEF without the effect that sets it'))
    # a condition pulled in by its action when the bag was empty had no amount (lp_gap compared LP with nil; costs
    # default to 1 in their Lua)
    for e in card.get('effects') or []:
        for c in ('conds',):
            for q in e.get(c, []):
                if R.CATEGORIES[c].get(q['k'], {}).get('n') and q.get('n') is None:
                    problems.append((card['id'], game['name'], kind, f'{q["k"]} without its amount'))
    if re.match(r'Cannot be Normal Summoned(?:/Set)?\.$', text):
        problems.append((card['id'], game['name'], kind, 'cannot be Normal Summoned and has no Special Summon'))
    if SETUP_ALONE.match(text):
        problems.append((card['id'], game['name'], kind, 'setup piece alone'))
    if 'as an Effect Monster' in text or 'as a Normal Monster' in text:
        data = game['data']
        if not (data['attack'] or data['defense']) or not data['level']:
            problems.append((card['id'], game['name'], kind, 'Trap Monster without stats in its card data'))

for p in problems[:40]:
    print('FAIL', *p)
if problems:
    print(f'{len(problems)} problems in {len(cards)} cards')
    sys.exit(1)
print(f'PASS: {len(cards)} dealt cards have text, filled placeholders, named "treated as" cards and Trap Monster stats (seed {seed})')
