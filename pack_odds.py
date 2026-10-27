"""Exact per-pack inclusion odds, grouped by identical draw eligibility/weight."""
from collections import defaultdict
from functools import lru_cache

@lru_cache(maxsize=128)
def group_odds(groups):
 # group = (population, common weight, premium weight, starter weight, normal)
 n=len(groups);zero=(0,)*n;states={(zero,-1):1.0}
 for drawn in range(9):
  next_states=defaultdict(float)
  for (used,left),probability in states.items():
   pool=2 if left==-1 else 3 if left>0 else 1
   weights=[(g[0]-used[i])*g[pool] for i,g in enumerate(groups)]
   if not sum(weights):
    # Common exhaustion falls back to all identities, with their standard weight.
    weights=[(g[0]-used[i])*max(g[1:4]) for i,g in enumerate(groups)]
   total=sum(weights)
   for i,weight in enumerate(weights):
    if not weight:continue
    taken=list(used);taken[i]+=1;taken=tuple(taken)
    if left==-1:
     basic=sum(g[0] for g in groups if g[3]);remaining=sum(g[0]-taken[j] for j,g in enumerate(groups) if g[3])
     newleft=min(remaining,max(0,min(3,basic)-groups[i][4]))
    else:newleft=max(0,left-1)
    next_states[(taken,newleft)]+=probability*weight/total
  states=next_states
 return tuple(sum(p*used[i] for (used,left),p in states.items())/g[0] for i,g in enumerate(groups))

def inspect_pack(pid,profile):
 import campaign as g,content,unlocks,card_rarity
 p=content.PACK_BY_ID[pid]
 overrides=p.get('rarity_weights',{})
 def unique(ids):
  out={}
  for cid in ids:
   if unlocks.card_allowed(g.BY_ID[cid],profile):out.setdefault(g.card_identity(cid),cid)
  return out
 common=unique(p['common']);rare=unique(p['rare']);basic=unique([cid for cid in (p['common'] if p.get('draft_only') else p['common']+p['rare']+p.get('starter_support',[])) if g.normal_starter(cid)])
 all_cards={**basic,**rare,**common};buckets={}
 premium=rare or common
 def effective_weight(pool,identity,apply_override=False):
  cid=pool[identity]
  weight=card_rarity.weight(cid)
  if apply_override:weight*=float(overrides.get(str(cid),overrides.get(cid,1)))
  return weight
 for identity,cid in all_cards.items():
  key=(effective_weight(common,identity,True) if identity in common else 0,
       effective_weight(premium,identity,True) if identity in premium else 0,
       effective_weight(basic,identity) if identity in basic else 0,
       int(g.normal_starter(premium.get(identity,cid))))
  buckets.setdefault(key,[]).append(cid)
 groups=tuple((len(ids),*key) for key,ids in buckets.items())
 if len(all_cards)<9:return []
 odds=group_odds(groups)
 rows=[{'id':cid,'chance':odds[i]} for i,ids in enumerate(buckets.values()) for cid in ids]
 seen=set(all_cards)
 for cid in p['common']+p['rare']+p.get('starter_support',[]):
  identity=g.card_identity(cid)
  if identity not in seen:rows.append({'id':cid,'chance':0,'locked':True});seen.add(identity)
 return rows
