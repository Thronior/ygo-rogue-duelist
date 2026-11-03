"""Winning a run that unlocks a Challenge Level selects that level for the character (Discord, 2026-11-02)."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import challenge_levels

def award(profile,level,character=4):
 run={'character':character,'challenge_level':level}
 challenge_levels.award(profile,run)
 return run

profile={'character_levels':{},'character_last_levels':{'4':0,'9':3}}
run=award(profile,0)
assert run['level_unlocked']==1 and profile['character_last_levels']['4']==1,'a first clear moves to level 1'
assert profile['character_last_levels']['9']==3,'other characters keep their level'

# A replayed level unlocks nothing, so the remembered choice stays.
profile['character_last_levels']['4']=0
run=award(profile,0)
assert 'level_unlocked' not in run and profile['character_last_levels']['4']==0,'no new level, no change'

# Level 6 is the top: nothing to move to.
profile={'character_levels':{'4':5},'character_last_levels':{'4':6}}
run=award(profile,6)
assert 'level_unlocked' not in run and profile['character_last_levels']['4']==6

# Relicless clears are not ranked levels.
profile={'character_levels':{},'character_last_levels':{'4':-1}}
award(profile,-1)
assert profile['character_last_levels']['4']==-1
print('PASS newly unlocked Challenge Levels are selected')
