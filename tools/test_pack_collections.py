import sys,json,random,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content as c
from pack_odds import inspect_pack
from PIL import Image
records=json.loads((ROOT/'data/pack-collections.json').read_text())
for row in records:
 p=c.PACK_BY_ID[row['id']]
 for key in ('common','rare','starter_support','rare_display'):
  assert set(p.get(key,[]))=={cid for old in row['original_packs'] for cid in old.get(key,[])},key
 Image.open(ROOT/'assets/packs'/f"{p['id']}.jpg").verify()
 assert all(r['chance']>0 for r in inspect_pack(p['id'],{}))
 for old in row['original_packs']:
  assert c.PACK_BY_ID[old['id']] is p
  rng=random.Random(96)
  for _ in range(100):
   cards=g.open_pack(old['id'],rng)
   assert len(cards)==len({g.card_identity(cid) for cid in cards})==9
  run={'shop':[{'kind':'pack','id':old['id'],'price':35,'sold':False}],'starting_packs':[old['id']],'pool':[123],'gold':77}
  c.normalize_pack_references(run)
  assert run['shop'][0]['id']==p['id'] and run['starting_packs']==[p['id']]
  assert run['pool']==[123] and run['gold']==77
 print(p['name'],len(set(p['common']+p['rare']+p.get('starter_support',[]))),'cards')
assert not set(c.PACK_ALIASES)&{p['id'] for p in c.PACKS}
assert len([p for p in c.PACKS if p['name'].startswith(('Tournament Pack','Premium Pack'))])==2
for char in c.CHARACTERS:
 assert char.get('pack') not in c.PACK_ALIASES
 assert not set(char.get('starting_packs',[]))&set(c.PACK_ALIASES)
print('PASS merged card coverage, artwork, exact odds,',sum(len(r['original_packs']) for r in records)*100,'pack openings and legacy reference migration')

engine=json.loads((ROOT/'android/web/engine-data.json').read_text())
for cid in set(c.PACK_BY_ID['JP-PP7']['common']+c.PACK_BY_ID['JP-PP7']['rare']):
 assert cid in g.BY_ID and str(cid) in engine,cid
 Image.open(ROOT/'assets/cards'/f'{cid}.jpg').verify()
assert len(next(r for r in records if r['id']=='JP-PP7')['original_packs'])==7
print('PASS all seven Premium Pack lists, card engine data and card artwork')
