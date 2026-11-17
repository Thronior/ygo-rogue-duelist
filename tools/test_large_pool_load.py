"""Large card pools load (Discord, Nori, 2026-11-17): a loop-8 run with 10,004 cards saved fine, then was refused with
"This slot has no valid saved run." because the loader capped the pool at 10,000."""
import sys,random,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage,content as c
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='large-pool-'));g.SAVE=storage.ROOT/'run.json'
r=g.new_run(1,random.Random(1));g.auto_deck(r);r.update(stage='shop',_save_slot=1)
filler=[cid for cid in r['pool']][:50] or [g.CARDS[0]['id']]
def with_pool(size):
 pool=list(r['pool'])
 while len(pool)<size:pool.append(filler[len(pool)%len(filler)])
 return dict(r,pool=pool)
# Nori's size, and a much larger pool, both load with their deck selection intact.
for size in (10_004,60_000):
 storage.write(storage.run_path(1),with_pool(size))
 loaded=g.load_run(1)
 assert loaded and len(loaded['pool'])==size and loaded['selected']==r['selected'],(size,loaded and len(loaded['pool']))
# The sanity limit still refuses an absurd pool.
storage.write(storage.run_path(1),with_pool(c.MAX_POOL+1));storage.run_path(1).with_suffix('.bak').unlink(missing_ok=True)
assert g.load_run(1) is None
print(f'PASS large pools: 10,004 and 60,000 cards load; over {c.MAX_POOL:,} is still refused')
