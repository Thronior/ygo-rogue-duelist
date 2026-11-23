"""Optional championship encounter and repeat-loop transitions."""
import json
from copy import deepcopy
from pathlib import Path
ROOT=Path(__file__).parent
from deck_files import read
import content
CHAMPION=read('world-champion-2004',json.loads((ROOT/'data/champion.json').read_text(encoding='utf8')))
LOOP=json.loads((ROOT/'data/tuning.json').read_text(encoding='utf8')).get('loops',{'attack':100,'defense':100,'lp':2000})
OBELISK_ID=next((i for i,row in content.TIER_EXCLUSIVE_OPPONENTS.items() if row.get('name')=='Obelisk the Tormentor'),None)
def encore_record(run):
 if run.get('encore_opponent')==OBELISK_ID and OBELISK_ID is not None:
  return content.opponent_record(0,OBELISK_ID,loop=max(1,int(run.get('loop',0))))
 return CHAMPION
def challenge(g,run):
 if run['stage']!='complete' or run.get('encore_won'):raise ValueError('Complete this loop before starting its loop challenge.')
 opponent=OBELISK_ID if run.get('loop',0)>=1 else 0
 record=content.opponent_record(0,opponent,loop=max(1,int(run.get('loop',0)))) if opponent==OBELISK_ID else CHAMPION
 run.update(encore_active=True,encore_won=False,encore_opponent=opponent,opponent=opponent,routes=[opponent],stage='draft',boss_curse=None,curses=[])
 import shop_rewards,random
 run['route_rewards']={str(opponent):shop_rewards.reward_from_deck(record['main'],g.BY_ID,random)}
 # No local `import content` here: it made `content` local to the whole function, so the Obelisk line above failed
 # with UnboundLocalError and 'Start Looping' broke from loop 2 on (v0.2.35, Discord Nov 16).
 if content.copies_deck(run):g.copy_deck(run)
 if g.CHARACTERS[run['character']].get('engine_deck'):g.engine_deck(run)
 g.save(run)
# Loop 13 is the last loop (user, 2026-11-15, after Aporia reached it): beating its challenger ends the run.
FINAL_LOOP=13
FINAL_TEXT='You conquered the final loop.'
def final_loop(run):
 """Whether the run is in the final loop (run['loop'] counts from 0; players see loop+1)."""
 return int(run.get('loop',0) or 0)+1>=FINAL_LOOP
def mark_final(run):
 """Flags a run whose final loop challenger is beaten, so the end screen offers no further loop."""
 if run.get('stage')=='complete' and run.get('encore_won') and final_loop(run) and run.get('history_mode')!='tag' and not run.get('secret_challenge'):run['final_loop']=True
 else:run.pop('final_loop',None)
def next_loop(g,run):
 if run['stage']!='complete' or not run.get('encore_won'):raise ValueError('Defeat the loop challenger to begin another loop.')
 if final_loop(run):mark_final(run);raise ValueError(FINAL_TEXT)
 # Built on a copy and committed only once saved: a failure part-way used to leave the live run already past
 # 'complete', so the still-shown "Begin next loop" button then answered "Defeat the loop challenger" (Discord, Nov 14).
 nxt=deepcopy(run)
 nxt.update(loop=nxt.get('loop',0)+1,round=0,encore_active=False,encore_won=False,profile_complete=False,stage='shop',boss_curse=None,curses=[],boss_cursed=[])
 for key in ('encore_opponent','variant_unlocked','finished_at','final_loop'):nxt.pop(key,None)
 nxt.setdefault('previous_loop_opponents',[]).append(nxt.get('defeated_opponents',[]))
 nxt['defeated_opponents']=[]
 g.routes(nxt);g.restock(nxt);g.save(nxt)
 run.clear();run.update(nxt)
