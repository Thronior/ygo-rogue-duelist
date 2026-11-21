"""Broken Limiter weighs more the more copies of one card the card pool holds (user, 2026-11-21): 4 copies x2, 5 x3, ..."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import archetype_relics as ar
def run(pool):return {'pool':pool,'artifacts':[],'lp':8000,'selected':[]}
f=lambda pool,key='broken_limiter':ar.copies_factor(key,run(pool))
assert f([])==1 and f([1,1,1])==1 and f([1,1,1,2,2,2])==1
assert f([5]*4)==2 and f([5]*5+[7]*4)==3 and f([5]*6)==4
assert f([5]*40)==ar.BOOST_CAP
assert f([5]*6,'merchant_urn')==1
w=lambda pool:ar.offer_weights(['broken_limiter','merchant_urn'],run(pool),shop=True) if 'shop' in ar.offer_weights.__code__.co_varnames else ar.offer_weights(['broken_limiter','merchant_urn'],run(pool))
low,high=w([5]*3)['broken_limiter'][0],w([5]*5)['broken_limiter'][0]
assert abs(high/low-3)<1e-9,(low,high)
assert w([5]*5)['merchant_urn'][0]==w([5]*3)['merchant_urn'][0]
print('PASS Broken Limiter weight: x(copies-2) from 4 copies of one card, capped, other relics unchanged')
