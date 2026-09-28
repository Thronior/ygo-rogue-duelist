"""Optional championship encounter and repeat-loop transitions."""
import json
from pathlib import Path
ROOT=Path(__file__).parent
from deck_files import read
CHAMPION=read('world-champion-2004',json.loads((ROOT/'data/champion.json').read_text(encoding='utf8')))
LOOP=json.loads((ROOT/'data/tuning.json').read_text(encoding='utf8')).get('loops',{'attack':100,'defense':100,'lp':2000})
def challenge(g,run):
 if run['stage']!='complete' or run.get('encore_won'):raise ValueError('Complete this loop before challenging the champion.')
 run.update(encore_active=True,opponent=0,routes=[0],stage='draft',boss_curse=None,curses=[])
 import shop_rewards,random
 run['route_rewards']={'0':shop_rewards.reward_from_deck(CHAMPION['main'],g.BY_ID,random)}
 if g.CHARACTERS[run['character']].get('copycat'):g.copy_deck(run)
 if g.CHARACTERS[run['character']].get('engine_deck'):g.engine_deck(run)
 g.save(run)
def next_loop(g,run):
 if run['stage']!='complete' or not run.get('encore_won'):raise ValueError('Defeat the champion to begin another loop.')
 run.update(loop=run.get('loop',0)+1,round=0,encore_active=False,encore_won=False,profile_complete=False,stage='shop',boss_curse=None,curses=[],boss_cursed=[])
 run.setdefault('previous_loop_opponents',[]).append(run.get('defeated_opponents',[]))
 run['defeated_opponents']=[]
 run.setdefault('previous_loop_opponents',[]).append(run.get('defeated_opponents',[]))
 run['defeated_opponents']=[]
 run.pop('finished_at',None);g.routes(run);g.restock(run);g.save(run)
