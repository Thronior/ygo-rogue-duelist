import sys,tempfile,copy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage,collector
original=storage.ROOT
try:
 with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]/'temp') as directory:
  storage.ROOT=Path(directory)
  storage.write(storage.run_path(2),{'character':37,'pool':[1],'stage':'shop'})
  try:collector.dispatch('import',{'source':2,'slot':1,'name':'Copycat'})
  except ValueError as e:assert 'Copycat' in str(e)
  else:raise AssertionError('Copycat accepted')
  assert storage.read(storage.run_path(2))['character']==37
  active={'character':0,'pool':[1,2,3],'stage':'duel','duel':{'id':'unfinished'}}
  storage.write(storage.run_path(1),active)
  before=collector.load()
  try:collector.dispatch('import',{'source':1,'slot':1,'name':'Blocked'})
  except ValueError as e:assert str(e)=='finish your duel to import this collector'
  else:raise AssertionError('Unfinished duel imported')
  assert storage.read(storage.run_path(1))==active
  assert collector.load()==before
  run={'character':0,'pool':[1,2,3],'stage':'shop'}
  storage.write(storage.run_path(1),run)
  data=collector.dispatch('import',{'source':1,'slot':9,'name':'Test'})
  assert storage.read(storage.run_path(1)) is None
  assert storage.read(storage.run_path(1).with_suffix('.bak')) is None
  assert data['duelists'][0]['slot']==9
  d=data['duelists'][0]
  collector.dispatch('sync',{'id':d['id'],'record':{'id':d['id'],'status':'eliminated','pool':[],'deck':{}}})
  for path in [storage.ROOT/'collector.json',storage.ROOT/'collector.bak']:
   assert 'pool' not in storage.read(path)['duelists'][0]
  # Interrupted move recovery must not erase a replacement solo run.
  storage.write(storage.run_path(1),{'character':1,'pool':[4],'stage':'shop'})
  data=collector.load();data['pending_move']={'slot':1,'run':run};collector.save(data);collector.load()
  assert storage.read(storage.run_path(1))['character']==1
 print('Collector move, backup elimination and interrupted-move recovery passed.')
finally:storage.ROOT=original
