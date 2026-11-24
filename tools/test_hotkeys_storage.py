"""Settings > Hotkeys (2026-11-24): storage.settings() keeps the saved hotkeys ({action id: [key, key]}) through a
reload, and drops or empties anything of the wrong shape, so a bad settings.json can't grow without bound."""
import sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage
h=storage.hotkeys_setting
assert h(None)=={} and h([])=={} and h('x')=={}
assert h({'duel.battle':['v',''],'back':['Escape','k']})=={'duel.battle':['v',''],'back':['Escape','k']}
assert h({'duel.log':['l']})=={'duel.log':['l','']},'short rows are padded'
assert h({'duel.log':['l','m','n']})=={'duel.log':['l','m']},'at most two keys'
assert h({'duel.log':[5,None]})=={'duel.log':['','']},'non-strings become empty slots'
assert h({'duel.log':['bad key','\x00','x'*25]})=={'duel.log':['','']},'spaces, control characters and long names are dropped'
assert h({'Bad Id':['k'],'x'*33:['k'],'duel.log':'l'})=={},'bad ids and rows that are not lists are dropped'
assert h({'choice-1':['é','ArrowLeft']})=={'choice-1':['é','ArrowLeft']},'any printable key name is kept'
assert len(h({f'a{i}':['k'] for i in range(500)}))==64,'at most 64 actions'
original=storage.ROOT
try:
 with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]/'temp') as directory:
  storage.ROOT=Path(directory)
  assert storage.settings()['hotkeys']=={}
  storage.write(storage.ROOT/'settings.json',{'music':50,'hotkeys':{'duel.battle':['v',''],'made up!':['x']}})
  s=storage.settings()
  assert s['hotkeys']=={'duel.battle':['v','']},s['hotkeys']
  assert s['music']==50
  # A save of the returned settings round-trips unchanged (what the client sends back on the next change).
  storage.write(storage.ROOT/'settings.json',s)
  assert storage.settings()['hotkeys']==s['hotkeys']
finally:storage.ROOT=original
print('PASS hotkeys setting storage and validation')
