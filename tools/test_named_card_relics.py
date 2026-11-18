"""Relics that name specific cards (user, 2026-11-18): Gate Calling, Blue-Eyes Radiance, Black Chaos Rite and All for One
Terrorking are offered x0.3 as often while the run's card pool lacks their cards; archetype relics are unchanged."""
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,archetype_relics as a
from content import ART_INFO
ids=lambda *names:[g.BY_NAME[n]['id'] for n in names]
for key in a.SPECIFIC_CARDS:
 assert key in ART_INFO,key+' is a real relic'
 for name in a.SPECIFIC_CARDS[key][0]:assert name in g.BY_NAME,name

def base(key,pool):
 run={'pool':pool,'selected':list(range(len(pool))),'artifacts':[],'round':5,'gold':0}
 return a.offer_weights([key,'magicians_bond'],run)[key][0]
filler=ids('Kuriboh')*20
assert abs(base('all_for_one_terrorking',filler)-a.NOT_OWNED*base('all_for_one_terrorking',filler+ids('Terrorking Archfiend')))<1e-9,'Terrorking x0.3 without the card'
assert base('gate_calling',filler+ids('Kazejin'))<base('gate_calling',filler+ids('Kazejin','Suijin')),'Gate Calling needs 2 of the trio'
assert base('blue_eyes_radiance',filler+ids('Blue-Eyes White Dragon'))<base('blue_eyes_radiance',filler+ids('Blue-Eyes White Dragon','Blue-Eyes Shining Dragon')),'Radiance needs both'
assert base('black_chaos_rite',filler+ids('Dark Magician','Dark Magician of Chaos'))==base('black_chaos_rite',filler+ids('Dark Magician','Dark Magician of Chaos')+filler),'owned: no penalty'
# Owning the cards outside the Deck is enough (pool, not Deck).
run={'pool':filler+ids('Terrorking Archfiend'),'selected':list(range(20)),'artifacts':[],'round':5,'gold':0}
assert a.owns_named_cards('all_for_one_terrorking',run),'a card in the pool counts even when not in the Deck'
# Archetype relics are not touched.
assert a.owns_named_cards('magicians_bond',{'pool':[]}) and a.owns_named_cards('twin_eyes',{'pool':[]})
print('PASS named-card relics: x0.3 while their cards are not owned, archetype relics unchanged')
