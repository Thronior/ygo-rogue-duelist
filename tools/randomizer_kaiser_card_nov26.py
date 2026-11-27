"""Builds a randomized Continuous Spell whose effect is kaiser_colosseum ("While you control a monster, your opponent cannot
control more monsters than you control; they send any extra ones to the GY.") for tools/test_randomizer_kaiser_nov26.mjs.
  python/python.exe tools/randomizer_kaiser_card_nov26.py <out.json>"""
import json, random, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import randomizer as R

ids = iter(range(R.FIRST_ID + 980000, R.FIRST_ID + 989999))
base = None
for seed in range(400):
    for c in R.make_cards(seed, [('spell', 'Continuous')] * 6):
        if c.get('slot') == 's_cont':
            base = c; break
    if base: break
card = json.loads(json.dumps(base))
card['id'] = next(ids)
card['effects'] = [{'kind': 'aura', 'conds': [], 'costs': [], 'acts': [{'k': 'kaiser_colosseum'}], 'limits': [], 'others': []}]
card['desc'] = R._deal_text(card)
card['strings'] = R._strings(card)
g = R.as_game_card(card)
Path(sys.argv[1]).write_text(json.dumps(g, ensure_ascii=False), encoding='utf8')
