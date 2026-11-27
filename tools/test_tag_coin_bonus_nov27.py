"""Tag victories pay 25% more coins (user, 2026-11-27; a flat +20 since 2026-11-26), as their own line with a +25% note."""
import copy, random, sys, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import campaign as g, storage, easy_mode

(ROOT / 'temp').mkdir(exist_ok=True)
base = Path(tempfile.mkdtemp(prefix='tag-coins-', dir=ROOT / 'temp'))
storage.ROOT = base; g.SAVE = base / 'run.json'; g.RUNTIME = base / 'runtime'; g.RUNTIME.mkdir()

for seed, level in ((21, 0), (22, 3)):
    run = g.new_run(0, random.Random(seed)); run.update(_save_slot=1, challenge_level=level)
    run['gold'] = 200
    solo_tally, solo = g.rewards(copy.deepcopy(run), [])
    tag = dict(copy.deepcopy(run), history_mode='tag')
    tally, total = g.rewards(tag, [])
    assert 'Tag team bonus' not in solo_tally
    assert tally['Tag team bonus'] == solo * 25 // 100 and total == solo + solo * 25 // 100, (level, tally, solo)
    assert tag['last_reward_notes']['Tag team bonus'] == ['+25%', ''], tag['last_reward_notes']

# Easy Tag stacks both: the Tag bonus first, then Easy's 25% on the larger total.
run = g.new_run(0, random.Random(23), easy=True); run['_save_slot'] = 1
plain_tally, plain = g.rewards(dict(copy.deepcopy(run), easy=False), [])
tally, total = g.rewards(dict(copy.deepcopy(run), history_mode='tag'), [])
tagged = plain + plain * 25 // 100
assert tally['Tag team bonus'] == plain * 25 // 100 and total == tagged + easy_mode.coin_bonus(tagged), (tally, plain)
print('PASS tag coin bonus is +25%')
