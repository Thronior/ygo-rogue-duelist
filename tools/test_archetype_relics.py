import sys,random,tempfile,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,archetype_relics as a
base=Path(tempfile.mkdtemp(prefix='archetype-relics-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',p)
r=g.new_run(0,random.Random(7));r.update(stage='shop',gold=1000,artifacts=[])
for key,name,label,art in a.DEFINITIONS:
 assert art in g.BY_NAME,art
 pool=[c for c in g.CARDS if a.matches(key,c)];assert pool,key
 assert content.ARTIFACTS[key][1]==(80 if key=='fusion_chamber' else 85)
 for reroll in [False,True]:
  r['artifacts']=[key];g.restock(r,random.Random(10),general_stock=reroll)
  singles=[x for x in r['shop'] if x['kind']=='single'];assert len(singles)==11,(key,len(singles))
  assert a.matches(key,g.BY_ID[singles[-1]['id']]),key
 print('PASS',key,len(pool),'eligible pool cards; bonus stock on visits and rerolls')
assert a.matches('destiny_hourglass',g.BY_NAME['Final Countdown'])
assert not a.matches('guardian_arsenal',g.BY_NAME['Celtic Guardian'])
assert not a.matches('evolution_tablet',g.BY_NAME['Level Limit - Area B'])
assert a.matches('union_dock',g.BY_NAME['XYZ-Dragon Cannon'])
assert a.matches('union_dock',g.BY_NAME['Heavy Mech Support Platform'])
for key in a.FAMILY:
 assert a.weight(key,{})==.25
 for owned in a.FAMILY:assert a.weight(key,{'artifacts':[owned]})==.125
 assert a.weight(key,{'artifacts':list(a.FAMILY)})==.125
assert a.weight('scarab',{'artifacts':list(a.FAMILY)})==1
rng=random.Random(9);counts=[sum(a.sample(['scarab','amazoness_standard'],1,run,rng)[0]=='amazoness_standard' for _ in range(10000)) for run in [{},{'artifacts':['toon_world']}]]
assert 1700<counts[0]<2300 and 850<counts[1]<1350,counts
r['artifacts']=list(a.NEW_IDS);g.restock(r,random.Random(5));assert sum(x['kind']=='single' for x in r['shop'])==10+len(a.NEW_IDS)
print('PASS pools exclude unrelated names, all bonuses stack, rarity and ownership weighting',counts)
