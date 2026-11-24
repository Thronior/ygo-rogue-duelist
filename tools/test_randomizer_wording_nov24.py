"""Randomized effects that read as nonsense (Discord Nov 24, player screenshots; the user's decisions):

1. "Poison Mummy": "If this card is Normal Summoned: You can destroy all Equip Cards equipped to this card." A card
   that has just been Summoned, flipped or activated has no past: no Equip Cards, no counters, no battles.
2. "Goddess of Whim": "You can target 1 Spell Card in your GY chosen by your opponent" - the player targets or the
   opponent chooses, not both. It is now "Your opponent chooses 1 Spell in your GY to place on top of your Deck".
3. "Last Turn": "When one of your monsters is sent from the field to your GY: Target that Summoned monster ..." - a
   reference to a Summoned monster needs a timing that Summoned one (Dark Renewal keeps its real timing).
4. "Forest": "roll a die and apply the result: discard, draw, destroy an opponent monster, or destroy this card" - each
   face says what it does, as its Lua does.

Deals several seeds and checks every card's text for these four kinds of problem, then checks the four cases.

Usage: python/python.exe tools/test_randomizer_wording_nov24.py [seeds, e.g. 5,17,29] [cards per seed; default a full deal]
"""
import json, random, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import randomizer as R

# ---------------------------------------------------------------- text checks (independent of the generator's rules)
FRESH = re.compile(r'^(?:Once per turn, )?(?:FLIP|(?:If|When) this (?:face-up |face-down )?card is (?:(?:Normal|Special|Flip|Tribute|Fusion|Ritual),? (?:or )?|or )*Summoned\b[^:]*|(?:If|When) this card is flipped face-up[^:]*):')
PAST = re.compile(r"(?<!be )\bequipped to this card\b|\bthis card and the monster equipped to it\b|\bthis card is equipped with\b|"
                  r"\b(?:remove|for each|with) [^.;]{0,30}?Counters? (?:from|on) this card\b|\bthis card has (?:\d+|a|any) [^.;]{0,20}?Counters?\b|"
                  r"\bthis card (?:has )?destroyed [^.;]{0,40}?by battle\b|\bthis card has (?:attacked|battled)\b|"
                  r"\b(?:monsters?|cards?) (?:that )?(?:battled|destroyed) this card\b|\bmonsters? this card (?:battled|destroyed|attacked)\b|"
                  r"destroyed by battle with this card this turn|\bthat Equip Card\b", re.I)
ONE_SHOT_TYPES = ('Normal Spell', 'Quick-Play Spell', 'Normal Trap', 'Counter Trap', 'Ritual Spell')
TARGET_CHOSEN = re.compile(r'\b[Tt]arget[^.;:]*\bchosen by (?:your|their) opponent')
SUMMONED_REF = re.compile(r'\b(?:that|the|those) (?:face-up )?Summoned monsters?\b|\bSummoned monster\(s\)')
SELF_SUMMONED = re.compile(r'\bthis (?:face-up )?card is (?:[\w,-]+ )*?Summoned\b')
DIE = re.compile(r'\brolls? (?:a|\d|two) (?:six-sided )?(?:die|dice)\b')


def sentences(text):
    for line in text.split('\n'):
        for s in re.split(r'(?<=\.)\s+(?=[A-Z"●])', line):
            if s.strip():
                yield line, s.strip()


def scan(cards):
    """(card, kind of problem, sentence) for every card text that reads as nonsense."""
    bad = []
    for c in cards:
        text, kind = c['text'], c.get('type') or ''
        if not text or kind == 'Normal Monster':
            continue
        one_shot = any(kind.startswith(t) for t in ONE_SHOT_TYPES)
        timing_before = ''
        for line, s in sentences(text):
            # "If you call it right, ..." goes on with the effect of the sentence before it
            # "Heads: ..." / "Tails: ..." / "1-3: ..." are outcomes of the timing before them, not timings (Nov 24)
            outcome = re.match(r'(?:Heads|Tails|\d(?:-\d)?):', s)
            if ':' in s and not outcome:
                timing_before = s.split(':')[0]
            elif not outcome and not re.match(r'If (?:you call it|Heads|Tails|it is)', s):
                timing_before = ''
            m = FRESH.match(s)
            # (a) a card that has just arrived, with a piece that needs it to have been there before
            if (m and PAST.search(s[m.end():])) or (one_shot and PAST.search(s)):
                bad.append((c, 'just arrived, needs a past', s))
            # (b) "target ... chosen by your opponent"
            if TARGET_CHOSEN.search(s):
                bad.append((c, 'targets and is chosen by the opponent', s))
            # (c) "that Summoned monster" with no timing that Summoned a monster
            r = SUMMONED_REF.search(s)
            if r:
                timing = s[:r.start()].split(':')[0] if ':' in s[:r.start()] and not outcome else timing_before
                if 'Summon' not in timing or SELF_SUMMONED.search(timing):
                    bad.append((c, 'a Summoned monster its timing does not have', s))
            # (d) die results with no faces, or a die that is not six-sided
            if DIE.search(s) and ('six-sided' not in s and 'dice' not in s):
                bad.append((c, 'a die that does not say six-sided', s))
            if re.search(r'apply the result(?![:,.]\s*(?:●\s*)?1\b)', s):
                bad.append((c, 'die results without their faces', s))
            # the hand cost puts this card in the GY and the effect takes a card back from the GY: a free loop unless it
            # is once per turn ("You can discard this card, then target 1 monster in your GY; add it to your hand")
            if re.search(r'You can (?:discard this card|send this card from your hand to the GY)', s) \
               and re.search(r'\b(?:in|from) (?:your |either |both |the )?(?:hand, Deck, or |Deck or |hand or )?GYs?\b', s) \
               and re.search(r'\badd\b|\bto (?:the|your) hand\b|Special Summon', s) and 'once per turn' not in line.lower():   # "Once per turn: You can ..." counts too (Nov 24)
                bad.append((c, 'a hand cost that can take itself back forever', s))
            # a coin that decides nothing
            if re.search(r'\btoss(?:es)? (?:a coin|\d coins|a coin \d times)\b', s) and not re.search(r'Heads|Tails|call it', line):
                bad.append((c, 'a coin with no result', s))
    return bad


def named_problems(cards):
    """A piece whose Lua only works with named cards must name them (Discord Nov 24, Goldlibra's "Magical Scientist":
    "You can send this card from your hand to the GY; Special Summon 1 monster from your hand, Deck, or GY" took only
    1 dealt card, so it was never activatable and the text did not say which)."""
    bad = []
    for c in cards:
        for e in c['card'].get('effects') or []:
            for cat in ('conds', 'costs', 'acts'):
                for q in e.get(cat, []):
                    meta = R.CATEGORIES[cat].get(q['k'], {})
                    words = ' '.join(str(meta.get(x, '')) for x in ('tclause', 'gen_text', 'text'))
                    if q.get('names') and (q.get('codes') or isinstance(q.get('code'), int)) and re.search(r'\{(?:filter|names|names_or|name)\}', words) \
                       and not any(n in c['text'] for n in q['names']):
                        bad.append((c, f'{q["k"]} needs {q["names"]} but the text does not say it', c['text'][:160]))
    return bad


HAND_COSTS = ('send_self_hand_cost', 'discard_self_hand')
SS_ACTS = ('ss_filtered', 'ss_any_filtered', 'ss_up_to_n_filtered')


def hand_summon_cards(seeds=(5, 11, 23)):
    """Cards for tools/test_randomizer_hand_summon_nov24.mjs: Monsters whose only effect is "<cost from the hand>;
    Special Summon 1 <named card or monster> from your hand, Deck, or GY", each with the card it Summons. Built
    from the reported pieces with every hand cost and zone, plus every such effect dealt in a full deal of the seeds."""
    out, cards = [], deal(seeds[0])
    base = next(c['card'] for c in cards if c['card'].get('slot') == 'm_main' and c['card'].get('kind') == 'monster' and not c['card'].get('monster_kind'))
    target = next(c['card'] for c in cards if c['card'].get('frame') == 'normal' and (c['card'].get('level') or 9) <= 4)
    next_id = iter(range(R.FIRST_ID + 950000, R.FIRST_ID + 999000))

    def make(effect, target_card):
        # every card gets its own id: the seeds' deals number their cards from the same first id
        effect = json.loads(json.dumps(effect))
        if target_card:
            old, target_card = target_card['id'], json.loads(json.dumps(target_card))
            target_card['id'] = next(next_id)
            for q in effect['acts']:
                if q.get('codes'):
                    q['codes'] = [target_card['id'] if x == old else x for x in q['codes']]
        a = json.loads(json.dumps(base))
        a['id'] = next(next_id)
        a['effects'] = [effect]
        a['desc'] = R._deal_text(a)
        a['strings'] = R._strings(a)
        return {'test': R.as_game_card(a), 'target': R.as_game_card(target_card) if target_card else None,
                'zone': next((q.get('zone') for q in effect['acts']), None)}

    def effect(cost, act):
        return {'kind': 'activated', 'conds': [], 'costs': [{'k': cost}], 'acts': [act], 'limits': [], 'others': []}
    for cost in HAND_COSTS:
        for zone in ('deck_hand_gy', 'deck', 'deck_hand'):
            out.append(make(effect(cost, {'k': 'ss_filtered', 'kind': 'monster', 'codes': [target['id']], 'names': [target['name']],
                                          'zone': zone, 'position': 'attack'}), target))
        out.append(make(effect(cost, {'k': 'ss_filtered', 'kind': 'monster', 'zone': 'deck', 'position': 'attack'}), None))   # any monster
    # the same pieces as the deal made them
    for seed in seeds:
        dealt = cards if seed == seeds[0] else deal(seed)
        by_id = {c['card']['id']: c['card'] for c in dealt}
        for c in dealt:
            for e in c['card'].get('effects') or []:
                acts = [q for q in e.get('acts', []) if q['k'] in SS_ACTS and re.search('deck|hand', q.get('zone') or 'deck')]
                if e.get('kind') == 'activated' and not e.get('conds') and acts and any(q['k'] in HAND_COSTS for q in e.get('costs', [])) \
                   and len(e['acts']) == 1 and acts[0].get('codes') and all(x in by_id for x in acts[0]['codes']):
                    tgt = by_id[acts[0]['codes'][0]]
                    if tgt.get('kind') == 'monster' and tgt.get('frame') not in ('fusion', 'ritual'):
                        out.append(make({**e, 'limits': [q for q in e.get('limits', []) if q['k'] in ('opt', 'hopt')]}, tgt))
    return out


def deal(seed, limit=None):
    rng = random.Random(seed)
    ids = iter(range(R.FIRST_ID, R.FIRST_ID + 900000))
    used, out = set(), []
    while limit is None or len(out) < limit:
        batch = R.make_card(random.Random(rng.random()), lambda: next(ids), used)
        if R._DEALERS[-1][1].rounds > 1:
            break
        for card in batch:
            game = R.as_game_card(card)['card']
            out.append(dict(name=game['name'], type=game.get('type', ''), text=(game.get('desc') or '').strip(), card=card))
    return out


# ---------------------------------------------------------------- the four reported cases
def cases():
    fails = []
    card = {'slot': 'm_main', 'name': 'X'}

    def check(ok, why):
        if not ok:
            fails.append(why)

    # 1. no Summon or Flip timing with a piece that needs this card's past
    for ev in ({'k': 'summoned'}, {'k': 'summon_trigger', 'methods': ['normal']}, {'k': 'flip'}, {'k': 'any_special_summoned'}):
        parts = {c: [] for c in R.CATEGORIES}
        parts['conds'] = [ev]
        parts['costs'] = [{'k': 'send_equipped'}]
        parts['acts'] = [{'k': 'draw', 'n': 1}] if 'draw' in R.ACTS else [{'k': 'destroy_equipped_event'}]
        check(R._history_contradiction(parts, 'm_main'), f'{ev["k"]} + "send 1 Equip Card equipped to this card" is allowed')
        parts = {c: [] for c in R.CATEGORIES}
        parts['conds'] = [ev, {'k': 'kills', 'n': 1}]
        parts['acts'] = [{'k': 'destroy_equipped_event'}]
        check(R._history_contradiction(parts, 'm_main'), f'{ev["k"]} + "this card has destroyed 1 or more monsters by battle" is allowed')
    # ... and a Normal Spell is just being activated
    parts = {c: [] for c in R.CATEGORIES}
    parts['costs'] = [{'k': 'remove_three_self_spell_counters'}]
    parts['acts'] = [{'k': 'destroy_equipped_event'}]
    check(R._history_contradiction(parts, 's_normal'), 'a Normal Spell that removes counters from itself is allowed')
    # Gearfried's Equip destruction keeps its own timing and says which Equip Card
    check(R._event_need([{'k': 'destroy_equipped_event', '_e': 'equipped_to_this'}]) == {'equipped_to_this'},
          'destroy_equipped_event can take a timing other than "When an Equip Card is equipped to this card"')
    parts = {c: [] for c in R.CATEGORIES}
    parts['conds'] = [{'k': 'summoned'}]
    parts['acts'] = [{'k': 'destroy_equipped_event'}]
    check(R._text_problem(parts, 'm_main'), '"If this card is Normal Summoned: destroy that Equip Card" is allowed')
    parts['conds'] = [{'k': 'equipped_to_this'}]
    t = R.effect_text({'slot': 'm_main', 'name': 'X', 'parts': parts})
    check(not R._text_problem(parts, 'm_main') and not R._history_contradiction(parts, 'm_main'), f'its real timing is refused: {t}')
    check('equipped to this card:' in t.lower() and 'that Equip Card' in t, f'Gearfried text: {t}')
    # 2. the opponent chooses, nothing targets
    meta = R.ACTS['pixie_knight_spell_topdeck']
    check(not meta.get('target') and 'tclause' not in meta, 'pixie_knight_spell_topdeck still targets')
    parts = {c: [] for c in R.CATEGORIES}
    parts['conds'] = [{'k': 'any_special_summoned'}]
    parts['acts'] = [{'k': 'pixie_knight_spell_topdeck'}]
    t = R.effect_text({'slot': 'm_main', 'name': 'X', 'parts': parts})
    check('target' not in t.lower() and 'your opponent chooses 1 spell in your gy to place on top of your deck' in t.lower() and not TARGET_CHOSEN.search(t), f'Goddess of Whim text: {t}')
    lua = (ROOT / 'data/randomizer/randomizer.lua').read_text(encoding='utf8')
    block = re.search(r'^R\.Act\.pixie_knight_spell_topdeck=.*?(?=^R\.)', lua, re.S | re.M).group(0)
    check('target=true' not in block and 'SelectTarget' not in block and 'SelectMatchingCard(1-tp' in block, 'its Lua still targets, or the opponent does not choose')
    # 3. Dark Renewal needs the opponent's Summon
    check(R._event_need([{'k': 'dark_renewal', '_e': 'opp_summon'}]) == {'opp_summon'}, 'dark_renewal can take another timing')
    for ev in ({'k': 'opp_activate'}, {'k': 'sent_to_gy'} if 'sent_to_gy' in R.CONDS else {'k': 'opp_activate'}, None):
        parts = {c: [] for c in R.CATEGORIES}
        parts['conds'] = [ev] if ev else []
        parts['acts'] = [{'k': 'dark_renewal'}]
        check(R._text_problem(parts, 't_normal'), f'"that Summoned monster" with timing {ev and ev["k"]} is allowed')
    parts = {c: [] for c in R.CATEGORIES}
    parts['conds'] = [{'k': 'opp_summon'}]
    parts['acts'] = [{'k': 'dark_renewal'}]
    t = R.effect_text({'slot': 't_normal', 'name': 'X', 'parts': parts})
    check(not R._text_problem(parts, 't_normal'), f'Dark Renewal with its own timing is refused: {t}')
    # 4. every face of Dangerous Machine Type-6, as its Lua does it
    t = R.AURAS['dangerous_machine_type6']['text']
    faces = ['1: You discard 1 card.', '2: Your opponent discards 1 card.', '3: You draw 1 card.', '4: Your opponent draws 1 card.',
             '5: Destroy 1 monster your opponent controls.', '6: Destroy this card.']
    check('six-sided die' in t and all(f in t for f in faces), f'Forest text: {t}')
    block = re.search(r'^R\.Rule\.dangerous_machine_type6=.*?(?=^R\.)', lua, re.S | re.M).group(0)
    check(all(x in block for x in ('result==1 and tp or 1-tp', 'DiscardHand', 'result==3 and tp or 1-tp', 'result==5', 'Duel.Destroy(se:GetHandler()')),
          'the Lua of Dangerous Machine Type-6 no longer matches its faces')
    # 5. Goldlibra's "Magical Scientist": a Special Summon that takes only a named card says the name
    parts = {c: [] for c in R.CATEGORIES}
    parts['costs'] = [{'k': 'send_self_hand_cost'}]
    parts['acts'] = [{'k': 'ss_filtered', 'kind': 'monster', 'codes': [191000277], 'names': ['Rafflesia Seduction'], 'zone': 'deck_hand_gy', 'position': 'attack'}]
    t = R.effect_text({'slot': 'm_main', 'name': 'X', 'parts': parts})
    check('Special Summon 1 "Rafflesia Seduction" from your hand, Deck, or GY in face-up Attack Position' in t, f'Magical Scientist text: {t}')
    return fails


if __name__ == '__main__':
    if sys.argv[1:2] == ['--hand-summon-cards']:   # input for tools/test_randomizer_hand_summon_nov24.mjs
        Path(sys.argv[2]).write_text(json.dumps({'cards': hand_summon_cards()}, ensure_ascii=False), encoding='utf8')
        sys.exit(0)
    seeds = [int(s) for s in (sys.argv[1] if len(sys.argv) > 1 else '5,17,29,41,53,67').split(',')]
    per = int(sys.argv[2]) if len(sys.argv) > 2 else None   # a full deal per seed
    fails = cases()
    for f in fails:
        print('FAIL case:', f)
    total, problems = 0, []
    for seed in seeds:
        cards = deal(seed, per)
        total += len(cards)
        problems += [(seed, *p) for p in scan(cards) + named_problems(cards)]
    for seed, c, why, s in problems[:40]:
        print(f'FAIL seed {seed} {c["name"]} ({c["type"]}): {why}: {s[:160]}')
    if fails or problems:
        print(f'{len(fails)} case failures, {len(problems)} problems in {total} cards')
        sys.exit(1)
    print(f'PASS: 4 reported cases, and no just-arrived card with a past, no targeted card chosen by the opponent, '
          f'no orphan "that Summoned monster" and no die without its faces in {total} dealt cards (seeds {seeds})')
