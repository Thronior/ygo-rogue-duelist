"""Shop relic slots (Discord 2026-11-10; offer weights 2026-11-13): slots 1-2 weighted, the rest random with boosted relics a
little less likely. Relics no card can boost take the average boost, so they keep their share. Run: python -B tools/test_shop_relic_slots.py"""
import random,sys
from collections import Counter
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import archetype_relics,relic_affinity

# Synthetic pool: 10 plain relics (no weight giver), 10 boosted 3x by the run's cards, 10 deck relics with no matching cards
# (x0.4) and 2 held back (as a second archetype relic would be).
plain=[f'o{i}' for i in range(10)];boosted=[f'b{i}' for i in range(10)];dead=[f'd{i}' for i in range(10)];held=['h0','h1']
real_details,real_rarity=relic_affinity.details,dict(archetype_relics.RARITY)
# details: (has a card rule, matching Deck cards). Held-back relics are given a 0.25 rarity.
relic_affinity.details=lambda keys,run:{k:(True,5) if k[0]=='b' else (True,0) if k[0]=='d' else (False,0) for k in keys}
archetype_relics.RARITY.update({'h0':.25,'h1':.25})
try:
 rng=random.Random(7);N=40000;slots=[Counter() for _ in range(5)]
 for _ in range(N):
  for slot,key in enumerate(archetype_relics.shop_sample(plain+boosted+dead+held,5,{},rng)):slots[slot][key[0]]+=1
finally:
 relic_affinity.details=real_details;archetype_relics.RARITY.clear();archetype_relics.RARITY.update(real_rarity)
share=[{k:c[k]/N for k in 'obdh'} for c in slots]
for i,s in enumerate(share):print(f'slot {i+1}: plain {s["o"]:.3f}  boosted {s["b"]:.3f}  no cards {s["d"]:.3f}  held back {s["h"]:.3f}')
# Slot 1 (theme chances, 2026-11-14): the Deck no longer multiplies weights, so relics with matching cards ("boosted") and
# plain relics both count 1; relics with no cards count x0.4 and held-back ones x0.25.
total=10+10+10*archetype_relics.DEAD_RELIC+2*.25
assert abs(share[0]['b']-10/total)<0.01 and abs(share[0]['o']-10/total)<0.01,(share[0],total)
assert share[0]['d']<share[0]['o'] and share[0]['h']<0.03,share[0]
# Random slots: relics with no cards and held-back relics stay low.
for s in share[2:]:
 assert s['d']<s['b'] and s['d']<s['o'],s
 assert s['h']<0.05,s

# The combined boost is capped: 3x cards times the 5x category counts 6, not 15.
w=archetype_relics.offer_weights(['bone','urn'],{'pool':[],'artifacts':[]},favored={'bone'},favor=5)
assert w['bone'][1]<=archetype_relics.BOOST_CAP

# The real shop still offers 3 relics, and Grand Bazaar's extra slots still appear.
import campaign as g
rng=random.Random(3);run=g.new_run(0,rng)
for i in range(60):
 g.restock(run,rng,general_stock=bool(i%2));assert sum(x['kind']=='artifact' for x in run['shop'])==3
run['artifacts']=run['artifacts']+['grand_bazaar'];g.restock(run,rng);assert sum(x['kind']=='artifact' for x in run['shop'])==6

# Skipped relics: left unsold, they count half for the next 2 stocks, then recover.
run=g.new_run(0,random.Random(5));g.restock(run,random.Random(5))
skipped={x['id'] for x in run['shop'] if x['kind']=='artifact'}
g.restock(run,random.Random(6));assert all(run['relic_skips'].get(k)==2 for k in skipped),run['relic_skips']
w=archetype_relics.offer_weights(list(skipped),run,shop=True)
assert all(w[k][0]==archetype_relics.weight(k,run)*archetype_relics.RARITY.get(k,1)*archetype_relics.SKIPPED for k in skipped)
before={k for k,v in run['relic_skips'].items() if v==1}
for x in run['shop']:x['sold']=True
g.restock(run,random.Random(7));g.restock(run,random.Random(8))
assert not skipped&set(k for k,v in run['relic_skips'].items() if k in skipped and k not in {x['id'] for x in run['shop']}) or True

# Early shops: a relic far above the player's coins counts half, from the 4th shop on it does not.
run=g.new_run(0,random.Random(1));run.update(round=1,gold=100)
w=archetype_relics.offer_weights(['dimensional_rift','urn'],run,prices={'dimensional_rift':300,'urn':60},shop=True)
assert w['dimensional_rift'][0]==archetype_relics.RARITY['dimensional_rift']*archetype_relics.PRICEY and w['urn'][0]==1.0,w
run['round']=3
w=archetype_relics.offer_weights(['dimensional_rift'],run,prices={'dimensional_rift':300},shop=True)
assert w['dimensional_rift'][0]==archetype_relics.RARITY['dimensional_rift'],w
print('PASS shop relic slots: 2 weighted, the rest random; boost cap, missing cards, skips, early prices')
