import sys
from collections import Counter
from pathlib import Path
from types import SimpleNamespace

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))

import campaign as game,content,endless,deck_files

OBELISK_ID=75
expected=Counter({
 6104968:3,34124316:3,31305911:3,31709826:3,
 10000000:1,10000020:1,10000010:1,23205979:3,
 4031928:3,79571449:3,74848038:3,55144522:3,
 45986603:3,72302403:3,44095762:3,12607053:3,
 57953380:1,94163677:1,35346968:3,22567609:3,19613556:1,18144506:1,
})

assert content.CHARACTERS[OBELISK_ID]['name']=='Obelisk the Tormenter'
assert OBELISK_ID not in content.eligible_opponents(0,loop=0)
assert OBELISK_ID in content.eligible_opponents(0,loop=1)
deck=content.opponent_record(0,OBELISK_ID,loop=1)
assert deck['tier']==4 and deck['ignore_limited_list'] is True
assert Counter(deck['main'])==expected and len(deck['main'])==52
assert deck['extra']==[]
assert deck_files.read(deck['deck'],deck)['main']==deck['main']

fake=SimpleNamespace(
 CHARACTERS=game.CHARACTERS,
 BY_ID=game.BY_ID,
 copy_deck=lambda run:None,
 engine_deck=lambda run:None,
 save=lambda run:None,
 routes=lambda run:None,
 restock=lambda run:None,
)
first={'stage':'complete','loop':0,'round':9,'character':0,'encore_won':False}
endless.challenge(fake,first)
assert first['encore_opponent']==0 and endless.encore_record(first)['name']==endless.CHAMPION['name']

second={'stage':'complete','loop':1,'round':9,'character':0,'encore_won':False}
endless.challenge(fake,second)
assert second['encore_opponent']==OBELISK_ID and second['routes']==[OBELISK_ID]
assert endless.encore_record(second)['main']==deck['main']

third={'stage':'complete','loop':2,'round':9,'character':0,'encore_won':False}
endless.challenge(fake,third)
assert third['encore_opponent']==OBELISK_ID

second.update(stage='complete',encore_won=True,defeated_opponents=[])
endless.next_loop(fake,second)
assert second['loop']==2 and second['encore_active'] is False and 'encore_opponent' not in second
print('PASS exact 52-card Tier 4 Obelisk deck, limited-list bypass, and post-loop-two gate progression')
