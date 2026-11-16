"""'Start Looping' (the loop challenge) works from every loop. v0.2.35 crashed it from loop 2 on with UnboundLocalError,
because a local `import content` inside endless.challenge hid the module (Discord, 2026-11-16)."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,campaign as g
tmp=tempfile.mkdtemp(prefix='loop-challenge-',dir=ROOT/'temp');storage.ROOT=Path(tmp);g.SAVE=Path(tmp)/'run.json'
import campaign_expansion,content,endless
p=storage.profile();p['unlocked']=list(range(len(content.CHARACTERS)));storage.write(storage.ROOT/'profile.json',p)
checks=0
for name in ('Copycat','Yami Yugi','Tea Gardner'):
 cid=next(i for i,c in enumerate(content.CHARACTERS) if c['name']==name)
 for loop in range(0,4):
  r=g.new_run(cid,random.Random(loop));r.update(stage='complete',round=9,loop=loop,encore_won=False)
  endless.challenge(g,r)
  assert r['encore_active'] and r['stage']=='draft' and str(r['opponent']) in r['route_rewards'],(name,loop)
  assert r['opponent']==(endless.OBELISK_ID if loop>=1 else 0),(name,loop,r['opponent'])
  checks+=1
print(f'PASS loop challenge starts from loops 1-4 for 3 duelists ({checks} checks)')
