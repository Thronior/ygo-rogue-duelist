"""Regression checks for playable boosters, Copycat and earned reward notifications."""
import sys,random,uuid
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,shop_rewards
from content import *
base=ROOT/'temp'/('latest-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
p=storage.profile();p['unlocked']=PLAYABLE_IDS;storage.write(base/'profile.json',p)
for pack in PACKS:
 for seed in range(30):
  cards=g.open_pack(pack['id'],random.Random(seed))
  assert len(cards)==9 and sum(g.normal_starter(cid) for cid in cards)>=3,pack['id']
for i in PLAYABLE_IDS:
 for seed in range(8):
  r=g.new_run(i,random.Random(seed));g.auto_deck(r);assert g.validate(r) is None
  if not CHARACTERS[i].get('copycat'):assert sum(min(3,n) for cid,n in Counter(r['pool']).items() if g.normal_starter(cid))>=9
weak=g.opponent_deck(0);monsters=[g.BY_ID[c] for c in weak if g.BY_ID[c]['data']['type']&1]
assert max(c['atk'] for c in monsters)>max(c['defense'] for c in monsters)
signature=g.BY_NAME['Copycat']['id']
for rd in [0,1,3,6]:
 r=g.new_run(37);r['round']=rd;g.routes(r);g.copy_deck(r)
 expected=Counter(g.opponent_deck(rd,opponent=r['opponent'],tutorial_variant=r.get('tutorial_variants',{}).get(str(r['opponent']),0)));expected[signature]+=1
 assert Counter(cid for cid in g.deck(r) if not g.is_extra(cid))==expected
 assert r['guaranteed']==[signature] and g.validate(r) is None
 r['stage']='shop';r['gold']=999;g.restock(r);single=next(i for i,x in enumerate(r['shop']) if x['kind']=='single')
 try:g.buy(r,single);raise AssertionError('Copycat bought a card')
 except ValueError:pass
 assert r['gold']==999
for rd in range(9):
 r=g.new_run(0);r['round']=rd;g.routes(r)
 for i in r['routes']:
  deck=g.opponent_deck(rd,opponent=i,tutorial_variant=r.get('tutorial_variants',{}).get(str(i),0));reward=r['route_rewards'][str(i)]
  # Theme rewards are intentionally random within the opponent's theme
  # list, even when the picked theme is absent from the actual deck.
  assert reward['key'] in (shop_rewards.THEME_OPTIONS.get(i) or [reward['key']])
  def overlap(p):return sum(cid in set(p['common']+p['rare']) for cid in deck)
  assert overlap(PACK_BY_ID[reward['pack']])==max(map(overlap,PACKS))
  if rd==1:
   low=[g.BY_ID[c] for c in deck if g.normal_starter(c)]
   # Bound covers the strongest fixed duel-2 starters (Kaiba 1308); decks are data, do not retune here.
   assert sum(c['atk'] for c in low)/len(low)<1350
r=g.new_run(0);r['gold']=201;g.update_profile(r)
notices=storage.profile()['achievement_notices'];assert any(x['id']=='character:2' for x in notices)
g.update_profile(r);assert storage.profile()['achievement_notices']==notices
print('PASS: all 36 boosters supply starters; every draft playable; tutorial breakable; Copycat signature and shop restrictions; random theme rewards; gentler early decks; exactly-once achievement notices')
