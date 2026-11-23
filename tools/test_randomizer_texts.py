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
    # the same thing said twice (user, Nov 21: "use 'that card' or 'it' instead of repeating the same thing")
    (re.compile(r'(1 [^+\n]{3,40}? [Mm]onster) \+ (?:[^\n]*\+ )?\1(?= \+|\n|$)'), 'Fusion Material written twice'),
    (re.compile(r'( from your [\w ,]{2,30}?(?:Deck|GY|hand))\1\b'), 'place written twice'),
    (re.compile(r'attacks an? [^:]*monster: [^.]*the [\w -]*monster this card is attacking'), 'attacked monster described twice'),
    (re.compile(r'Summons? [^:]*: [^.]*\bthe (?:Flip |Normal |Special )?Summoned [\w -]+ monster'), 'Summoned monster described twice'),
    (re.compile(r'\b[Ss]end this monster from your field\b'), '"this monster from your field" (this card)'),
    (re.compile(r'\b(?:[Cc]hange|[Tt]urn) to (?:Defense|Attack) Position all\b'), 'object after the position'),
    (re.compile(r'\bthen (?:shuffle|place) it\.'), 'movement written twice'),
    (re.compile(r'\bchanges its stats\b|\b(?:gains?|loses?) -\d'), 'stat change without its amount'),
    # review of 200 dealt cards (Nov 23)
    (re.compile(r'\b[Yy]our [A-Z][^.;:]*? monsters you control\b'), '"Your ... monsters you control"'),
    (re.compile(r'\b(?:gains|loses) \d+ (ATK|DEF) and (?:gains|loses) \d+ \1\b'), 'one stat changed twice in one sentence'),
    (re.compile(r'\b(each|the|for|of|to) \1\b'), 'a word written twice'),
    (re.compile(r'\b(?:increases?|decreases?) \d+ (?:ATK|DEF)\b'), '"increase 300 DEF" (gain)'),
    (re.compile(r'Equip only to [^\n]*Equip only to'), '"Equip only to" twice'),
    (re.compile(r'During the end of the Battle Phase|battles a monster with [A-Z]|\bYou can this card\b'), 'clumsy block wording'),
    (re.compile(r'Summons [^:]*your opponent Summons\b|\b[Ss]huffle (?:it|them)[.;]|While it is the Battle Phase,[^.]*during the Battle Phase'), 'clumsy dealt wording'),
    (re.compile(r'\(Super Roboyarou\)|paired Fusion Monster|lower Ultimate Insect LV monster|Union Monster by this effect'), 'a real card\'s own piece on another card'),
]
SETUP_ALONE = re.compile(r'^Place 1 counter on this card during each of your Standby Phases\.$')
problems = []
dealt_names = {c['name'] for c in cards}
EXTRA = {c['id'] for c in cards if c.get('frame') in ('fusion', 'ritual')}
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
    # a Fusion's summoning rule never names materials other than its materials line (Discord Nov 21, "Penguin Soldier":
    # "1 Level 4 or lower monster + "Big Koala" / Must be Fusion Summoned with Queen's Knight, Jack's Knight, and King's
    # Knight"), and a Contact Fusion material is never an Extra Deck or Ritual monster
    if kind.startswith('Fusion'):
        first, _, rest = text.partition('\n')
        named = re.search(r'Fusion Summon(?:ed)? (?:only )?with ([^.;]+)', rest)
        if named and any(n.strip(' "') not in first for n in re.split(r',? and |, ', named.group(1))):
            problems.append((card['id'], game['name'], kind, 'summoning rule names other materials: ' + named.group(0)[:80]))
        if 'banishing the above' in rest:
            bad = [m['text'] for m in card.get('materials') or [] if m.get('k') == 'code' and m.get('v') in EXTRA]
            if bad:
                problems.append((card['id'], game['name'], kind, 'Contact Fusion material is a Fusion or Ritual Monster: ' + ', '.join(bad)))
    # about this card as a Trap Monster on a Trap that never becomes one (Discord Nov 22, "Enervating Mist")
    if kind.startswith('Trap') and re.search(r'this card is a monster|this Trap Monster|another Trap Monster', text) \
       and not re.search(r'Special Summon this card', text):
        problems.append((card['id'], game['name'], kind, 'Trap Monster text on a Trap that never becomes a monster'))
    # something that already happened in battle, checked before any Battle Phase (Discord Nov 22, "Spell of Pain")
    for sent in re.split(r'(?<=\.) ', text):
        if re.search(r'Main Phase 1', sent) and re.search(r'involved in damage calculation|destroyed by battle|attacked|battled', sent) \
           and 'this turn' in sent and not re.search(r'end of the Battle Phase|Main Phase 2|next', sent):
            problems.append((card['id'], game['name'], kind, 'battle this turn checked in Main Phase 1: ' + sent[:80]))
    # card-level contradictions (review of 200 dealt cards, Nov 23)
    if re.search(r'Cannot be Special Summoned\.|Return this card to its owner.s hand during the End Phase', text) \
       and re.search(r'(?:If|When) this card is Special Summoned', text):
        problems.append((card['id'], game['name'], kind, 'Special Summoned timing on a card that cannot be Special Summoned'))
    # "gain 1000 LP for each Spell/Trap sent" needs a cost that sends them, before it in the same effect
    for m in re.finditer(r'for each (?:Spell/Trap|card|monster) (sent|discarded|banished)\b', text):
        verb = {'sent': r'\b[Ss]end', 'discarded': r'\b[Dd]iscard', 'banished': r'\b[Bb]anish'}[m.group(1)]
        if not re.search(verb, text[:m.start()].split('. ')[-1]):
            problems.append((card['id'], game['name'], kind, 'counts a cost the effect does not have: ' + m.group(0)))
    if 'Monster' in kind and re.search(r'this card is Tribute Summoned', text) and not re.search(r'Normal Summoned/Set with \d Tribute', text):
        need = 7 if 'Tributing 3' in text else 5
        if (game.get('level') or 0) < need:
            problems.append((card['id'], game['name'], kind, f'Tribute Summon timing on a Level {game.get("level")} monster'))
    own = re.search(r'Destroy this face-up card if you control a face-up non-(\w+) monster', text)
    if own and game.get('attribute') != own.group(1):
        problems.append((card['id'], game['name'], kind, f'a {game.get("attribute")} monster that destroys itself for being non-{own.group(1)}'))
    if re.search(r'. Cannot be Normal Summoned/Set\.', text):
        problems.append((card['id'], game['name'], kind, '"Cannot be Normal Summoned/Set." not first'))
    if card.get('slot') == 's_equip' and 'Equip only to' not in text:
        problems.append((card['id'], game['name'], kind, 'Equip Spell without "Equip only to"'))
    if kind.startswith('Trap') and 'while equipped' in text and not re.search(r'equip this card', text, re.I):
        problems.append((card['id'], game['name'], kind, '"while equipped" on a Trap that never equips'))
    if re.search(r'this card is (?:Normal |Flip |Special )?Summoned, if this card has destroyed', text):
        problems.append((card['id'], game['name'], kind, 'just Summoned, yet has destroyed monsters by battle'))
    if 'Special Summoned from your hand by its own effect' in text and 'Special Summon this card' not in text:
        problems.append((card['id'], game['name'], kind, 'timing needs a self-Summon effect the card does not have'))
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
