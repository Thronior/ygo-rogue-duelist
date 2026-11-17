import sys,random,tempfile,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,archetype_relics as a,shop_rewards
base=Path(tempfile.mkdtemp(prefix='archetype-relics-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=list(content.PLAYABLE_IDS);storage.write(base/'profile.json',p)
r=g.new_run(0,random.Random(7));r.update(stage='shop',gold=1000,artifacts=[])
for key,name,label,art in a.DEFINITIONS:
 assert art in g.BY_NAME,art
 pool=[c for c in g.CARDS if a.matches(key,c)];assert pool,key
 assert content.ARTIFACTS[key][1]==(80 if key in ('fusion_chamber','ritual_dagger') else 60 if key in a.STARTER_CARD else 85)
 for reroll in [False,True]:
  r['artifacts']=[key];g.restock(r,random.Random(10),general_stock=reroll)
  singles=[x for x in r['shop'] if x['kind']=='single'];assert len(singles)==11,(key,len(singles))
  assert a.matches(key,g.BY_ID[singles[-1]['id']]),key
 # 2026-11-16 balance picks: four of them bring 1 card of their pool when bought.
 before=list(r['pool']);r['artifacts']=[];got=g.acquire_relic(r,key,random.Random(3))
 assert len(got)==(1 if key in a.STARTER_CARD else 0) and all(a.matches(key,g.BY_ID[c]) for c in got),(key,got)
 r['pool']=before
 print('PASS',key,len(pool),'eligible pool cards; bonus stock on visits and rerolls')
# Fusion Chamber offers a Fusion Monster only with one of its materials in the card pool; support cards always.
bugroth=g.BY_NAME['Amphibious Bugroth'];five=g.BY_NAME['Five-Headed Dragon']
assert not a.fusion_offerable(bugroth,[g.BY_NAME['Battle Ox']]) and a.fusion_offerable(bugroth,[g.BY_NAME['Ground Attacker Bugroth']])
assert a.fusion_offerable(five,[g.BY_NAME['Luster Dragon']]) and not a.fusion_offerable(five,[g.BY_NAME['Battle Ox']])
assert a.fusion_offerable(g.BY_NAME['Polymerization'],[])
r['pool']=[g.BY_NAME['Pot of Greed']['id']]*40;r['artifacts']=['fusion_chamber']
for seed in range(30):
 g.restock(r,random.Random(seed));bonus=g.BY_ID[[x for x in r['shop'] if x['kind']=='single'][-1]['id']]
 assert a.matches('fusion_chamber',bonus) and not bonus['data']['type']&0x40,bonus['name']
# Legendary Shackles: only missing pieces, then Exodia support.
names=sorted(a.EXODIA);r['artifacts']=['legendary_shackles']
r['pool']=[g.BY_NAME[n]['id'] for n in names[:4]]
for seed in range(10):
 g.restock(r,random.Random(seed));assert g.BY_ID[[x for x in r['shop'] if x['kind']=='single'][-1]['id']]['name']==names[4]
r['pool']=[g.BY_NAME[n]['id'] for n in names]
for seed in range(10):
 g.restock(r,random.Random(seed));c=g.BY_ID[[x for x in r['shop'] if x['kind']=='single'][-1]['id']]
 assert c['name'] not in a.EXODIA and shop_rewards.matches(c,'exodia'),c['name']
print('PASS Fusion Chamber materials, Legendary Shackles missing pieces and support')
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
# Empty Deck: Amazoness Standard x0.25 hold-back x0.4 (no cards) against Jade Pendant's 1 (plain relics count 1 since 2026-11-14).
assert 800<counts[0]<1050 and 400<counts[1]<560,counts
r['artifacts']=list(a.NEW_IDS);g.restock(r,random.Random(5));assert sum(x['kind']=='single' for x in r['shop'])==10+len(a.NEW_IDS)
print('PASS pools exclude unrelated names, all bonuses stack, rarity and ownership weighting',counts)
