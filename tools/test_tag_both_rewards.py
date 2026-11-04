import sys, random, json
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as game, storage, content, unlocks
from tag_campaign import TagCampaign

# Discord (Mugen101): both Tag seats' chosen opponents' guaranteed packs must be in the shop.
live=storage.profile()
packs=[p['id'] for p in content.PACKS if not p.get('draft_only') and unlocks.available('pack',p['id'],live)]
assert len(packs)>=2,'need two unlocked packs'
profile=storage.profile();profile['unlocked']=list(range(len(content.CHARACTERS)))
checked=0
for seed in range(12):
 a,b=random.Random(seed).sample(packs,2)
 s=TagCampaign([0,1],[profile,profile],seed=900+seed,lobby=True)
 for seat,r in enumerate(s.players):
  r['opponent']=2+seat;r['duel']={'id':str(seat)}
  r['route_rewards'][str(2+seat)]={'key':['destruction','jar'][seat],'label':'test','pack':[a,b][seat]}
 s.phase='duel';s.duel={'mode':'tag'}
 def complete(run,result,rng):
  run.update(stage='shop',last_rewards=[],last_gold=0,shop=[],route_rewards={})
 with patch.object(game,'finish_duel',complete):s.finish(0,6000,[])
 s=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())))
 for seat in (0,1):
  r=s.players[seat]
  for shelf in ([],['booster_shelf']):
   r['artifacts']=shelf
   with s.scope(seat):game.restock(r,random.Random(70+seed+seat))
   shop=[x for x in r['shop'] if x['kind']=='pack']
   ids=[x['id'] for x in shop]
   assert a in ids and b in ids,(seed,seat,a,b,ids)
   assert [x['id'] for x in shop if x['opponent_pack']]==[a,b],(seed,ids)
   assert len(ids)==(4 if shelf else 3),ids
   checked+=1
# The same pick from both seats offers that pack once, plus the usual random slots.
r=s.players[0];r['tag_shop_rewards']=[dict(r['tag_shop_rewards'][0]),dict(r['tag_shop_rewards'][0])];r['artifacts']=[]
with s.scope(0):game.restock(r,random.Random(5))
ids=[x['id'] for x in r['shop'] if x['kind']=='pack']
assert len(ids)==3 and ids.count(r['tag_shop_rewards'][0]['pack'])>=1 and [x['opponent_pack'] for x in r['shop'] if x['kind']=='pack'][:1]==[True],ids
print(f'PASS: both Tag guaranteed packs offered in {checked} shops (with and without Booster Shelf), duplicate pick collapses')
