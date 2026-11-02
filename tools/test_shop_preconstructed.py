"""Every starter and structure deck can be offered in the shop, and none repeat another's card list."""
import sys,json,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as g
decks=json.loads((g.ROOT/'data/preconstructed.json').read_text(encoding='utf8'))['decks']
assert len({tuple(sorted(d['cards'])) for d in decks})==len(decks)
assert not [d for d in decks if '(OCG)' in d['name']]
r=g.new_run(0,random.Random(4));g.auto_deck(r);r.update(stage='shop',gold=1000,gold_leaving_shop=10000)
seen={}
for seed in range(1500):
 g.restock(r,random.Random(seed))
 for x in r['shop']:
  if x['kind']=='deck':seen[x['id']]=seen.get(x['id'],0)+1
assert set(seen)=={d['id'] for d in decks},sorted({d['id'] for d in decks}-set(seen))
print('PASS',len(decks),'unique decks all appear in the shop; lowest',min(seen.values()),'highest',max(seen.values()),'of',sum(seen.values()),'offers')
