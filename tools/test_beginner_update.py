import sys,json,uuid,random,subprocess
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content,encounters,passives
base=ROOT/'temp'/('beginners-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=content.PLAYABLE_IDS;storage.write(base/'profile.json',p)
seen=set()
for seed in range(25):
 r=g.new_run(37,random.Random(seed));v=r['tutorial_variants'][str(r['opponent'])];seen.add(v)
 enemy=g.opponent_deck(0,opponent=r['opponent'],tutorial_variant=v)
 assert Counter(g.deck(r))==Counter(enemy+[g.BY_NAME['Copycat']['id']])
 assert r['artifacts']==['echo_glass'] and g.validate(r) is None
assert len(seen)==7
for i in range(7):
 deck=g.opponent_deck(0,tutorial_variant=i);monsters=[g.BY_ID[c] for c in deck if g.BY_ID[c]['data']['type']&1]
 assert 1000<=max(c['atk'] for c in monsters)<=1100 and max(c['atk'] for c in monsters)>max(c['defense'] for c in monsters)
 assert any(g.BY_ID[c]['data']['type']&2 for c in deck) and any(g.BY_ID[c]['data']['type']&4 for c in deck)
 assert len(deck)==23 and max(Counter(deck).values())<=3
for i in encounters.EARLY_IDS:
 deck=g.opponent_deck(1,opponent=i);assert 20<=len(deck)<=60
 assert max(Counter(deck).values())<=3
 assert all(c in g.BY_ID for c in deck)
for i in content.PLAYABLE_IDS:
 r=g.new_run(i,random.Random(i))
 if content.CHARACTERS[i].get('engine_deck'):assert r['artifacts']==[]
 else:assert len(r['artifacts'])==1 and r['artifacts'][0] in content.ARTIFACTS
assert len({g.new_run(36,random.Random(i))['artifacts'][0] for i in range(15)})>5
print('PASS: fixed round-zero and early decks, exact Copycat mirror, all starting relics')
