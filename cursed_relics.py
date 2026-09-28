"""Saved, mandatory boss reward offers. Proposed relics remain inactive until approved."""
from pathlib import Path
import json,random
import approved_relics as ar
from content import ARTIFACTS

def approved():
 path=Path(__file__).parent/'data/cursed-relics.json'
 return tuple(json.loads(path.read_text(encoding='utf8')).get('approved',[])) if path.exists() else ()

def pending(run):return bool(run and run.get('cursed_offer'))

def create_offer(run,rng=random):
 if pending(run):return
 choices=[k for k in approved() if k in ARTIFACTS and ar.eligible(run,k) and k not in run.get('artifacts',[])]
 if len(choices)<6:return
 run['cursed_offer']={'options':rng.sample(choices,3),'rerolls_left':1,'boss_round':run['round']}

def reroll(run,rng=random):
 offer=run.get('cursed_offer')
 if not offer or offer['rerolls_left']!=1:raise ValueError('No cursed-relic reroll remains.')
 eligible=[k for k in approved() if k in ARTIFACTS and ar.eligible(run,k) and k not in run.get('artifacts',[]) and k not in offer['options']]
 if len(eligible)<3:raise ValueError('There are not enough different cursed relics to reroll.')
 offer['options']=rng.sample(eligible,3);offer['rerolls_left']=0

def choose(run,key,rng=random):
 offer=run.get('cursed_offer')
 if not offer or key not in offer['options'] or key not in approved() or key not in ARTIFACTS:raise ValueError('Choose one of the offered cursed relics.')
 if key in run['artifacts']:raise ValueError('You already own that relic.')
 run['artifacts'].append(key);run.setdefault('cursed_artifacts',[]).append(key)
 ar.reconcile_turn_order(run)
 run.pop('cursed_offer',None)
 import campaign
 campaign.restock(run,rng)

def require_choice(run):
 if pending(run):raise ValueError('Choose a cursed relic before continuing to the shop.')
