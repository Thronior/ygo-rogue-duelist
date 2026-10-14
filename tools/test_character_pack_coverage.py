"""New character-pack additions remain obtainable and isolated to their intended packs."""
import sys,json,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import campaign as g,content
from pack_odds import inspect_pack
assignments=json.loads((g.ROOT/'data/character-pack-coverage-additions.json').read_text(encoding='utf8'))
count=0
for owner,groups in assignments.items():
 pack=next(p for p in content.PACKS if p['name']==owner and p.get('draft_only'))
 assert not set(pack['common'])&set(pack['rare'])
 odds={r['id']:r for r in inspect_pack(pack['id'],{})}
 for pool,names in groups.items():
  for name in names:
   cid=g.BY_NAME[name]['id'];assert cid in pack[pool]
   assert odds[cid]['chance']>0 and not odds[cid].get('locked'),(owner,name)
   count+=1
 rng=random.Random(84)
 for _ in range(100):
  pulled=g.open_pack(pack['id'],rng)
  assert len(pulled)==9 and len({g.card_identity(cid) for cid in pulled})==9
print('PASS',count,'new cards have positive pull odds; 1,200 legal nine-card character packs')
