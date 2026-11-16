"""Draft Duels' Random Pack (user, 2026-11-16) and the Ultimate Collector ban on randomized cards.
Draft boosters are built from a Worker seed on each device: the same seed must give the same cards, ids inside the
booster's block (collector-rules.js randomBlock), and nothing may leak into the run's own randomized cards."""
import sys,json,uuid,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT/'android'))
import campaign as g,storage,content,random_cards,collector
base=ROOT/'temp'/('draft-random-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'

seeds=[[11,22,4294967295],[33]]
a=random_cards.draft_cards({'players':seeds});b=random_cards.draft_cards({'players':json.loads(json.dumps(seeds))})
assert json.dumps(a,sort_keys=True)==json.dumps(b,sort_keys=True),'same seeds, same cards'
assert [len(x) for x in a['boosters']]==[3,1] and all(len(ids)==9 for seat in a['boosters'] for ids in seat)
for seat,boosters in enumerate(a['boosters']):
 for k,ids in enumerate(boosters):
  first=random_cards.DRAFT_FIRST+seat*random_cards.DRAFT_SEAT+k*random_cards.DRAFT_BLOCK
  assert all(first<=i<first+random_cards.DRAFT_BLOCK for i in ids),(seat,k,ids)
ids=[c['card']['id'] for c in a['cards']];assert len(ids)==len(set(ids))==36
assert all(random_cards.is_random(i) for i in ids) and all(c['script'] and c['card']['randomized'] for c in a['cards'])
assert not random_cards._cards,'draft cards never join the run store'
# Different seeds give different boosters.
names=lambda r:[c['card']['name'] for c in r['cards'][:9]]
assert names(a)!=names(random_cards.draft_cards({'players':[[12]]}))

# Ultimate Collector: a run's randomized cards stay behind; a Randomizer run cannot enter.
p=storage.profile();p['unlocked']=content.PLAYABLE_IDS;p['variants_unlocked']=True;storage.write(base/'profile.json',p)
plain=next(i for i in content.PLAYABLE_IDS if not content.CHARACTERS[i].get('copycat') and not content.CHARACTERS[i].get('engine_deck'))
run=g.new_run(plain,random.Random(3));run['stage']='shop';run['gold']=999
run['shop'].append(dict(kind='pack',id=random_cards.RANDOM_PACK,price=35,sold=False,opponent_pack=False))
got=g.buy(run,len(run['shop'])-1,random.Random(4));assert len(got)==9 and all(random_cards.is_random(c) for c in run['pool'][-9:])
storage.write(storage.run_path(1),run)
data=collector.dispatch('import',{'source':1,'slot':1,'name':'Tester'})
pool=data['duelists'][0]['pool'];assert pool and not any(random_cards.is_random(c) for c in pool)
assert len(pool)==len(run['pool'])-9
hat=g.new_run(37,random.Random(5),variant=1);storage.write(storage.run_path(2),hat)
try:collector.dispatch('import',{'source':2,'slot':2,'name':'Hat'});raise AssertionError('Randomizer run imported')
except ValueError as e:assert 'Copycat' in str(e) or 'Randomizer' in str(e),e
print('PASS: draft Random Pack boosters are seeded and blocked per seat; Ultimate Collector drops randomized cards')
