"""Shop relic banish (Discord suggestion, user 2026-11-24): 10 coins, the relic is never offered again this run, its slot
restocks with another relic at once, and a locked relic loses its lock when banished."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage
from content import PLAYABLE_IDS
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='relic-banish-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);storage.write(base/'profile.json',profile)
 rng=random.Random(4);run=g.new_run(0,rng);run.update(stage='shop',round=2,gold=100)
 g.restock(run,rng)
 relics=lambda:[x['id'] for x in run['shop'] if x['kind']=='artifact' and not x.get('sold')]
 before=relics();index=next(i for i,x in enumerate(run['shop']) if x['kind']=='artifact');key=run['shop'][index]['id']
 g.lock_relic(run,index)
 result=g.banish_relic(run,index,random.Random(1))
 assert run['gold']==90,run['gold']
 assert result['banished']==key and run['relic_banishes']==[key] and key not in run['relic_locks']
 # Same slot, a different relic that was not already in stock, with a real price; the other relics stay.
 new=run['shop'][index]
 assert new['kind']=='artifact' and new['id']==result['replacement'] and new['id'] not in before and new['price']>0 and not new['sold'],new
 assert len(relics())==len(before) and [k for k in relics() if k!=new['id']]==[k for k in before if k!=key]
 # Never offered again: not after rerolls, not in the next shop.
 for seed in range(40):
  run['gold']=10**6;g.reroll_shop(run,random.Random(seed));assert key not in relics(),seed
 g.restock(run,random.Random(99));assert key not in relics()
 assert key not in g.shop_relic_pool(run)
 # Not enough coins: nothing changes.
 run['gold']=9;i=next(i for i,x in enumerate(run['shop']) if x['kind']=='artifact');other=run['shop'][i]['id']
 try:g.banish_relic(run,i);raise SystemExit('banished without coins')
 except ValueError:pass
 assert run['shop'][i]['id']==other and other not in run['relic_banishes'] and run['gold']==9
 # Only relics in stock, and only in the shop.
 run['gold']=100;single=next(i for i,x in enumerate(run['shop']) if x['kind']!='artifact')
 try:g.banish_relic(run,single);raise SystemExit('a card was banished')
 except ValueError:pass
 run['stage']='draft'
 try:g.banish_relic(run,i);raise SystemExit('banished outside the shop')
 except ValueError:pass
 print('PASS relic banish: 10 coins, slot restocks with a new relic, lock dropped, never offered again, coins checked, relics only')
