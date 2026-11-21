"""Dragon's Claws (dragon_triumph) is weighted by the Dragon monsters in the Deck (user check, 2026-11-21): it shares the
Dragon type theme with Dragon relics, so a Dragon Deck rolls that theme's chance and a Deck without Dragons does not."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as g, relic_affinity as ra, archetype_relics as ar
dragons=[c['id'] for c in g.CARDS if c.get('race')=='Dragon' and c['data']['type']&1][:20]
warriors=[c['id'] for c in g.CARDS if c.get('race')=='Warrior' and c['data']['type']&1][:20]
def run(ids):return {'pool':ids*2,'selected':list(range(len(ids)*2)),'artifacts':[],'lp':8000}  # no character: loadouts are left out of this check
def chance(r):return max([p for gid,(p,members,x,rank) in ra.theme_chances(r).items() if 'dragon_triumph' in members],default=0)
assert chance(run(dragons))>0, 'a Dragon Deck rolls the Dragon theme for Dragon\'s Claws'
assert chance(run(warriors))==0, 'a Deck without Dragons does not'
def w(r):
 base,boost,_=ar.offer_weights(['dragon_triumph'],r)['dragon_triumph'];return base*boost
assert w(run(warriors))<w(run(dragons)), 'without Dragons it also counts as a relic whose cards are missing'
print('PASS Dragon\'s Claws follows the Dragons in the Deck (theme chance %.2f with an all-Dragon Deck)'%chance(run(dragons)))
