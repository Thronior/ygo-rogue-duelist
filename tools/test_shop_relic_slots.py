"""Shop relic slots (Discord 2026-11-10): slots 1-2 weighted, the rest random with boosted relics a little less likely.
Run: python -B tools/test_shop_relic_slots.py"""
import random,sys
from collections import Counter
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import archetype_relics,relic_affinity

# Synthetic pool: 10 ordinary relics, 10 boosted 3x by the run's cards, 2 held back (as a second archetype relic would be).
ordinary=[f'o{i}' for i in range(10)];boosted=[f'b{i}' for i in range(10)];held=['h0','h1']
real_mult,real_weight=relic_affinity.multipliers,archetype_relics.weight
relic_affinity.multipliers=lambda keys,run:{k:3.0 if k.startswith('b') else 1.0 for k in keys}
archetype_relics.weight=lambda k,run:0.25 if k.startswith('h') else 1.0
try:
 rng=random.Random(7);N=40000;slots=[Counter() for _ in range(5)]
 for _ in range(N):
  for slot,key in enumerate(archetype_relics.shop_sample(ordinary+boosted+held,5,{},rng)):slots[slot][key[0]]+=1
finally:relic_affinity.multipliers,archetype_relics.weight=real_mult,real_weight
share=[{k:c[k]/N for k in 'obh'} for c in slots]
for i,s in enumerate(share):print(f'slot {i+1}: ordinary {s["o"]:.3f}  boosted {s["b"]:.3f}  held back {s["h"]:.3f}')
# Slot 1 is weighted: boosted relics 30 of 40.5 weight -> about 74%.
assert abs(share[0]['b']-30/40.5)<0.01,share[0]
assert share[1]['b']>0.65,share[1]
# Random slots: boosted relics are less likely than ordinary ones, but only a little (0.8 against 1 per relic).
for s in share[2:]:
 assert s['b']<s['o'],s
 assert s['b']>0.25,s
# Held-back relics stay held back in random slots too.
for s in share[2:]:assert s['h']<0.05,s

# The real shop still offers 3 relics, and Grand Bazaar's extra slots still appear.
import campaign as g
rng=random.Random(3);run=g.new_run(0,rng)
for i in range(60):
 g.restock(run,rng,general_stock=bool(i%2));assert sum(x['kind']=='artifact' for x in run['shop'])==3
run['artifacts']=run['artifacts']+['grand_bazaar'];g.restock(run,rng);assert sum(x['kind']=='artifact' for x in run['shop'])==6
print('PASS shop relic slots: 2 weighted, the rest random; boosted relics a little less likely there')
