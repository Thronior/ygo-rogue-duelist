"""The run timeline records every curse active in each duel, for the end-of-run card's final duel."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='timeline-curses-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)

def play(r,seed):
 g.routes(r);r['opponent']=r['routes'][0] if isinstance(r['routes'][0],int) else r['routes'][0]['id']
 g.prepare_duel(r,random.Random(seed))
 g.finish_duel(r,dict(protocol=1,id=r['duel']['id'],winner=0,lp=8000,events=[]),random.Random(seed+1))
 return r['timeline'][-1]

for level in (0,5):
 r=g.new_run(1,random.Random(level));g.auto_deck(r);r.update(stage='shop',challenge_level=level)
 seen=[]
 for duel in range(1,4):
  r.update(stage='shop',round=duel-1);r.pop('cursed_offer',None);row=play(r,10*duel+level)
  assert row['duel']==duel and isinstance(row['curses'],list),row
  seen.append(row['curses'])
 assert seen[2] and all(k in c.CURSES for k in seen[2]),(level,seen)
 if level==0:assert seen[0]==seen[1]==[],seen
 else:assert len(seen[0])==1 and seen[1]==seen[0] and set(seen[0])<=set(seen[2]),seen  # LVL 5+: curses carry over
print('PASS each duel records its active curses: boss duels at LVL 0, carried-over curses at LVL 5+')
