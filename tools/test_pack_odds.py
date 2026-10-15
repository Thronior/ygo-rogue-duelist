import sys,random,time,json,tempfile
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,content,storage,shop_rewards as s,pack_odds,passives
storage.ROOT=Path(tempfile.mkdtemp(dir=ROOT/'temp',prefix='reward-audit-'));g.SAVE=storage.ROOT/'run.json'
profile=storage.profile()
assert content.ARTIFACTS['shell'][0]=='Shell Spikes'
lua=passives.script({'character':0,'artifacts':['shell'],'round':0,'curses':[]},telemetry=False)
assert 'RACE_AQUA|RACE_FISH' in lua and 'SetValue(300)' in lua
for key,names in [('draw',['Good Goblin Housekeeping','Dark Mimic LV1']),('heal',['Spell Absorption','Draining Shield']),('summon',['Summoner Monk','Machine Duplication']),('fusion',['Re-Fusion','King of the Swamp']),('negation',['Horus the Black Flame Dragon LV8'])]:
 assert all(s.matches(g.BY_NAME[n],key) for n in names)
for key,names in [('heal',['Des Dendle','Fire Princess']),('draw',['Sasuke Samurai','White Magical Hat']),('pierce',['Axe of Despair']),('counter',['Cure Mermaid'])]:assert all(not s.matches(g.BY_NAME[n],key) for n in names)
assert s.BACKROW_REMOVAL <= g.BY_NAME.keys()
for name in ['DRAW','BURN','HEAL','SEARCH','SUMMON','NEGATION','FUSION_SUPPORT']:
 missing=getattr(s,name)-g.BY_NAME.keys()
 print(name,'nonexistent legacy names',sorted(missing))
for pid in ['EN-LOB','DRAFT-YAMI-YUGI','WC4-24']:
 rows=pack_odds.inspect_pack(pid,profile);assert abs(sum(r['chance'] for r in rows)-9)<1e-7
 assert all(0<=r['chance']<=1+1e-9 for r in rows)
 # Compare the exact grouped result to the unchanged real pack generator.
 from collections import Counter
 counts=Counter();rng=random.Random(417)
 with patch('unlocks.available',return_value=True):
  for _ in range(2500):counts.update(g.card_identity(cid) for cid in g.open_pack(pid,rng))
 assert max(abs(counts[g.card_identity(r['id'])]/2500-r['chance']) for r in rows)<.045,pid
print('PASS: Shell Spikes core effects; category inclusions/exclusions; exact odds vs 7500 real generated packs')

