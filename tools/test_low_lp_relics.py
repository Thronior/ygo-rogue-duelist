"""LP-recovery relics weigh more the less LP the player has (Thronior, Discord 2026-11-20; curve picked 2026-11-21).
Run: python -B tools/test_low_lp_relics.py"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import archetype_relics as ar
import campaign as g

f=ar.low_lp_factor
for key in ar.LP_RECOVERY:assert key in g.ARTIFACTS,key
run={'lp':8000,'artifacts':[]}
assert f('scarab',run)==1.0
assert f('scarab',dict(run,lp=4000))==2.0
assert abs(f('spring',dict(run,lp=2000))-2.5)<1e-9
assert f('phoenix_rebirth',dict(run,lp=0))==3.0
assert f('urn',dict(run,lp=1000))==1.0,'plain relics never change'
# Challenge level 4+: the limit is 4,000; Diamond Ankh raises it by 2,000.
assert f('chalice',{'lp':2000,'challenge_level':4,'artifacts':[]})==2.0
assert f('chalice',{'lp':5000,'artifacts':['ankh']})==2.0
assert f('chalice',dict(run,lp=9000))==1.0,'LP above the limit counts as full'
# Glass Treasury blocks between-Duel healing only; Zombie's Bargain blocks all LP gain but not the Phoenix saves.
glass={'lp':2000,'artifacts':['cursed_glass_treasury']}
assert f('scarab',glass)==1.0 and f('spring',glass)==2.5
zombie={'lp':2000,'artifacts':['cursed_zombies_bargain']}
assert f('spring',zombie)==1.0 and f('sacred_phoenix',zombie)==2.5
# offer_weights carries it into the base weight every slot uses.
w=ar.offer_weights(['scarab','spring'],dict(run,lp=4000,pool=[]))
assert abs(w['scarab'][0]-2.0)<1e-9,w
print('low-LP relic weights OK')
