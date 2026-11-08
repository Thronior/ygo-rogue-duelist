"""Through loop 1 a boss reroll never brings back a curse the previous roll had (user, 2026-11-08). From loop 2 on,
and before any reroll, curses draw as before. Solo and Tag."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,boss_selection as bs
base=Path(tempfile.mkdtemp(prefix='boss-reroll-curses-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'

def boss_curses(run):return [k for i in run['routes'] for k in run['route_curses'].get(str(i),[])]

checks=0
for rd in (2,5,8):
 for seed in range(40):
  r=g.new_run(0,random.Random(seed));r.update(stage='draft',gold=100000,round=rd,loop=0);g.routes(r,random.Random(seed))
  for step in range(4):
   before=set(boss_curses(r));assert before,(rd,seed)
   bs.reroll(g,r,random.Random(seed*31+step))
   after=boss_curses(r)
   assert len(after)==min(3,(rd+1)//3),(rd,after)
   assert not before&set(after),f'round {rd} seed {seed}: reroll brought back {before&set(after)}'
   checks+=1

# Loop 2 and later: no restriction, so a curse can come back.
r=g.new_run(0,random.Random(1));r.update(stage='draft',gold=10**7,round=2,loop=1)
assert bs.reroll_avoided_curses(r)==set()
g.routes(r,random.Random(1));repeat=False
for step in range(200):
 before=set(boss_curses(r));bs.reroll(g,r,random.Random(step));repeat|=bool(before&set(boss_curses(r)))
assert repeat,'from loop 2 a reroll may repeat a curse';checks+=1

from tag_campaign import TagCampaign
p=storage.profile()
for seed in range(25):
 t=TagCampaign([0,1],[p,p],seed=seed);t.shared['gold']=100000;t.shared['round']=2;t.sync();t.phase='draft';t.routes();t.sync()
 # Tag rerolls one shared boss at a time (2026-11-08): that boss's replacement never repeats its curses.
 for step in range(3):
  old=t.players[0]['routes'][step%2];before=set(t.players[0]['route_curses'][str(old)])
  new=t.apply(step%2,'boss-reroll',old)['new']
  for seat,r in enumerate(t.players):
   assert not before&set(r['route_curses'][str(new)]),f'Tag seed {seed} seat {seat}: {before&set(r["route_curses"][str(new)])}'
  checks+=1
print(f'PASS boss rerolls never repeat the previous curses through loop 1, solo and Tag ({checks} checks)')
