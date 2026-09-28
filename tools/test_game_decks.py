"""Play ten AI turns with every fixed opponent deck plus expert decks, using the native core."""
import sys,json,random,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g
from content import FIXED_OPPONENTS
from deck_files import read as read_ydk
records={}
for key,tiers in FIXED_OPPONENTS.items():
 for row in tiers:
  deck=read_ydk(row['deck'],{})
  records[f"{key}-tier-{row['tier']}"]=dict(name=f"{row['name']} tier {row['tier']}",main=deck['main'],extra=deck['extra'])
expert=json.loads((ROOT/'data/expert-opponents.json').read_text(encoding='utf8'))
for k,v in expert.items():records['expert-'+str(k)]=v
if '--expert' in sys.argv:records={k:v for k,v in records.items() if k.startswith('expert-')}
for key,record in records.items():
 for seed in range(3):
  deck=record['main'][:];random.Random(seed).shuffle(deck)
  assert all(c in g.BY_ID for c in deck+record['extra'])
  lines=['Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)','Debug.SetPlayerInfo(0,200000,0,1)','Debug.SetPlayerInfo(1,8000,5,1)']
  for who,cards,zone in [(0,[40640057]*60,'LOCATION_DECK'),(1,deck,'LOCATION_DECK'),(1,record['extra'],'LOCATION_EXTRA')]:
   lines += [f'Debug.AddCard({c},{who},{who},{zone},0,POS_FACEDOWN_DEFENSE)' for c in cards]
  lines+=['Debug.ReloadFieldEnd()']
  (ROOT/'temp/deck-fixture.lua').write_text('\n'.join(lines))
  log=ROOT/f'temp/deck-{key}-{seed}.log'
  with log.open('w') as out:
   result=subprocess.run([str(ROOT/'runtime/core_check.exe'),'decks'],cwd=ROOT/'runtime',stdout=out,stderr=out,timeout=30)
  if result.returncode:raise AssertionError(f"{record['name']} seed {seed}: {log.read_text()[-2000:]}")
 print('PASS',record['name'],len(deck),'main /',len(record['extra']),'extra')
print('PASS:',len(records)*3,'native-core deck simulations, no AI prompts leaked or Lua errors')
