import sys,random
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import content,campaign as g,storage,fallen_collectors as f
uc=set(content.UC_OPPONENTS);assert len(uc)==7
for loop in [1,2,9]:assert uc<=set(content.eligible_opponents(0,loop))
assert not uc.intersection(content.eligible_opponents(5,0))
profile=storage.profile();profile['unlocked']=list(content.PLAYABLE_IDS)
with patch.object(storage,'profile',lambda:profile),patch.object(storage,'write',lambda *a:None):
 r=g.new_run(0,random.Random(2));g.auto_deck(r);r.update(loop=1,round=5,defeated_opponents=[])
 seen=set()
 for seed in range(200):
  g.routes(r,random.Random(seed));seen.update(r['routes']);assert set(map(int,r.get('fallen_routes',{})))==set(r['routes'])&uc
 assert seen&uc and seen-uc
 for cid in uc:
  r.update(opponent=cid,routes=[cid]);f.add_route(r,random.Random(0));assert r['fallen_routes'][str(cid)]['deck']['main']==content.opponent_record(5,cid,1)['main']
print('PASS normal and UC bosses drawn from mixed pool; all UC identities reachable; first loop unaffected; selected decks match')
