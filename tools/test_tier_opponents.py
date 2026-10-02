from pathlib import Path
import sys,random,uuid
from unittest.mock import patch
from collections import Counter
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root))
import content,campaign as game,storage,shop_rewards,deck_files
from tag_campaign import TagCampaign
seen={1:set(),2:set(),3:set()};count=0
with patch.object(storage,'ROOT',root/'temp'/('tier-opponent-test-'+uuid.uuid4().hex)):
 for loop in (0,1):
  for character in content.PLAYABLE_IDS:
   defeated=[]
   for rd in range(9):
    run=dict(round=rd,loop=loop,character=character,defeated_opponents=defeated[:],challenge_level=0)
    game.routes(run,random.Random(1000+character*19+rd+loop*100))
    assert len(set(run['routes']))==5
    assert not set(run['routes'])&set(defeated+[character])
    assert set(run['route_rewards'])==set(map(str,run['routes']))
    for i in run['routes']:
     assert i in content.eligible_opponents(rd,loop)
     reward=run['route_rewards'][str(i)]
     assert reward['key'] in shop_rewards.THEME_OPTIONS[i]
     assert reward['pack'] in content.PACK_BY_ID and not content.PACK_BY_ID[reward['pack']].get('draft_only')
     if i in content.TIER_EXCLUSIVE_OPPONENTS:
      assert not loop and rd>0
      seen[rd//3+1].add(i)
    if rd==0 and not loop:
     assert run['tutorial_variants']=={str(i):content.TUTORIAL_OPPONENTS[i] for i in run['routes']}
    defeated.append(run['routes'][0]);count+=1
 for i,row in content.TIER_EXCLUSIVE_OPPONENTS.items():
  tiers={int(t) for t in row.get('tier_decks',{str(row['tier']):row['deck']})}
  assert i not in content.PLAYABLE_IDS and len(set(shop_rewards.THEME_OPTIONS[i]))==6
  for rd in range(9):
   allowed=rd>0 and rd//3+1 in tiers
   try:deck=content.opponent_record(rd,i)
   except ValueError:assert not allowed
   else:
    assert allowed and deck['tier']==rd//3+1 and 40<=len(deck['main'])<=60 and max(Counter(deck['main']+deck['extra']).values())<=3
  assert all(i in seen[t] for t in tiers)
  fallback=shop_rewards.reward_for(i);assert fallback['pack'] in content.PACK_BY_ID
  for tier in tiers:
   run=dict(round=(tier-1)*3+1,character=37,opponent=i)
   game.copy_deck(run,random.Random(1));assert run['copied_opponent']==i and len(run['selected'])>=40
 assert len(content.TUTORIAL_OPPONENTS)==7
 for i,v in content.TUTORIAL_OPPONENTS.items():
  deck=deck_files.read('tutorial-'+str(v+1),{})
  assert len(deck['main'])==40 and not deck['extra']
 # Both tutorial players must be excluded and still leave exactly five choices.
 tutorial=list(content.TUTORIAL_OPPONENTS)
 for j in range(7):
  chars=[tutorial[j],tutorial[(j+1)%7]]
  profile=storage.profile();profile['unlocked']=content.PLAYABLE_IDS[:]
  room=TagCampaign(chars,[profile,profile],seed=j,lobby=True)
  for rd in range(9):
   room.shared['round']=rd;room.sync();room.routes()
   for run in room.players:
    assert len(set(run['routes']))==5 and not set(chars)&set(run['routes'])
    assert all(i in content.eligible_opponents(rd) for i in run['routes'])
   chosen=[room.players[0]['routes'][0],next(i for i in room.players[1]['routes'] if i!=room.players[0]['routes'][0])]
   for run in room.players:run.setdefault('defeated_opponents',[]).extend(chosen)
print('PASS',count,'single-player route generations and 63 tag rounds; five choices, seven tutorials, tier variants, rewards, Copycat')
