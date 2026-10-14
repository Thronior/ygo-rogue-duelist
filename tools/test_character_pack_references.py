"""Character packs contain the exact named cards required by their contents."""
import copy,json,random
from complete_character_pack_references import g,references,complete
from pack_odds import inspect_pack
packs=json.loads((g.ROOT/'data/packs.json').read_text(encoding='utf8'))
assert complete(copy.deepcopy(packs))==[], 'Missing recursive named-card references'
additions=json.loads((g.ROOT/'data/character-pack-reference-additions.json').read_text(encoding='utf8'))
count=0
for pack in packs:
 if not pack['id'].startswith('DRAFT-') or not pack.get('draft_only'):continue
 ids=pack['common']+pack['rare']+pack.get('starter_support',[])
 present=set(ids)
 assert not set(pack['common'])&set(pack['rare']),pack['name']
 for cid in present:
  assert references(g.BY_ID[cid])<=present,(pack['name'],g.BY_ID[cid]['name'])
 odds={g.card_identity(row['id']):row['chance'] for row in inspect_pack(pack['id'],{})}
 for addition in additions:
  if addition['pack']==pack['name']:
   assert odds[g.card_identity(g.BY_NAME[addition['card']]['id'])]>0,addition
   count+=1
 rng=random.Random(85)
 for _ in range(30):
  cards=g.open_pack(pack['id'],rng)
  assert len(cards)==9 and len({g.card_identity(cid) for cid in cards})==9
assert count==len(additions)
assert g.BY_NAME['Ultimate Insect LV7']['id']==19877898
print('PASS: recursive reference closure,',count,'obtainable additions, and legal pack generation')

