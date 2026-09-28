import sys, json, subprocess, time, random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT))
import campaign as g
import storage
storage.ROOT=ROOT/'temp/native-profile';storage.ROOT.mkdir(exist_ok=True)
g.SAVE=ROOT/'temp/native-check-run.json'
run=g.new_run(0,random.Random(100)); g.auto_deck(run)
boss='boss' in sys.argv
if boss:run['round']=2;g.routes(run);run['boss_curse']='tax'
g.prepare_duel(run)
path=g.RUNTIME/'puzzles/shadow-run.lua'
original=path.read_text()
path.write_text(original+'''
local e=Effect.GlobalEffect()
e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)
e:SetCode(EVENT_PREDRAW)
e:SetOperation(function() Duel.SetLP(0,4321) Duel.Win(0,0x10) end)
Duel.RegisterEffect(e,0)
''')
with open(ROOT/'temp/native-launch.log','w') as log:
    proc=subprocess.Popen([str(g.RUNTIME/'ShadowDuel.exe')],cwd=g.RUNTIME,stdout=log,stderr=log)
    try:
        deadline=time.monotonic()+40
        while time.monotonic()<deadline:
            if (g.RUNTIME/'campaign-result.json').exists():
                result=json.loads((g.RUNTIME/'campaign-result.json').read_text())
                assert result['id']==run['duel']['id'],result
                assert result['winner']==0 and result['lp']==4321,result
                g.finish_duel(run,result)
                assert run['stage']=='shop' and run['round']==(3 if boss else 1) and run['lp']==(6321 if boss else 4321)
                assert not run['curses']
                try:proc.wait(timeout=10)
                except subprocess.TimeoutExpired:pass
                print('PASS: native field opened, real core WIN/LP returned, client closed, campaign entered shop'+(' with +2000 boss healing and curse removed' if boss else ''),flush=True)
                break
            if proc.poll() is not None:
                raise RuntimeError(f'Native client exited early: {proc.returncode}; see temp/native-launch.log')
            time.sleep(.2)
        else: raise TimeoutError('No native result received; see temp/native-launch.log')
    finally:
        if proc.poll() is None: proc.terminate(); proc.wait(timeout=5)
        path.write_text(original)
        for name in ['campaign-request.json','campaign-result.json']:
            (g.RUNTIME/name).unlink(missing_ok=True)
