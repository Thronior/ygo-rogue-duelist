"""Opponents without a pack of their own (itch report, 2026-11-14): beating the Ultimate Collector NotUrDaddy, who plays
Ryou Bakura (pack 'RANDOM'), crashed v0.2.33 with KeyError 'RANDOM' in shop_rewards.reward_for, and then on every load
of that saved shop. Every opponent must get a real, stable reward pack. Uses a temporary save folder, never saves/."""
import random,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,shop_rewards
from content import CHARACTERS,PACK_BY_ID
for index in range(len(CHARACTERS)):
 first=shop_rewards.reward_for(index)
 assert first['pack'] in PACK_BY_ID,(index,CHARACTERS[index]['name'],first)
 assert shop_rewards.reward_for(index)['pack']==first['pack'],'stable between loads'
odd=[i for i,c in enumerate(CHARACTERS) if c['pack'] not in PACK_BY_ID]
assert odd,'expected Bakura/Copycat/Engine (and collectors playing them) to have no real pack'
uc=[i for i in odd if CHARACTERS[i].get('ultimate_collector')]
(ROOT/'temp').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='reward-pack-',dir=ROOT/'temp') as tmp:
 storage.ROOT=Path(tmp);g.SAVE=Path(tmp)/'run.json'
 run=g.new_run(0,random.Random(3))
 for opponent in odd:
  # The saved shop after beating that opponent, without a stored reward (the crashing case).
  run.update(stage='shop',opponent=opponent);run.pop('shop_reward',None)
  g.restock(run,random.Random(opponent))
  assert any(x['kind']=='pack' and x.get('opponent_pack') and x['id'] in PACK_BY_ID for x in run['shop']),opponent
print(f'PASS every opponent has a real reward pack; restock works after {", ".join(CHARACTERS[i]["name"] for i in odd)}'+(f' (collectors: {", ".join(CHARACTERS[i]["name"] for i in uc)})' if uc else ''))
