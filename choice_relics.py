"""Relics that ask for a choice when acquired: Relic Picker, Card Picker, Name Changer and the weighted relics.

Pending choices live on the run (relic_offer/relic_picks, card_picks, name_change_picks, weight_picks), so a reload
or another device shows the same prompt until it is answered.
"""
import json,random
from pathlib import Path
import approved_relics as ar
import archetype_relics

ANCIENT_TREASURE=190000050  # The 50-coin card stays exclusive to the All Spells pack.
VERY_RARE=('almighty',)
# relic: (run field, Lua toss kind, legal faces, how many plain faces the chosen one counts as)
WEIGHTED={'weighted_coins':('weighted_coin','coin',(0,1),2),'weighted_dice':('weighted_die','dice',(1,2,3,4,5,6),3)}

def archetypes():
 return json.loads((Path(__file__).parent/'data/archetypes.json').read_text(encoding='utf8'))['archetypes']

def relic_pool(run,exclude=()):
 """Regular relics a Relic Picker may offer: shop-eligible, unowned, never very rare or another choice relic."""
 from content import ARTIFACTS,RETIRED_ARTIFACTS
 from campaign_expansion import shop_relic_eligible
 import cursed_relics
 cursed=set(cursed_relics.approved())
 return [a for a in ARTIFACTS if a not in cursed and not a.startswith('cursed_') and a not in RETIRED_ARTIFACTS
         and a not in run.get('artifacts',[]) and a not in VERY_RARE and a not in ar.CHOICE_RELICS and a!='golden_sleeve'
         and a not in exclude and shop_relic_eligible(run,a)]

def _offer(run,rng,exclude=()):
 pool=relic_pool(run,exclude)
 run['relic_offer']={'options':archetype_relics.sample(pool,min(3,len(pool)),run,rng),'rerolls_left':1} if pool else None
 if not pool:run['relic_picks']=0

def queue_relic_pick(run,rng=random):
 run['relic_picks']=run.get('relic_picks',0)+1
 if not run.get('relic_offer'):_offer(run,rng)

def choose_relic(run,key,rng=random):
 import campaign as g
 offer=run.get('relic_offer')
 if not offer or key not in offer['options']:raise ValueError('That relic is not on offer.')
 run['relic_offer']=None;run['relic_picks']=max(0,run.get('relic_picks',1)-1)
 run['pool']+=g.acquire_relic(run,key,rng)
 if run['relic_picks']:_offer(run,rng)
 return key

def reroll_relic(run,rng=random):
 offer=run.get('relic_offer')
 if not offer or offer['rerolls_left']<=0:raise ValueError('No Relic Picker reroll remains.')
 offer['rerolls_left']-=1
 # Show 3 new relics when enough remain; otherwise reuse the wider pool.
 _offer(run,rng,exclude=offer['options'] if len(relic_pool(run,offer['options']))>=3 else ())
 if run.get('relic_offer'):run['relic_offer']['rerolls_left']=offer['rerolls_left']

def pick_card(run,cid):
 import campaign as g
 cid=int(cid)
 if run.get('card_picks',0)<=0:raise ValueError('No Card Picker choice is waiting.')
 if cid not in g.BY_ID or cid==ANCIENT_TREASURE:raise ValueError('That card cannot be chosen.')
 run['card_picks']-=1;run['pool'].append(cid);run['purchased']=run.get('purchased',0)+1
 return cid

def change_name(run,setcode):
 setcode=int(setcode)
 if run.get('name_change_picks',0)<=0:raise ValueError('No Name Changer choice is waiting.')
 if setcode not in {a['setcode'] for a in archetypes()}:raise ValueError('Unknown archetype.')
 run['name_change_picks']-=1;run.setdefault('name_changes',[]).append(setcode)
 return setcode

def queue_weight_pick(run,key):
 run.setdefault('weight_picks',[]).append(key)

def choose_weight(run,face):
 face=int(face)
 if not run.get('weight_picks'):raise ValueError('No weighted relic choice is waiting.')
 field,_,faces,_=WEIGHTED[run['weight_picks'][0]]
 if face not in faces:raise ValueError('Choose a valid face.')
 run[field]=face;run['weight_picks'].pop(0)
 return face

def clear_weight(run,key):
 run.pop(WEIGHTED[key][0],None)
 if key in run.get('weight_picks',[]):run['weight_picks'].remove(key)

def weight_script(run):
 lines=[]
 for key,(field,kind,_,share) in WEIGHTED.items():
  if ar.has(run,key) and run.get(field) is not None:
   lines.append(f"if Duel.SetRogueWeight then Duel.SetRogueWeight(0,'{kind}',{run[field]},{share}) end")
 return '\n'.join(lines)
