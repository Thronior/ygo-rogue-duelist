import sys,json,random,tempfile,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content as c,storage,character_variants as v
base=Path(tempfile.mkdtemp(prefix='variants-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=list(c.PLAYABLE_IDS);p['character_levels']={str(i):2 for i in c.PLAYABLE_IDS};storage.write(base/'profile.json',p)
relics=[c.CHARACTERS[i]['starting_relic'] for i in c.PLAYABLE_IDS]
for k,row in v.VARIANTS.items():
 i=int(k);relics.append(row['starting_relic']);assert row['starting_relic'] in c.ARTIFACTS
 for level in [-1,0,1]:
  try:v.loadout(c.CHARACTERS,i,1,{'character_levels':{k:level}})
  except ValueError:pass
  else:raise AssertionError(('early unlock',i,level))
 alt=v.loadout(c.CHARACTERS,i,1,p);assert alt['name']==c.CHARACTERS[i]['name']
 assert len(alt['starting_packs'])==4
 assert alt['starting_packs'][:2]==[c.CHARACTERS[i]['pack']]*2
 assert set(alt['starting_packs'][2:]).isdisjoint(c.starting_packs(i)[2:]),('support overlap',i)
 pack=c.PACK_BY_ID[c.CHARACTERS[i]['pack']];pool=set(pack['common']+pack['rare'])
 for name in c.CHARACTERS[i]['cards']+row['cards']+row['pack_additions']:assert g.BY_NAME[name]['id'] in pool,(i,name)
 for seed in range(3):
  r=g.new_run(i,random.Random(seed),0,1)
  assert r['starting_relic']==row['starting_relic'];assert r['variant']==1
  assert r['guaranteed']==[g.BY_NAME[n]['id'] for n in row['cards']]
  assert json.loads(json.dumps(r))['variant_name']==row['name']
 print('PASS',i,alt['name'],row['name'])
assert not [k for k,n in collections.Counter(relics).items() if n>1],collections.Counter(relics)
for i in [36,37,38]:
 assert 'alternate' not in c.CHARACTERS[i]
 try:v.loadout(c.CHARACTERS,i,1,p)
 except ValueError:pass
 else:raise AssertionError(i)
assert g.BY_NAME['Petit Moth']['id'] in set(c.PACK_BY_ID[c.CHARACTERS[10]['pack']]['common']+c.PACK_BY_ID[c.CHARACTERS[10]['pack']]['rare'])
print('PASS 69 unique loadouts, 99 alternate drafts, locks, signatures, packs and save serialization')

import variant_relics
r=g.new_run(4,random.Random(1),0,1)
events=[{'kind':'fusion_dividend'},{'kind':'fusion_dividend'}]
assert variant_relics.coins(r,events)==60
assert variant_relics.coins({'artifacts':[]},events)==0
assert g.rewards(r,events)[0]['Fusion Dividend']==60
assert c.CHARACTERS[10]['alternate']['starting_relic']=='chitin_carapace'
assert c.CHARACTERS[13]['alternate']['starting_relic']=='evolution_tablet'
print('PASS Fusion Dividend payout and updated character assignments')
