"""Validated, cached Collector opponents for later campaign loops."""
import copy
from collections import Counter
import storage

def sanitize(rows):
 import campaign as g
 import content
 result=[]
 for row in rows[:200] if isinstance(rows,list) else []:
  if not isinstance(row,dict):continue
  deck=row.get('deck',{});character=row.get('character')
  if character not in content.PLAYABLE_IDS or not isinstance(deck,dict):continue
  main,extra=deck.get('main'),deck.get('extra',[])
  if not isinstance(main,list) or not isinstance(extra,list) or not 40<=len(main)<=60 or len(extra)>15:continue
  if any(type(cid) is not int or cid not in g.BY_ID for cid in main+extra):continue
  if any(g.is_extra(cid) for cid in main) or any(not g.is_extra(cid) for cid in extra):continue
  if max(Counter(g.card_identity(cid) for cid in main+extra).values(),default=0)>3:continue
  result.append(dict(id=str(row.get('id',''))[:64],name=str(row.get('name','Fallen duelist'))[:32],character=character,deck=dict(main=main[:],extra=extra[:])))
 return result

def sync(rows):
 clean=sanitize(rows);storage.write(storage.ROOT/'fallen-collectors.json',clean);return len(clean)

def candidates():
 cached=storage.read(storage.ROOT/'fallen-collectors.json',[])
 local=storage.read(storage.ROOT/'collector.json',{}).get('duelists',[])
 rows=[dict(id=d.get('id'),name=d.get('name'),character=d.get('character'),deck=d.get('defeatedDeck')) for d in local if d.get('status')=='eliminated']
 return sanitize(rows+cached)

def add_route(run,rng):
 run.pop('fallen_routes',None)
 if not run.get('loop') or run.get('encore_active'):return
 import content
 eligible=set(content.eligible_opponents(run['round'],run['loop']))
 choices=[d for d in candidates() if d['character'] in eligible and d['character']!=run['character'] and d['character'] not in run.get('defeated_opponents',[])]
 if not choices:return
 chosen=copy.deepcopy(rng.choice(choices));cid=chosen['character']
 if cid not in run['routes']:run['routes'][rng.randrange(len(run['routes']))]=cid
 run['fallen_routes']={str(cid):chosen};run['opponent']=run['routes'][0]

def opponent(run,cid=None):
 if not run.get('loop') or run.get('encore_active'):return None
 return run.get('fallen_routes',{}).get(str(run.get('opponent') if cid is None else cid))
