"""Release-bundled, shared Collector opponents for later campaign loops."""
import copy
from collections import Counter

def sanitize(rows):
 import campaign as g
 import content
 result=[]
 for row in rows if isinstance(rows,list) else []:
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

def candidates():
 # Release data is identical on every device and never reads the player's save.
 import json
 from pathlib import Path
 rows=json.loads((Path(__file__).parent/'data/fallen-collectors.json').read_text(encoding='utf8'))['opponents']
 identities={row['id']:row['opponent_id'] for row in rows}
 return [dict(row,avatar_character=row['character'],character=identities[row['id']]) for row in sanitize(rows)]


def add_route(run,rng):
 run.pop('fallen_routes',None)
 if not run.get('loop') or run.get('encore_active'):return
 selected={str(d['character']):copy.deepcopy(d) for d in candidates() if d['character'] in run['routes']}
 if selected:run['fallen_routes']=selected


def opponent(run,cid=None):
 if not run.get('loop') or run.get('encore_active'):return None
 return run.get('fallen_routes',{}).get(str(run.get('opponent') if cid is None else cid))
