"""Locked shop relics (user, 2026-11-13): stay through rerolls and into the next shop, until bought or unlocked."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage
from content import PLAYABLE_IDS
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='relic-locks-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);storage.write(base/'profile.json',profile)
 rng=random.Random(2);run=g.new_run(0,rng);run.update(stage='shop',round=2,gold=5000)
 g.restock(run,rng)
 relics=lambda:[x['id'] for x in run['shop'] if x['kind']=='artifact']
 index=next(i for i,x in enumerate(run['shop']) if x['kind']=='artifact');key=run['shop'][index]['id']
 assert g.lock_relic(run,index)=={'locked':True} and run['relic_locks']==[key]
 # Rerolls keep it, in the first relic slot, at the normal number of relics; it is never marked as skipped.
 for seed in range(25):
  run['gold']=10**6;g.reroll_shop(run,random.Random(seed));assert relics()[0]==key and len(relics())==3,relics()
  assert key not in run.get('relic_skips',{}),run['relic_skips']
 # The next shop (after a duel) still has it.
 g.restock(run,random.Random(99));assert key in relics()
 # Unlocking lets it go on the next reroll (eventually).
 i=next(i for i,x in enumerate(run['shop']) if x.get('id')==key and x['kind']=='artifact')
 assert g.lock_relic(run,i)=={'locked':False} and run['relic_locks']==[]
 # Buying a locked relic drops the lock.
 i=next(i for i,x in enumerate(run['shop']) if x['kind']=='artifact');other=run['shop'][i]['id']
 g.lock_relic(run,i);g.buy(run,i);g.restock(run,random.Random(5))
 assert other not in run['relic_locks'] and other not in relics(),(run['relic_locks'],relics())
 # Two locks fill two slots; only relics in stock can be locked.
 ids=[i for i,x in enumerate(run['shop']) if x['kind']=='artifact'][:2]
 for i in ids:g.lock_relic(run,i)
 locked=[run['shop'][i]['id'] for i in ids];run['gold']=10**6;g.reroll_shop(run,random.Random(7));assert relics()[:2]==locked,relics()
 single=next(i for i,x in enumerate(run['shop']) if x['kind']!='artifact')
 try:g.lock_relic(run,single);raise SystemExit('a card was locked')
 except ValueError:pass
 print('PASS relic locks: kept through rerolls and the next shop, first slots, unlock, buy drops the lock, relics only')
