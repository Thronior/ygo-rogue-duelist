import json, sys, tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from multiplayer.signaling import Signaling
now=[100000.0]
with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[1]/'temp',prefix='tag-signaling-') as folder:
 path=Path(folder)/'rooms.json'
 s=Signaling(clock=lambda:now[0],state_path=path)
 h=s.request('create',{});code=h['code'];g=s.request('join',{'code':code})
 try:s.request('started',{'code':code},g['token']);raise AssertionError('guest marked the room started')
 except PermissionError:pass
 s.request('started',{'code':code},h['token'])
 s.request('signal',{'code':code,'generation':0,'message':{'type':'offer','sdp':'private-address'}},h['token'])
 assert 'private-address' not in path.read_text()
 try:s.request('join',{'code':code,'resumeToken':'wrong'});raise AssertionError('seat stolen')
 except PermissionError:pass
 restored=Signaling(clock=lambda:now[0],state_path=path)
 assert restored.rooms[code]['tokens']==[h['token'],g['token']]
 resumed=restored.request('join',{'code':code,'resumeToken':g['token']})
 assert resumed['seat']==1 and resumed['resumed'] and resumed['generation']==2 and resumed['started']
 restored.request('signal',{'code':code,'generation':2,'message':{'type':'offer','sdp':'new'}},h['token'])
 # A stale poll cursor from before restart cannot consume the fresh offer.
 stale=restored.request('poll',{'code':code,'generation':0,'after':999},g['token'])
 fresh=restored.request('poll',{'code':code,'generation':2,'after':0},g['token'])
 assert stale['messages']==fresh['messages'] and fresh['messages'][0]['message']['sdp']=='new'
 try:restored.request('signal',{'code':code,'generation':0,'message':{'type':'answer','sdp':'old'}},g['token']);raise AssertionError('stale generation accepted')
 except ValueError:pass
 for seat,token in enumerate((h['token'],g['token'])):
  result=restored.request('join',{'code':code,'resumeToken':token});assert result['seat']==seat
 # No forfeit timer; only discovery records expire after 24h of total inactivity.
 now[0]+=86401
 try:restored.request('join',{'code':code,'resumeToken':h['token']});raise AssertionError('expired code accepted')
 except ValueError:pass
print('PASS room recovery: persisted seats, same code after service restart, no stored SDP, stale signal protection, unclaimed-device rejection, inactive room expiry')
