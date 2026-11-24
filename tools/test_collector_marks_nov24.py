"""Card marks in Ultimate Collector (CITYDRIVER, user 2026-11-24): an imported duelist keeps its run's ★/✕ marks, older
duelists start from the character's saved marks, and the deck editor's 'mark' action changes them locally only.
Runs in a temporary save folder; never touches saves/."""
import sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage,collector
original=storage.ROOT
(Path(__file__).resolve().parents[1]/'temp').mkdir(exist_ok=True)
try:
 with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]/'temp') as directory:
  storage.ROOT=Path(directory)
  storage.write(storage.run_path(1),{'character':0,'pool':[1,2,3],'stage':'shop','card_marks':{'2':1,'3':-1,'9':7}})
  data=collector.dispatch('import',{'source':1,'slot':1,'name':'Marks'})
  d=data['duelists'][0]
  assert d['card_marks']=={'2':1,'3':-1},d['card_marks']
  data=collector.dispatch('mark',{'id':d['id'],'card':1,'mark':1})
  assert data['duelists'][0]['card_marks']=={'2':1,'3':-1,'1':1}
  data=collector.dispatch('mark',{'id':d['id'],'card':[2,3],'mark':0})
  assert data['duelists'][0]['card_marks']=={'1':1}
  for bad in [{'card':1,'mark':2},{'card':'x','mark':1},{'card':True,'mark':1},{'card':[],'mark':1}]:
   try:collector.dispatch('mark',{'id':d['id'],**bad})
   except ValueError:pass
   else:raise AssertionError(f'accepted {bad}')
  # A server receipt never carries marks, so syncing keeps them.
  data=collector.dispatch('sync',{'id':d['id'],'record':{'id':d['id'],'status':'alive','wins':1,'pool':[1,2,3],'deck':{'main':[],'side':[],'extra':[]}}})
  assert data['duelists'][0]['card_marks']=={'1':1}
  # A duelist imported before marks existed starts from the character's saved marks.
  raw=collector.load();raw['duelists'][0].pop('card_marks');raw['duelists'][0]['character']=5;collector.save(raw)
  storage.write(storage.ROOT/'settings.json',{'characterSettings':{'5':{'marks':{'7':1}}}})
  assert collector.dispatch('list',{})['duelists'][0]['card_marks']=={'7':1}
  # Eliminated duelists lose their pool and are never seeded.
  collector.dispatch('sync',{'id':d['id'],'record':{'id':d['id'],'status':'eliminated','pool':[],'deck':{}}})
  try:collector.dispatch('mark',{'id':d['id'],'card':1,'mark':1})
  except ValueError:pass
  else:raise AssertionError('marked an eliminated duelist')
finally:
 storage.ROOT=original
print('PASS Collector card marks: import, mark, sync, character fallback')
