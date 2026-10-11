import sys,json,tempfile,copy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT),str(ROOT/'android')]
import mobile_backend as b,storage,campaign as g
base=Path(tempfile.mkdtemp(prefix='phase-save-',dir=ROOT/'temp'));storage.ROOT=base;g.SAVE=base/'run.json';g.RUNTIME=base/'runtime';g.RUNTIME.mkdir()
def call(action,value=None):return json.loads(b.dispatch(json.dumps(dict(action=action,value=value))))
call('new',dict(character=0,replace=True));call('auto')
writes=[];original=storage.write
storage.write=lambda p,v:(writes.append(Path(p).name),original(p,v))[1]
for action in ['active-curses']:
 before=(base/'run.json').read_bytes();writes.clear();r=call(action);assert r['persist'] is False and not writes and (base/'run.json').read_bytes()==before
writes.clear();r=call('settings',{'music':27,'sound':19});assert writes==['settings.json'] and r['settings']['music']==27
r=call('toggle',0);assert r['partial'] and 'profile' not in r and r['runPatch']['selected']==b.run['selected'];assert storage.read(base/'run.json')['selected']==b.run['selected']
b.run['mobile_duel']={'responses':[]};g.save(b.run);before=(base/'run.json').read_bytes();writes.clear()
for i in range(6):
 r=call('response',{'response':{'type':1,'index':i},'checkpoint':False});assert r['persist'] is False
assert not writes and (base/'run.json').read_bytes()==before
r=call('response',{'response':{'type':1,'index':6},'checkpoint':True});assert r['persist'] is True and len(storage.read(base/'run.json')['mobile_duel']['responses'])==7
call('response',{'response':{'type':1,'index':7},'checkpoint':False});call('duel-checkpoint');assert len(storage.read(base/'run.json')['mobile_duel']['responses'])==8
print('PASS read-only zero writes, settings-only writes, selection delta/persistence, phase checkpoint includes all responses, explicit exact save')

from tag_campaign import TagCampaign
profile=storage.profile();b.tag_session=TagCampaign([0,1],[profile,profile],seed=7);b.tag_session.phase='duel';b.tag_session.duel={'responses':[]}
writes.clear();r=call('tag-journal',{'seat':None,'response':{'type':1},'checkpoint':False});assert not writes and r['persist'] is False
call('tag-journal',{'seat':None,'response':{'type':2},'checkpoint':True});assert writes==['tag-host.json'] and len(storage.read(base/'tag-host.json')['duel']['responses'])==2
writes.clear();call('tag-receipt',{'seat':0,'id':'missing'});assert not writes
print('PASS tag journal checkpoints and read-only receipt without unrelated solo saves')
