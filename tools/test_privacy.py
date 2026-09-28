"""Inspect the real native client's filtered model, not a mock renderer."""
import os,sys,json,time,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage
storage.ROOT=ROOT/'temp/privacy-profile';storage.ROOT.mkdir(exist_ok=True);g.SAVE=storage.ROOT/'run.json'
r=g.new_run(0);g.auto_deck(r);g.prepare_duel(r)
path=g.RUNTIME/'puzzles/shadow-run.lua'
path.write_text('''Debug.SetAIName("Privacy test")
Debug.ReloadFieldBegin(DUEL_MODE_MR1|DUEL_SIMPLE_AI,1)
Debug.SetPlayerInfo(0,8000,0,1)
Debug.SetPlayerInfo(1,8000,0,1)
Debug.AddCard(89631139,1,1,LOCATION_MZONE,0,POS_FACEUP_ATTACK)
Debug.AddCard(6368038,1,1,LOCATION_MZONE,1,POS_FACEDOWN_DEFENSE)
Debug.AddCard(44095762,1,1,LOCATION_SZONE,0,POS_FACEDOWN_DEFENSE)
Debug.AddCard(46986414,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)
Debug.AddCard(46986414,0,0,LOCATION_MZONE,0,POS_FACEDOWN_DEFENSE)
Debug.AddCard(46986414,0,0,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)
for i=1,20 do Debug.AddCard(40640057,0,0,LOCATION_DECK,0,POS_FACEDOWN_DEFENSE) Debug.AddCard(40640057,1,1,LOCATION_DECK,0,POS_FACEDOWN_DEFENSE) end
Debug.ReloadFieldEnd()
''',encoding='utf8')
audit=g.RUNTIME/'privacy-audit.json';audit.unlink(missing_ok=True)
env=os.environ.copy();env['SHADOW_RUN_PRIVACY_AUDIT']='1'
with (ROOT/'temp/privacy-client.log').open('w') as log:
 p=subprocess.Popen([str(g.RUNTIME/'ShadowDuel.exe')],cwd=g.RUNTIME,env=env,stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+40
  while time.monotonic()<deadline:
   try:
    a=json.loads(audit.read_text())
    if len(a['opponent_monsters'])==2 and len(a['opponent_hand'])==1 and a['player_hand'] and all(c['code'] for c in a['player_hand']) and a['player_monsters'][0]['code'] and any(c['code'] for c in a['opponent_monsters']):
     assert all(c['code']==0 for c in a['opponent_hand']),a
     assert all(c['code']==0 for c in a['opponent_spells']),a
     faceup=[c for c in a['opponent_monsters'] if c['position']&5]
     hidden=[c for c in a['opponent_monsters'] if c['position']&10]
     assert faceup and all(c['code']==89631139 for c in faceup),a
     assert hidden and all(c['code']==0 for c in hidden),a
     assert a['player_monsters'][0]['code']==46986414,a
     assert all(c['code']!=0 for c in a['player_hand']),a
     print('PASS: native opponent hand/set monster/set trap hidden; face-up opponent monster and own cards remain inspectable');break
   except (OSError,ValueError):pass
   if p.poll() is not None:raise RuntimeError('Native client exited; see privacy-client.log')
   time.sleep(.1)
  else:raise TimeoutError('No populated privacy audit')
 finally:
  if p.poll() is None:p.terminate();p.wait(timeout=5)
  for name in ['campaign-request.json','campaign-result.json','privacy-audit.json']:(g.RUNTIME/name).unlink(missing_ok=True)
  path.unlink(missing_ok=True)
