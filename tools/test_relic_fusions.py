"""Relic fusions in the campaign (2026-11-03): sets fuse when completed, pieces and fused relics are never offered,
and the shop and coin effects of the fused relics apply. Runs in a temporary save folder."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,relic_fusions as rf,approved_relics as ar,choice_relics
from campaign_expansion import shop_relic_eligible
from content import ARTIFACTS,PLAYABLE_IDS

(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='fusions-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);storage.write(base/'profile.json',profile)
 rng=random.Random(7)
 def shop_run(artifacts):
  run=g.new_run(0,rng);run.update(stage='shop',round=1,gold=5000,artifacts=list(artifacts));g.restock(run,rng);return run
 def offer(run,key,price=50):
  run['shop'].append(dict(kind='artifact',id=key,price=price,sold=False));return len(run['shop'])-1

 # Buying the last piece fuses the set, queues the shop animation and records the discovery.
 run=shop_run(['light'])
 g.buy(run,offer(run,'dark'),rng)
 assert run['artifacts'].count('chaos_orb')==1 and 'light' not in run['artifacts'] and 'dark' not in run['artifacts'],run['artifacts']
 assert run['fusion_events']==[{'relic':'chaos_orb','pieces':['light','dark']}],run.get('fusion_events')
 assert 'chaos_orb' in storage.profile().get('fused_relics',[]),'the fusion is recorded for the collection'
 # Leaving the shop clears the animation queue.
 run['selected']=run['selected'];run.pop('fusion_events',None)

 # Fused relics and the pieces of a fused set are never stocked or offered by Relic Picker.
 for key in rf.KEYS:assert not shop_relic_eligible(run,key),key
 assert not shop_relic_eligible(run,'light') and not shop_relic_eligible(run,'dark')
 assert shop_relic_eligible(run,'ember'),'pieces of other sets are still offered'
 assert not set(choice_relics.relic_pool(run))&(rf.KEYS|{'light','dark'})
 for _ in range(30):
  g.restock(run,rng)
  assert not {x['id'] for x in run['shop'] if x['kind']=='artifact'}&(rf.KEYS|{'light','dark'})

 # No relic text names its pieces, so the recipes stay secret.
 names={ARTIFACTS[p][0] for pieces in rf.RECIPES.values() for p in pieces}
 for key in rf.KEYS:assert not any(n in ARTIFACTS[key][2] for n in names),(key,ARTIFACTS[key][2])

 # A fused relic sells for half of its pieces' combined price.
 assert ARTIFACTS['chaos_orb'][1]==ARTIFACTS['light'][1]+ARTIFACTS['dark'][1]

 # Jar of Greed keeps the jars' effects, and one relic per shop visit costs 0 until it is bought.
 run=shop_run(['dice_jar','cyber_jar'])
 g.buy(run,offer(run,'morphing_jar_2'),rng)
 assert run['artifacts'].count('jar_of_greed')==1 and ar.has(run,'dice_jar') and ar.has(run,'cyber_jar') and ar.has(run,'morphing_jar_2')
 free=[x for x in run['shop'] if x.get('greed')]
 assert len(free)==1 and free[0]['price']==0 and free[0]['kind']=='artifact' and not free[0]['sold'],free
 assert g.reroll_price(run)==0,'the free Dice Jar reroll'
 g.reroll_shop(run,rng)
 free=[x for x in run['shop'] if x.get('greed')]
 assert len(free)==1 and free[0]['price']==0,'an unbought free relic moves to the rerolled stock'
 gold=run['gold'];g.buy(run,run['shop'].index(free[0]),rng)
 assert run['gold']==gold,'the free relic costs nothing'
 g.restock(run,rng,general_stock=True)
 assert not any(x.get('greed') for x in run['shop']),'only one free relic per shop visit'

 # Pharaoh's Hoard (key gold_sarcophagus) halves shop prices (repricing the open shop) and pays 50 coins per victory.
 run=shop_run(['bargain','urn','receipt'])
 single=next(x for x in run['shop'] if x['kind']=='single');before=single['price']
 g.buy(run,offer(run,'interest'),rng)
 assert run['artifacts'].count('gold_sarcophagus')==1
 assert single['price']==max(1,round(before*.5/.8)),(before,single['price'])
 tally,_=g.rewards(run,[])
 assert tally.get("Pharaoh's Hoard")==50 and not tally.get('Artifacts') and 'Interest' not in tally,tally

 # Sacred Phoenix pays 40 coins after a won duel in which it saved you, and is never used up.
 run=shop_run(['phoenix_rebirth','phoenix_debt'])
 g.buy(run,offer(run,'second_wind'),rng)
 assert run['artifacts'].count('sacred_phoenix')==1
 tally,_=g.rewards(run,[{'kind':'relic_used','relic':'phoenix_rebirth'}])
 assert tally.get('Sacred Phoenix')==40,tally
 tally,_=g.rewards(run,[]);assert 'Sacred Phoenix' not in tally

 # Second Coin Toss: a weighted relic that fuses at once does not ask for its face.
 run=shop_run(['lets_go_gambling','weighted_coins']);run['weighted_coin']=1
 g.buy(run,offer(run,'weighted_dice'),rng)
 assert run['artifacts'].count('second_coin_toss')==1 and not run.get('weight_picks') and 'weighted_coin' not in run,run.get('weight_picks')

 # Relic Picker can complete a set too.
 run=shop_run(['tide','gale','earth']);run['relic_offer']={'options':['ember'],'rerolls_left':0};run['relic_picks']=1
 choice_relics.choose_relic(run,'ember',rng)
 assert run['artifacts'].count('four_elements')==1,run['artifacts']

 # Blank Relic turning into the last missing Orb fuses after the duel.
 run=shop_run(['ember','tide','gale','blank_relic'])
 run['artifacts']=['ember','tide','gale','earth'];rf.fuse(run)
 assert run['artifacts']==['four_elements']

 # A random starting relic is never a fused one.
 for _ in range(200):
  r=g.new_run(36,rng) if 36 in PLAYABLE_IDS and g.CHARACTERS[36].get('starting_relic')=='random' else None
  if r is None:break
  assert not set(r['artifacts'])&rf.KEYS

 # Tag: two starting relics that complete a set fuse into the shared relics.
 shared={'artifacts':['light','dark']};rf.fuse(shared)
 assert shared['artifacts']==['chaos_orb'] and shared['fusion_events']

print("PASS relic fusions: fusing, offers, secret recipes, Jar of Greed, Pharaoh's Hoard, Sacred Phoenix, Tag")
