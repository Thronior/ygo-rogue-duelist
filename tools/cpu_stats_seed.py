"""CPU Stats seed (user, 2026-11-24): prints every CPU deck the game deals today, by opponent and tier, so
tools/cpu_stats_seed.mjs can tell from a replay's CPU deck which opponent and tier it was. Tier 0 is the opening
starter deck (one tutorial deck per opening opponent), 1-3 the run tiers, 4 the loop decks (Tier 4 and Ultimate
Collectors). Also prints the starting relic of every playable character and loadout. Output: JSON on stdout."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,encounters
from deck_files import read
decks=[]
def add(opponent,tier,record):
 decks.append(dict(opponent=opponent,tier=tier,main=sorted(record['main']),extra=sorted(record.get('extra',[]))))
for opponent,variant in content.TUTORIAL_OPPONENTS.items():
 n=variant%len(encounters.TUTORIALS);add(opponent,0,dict(main=read('tutorial-'+str(n+1),encounters.TUTORIALS[n])['main'],extra=[]))
ids=sorted(set(content.GAME_DECKS)|set(content.TIER_EXCLUSIVE_OPPONENTS)|set(content.UC_OPPONENTS))
for opponent in ids:
 for tier,(round_index,loop) in {1:(1,0),2:(3,0),3:(6,0),4:(1,1)}.items():
  try:add(opponent,tier,content.opponent_record(round_index,opponent,loop))
  except (ValueError,KeyError):pass
relics={}
for i in content.PLAYABLE_IDS:
 c=content.CHARACTERS[i]
 for relic in (c.get('starting_relic'),(c.get('alternate') or {}).get('starting_relic')):
  if relic and relic!='none':relics.setdefault(relic,[]).append(i)
print(json.dumps(dict(decks=decks,startingRelics=relics)))
