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

 # Divine Gambler (key second_coin_toss): a weighted relic that fuses at once does not ask for its face.
 run=shop_run(['lets_go_gambling','weighted_coins']);run['weighted_coin']=1
 g.buy(run,offer(run,'weighted_dice'),rng)
 assert run['artifacts'].count('second_coin_toss')==1 and not run.get('weight_picks') and 'weighted_coin' not in run,run.get('weight_picks')

 # Attribute Mutation: any 3 of the 6 Surgery relics fuse; a later Surgery joins it quietly and none is offered again.
 run=shop_run(['attribute_fire','attribute_water'])
 g.buy(run,offer(run,'attribute_dark'),rng)
 assert run['artifacts'].count('attribute_mutation')==1 and not any(a.startswith('attribute_') and a!='attribute_mutation' for a in run['artifacts']),run['artifacts']
 assert run['fusion_events']==[{'relic':'attribute_mutation','pieces':['attribute_dark','attribute_fire','attribute_water']}],run['fusion_events']
 assert ARTIFACTS['attribute_mutation'][1]==3*ARTIFACTS['attribute_fire'][1]
 assert not shop_relic_eligible(run,'attribute_light')
 run['artifacts'].append('attribute_light');rf.fuse(run)
 assert run['artifacts'].count('attribute_mutation')==1 and 'attribute_light' not in run['artifacts']
 run=shop_run(['attribute_fire','attribute_water']);rf.fuse(run)
 assert 'attribute_mutation' not in run['artifacts'],'two Surgery relics do not fuse'

 # Cursed fusions: a cursed relic choice can complete a set; the curse leaves the cursed list too.
 import cursed_relics,passives
 run=shop_run(['blade','sword']);run['cursed_offer']={'options':['cursed_cracked_sword'],'rerolls_left':0,'boss_round':1}
 approved=cursed_relics.approved;cursed_relics.approved=lambda:('cursed_cracked_sword',)
 try:cursed_relics.choose(run,'cursed_cracked_sword',rng)
 finally:cursed_relics.approved=approved
 assert run['artifacts'].count('masterwork_blade')==1 and 'cursed_cracked_sword' not in run['artifacts'] and 'cursed_cracked_sword' not in run.get('cursed_artifacts',[]),run['artifacts']
 assert run['fusion_events'][-1]['relic']=='masterwork_blade'
 # A relic in two sets (Demonic Sword) is still offered until both sets are fused, and the first set completed uses it up.
 assert shop_relic_eligible(run,'sword'),"Tyrant's Throne still needs Demonic Sword"
 assert not shop_relic_eligible(run,'blade')
 run['artifacts']+=['cursed_solitary_tyrant','solo'];rf.fuse(run)
 assert 'tyrants_throne' not in run['artifacts'],'its Demonic Sword went into Masterwork Blade'
 g.buy(run,offer(run,'sword'),rng)
 assert run['artifacts'].count('tyrants_throne')==1 and not shop_relic_eligible(run,'sword')
 # Merchant Urn is in Pharaoh's Hoard and Bottomless Purse.
 run=shop_run(['cursed_loaded_purse','champion_trophy']);run['cursed_artifacts']=['cursed_loaded_purse']
 g.buy(run,offer(run,'urn'),rng)
 assert run['artifacts'].count('bottomless_purse')==1 and run['cursed_artifacts']==[],run['artifacts']
 run['round']=1;tally,_=g.rewards(run,[]);assert tally.get('Bottomless Purse')==80 and 'Loaded Purse' not in tally,tally
 run['round']=2;tally,_=g.rewards(run,[]);assert tally.get('Bottomless Purse')==160,('80 more after a boss victory',tally)
 assert shop_relic_eligible(run,'urn'),"Pharaoh's Hoard still needs Merchant Urn"
 # Grand Bazaar: 6 relics and 4 packs per shop, 15% off, repricing the open shop when it fuses.
 run=shop_run(['cursed_rusted_compass','map'])
 single=next(x for x in run['shop'] if x['kind']=='single');before=single['price']
 g.buy(run,offer(run,'booster_shelf'),rng)
 assert run['artifacts'].count('grand_bazaar')==1
 assert single['price']==max(1,round(before*.85/1.15)),(before,single['price'])
 assert sum(x['kind']=='pack' for x in run['shop'])==4
 g.restock(run,rng,general_stock=True)
 assert sum(x['kind']=='artifact' for x in run['shop'])==6,[x['id'] for x in run['shop'] if x['kind']=='artifact']
 # Hand limits: Divine Archive 8, Mass Grave 4 (written into the duel script).
 from approved_relic_effects import relic_hand_limit
 assert relic_hand_limit({'artifacts':['endless_archive']})==8 and relic_hand_limit({'artifacts':['mass_grave']})==4
 for key,limit in (('endless_archive',8),('mass_grave',4)):
  assert f'e:SetCode(EFFECT_HAND_LIMIT) e:SetProperty(EFFECT_FLAG_PLAYER_TARGET) e:SetTargetRange(1,0) e:SetValue({limit})' in passives.script({'curses':[],'artifacts':[key],'challenge_level':0,'character':0}),key
 # Undying Legion halves healing after a duel.
 run=shop_run(['undying_legion'])
 assert ar.heal_scale(run)==.5 and ar.can_heal(run,between=True)

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

print("PASS relic fusions: fusing, offers, secret recipes, Jar of Greed, Pharaoh's Hoard, Sacred Phoenix, Attribute Mutation, cursed fusions, Tag")
