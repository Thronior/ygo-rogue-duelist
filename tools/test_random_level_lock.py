"""Randomized cards from challenge level 3 (user, 2026-11-18): the shop's Random Pack and the Absolute Random relic stay away
until the character has beaten that level once; levels 0-2 and the Randomizer loadout are unchanged."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,random_cards,campaign_expansion as ce
from content import PLAYABLE_IDS
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='random-lock-',dir=ROOT/'temp') as tmp:
 base=Path(tmp);storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
 profile=storage.profile();profile['unlocked']=list(PLAYABLE_IDS);profile['character_levels']={'0':3};storage.write(base/'profile.json',profile)
 run=g.new_run(0,random.Random(1))
 for level,ok in [(0,True),(2,True),(3,True),(4,False),(5,False)]:
  run['challenge_level']=level
  assert random_cards.allowed(run)==ok,(level,ok)
  assert ce.shop_relic_eligible(run,'absolute_random')==ok,(level,'relic')
 # Another character that has beaten nothing: open at level 2, locked from level 3.
 assert random_cards.allowed(dict(run,character=1,challenge_level=2))
 other=dict(run,character=1,challenge_level=3);assert not random_cards.allowed(other)
 # The shop never rolls a Random Pack while locked (SHOP_CHANCE forced to 1 to make it show up whenever it may).
 old=random_cards.SHOP_CHANCE;random_cards.SHOP_CHANCE=1.0
 try:
  def packs(level):
   r=dict(run,challenge_level=level,stage='shop',round=1,gold=0,artifacts=[]);seen=set()
   for seed in range(6):
    g.restock(r) if 'rng' not in g.restock.__code__.co_varnames else g.restock(r,random.Random(seed))
    seen|={x['id'] for x in r['shop'] if x['kind']=='pack'}
   return seen
  assert random_cards.RANDOM_PACK in packs(3),'level 3 beaten: it comes back'
  assert random_cards.RANDOM_PACK not in packs(4),'locked at level 4'
 finally:random_cards.SHOP_CHANCE=old
print('PASS randomized cards from level 3 wait until the character beats that level (Random Pack, Absolute Random)')
