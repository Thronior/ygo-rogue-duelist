"""Every generated shop quietly ends general singles with back-row interaction."""
import random,sys
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as game,shop_rewards,storage
assert shop_rewards.BACKROW_REMOVAL <= game.BY_NAME.keys(),shop_rewards.BACKROW_REMOVAL-game.BY_NAME.keys()
for name in ['Mystical Space Typhoon','Tornado Bird','Fish and Kicks','Light of Judgment','Breaker the Magical Warrior','Raigeki Break']:
 assert shop_rewards.removes_backrow(game.BY_NAME[name]),name
for name in ['Emergency Provisions',"Gryphon's Feather Duster",'Magic Jammer','Jinzo','Penguin Soldier','Cobraman Sakuzy','Timidity','Raigeki','Mask of Dispel']:
 assert not shop_rewards.removes_backrow(game.BY_NAME[name]),name
seen=set();profile=storage.profile()
with patch.object(storage,'profile',return_value=profile):
 for seed in range(500):
  run=dict(character=seed%36,opponent=0,artifacts=[],bias=list(shop_rewards.LABELS)[seed%len(shop_rewards.LABELS)])
  game.restock(run,random.Random(seed))
  singles=[x for x in run['shop'] if x['kind']=='single']
  assert len(singles)==10
  assert len({x['id'] for x in singles})==10
  last=singles[-1];card=game.BY_ID[last['id']]
  assert shop_rewards.removes_backrow(card),(seed,card['name'])
  assert set(last)=={'kind','id','price','sold'},last
  assert last['price']==15+(10 if card['level']>=5 else 0) and not last['sold']
  seen.add(card['name'])
 assert seen==shop_rewards.BACKROW_REMOVAL,shop_rewards.BACKROW_REMOVAL-seen
 # A restricted profile still draws the guaranteed slot only from eligible cards.
 allowed=set(game.BY_ID)-{game.BY_NAME[n]['id'] for n in shop_rewards.BACKROW_REMOVAL if n!='Mystical Space Typhoon'}
 import unlocks
 with patch.object(unlocks,'card_allowed',side_effect=lambda c,*args:c['id'] in allowed):
  for seed in range(10):
   run=dict(character=0,opponent=0,artifacts=[],bias='normal')
   game.restock(run,random.Random(seed))
   singles=[x for x in run['shop'] if x['kind']=='single']
   assert singles[-1]['id']==game.BY_NAME['Mystical Space Typhoon']['id']
   assert all(x['id'] in allowed for x in singles)
print(f'PASS: 510 shops, all {len(seen)} back-row removal cards, unique singles, final-slot order, normal pricing/metadata, eligible-card filtering')
