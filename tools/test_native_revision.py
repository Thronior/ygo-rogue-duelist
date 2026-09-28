"""Real-client smoke test for pinned scripts, token cards and duel score metrics."""
import sys,uuid,subprocess,time,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import campaign as g,storage
base=ROOT/'temp'/('native-revision-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
paths=[g.RUNTIME/'puzzles/shadow-run.lua',g.RUNTIME/'campaign-request.json',g.RUNTIME/'campaign-result.json'];backups={p:p.read_bytes() if p.exists() else None for p in paths}
logpath=g.RUNTIME/'error.log';offset=logpath.stat().st_size if logpath.exists() else 0
proc=None
try:
 r=g.new_run(0);g.auto_deck(r);r['round']=6;g.routes(r);r['opponent']=r['routes'][0];g.prepare_duel(r)
 lua=paths[0].read_text(encoding='utf8')
 # Force Cyber Jar to initialize, and all four Scapegoat variants to enter the model.
 lua=lua.replace('Debug.ReloadFieldEnd()',"Debug.AddCard(34124316,1,1,LOCATION_HAND,0,POS_FACEDOWN_DEFENSE)\nlocal champion=Debug.AddCard(89631139,0,0,LOCATION_MZONE,0,POS_FACEUP_ATTACK)\nfor i=1,4 do Debug.AddCard(73915051+i,0,0,LOCATION_MZONE,i,POS_FACEUP_DEFENSE) end\nDebug.ReloadFieldEnd()")
 lua+="""
local boost=Effect.GlobalEffect()
boost:SetType(EFFECT_TYPE_FIELD) boost:SetCode(EFFECT_UPDATE_ATTACK)
boost:SetTargetRange(LOCATION_MZONE,0) boost:SetValue(300) Duel.RegisterEffect(boost,0)
local test=Effect.GlobalEffect()
test:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) test:SetCode(EVENT_PREDRAW) test:SetCountLimit(1)
test:SetOperation(function() Duel.Recover(0,500,REASON_EFFECT) Duel.Damage(1,2600,REASON_EFFECT) Duel.Win(0,0x10) end)
Duel.RegisterEffect(test,0)
"""
 paths[0].write_text(lua,encoding='utf8')
 with (base/'client.log').open('w') as log:
  proc=subprocess.Popen([str(g.RUNTIME/'ShadowDuel.exe')],cwd=g.RUNTIME,stdout=log,stderr=log)
  deadline=time.monotonic()+45
  while time.monotonic()<deadline:
   if paths[2].exists():
    result=json.loads(paths[2].read_text());assert result['id']==r['duel']['id'];assert result['winner']==0
    metrics=next(e for e in result['events'] if e['kind']=='duel_metrics')
    assert metrics['peak_attack']>=3300 and metrics['peak_field']==5,metrics
    assert any(e['kind']=='damage' and e['amount']==2600 for e in result['events'])
    assert any(e['kind']=='recover' and e['amount']==500 for e in result['events'])
    proc.wait(timeout=12);break
   if proc.poll() is not None:raise AssertionError('Native duel exited without a result')
   time.sleep(.1)
  else:raise AssertionError('Native duel did not return')
 newlog=logpath.read_bytes()[offset:].decode('utf8',errors='replace') if logpath.exists() else ''
 assert '[Script Error]' not in newlog,newlog
 print('PASS: real Yugi client loads Cyber Jar without errors, all four tokens, 3300 ATK / five-monster peak and 2600 damage metrics')
finally:
 if proc and proc.poll() is None:proc.terminate();proc.wait(timeout=5)
 for p,data in backups.items():
  if data is None:p.unlink(missing_ok=True)
  else:p.write_bytes(data)
