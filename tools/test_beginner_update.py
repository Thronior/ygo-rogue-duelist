import sys,json,uuid,random,subprocess
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content,encounters,passives
base=ROOT/'temp'/('beginners-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
p=storage.profile();p['unlocked']=content.PLAYABLE_IDS;storage.write(base/'profile.json',p)
seen=set()
plain=next(i for i in content.PLAYABLE_IDS if i not in content.TUTORIAL_OPPONENTS and not content.CHARACTERS[i].get('copycat') and not content.CHARACTERS[i].get('engine_deck'))
for seed in range(25):
 r=g.new_run(plain,random.Random(seed));seen.update(r['tutorial_variants'].values())
 assert set(r['routes'])<=set(content.TUTORIAL_OPPONENTS)
assert len(seen)==7
# Solo Copycat skips the tutorial decks: its first duel copies a Tier 1 deck, Extra Deck included (user, 2026-11-07).
signature=g.BY_NAME['Copycat']['id'];extras=0
for seed in range(25):
 r=g.new_run(37,random.Random(seed))
 assert 'tutorial_variants' not in r and all(i in content.eligible_opponents(1) for i in r['routes'])
 record=content.opponent_record(1,r['opponent']);main,extra=g.legal_fixed_cards(record['main']+[signature],record['extra']);extras+=bool(extra)
 assert Counter(g.deck(r))==Counter(main+extra)
 assert r['artifacts']==['echo_glass'] and g.validate(r) is None
assert extras
for i in range(7):
 deck=g.opponent_deck(0,tutorial_variant=i);monsters=[g.BY_ID[c] for c in deck if g.BY_ID[c]['data']['type']&1]
 assert 1000<=max(c['atk'] for c in monsters)<=1100 and max(c['atk'] for c in monsters)>max(c['defense'] for c in monsters)
 assert any(g.BY_ID[c]['data']['type']&2 for c in deck) and any(g.BY_ID[c]['data']['type']&4 for c in deck)
 # Tutorial .ydk decks were rebalanced from 23 to 40 cards in 0.1.33 (enemy deck balancing).
 assert len(deck)==40 and max(Counter(deck).values())<=3
for i in encounters.EARLY_IDS:
 deck=g.opponent_deck(1,opponent=i);assert 20<=len(deck)<=60
 assert max(Counter(deck).values())<=3
 assert all(c in g.BY_ID for c in deck)
for i in content.PLAYABLE_IDS:
 r=g.new_run(i,random.Random(i))
 if content.CHARACTERS[i].get('engine_deck'):assert r['artifacts']==[]
 else:assert len(r['artifacts'])==1 and r['artifacts'][0] in content.ARTIFACTS
# Ryou Bakura's standard start is the Blank Relic (data/character-progression.json); the random relic
# moved to his alternate variant, Fortune's Favorite, which draws a random archetype relic.
assert {g.new_run(36,random.Random(i))['artifacts'][0] for i in range(5)}=={'blank_relic'}
p=storage.profile();p['character_levels']={'36':99};storage.write(base/'profile.json',p)
assert len({g.new_run(36,random.Random(i),variant=1)['artifacts'][0] for i in range(15)})>5
print('PASS: fixed round-zero and early decks, Copycat opens on an exact Tier 1 mirror, all starting relics')
