"""Blood Toll (cursed relic, 2026-10-29): purchases and rerolls cost 10 LP per coin instead of coins, after discounts."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c,payment,approved_relics as ar
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='blood-toll-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile();profile['unlocked']=list(c.PLAYABLE_IDS);storage.write(storage.ROOT/'profile.json',profile)
assert 'cursed_blood_toll' in ar.CURSED_IDS and 'cursed_blood_toll' in c.ART_INFO

r=g.new_run(1,random.Random(3));g.auto_deck(r);r.update(stage='shop',round=2,gold=500,lp=8000)
r['artifacts']=r.get('artifacts',[])+['cursed_blood_toll'];g.restock(r,random.Random(4))
item=next(i for i,x in enumerate(r['shop']) if x['kind'] in ('single','pack') and not x['sold'])
price=r['shop'][item]['price'];g.buy(r,item,random.Random(5))
assert r['lp']==8000-10*price and r['gold']==500,(r['lp'],r['gold'],price)
lp=r['lp'];cost=g.reroll_price(r);g.reroll_shop(r,random.Random(6));assert r['lp']==lp-10*cost and r['gold']==500
# Never below 1 LP: the purchase is refused and nothing changes.
r['lp']=10*r['shop'][0]['price'];before=dict(lp=r['lp'],sold=r['shop'][0]['sold'])
try:g.buy(r,0,random.Random(7));raise AssertionError('bought down to 0 LP')
except ValueError as e:assert 'LP' in str(e)
assert r['lp']==before['lp'] and r['shop'][0]['sold']==before['sold']
assert payment.cost(r,15)==150 and payment.can_pay(dict(r,lp=151),15) and not payment.can_pay(dict(r,lp=150),15)
# Without the relic, coins as usual.
plain=dict(artifacts=[],gold=20,lp=8000);payment.pay(plain,15);assert plain['gold']==5 and plain['lp']==8000
print('PASS Blood Toll: 10 LP per coin for buys and rerolls, discounts kept, never below 1 LP, coins untouched')
