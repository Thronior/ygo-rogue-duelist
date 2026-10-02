"""Shared rarity weighting; ordinary Rare/Common relative weights stay unchanged."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
ULTRA=set(json.loads((ROOT/'data/champion-ultra.json').read_text(encoding='utf8'))['cards'])
ULTRA.update(int(cid) for cid,limit in json.loads((ROOT/'data/collector-banlist.json').read_text(encoding='utf8'))['limits'].items() if limit==1)
ULTRA_WEIGHT=0.65
def weight(cid):return ULTRA_WEIGHT if cid in ULTRA else 1.0
def choose(pool,rng):return rng.choices(pool,weights=[weight(cid) for cid in pool],k=1)[0]
def sample(pool,count,rng):
 remaining=list(pool);out=[]
 for _ in range(min(count,len(remaining))):
  cid=choose(remaining,rng);out.append(cid);remaining.remove(cid)
 return out
