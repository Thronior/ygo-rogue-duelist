"""Auto-fill to minimum (user, 2026-11-23): campaign.fill_picks keeps every chosen card, adds just enough Main Deck
cards to reach the minimum, never Extra Deck cards, never a fourth copy, and nothing for fixed decks."""
import sys
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g
from approved_relics import minimum

ext=next(c['id'] for c in g.CARDS if g.is_extra(c['id']))
mon=next(c['id'] for c in g.CARDS if g.normal_starter(c['id']))
others=[c['id'] for c in g.CARDS if not g.is_extra(c['id']) and c['id']!=mon][:60]
pool=[mon]*5+[ext]*4+others
run={'character':0,'guaranteed':[],'pool':pool,'selected':[0,1,9,10],'artifacts':[],'curses':[],'loop':0,'round':0,'challenge_level':0}
need=minimum(run)-4
picks=g.fill_picks(run)
assert len(picks)==need,(len(picks),need)
assert not set(picks)&set(run['selected']),'chosen cards stay and are not picked again'
assert not any(g.is_extra(pool[i]) for i in picks),'no Extra Deck card'
copies=Counter(pool[i] for i in picks+run['selected'])
assert copies[mon]<=3,'never more than three copies'
full=dict(run,selected=list(range(len(pool)))[:minimum(run)+5])
assert g.fill_picks(full)==[],'a full deck needs nothing'
print(f'PASS deck fill: {need} cards added, chosen cards kept, no Extra Deck, copy limit kept')
