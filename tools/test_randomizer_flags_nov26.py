"""Randomized cards reported on 2026-11-26:

1. A rolled card had "inflict 1000 damage ... for each of your Standby Phases since this card was activated" without the
   counter that effect reads, so it could never be activated (flag 384f9fb7). wave_motion_damage is kept off rolls.
2. "Thousand Energy": "While it is the Battle Phase, your opponent cannot control more monsters than you control." The
   limit only applies as monsters are placed, so a condition left it doing nothing (Discord). kaiser_colosseum takes none.
3. "White Dragon Ritual": "Target 1 monster on the field; place it on top of the Deck, then destroy all face-up Fish
   monsters on the field" could not be activated without a face-up Fish. Only the first action (and any that target) must be
   possible; the Lua check is read here, the engine test plays it (tools/test_randomizer_engine.mjs gate).
"""
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import randomizer as R

checks = 0
lone = []
for seed in list(range(0, 121)) + [166]:
    for c in R.make_cards(seed, [('spell', 'Continuous')] * 25):
        keys = {p.get('k') for e in (c.get('effects') or []) for cat in ('conds', 'costs', 'acts', 'limits', 'others') for p in (e.get(cat) or [])}
        if 'wave_motion_damage' in keys and 'wave_motion_counter' not in keys:
            lone.append((seed, c.get('name')))
assert not lone, ('Standby burn without its counter', lone[:5]); checks += 1

parts = lambda conds: {'conds': conds, 'costs': [], 'acts': [{'k': 'kaiser_colosseum'}], 'limits': [], 'others': []}
assert not R._deal_ok(parts([{'k': 'battle_phase'}]), 's_cont', 'continuous'), 'Kaiser Colosseum takes no condition'; checks += 1
assert R._deal_ok(parts([]), 's_cont', 'continuous'), 'Kaiser Colosseum alone is still dealt'; checks += 1

lua = (ROOT / 'data/randomizer/randomizer.lua').read_text(encoding='utf8')
strict = re.findall(r'if a\.check and not a\.check\(e,tp,eg,ep,ev,re,r,rp,p\)', lua)
assert not strict, 'every later action no longer has to be possible'; checks += 1
assert lua.count('if a.check and (i==1 or a.target) and not a.check(') == 2; checks += 1
print(f'PASS randomizer flags nov26 ({checks} checks): Standby burn keeps its counter, Kaiser Colosseum takes no condition, "then" actions do not block activation')
