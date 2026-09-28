"""Isolated campaign regressions; never opens or rewrites the player's save."""
import sys,json,random,uuid
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content as c,storage,loss_reason,passives
base=ROOT/'temp'/('sept-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p.update(unlock_all=True,unlocked=c.PLAYABLE_IDS);storage.write(base/'profile.json',p)
# All starts have legal drafts and retain unique fixed boosters.
seen=set()
for i in c.PLAYABLE_IDS:
 ch=c.CHARACTERS[i]
 if not ch.get('random_packs') and not ch.get('copycat') and not ch.get('engine_deck'):
  packs=set(c.starting_packs(i));assert not seen&packs,(i,packs);seen|=packs
 for seed in range(5):
  r=g.new_run(i,random.Random(seed));g.auto_deck(r);assert g.validate(r) is None,(i,seed)
# Unlock graph must be reachable from the two original characters.
reachable={0,1};others=set(c.PLAYABLE_IDS)-reachable
for _ in c.PLAYABLE_IDS:
 for i in list(others):
  k,_=g.unlock_rule(i)
  if not k.startswith('won_as:') or int(k.split(':')[1]) in reachable:reachable.add(i);others.remove(i)
assert not others
assert sum(g.unlock_rule(i)[0].startswith('won_as:') for i in c.PLAYABLE_IDS if i>1)>len(c.PLAYABLE_IDS)*.8
# Rare offers keep the opponent booster and cost exactly 200, even with discount.
r=g.new_run(0,random.Random(4));g.auto_deck(r);r.update(stage='shop',gold=1000,gold_leaving_shop=10000)
for seed in range(100):
 g.restock(r,random.Random(seed))
 offers=[(i,x) for i,x in enumerate(r['shop']) if x['kind']=='deck']
 if offers:break
assert offers and sum(x['kind']=='pack' and x.get('opponent_pack',False) for x in r['shop'])==1
idx,item=offers[0];assert item['price']==200;r['card_mods']={'0':[50,50]};r['golden_card']=r['pool'][0]
arts=r['artifacts'][:];gold=r['gold'];cards=item['cards'][:];g.buy_many(r,[idx],random.Random(1))
assert r['pool']==cards and g.deck(r)==cards and r['gold']==gold-200 and r['artifacts']==arts and not r['card_mods'] and not r.get('golden_card')
assert g.validate(r) is None
# New reward semantics.
r['artifacts']=['underdog_clause'];r['pool']=[g.BY_NAME['Petit Dragon']['id']]*3;r['selected']=[0,1,2]
tally,total=g.rewards(r,[]);assert tally["Underdog's Clause"]==9
fast=g.rewards(r,[{'kind':'duel_metrics','turns':2}])[1];slow=g.rewards(r,[{'kind':'duel_metrics','turns':12}])[1];assert fast>slow
# Every NPC ritual package is paired and copy limits are respected.
for i in c.GAME_DECKS:
 for rd in (1,3,6):
  d=c.opponent_record(rd,i);counts=Counter(d['main'])
  assert all(n<=3 for cid,n in counts.items())
  for cid,n in counts.items():
   card=g.BY_ID[cid]
   if card['data']['type']&2 and card['data']['type']&128:
    target=[m for m in g.CARDS if m['data']['type']&1 and m['data']['type']&128 and m['name'] in card['desc']]
    assert target and counts[target[0]['id']]==n,(i,rd,card['name'])
   if card['data']['type']&0x400000:assert counts[g.BY_NAME['Toon World']['id']]
# Every standard/special engine reason renders, named win cards get correct art.
for reason in loss_reason.REASONS:assert loss_reason.describe({'reason':int(reason),'events':[]},g.BY_ID)['text']
assert loss_reason.describe({'reason':16},g.BY_ID)['card']==g.BY_NAME['Exodia the Forbidden One']['id']
assert loss_reason.describe({'reason':21},g.BY_ID)['card']==g.BY_NAME['Destiny Board']['id']
# Reset must wipe the recovery copies too, while leaving settings intact.
storage.write(base/'settings.json',{'music':17});storage.reset_progress();assert storage.profile()['unlocked']==[0,1]
assert storage.read(base/'run.json') is None and storage.read(base/'run.bak') is None
assert storage.read(base/'settings.json')['music']==17
print('PASS: 175 drafts, unique packs, reachable unlock graph, rare replacement purchases, quick-win/underdog rewards, NPC package checks, loss reasons and isolated progress reset')
