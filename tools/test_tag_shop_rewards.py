import sys, random, json
from pathlib import Path
from copy import deepcopy
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import shop_rewards as rewards, campaign as game, storage, content
from tag_campaign import TagCampaign

def check(top,keys):
 assert len(top)==5
 assert all(rewards.matches(c,keys[0]) for c in top[:3])
 assert all(rewards.matches(c,keys[1]) for c in top[3:])

for keys in [('destruction','jar'),('jar','destruction'),('DARK','DARK'),('Spellcaster','darkmagician')]:
 for seed in range(100):
  top=rewards.tag_featured(game.CARDS,[{'key':k} for k in keys],random.Random(seed))
  check(top,keys);assert len({c['id'] for c in top})==5
small=[c for c in game.CARDS if rewards.matches(c,'jar')][:1]
check(rewards.tag_featured(small,[{'key':'jar'}]*2,random.Random(1)),['jar']*2)
assert not set(rewards.RETIRED_THEMES)&set(rewards.LABELS)
assert all(not set(options)&set(rewards.RETIRED_THEMES) for options in rewards.THEME_OPTIONS.values())
old={'route_rewards':{'2':{'key':'sword','label':'Sword cards','pack':'EN-LOB'}},'bias':'shield'}
rewards.normalize_run(old);assert old['bias']=='stall' and old['route_rewards']['2']['key']=='equip'
profile=storage.profile();profile['unlocked']=list(range(len(content.CHARACTERS)))
s=TagCampaign([0,1],[profile,profile],seed=723,lobby=True)
for seat,r in enumerate(s.players):
 r['opponent']=2+seat;r['duel']={'id':str(seat)}
 r['route_rewards'][str(2+seat)]={'key':['destruction','jar'][seat],'label':'test','pack':'EN-LOB'}
s.phase='duel';s.duel={'mode':'tag'}
def complete(run,result,rng):
 # Simulate route replacement during completion and a delayed boss shop.
 run.update(stage='shop',last_rewards=[],last_gold=0,shop=[],route_rewards={})
with patch.object(game,'finish_duel',complete):s.finish(0,6000,[])
s=TagCampaign.restore(json.loads(json.dumps(s.checkpoint())))
for seat in (0,1):
 r=s.players[seat]
 assert [x['key'] for x in r['tag_shop_rewards']]==['destruction','jar']
 r.update(artifacts=['legendary_shackles'],shackles_shop_visits=2)
 with s.scope(seat):game.restock(r,random.Random(55+seat))
 check([game.BY_ID[x['id']] for x in r['shop'][:5]],['destruction','jar'])
 assert len(r['shop'][:10])==10
# Single-player generation still works without a split.
r=deepcopy(s.players[0]);r['history_mode']='single';r.pop('tag_shop_rewards')
with s.scope(0):game.restock(r,random.Random(99))
assert len(r['shop'][:10])==10
print('PASS: 400 category-pair seeds, narrow pools, retired themes, tag finish snapshot, checkpoint/delayed boss restock, relic guarantee, and single-player stock')

