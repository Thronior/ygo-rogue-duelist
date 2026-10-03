import sys,tempfile,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import storage,progress_sync,achievement_model
with tempfile.TemporaryDirectory() as t:
 storage.ROOT=Path(t)
 p={'unlocked':[0,1,2],'wins':7,'runs':12,'won_as':[],'run_history':[{'id':'keep'}],'character_levels':{'0':3},'gallery_unlocked':True}
 storage.write(storage.ROOT/'profile.json',p)
 for name in ['run.json','collector.json']:(storage.ROOT/name).write_text('untouched')
 result=progress_sync.merge({'characters':[3],'achievements':['character:3'],'levels':{'0':1,'1':5},'flags':['cpu_viewer_unlocked','relicless_unlocked'],'wins':999,'run_history':[]})
 merged=storage.profile()
 assert merged['wins']==7 and merged['runs']==12 and merged['run_history']==p['run_history']
 assert merged['character_levels']=={'0':3,'1':5}
 assert all(merged[k] for k in progress_sync.FLAGS)
 assert next(x for x in achievement_model.entries(merged) if x['id']=='character:3')['done']
 assert all((storage.ROOT/n).read_text()=='untouched' for n in ['run.json','collector.json'])
 assert set(result)=={'characters','achievements','levels','flags'}
 progress_sync.dispatch('link',{'group':'test','token':'secret'});progress_sync.dispatch('unlink',None)
 assert storage.profile()['unlocked']==merged['unlocked']
 print('PASS local merge keeps stats, runs and Collector saves, syncs achievements/levels/secrets, disconnect retains unlocks')
