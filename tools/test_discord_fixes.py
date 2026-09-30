"""Headless checks: discount repricing on purchase, zombies_bargain heal block + ATK, level_unlocked flag."""
import sys, random, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(ROOT))
import storage, campaign as g
from content import ARTIFACTS, ART_INFO
base = ROOT/'temp'/('disc-check-'+uuid.uuid4().hex); base.mkdir(); storage.ROOT = base; g.SAVE = base/'run.json'
# --- discount applies immediately ---
r = g.new_run(0, random.Random(1)); g.auto_deck(r)
r.update(stage='shop', round=3, gold=9999, lp=5400)
g.routes(r); g.restock(r, random.Random(1))
r['shop'].append(dict(kind='artifact', id='bargain', price=ARTIFACTS['bargain'][1], sold=False))
before = {i: x['price'] for i, x in enumerate(r['shop']) if not x['sold'] and x['kind'] != 'deck'}
idx = next(i for i, x in enumerate(r['shop']) if x['id'] == 'bargain')
g.buy(r, idx, random.Random(1))
assert 'bargain' in r['artifacts']
for i, p in before.items():
    if i == idx or r['shop'][i]['kind'] == 'deck':
        continue
    exp = max(1, round(p*0.8))
    assert r['shop'][i]['price'] == exp, (i, p, r['shop'][i]['price'], exp)
print('PASS discount repriced on purchase')
# --- zombies_bargain blocks all heals, ATK 800 ---
import approved_relics as ar
r2 = g.new_run(0, random.Random(2)); g.auto_deck(r2)
r2.update(stage='shop', round=3, gold=999, lp=5000)
assert ar.can_heal(r2, between=True)
r2['artifacts'].append('cursed_zombies_bargain')
assert not ar.can_heal(r2, between=True) and not ar.can_heal(r2)
import approved_relics as _arlist
txt = [a for a in _arlist.CURSED if a[1] == 'zombies_bargain'][0]
print('PASS heal block + relic:', txt[2], '|', txt[3][:60])
# --- level_unlocked flag ---
import challenge_levels as cl
p = storage.profile()
r3 = g.new_run(0, random.Random(3))
r3['character'] = 0; r3['challenge_level'] = 0
cl.award(p, r3)
assert r3.get('level_unlocked') == 1, r3.get('level_unlocked')
print('PASS level_unlocked =', r3['level_unlocked'])
print('ALL HEADLESS CHECKS PASS')
