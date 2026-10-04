"""Validate the active T2 roster, copy limits, and the reviewed balance edits."""
import json,sys
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import content,deck_files
cards={c['id']:c['name'] for c in json.loads((ROOT/'data/era-cards.json').read_text(encoding='utf8'))}
policy=json.loads((ROOT/'data/tier2-staple-policy.json').read_text(encoding='utf8'))
premium=set(policy['cards'])
assert policy['max_total']==4
assert premium<=set(cards.values())
assert {'Mirror Force','Torrential Tribute','Raigeki','Pot of Greed','Monster Reborn'}<=premium
assert not {'Sakuretsu Armor','Trap Hole','Fissure','Jar of Greed','The Shallow Grave'}&premium
roster=content.eligible_opponents(4)
for character in roster:
 deck=content.opponent_record(4,character)
 used=Counter(cards[c] for s in ('main','extra','side') for c in deck.get(s,[]) if cards[c] in premium)
 assert sum(used.values())<=policy['max_total'],(character,dict(used))
report=json.loads((ROOT/'docs/deck-balance-oct5.json').read_text(encoding='utf8'))
for row in report['decks']:
 deck=deck_files.read(row['deck'],{})
 assert {s:len(deck[s]) for s in ('main','extra','side')}==row['before_sizes'],row['deck']
# Meaningful theme/consistency constraints on the targeted weak decks.
def counts(name):return Counter(cards[c] for c in deck_files.read(name,{})['main'])
keith=counts('bandit-keith-tier-2')
assert keith['Barrel Dragon']==2 and keith['Gamble']==1 and keith['Fissure']==2
mai=counts('mai-valentine-tier-2')
assert mai['Harpie Lady']==3 and mai['Elegant Egotist']==3 and mai['Birdface']==3
tristan=counts('tristan-taylor-tier-2')
assert all(tristan[n]==1 for n in ('Robolady','Roboyarou','Polymerization'))
strings=counts('wct2004-strings-tier2')
assert strings['Book of Moon']==2 and strings['Waboku']==3 and not strings['Final Attack Orders']
print(f'PASS all {len(roster)} active T2 opponents have at most four premium copies; {len(report["decks"])} edited decks preserve section sizes and key themes.')
