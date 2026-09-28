import sys,json,random,subprocess
from pathlib import Path
sys.path.insert(0,str(Path.cwd()))
import content,endless
from deck_files import read as read_ydk
records=[]
for tiers in content.FIXED_OPPONENTS.values():
 for row in tiers:
  deck=read_ydk(row['deck'],{})
  records.append(dict(name=f"{row['name']} tier {row['tier']}",main=deck['main'],extra=deck['extra']))
records.append(endless.CHAMPION)
fixture=Path('temp/deck-fixture.lua');backup=fixture.read_bytes() if fixture.exists() else None
try:
 for record in records:
  deck=record['main'][:];random.Random(42).shuffle(deck)
  lines=['Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)','Debug.SetPlayerInfo(0,200000,0,1)','Debug.SetPlayerInfo(1,8000,5,1)']
  for who,cards,zone in [(0,[40640057]*60,'LOCATION_DECK'),(1,deck,'LOCATION_DECK'),(1,record['extra'],'LOCATION_EXTRA')]:
   lines += [f'Debug.AddCard({c},{who},{who},{zone},0,POS_FACEDOWN_DEFENSE)' for c in cards]
  lines+=['Debug.ReloadFieldEnd()'];fixture.write_text('\n'.join(lines),encoding='utf8')
  r=subprocess.run([str(Path('runtime/core_check.exe').resolve()),'decks'],cwd='runtime',capture_output=True,text=True,timeout=30)
  if r.returncode:raise AssertionError((record['name'],r.stdout[-2000:],r.stderr))
 print('PASS fixed tier decks and championship deck through the real native core')
finally:
 if backup is None:fixture.unlink(missing_ok=True)
 else:fixture.write_bytes(backup)
