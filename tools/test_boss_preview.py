"""Next boss preview (2026-11-15): each stretch's boss and curses are rolled when it starts, used when the boss round
arrives, replaced by a boss reroll, rolled on load for older saves, never kept by Tag. Loop 13 is the final loop."""
import json,random,sys,tempfile
from copy import deepcopy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content,endless,boss_preview as bp,boss_selection as bs
from feedback_update import nonstackable_curses
base=Path(tempfile.mkdtemp(prefix='boss-preview-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json'
checks=0

def advance(r,rng,rd=None):
 """The routes a win leads to: the next round's opponents (finish_duel calls routes() the same way)."""
 r['round']=r['round']+1 if rd is None else rd;r['stage']='shop';g.routes(r,rng);return r

# 1. Rolled at the start of every stretch, kept out of its ordinary duels, used on its round.
for level in (-1,0,2,5):
 for seed in range(12):
  rng=random.Random(seed*7+level);r=g.new_run(seed%2,rng,level=0);r['challenge_level']=level
  g.routes(r,rng)  # re-roll the opening at this level
  for loop in (0,1,3):
   if loop:r.update(loop=loop,round=0,defeated_opponents=[]);r.pop('next_boss',None);g.routes(r,rng)
   for stretch in range(3):
    start=stretch*3
    if r['round']!=start:advance(r,rng,start)
    plan=deepcopy(r['next_boss']);assert plan['round']==start+2 and plan['loop']==loop,(plan,r['round'])
    want=0 if level==-1 else min(3,stretch+1)+3*loop
    assert len(plan['curses'])==want,(level,loop,plan)
    for rd in (start,start+1):
     if r['round']!=rd:advance(r,rng,rd)
     assert plan['opponent'] not in r['routes'],(plan,r['routes'])
     assert r['next_boss']==plan,'the plan never changes before its round'
     r['defeated_opponents']=sorted(set(r.get('defeated_opponents',[]))|{r['routes'][0]})
    advance(r,rng,start+2)
    assert r['routes']==[plan['opponent']],(plan,r['routes'])
    assert r['route_curses'].get(str(plan['opponent']),[])==plan['curses'] or level==-1
    assert r['next_boss']['opponent']==plan['opponent'] and r['next_boss']['curses']==(plan['curses'] if level!=-1 else [])
    r['defeated_opponents'].append(plan['opponent'])
    checks+=1

# 2. The boss duel uses the planned curses.
r=g.new_run(1,random.Random(9));g.auto_deck(r);plan=deepcopy(r['next_boss'])
advance(r,random.Random(1),1);advance(r,random.Random(2),2);r['stage']='draft'
g.prepare_duel(r,random.Random(3));assert r['duel_curses']==plan['curses'] or r.get('charmed_curse'),(r['duel_curses'],plan);checks+=1

# 3. A boss reroll replaces the plan (new boss and curses) at the usual price.
for seed in range(20):
 rng=random.Random(seed);r=g.new_run(0,rng);r.update(gold=10**6);advance(r,rng,2);old=deepcopy(r['next_boss'])
 price=bs.price(r);gold=r['gold'];bs.reroll(g,r,random.Random(100+seed))
 assert r['gold']==gold-price and r['routes'][0]!=old['opponent']
 assert r['next_boss']['opponent']==r['routes'][0] and r['next_boss']['curses']==r['route_curses'][str(r['routes'][0])]
 assert not set(old['curses'])&set(r['next_boss']['curses']),'loop 1 rerolls still avoid the previous curses'
 checks+=1

# 4. LVL 6: the first boss keeps one roll per opening curse and settles on the one taken in Duel 1.
for seed in range(15):
 rng=random.Random(seed);r=g.new_run(0,rng,level=0);r['challenge_level']=6;r['persistent_curses']=[];r.pop('next_boss');g.routes(r,rng)
 plan=r['next_boss'];assert plan['curses'] is None and set(plan['variants'])=={','.join(c) for c in r['route_curses'].values()}
 taken=r['route_curses'][str(r['routes'][seed%5])];key=','.join(taken)
 for opening,boss in plan['variants'].items():
  assert len(boss)==1 and not set(boss)&set(opening.split(','))&nonstackable_curses(6),(opening,boss)
 expected=plan['variants'][key]
 r['persistent_curses']=list(taken);r['defeated_opponents']=[r['routes'][seed%5]];advance(r,rng,1)
 assert r['next_boss']['curses']==expected and 'variants' not in r['next_boss'];checks+=1
 advance(r,rng,2);assert r['route_curses'][str(r['routes'][0])]==expected;checks+=1

# 5. Saves from before the preview roll it on load; a boss-round save keeps the boss it already shows.
storage.write(base/'profile.json',storage.profile())
for rd in (1,2):
 r=g.new_run(0,random.Random(rd));g.auto_deck(r);advance(r,random.Random(5),rd);r.pop('next_boss');r['_save_slot']=1
 shown=list(r['routes']);g.save(r);loaded=g.load_run(1)
 plan=loaded['next_boss'];assert plan['round']==2 and plan['loop']==0 and plan['curses']
 if rd==2:assert loaded['routes']==shown and plan['opponent']==shown[0] and plan['curses']==loaded['route_curses'][str(shown[0])]
 else:assert plan['opponent'] not in loaded['routes']
 again=g.load_run(1);assert again['next_boss']==plan,'the rolled plan was saved';checks+=1

# 6. Tag never keeps a plan.
from tag_campaign import TagCampaign
p=storage.profile();t=TagCampaign([0,1],[p,p],seed=3);t.routes()
# (A seat's run can still carry the plan new_run rolled before it became a Tag run; it is never used.)
assert all(bp.planned(run) is None for run in t.players);checks+=1

# 7. Loop 13 is the final loop; next_loop is all-or-nothing.
fake=lambda **over:type('G',(),dict(dict(CHARACTERS=g.CHARACTERS,BY_ID=g.BY_ID,copy_deck=staticmethod(lambda run:None),engine_deck=staticmethod(lambda run:None),save=staticmethod(lambda run:None),routes=staticmethod(lambda run:None),restock=staticmethod(lambda run:None)),**over))
done={'stage':'complete','loop':12,'round':9,'character':0,'encore_won':True,'defeated_opponents':[]}
before=deepcopy(done)
try:endless.next_loop(fake(),done);raise AssertionError('loop 13 must not continue')
except ValueError as e:assert str(e)==endless.FINAL_TEXT
assert done['final_loop'] is True and {k:v for k,v in done.items() if k!='final_loop'}==before;checks+=1
assert endless.FINAL_LOOP==13 and endless.final_loop({'loop':12}) and not endless.final_loop({'loop':11})
def broken(run):raise RuntimeError('restock failed')
live={'stage':'complete','loop':3,'round':9,'character':0,'encore_won':True,'defeated_opponents':[4]};kept=deepcopy(live)
try:endless.next_loop(fake(restock=staticmethod(broken)),live)
except RuntimeError:pass
assert live==kept,'a failed loop start leaves the finished loop as it was';endless.next_loop(fake(),live)
assert live['loop']==4 and live['stage']=='shop' and not live['encore_won'];checks+=1

# The real flow: beating the loop-13 challenger ends the run as a completed run with the final-loop flag.
r=g.new_run(1,random.Random(4));g.auto_deck(r);r.update(stage='complete',round=9,loop=12,encore_won=False)
endless.challenge(g,r);assert r['encore_active'] and r['encore_opponent']==endless.OBELISK_ID
r.update(stage='duel',duel={'id':'final','enemy_deck':[g.BY_NAME['Battle Ox']['id']]*40})
g.finish_duel(r,{'protocol':1,'id':'final','winner':0,'lp':8000,'events':[]},random.Random(5))
assert r['stage']=='complete' and r['encore_won'] and r['final_loop'] is True
row=next(x for x in storage.profile()['run_history'] if x['id'].endswith(':12'));assert row['result']=='complete' and row['encore_won']
try:endless.next_loop(g,r);raise AssertionError('no loop 14')
except ValueError as e:assert str(e)==endless.FINAL_TEXT
assert r['stage']=='complete' and r['loop']==12;checks+=1
# Loop 12's challenger still leads on to loop 13.
r=g.new_run(1,random.Random(5));g.auto_deck(r);r.update(stage='complete',round=9,loop=11,encore_won=True,defeated_opponents=[])
endless.mark_final(r);assert 'final_loop' not in r;endless.next_loop(g,r);assert r['loop']==12 and r['next_boss']['loop']==12 and len(r['next_boss']['curses'])==1+36;checks+=1
print(f'PASS next boss preview: rolled per stretch, used on its round, reroll replaces it, LVL 6 opening variants, old saves, Tag untouched; loop 13 is final ({checks} checks)')
