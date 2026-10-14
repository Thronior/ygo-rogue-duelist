"""Unlock boundaries and existing-profile migration, without touching saves."""
import sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage, campaign, content, achievement_model
engine=next(i for i,c in enumerate(content.CHARACTERS) if c.get('engine_deck'))
assert campaign.unlock_rule(engine)==('highest_challenge_level',5)
for levels,old,expected in [({},False,False),({'0':4},False,False),({'1':5},False,True),({'33':5},False,True),({'0':-1},False,False),({},True,True)]:
 with patch.object(storage,'read',return_value={'unlocked':[0,1]+([engine] if old else []),'character_levels':levels}):
  p=storage.profile()
  assert (engine in p['unlocked'])==expected,(levels,old,p)
  row=next(x for x in achievement_model.entries(p) if x['id']=='character:'+str(engine))
  assert row['description']=='Beat Challenge Level 5 with any character'
# New completion unlocks immediately, with its usual unlock notification.
with patch.object(storage,'read',return_value={'character_levels':{'0':4}}),patch.object(storage,'write') as write:
 run=dict(character=0,challenge_level=5,stage='complete',gold=0,artifacts=[])
 campaign.update_profile(run,True)
 assert engine in run['unlocks_earned']
 assert engine in write.call_args.args[1]['unlocked']
print('PASS: Challenge 5 unlock, level 4/-1 locked, existing progress/unlocks preserved, completion notification')
