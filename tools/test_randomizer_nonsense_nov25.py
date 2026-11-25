"""Randomized effects that defeat themselves (Discord Nov 25, the user's picks):

1. "Electromagnetic Bagworm": "When this card changes from Attack Position to Defense Position: You can pay 2000 LP;
   gain 1000 LP." An LP cost at least as big as the flat LP the same effect gains is refused.
2. "Marshmallon": "Once per turn: You can Special Summon this card from your GY, then swap its original ATK and DEF."
   This one works (tools/test_randomizer_gy_self_nov25.mjs plays it); the deal made broken relatives of it, which are
   refused now: a cost that moves this card ("You can Tribute this card; Special Summon this card from your GY"), a
   timing or condition with this card on the field ("while this card is face-up in Defense Position: ... Special Summon
   this card from your GY"), and "Cannot be Special Summoned." on a card that Special Summons itself.
3. Found in a sample of 12,000 dealt cards: "this card permanently loses 500 ATK, then this card permanently gains 500
   ATK"; "You can Tribute 1 other monster; this card permanently loses 200 ATK" (only a drawback); "Special Summon 1
   Level 4 monster; it cannot attack this turn from your Deck" (the place after the restriction).

Usage: python/python.exe tools/test_randomizer_nonsense_nov25.py [seeds, e.g. 5,17,29]
       python/python.exe tools/test_randomizer_nonsense_nov25.py --engine-cards <out.json>   (for the .mjs engine test)
"""
import json, random, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'tools'))
import randomizer as R
from test_randomizer_wording_nov24 import deal, sentences


def E(conds=(), costs=(), acts=(), limits=()):
    return {'conds': list(conds), 'costs': list(costs), 'acts': list(acts), 'limits': list(limits), 'others': []}


def text(parts, slot='m_main'):
    return R.effect_text({'slot': slot, 'name': 'X', 'parts': parts})


# (name, parts, dealt effect allowed?)
CASES = [
    ('Bagworm: pay 2000 LP; gain 1000 LP', E([{'k': 'yado_karu_defense_change'}], [{'k': 'lp', 'n': 2000}], [{'k': 'recover', 'n': 1000}]), False),
    ('pay 1000 LP; gain 1000 LP', E([], [{'k': 'lp', 'n': 1000}], [{'k': 'recover', 'n': 1000}], [{'k': 'opt'}]), False),
    ('pay 500 LP; gain 1000 LP is fine', E([{'k': 'yado_karu_defense_change'}], [{'k': 'lp', 'n': 500}], [{'k': 'recover', 'n': 1000}]), True),
    ('Marshmallon: GY ignition is fine', E([], [], [{'k': 'ss_self_gy_swap_base'}], [{'k': 'opt'}]), True),
    ('destroyed by battle, then revive from the GY is fine', E([{'k': 'battle_destroyed'}], [], [{'k': 'ss_self_gy'}], [{'k': 'opt'}]), True),
    ('Tribute this card; Special Summon this card from your GY', E([], [{'k': 'tribute_self'}], [{'k': 'ss_self_gy'}], [{'k': 'opt'}]), False),
    ('changes to Defense Position: Special Summon this card from your GY', E([{'k': 'changed_from_attack_to_defense'}], [], [{'k': 'ss_self_gy'}], [{'k': 'opt'}]), False),
    ('battled a monster that was not destroyed: Special Summon this card from your GY', E([{'k': 'battle_opponent_not_destroyed'}], [], [{'k': 'ss_self_gy_swap_base'}], [{'k': 'opt'}]), False),
]

# texts no dealt card may have (independent of the generator's rules)
FIELD = re.compile(r'(?i)this card is (?:face-up|in face-up|in (?:Attack|Defense) Position)|this card changes (?:from|to)|'
                   r'this card (?:attacks|battled|battles|destroys)|this card is (?:(?:Normal|Flip|Special|Tribute),? (?:or )?)*Summoned')
AWAY = re.compile(r'(?i)this card from your GY|this banished card|this card from banishment')


def scan(cards):
    bad = []
    for c in cards:
        if not c['text'] or c.get('type') == 'Normal Monster':
            continue
        if re.search(r'(?m)^Cannot be Special Summoned\.|\bCannot be Special Summoned\. ', c['text']) and re.search(r'Special Summon this card(?! from your hand)', c['text']) \
           and 'Cannot be Special Summoned from the GY' not in c['text']:
            bad.append((c, 'cannot be Special Summoned, but Special Summons this card', c['text'][:200]))
        for line, s in sentences(c['text']):
            head, _, body = s.partition(':') if ':' in s else ('', '', s)
            cost, _, act = body.partition(';') if ';' in body else ('', '', body)
            paid = sum(int(x) for x in re.findall(r'(?i)\bpay (\d+) LP\b', body))
            gain = [int(x) for x in re.findall(r'(?i)\bgain (\d+) LP\b(?! (?:for each|times|x\b|equal|per\b))', body)]
            if paid and gain and sum(gain) <= paid:
                bad.append((c, 'pays as much LP as it gains', s))
            stats = {}
            for verb, stat in re.findall(r'(?i)\bthis card (?:permanently )?(gains|loses) \d+ (ATK|DEF)\b', body):
                stats.setdefault(stat, set()).add(verb)
            if any(len(v) > 1 for v in stats.values()):
                bad.append((c, 'gains and loses the same stat', s))
            if AWAY.search(act) and FIELD.search(head) and not re.search(r'(?i)this (?:face-up )?card (?:is|was) (?:destroyed|sent|banished)|leaves the field', head):
                bad.append((c, 'on the field, acts on it in the GY', s))
            if AWAY.search(act) and re.search(r'(?i)\b(?:Tribute|discard|banish|send|return|shuffle|destroy) this card\b', cost):
                bad.append((c, 'the cost moves this card, the action needs it in the GY', s))
            if re.search(r'it cannot attack this turn from your', s):
                bad.append((c, 'the place after the restriction', s))
            if re.search(r'(?i)(?:: |; )(?:You can )?this card permanently loses \d+ ATK\.$', s):
                bad.append((c, 'only a drawback', s))
    return bad


def engine_cards():
    """Monsters for tools/test_randomizer_gy_self_nov25.mjs: the reported GY ignition, a plain GY revive, and the
    banished Dinosaur revive (used while banished)."""
    rng = random.Random(5)
    ids = iter(range(R.FIRST_ID, R.FIRST_ID + 900000))
    base = None
    while base is None:
        for c in R.make_card(random.Random(rng.random()), lambda: next(ids), set()):
            if c.get('slot') == 'm_main' and c.get('kind') == 'monster' and not c.get('monster_kind'):
                base = c
                break
    out = []
    for i, (act, where) in enumerate((('ss_self_gy_swap_base', 'grave'), ('ss_self_gy', 'grave'), ('ss_self_banished_dino_boost', 'banished'))):
        a = json.loads(json.dumps(base))
        a['id'] = R.FIRST_ID + 990000 + i
        a['atk'], a['defense'] = 2000, 1400
        a['effects'] = [{'kind': 'activated', 'conds': [], 'costs': [], 'acts': [{'k': act}], 'limits': [{'k': 'opt'}], 'others': []}]
        a['desc'] = R._deal_text(a)
        a['strings'] = R._strings(a)
        g = R.as_game_card(a)
        g['where'] = where
        out.append(g)
    return out


def main():
    if sys.argv[1:2] == ['--engine-cards']:
        Path(sys.argv[2]).write_text(json.dumps(engine_cards(), ensure_ascii=False), encoding='utf8')
        return
    fails = []
    for name, parts, allowed in CASES:
        got = R._deal_ok(parts, 'm_main', 'activated')
        if got != allowed:
            fails.append(f'{name}: dealt effect allowed={got}, expected {allowed} ({text(parts)}; {R._text_problem(parts, "m_main")})')
    # only a drawback: the lost ATK alone
    if not all(R._drawback_only({'k': k}) for k in ('lose_atk_permanent', 'lose_200_atk')):
        fails.append('losing ATK permanently is not counted as only a drawback')
    tidy = R._tidy('Once per turn: You can discard 1 Spell; Special Summon 1 Level 4 monster; it cannot attack this turn from your Deck.')
    if tidy != 'Once per turn: You can discard 1 Spell; Special Summon 1 Level 4 monster from your Deck; it cannot attack this turn.':
        fails.append('wording: ' + tidy)
    seeds = [int(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else [5, 17, 29]
    count = 0
    for seed in seeds:
        cards = deal(seed)
        count += len(cards)
        for c, why, s in scan(cards):
            fails.append(f'seed {seed} {c["name"]} ({c["type"]}): {why}: {s[:220]}')
    for f in fails:
        print('FAIL', f)
    if fails:
        print(f'{len(fails)} problems')
        sys.exit(1)
    print(f'PASS: {len(CASES)} cases; no LP cost at least as big as its gain, no revive of a card that is on the field or '
          f'that its own cost moved, no "Cannot be Special Summoned" self-summoner, in {count} dealt cards (seeds {seeds})')


if __name__ == '__main__':
    main()
