"""Opponent-screen categories follow the Deck (user, 2026-11-14): 3 weighted picks, removal categories a flat x2 there,
missing themes x0.4, Tag halves each Deck, and data/category-ceilings.json stays current."""
import sys,json,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,shop_rewards as s,relic_affinity as ra
AMA=[c['id'] for c in g.CARDS if c['name'].startswith('Amazoness')]
ZOMBIE=g.BY_NAME['Armored Zombie']['id']
deck=lambda ids:{'pool':ids,'selected':list(range(len(ids))),'round':1,'artifacts':[]}
keys=s.reward_keys();w=s.category_weights(keys,deck(AMA*3))
assert w['amazoness']==ra.ARCHETYPE_CEILING and w['amazoness']>w['Warrior']>1,w
assert w['Zombie']==ra.DEAD_CARD and w['monster_removal']==w['spelltrap_removal']==s.REMOVAL_WEIGHT,w
assert s.category_weights(keys,None)=={k:1.0 for k in keys} if hasattr(s,'category_weights') else True
# Tag: half of each Deck's change.
z=s.category_weights(keys,deck([ZOMBIE]*40));both=s.category_weights(keys,[deck(AMA*3),deck([ZOMBIE]*40)])
assert abs(both['amazoness']-(1+.5*(w['amazoness']-1)+.5*(z['amazoness']-1)))<1e-9 and both['monster_removal']==2.0
# Only 3 picks are weighted: with a flat-x0 trick on the rest the screen still fills, and the weighted ones lean on-theme.
rng=random.Random(4);hits=sum('amazoness' in [v['key'] for v in s.route_rewards([1,2,3,4,5],rng,None,deck(AMA*3)).values()] for _ in range(2000))
base=sum('amazoness' in [v['key'] for v in s.route_rewards([1,2,3,4,5],rng,None,None).values()] for _ in range(2000))
assert hits>3*base,(hits,base)
r=s.route_rewards([1,2,3,4,5],random.Random(1),None,deck(AMA*3));assert len({v['key'] for v in r.values()})==5
assert json.loads(ra.CATEGORY_CEILINGS_FILE.read_text(encoding='utf8'))==ra.compute_category_ceilings(),'data/category-ceilings.json is stale'
print(f'PASS category weights: Amazoness x{w["amazoness"]}, Warrior x{w["Warrior"]:.2f}, missing x0.4, removal x2; offered {hits/20:.0f}% vs {base/20:.0f}%')
