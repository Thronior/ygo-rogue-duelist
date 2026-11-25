"""Shop relic banish (Discord suggestion, user 2026-11-24): the relic is never offered again this run and a locked relic loses
its lock when banished. Since 2026-11-25: 20 coins, +10 per banish this run up to 60, and the slot is not rerolled (sold out)."""
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
 assert run['gold']==80 and result['price']==20,(run['gold'],result)
 assert result['banished']==key and run['relic_banishes']==[key] and key not in run['relic_locks']
 # The slot is not rerolled: same relic, sold out; the other relics stay.
 slot=run['shop'][index]
 assert slot['kind']=='artifact' and slot['id']==key and slot['sold'] and slot['banished'] and result['replacement'] is None,slot
 assert relics()==[k for k in before if k!=key]
 try:g.banish_relic(run,index);raise SystemExit('banished an empty slot')
 except ValueError:pass
 # Price climbs by 10 per banish and stops at 60.
 assert [g.banish_price(dict(relic_banishes=['x']*n)) for n in range(7)]==[20,30,40,50,60,60,60]
 # Never offered again: not after rerolls, not in the next shop.
 for seed in range(40):
  run['gold']=10**6;g.reroll_shop(run,random.Random(seed));assert key not in relics(),seed
 g.restock(run,random.Random(99));assert key not in relics()
 assert key not in g.shop_relic_pool(run)
 # Not enough coins: nothing changes.
 run['gold']=29;i=next(i for i,x in enumerate(run['shop']) if x['kind']=='artifact');other=run['shop'][i]['id']
 try:g.banish_relic(run,i);raise SystemExit('banished without coins')
 except ValueError:pass
 assert run['shop'][i]['id']==other and other not in run['relic_banishes'] and run['gold']==29 and not run['shop'][i]['sold']
 run['gold']=30;g.banish_relic(run,i);assert run['gold']==0 and run['relic_banishes'][-1]==other
 # Only relics in stock, and only in the shop.
 run['gold']=100;i=next(i for i,x in enumerate(run['shop']) if x['kind']=='artifact' and not x['sold']);single=next(i for i,x in enumerate(run['shop']) if x['kind']!='artifact')
 try:g.banish_relic(run,single);raise SystemExit('a card was banished')
 except ValueError:pass
 run['stage']='draft'
 try:g.banish_relic(run,i);raise SystemExit('banished outside the shop')
 except ValueError:pass
 print('PASS relic banish: 20 coins +10 each up to 60, slot sold out (no reroll), lock dropped, never offered again, coins checked, relics only')
