"""Exercise the visible Duel button and real native result polling without changing user saves."""
import sys,time,random,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT))
import desktop,visual_ui,campaign_ui,campaign as game
import storage
storage.ROOT=ROOT/'temp/ui-profile';storage.ROOT.mkdir(exist_ok=True)
game.SAVE=ROOT/'temp/ui-test-run.json'
original_prepare=game.prepare_duel
def prepare(run):
    result=original_prepare(run)
    p=game.RUNTIME/'puzzles/shadow-run.lua'
    with p.open('a') as f:
        f.write('\nlocal e=Effect.GlobalEffect()\ne:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS)\ne:SetCode(EVENT_PREDRAW)\ne:SetOperation(function() Duel.SetLP(0,4200) Duel.Win(0,0x10) end)\nDuel.RegisterEffect(e,0)\n')
    return result
game.prepare_duel=prepare
a=desktop.Campaign(); errors=[]; a.report_callback_exception=lambda *err:errors.append(str(err))
a.run=game.new_run(0,random.Random(44)); game.auto_deck(a.run); a.run['route_confirmed']=True
a.preloader.finished=True;a.preloader.failed=[];a.draft(); a.update()
def descendants(w):
    for child in w.winfo_children():
        yield child
        yield from descendants(child)
nxt=next(w for w in descendants(a) if w.winfo_class()=='Button' and w.cget('text')=='Choose next opponent')
nxt.invoke();a.update()
duel=next(w for w in descendants(a) if w.winfo_class()=='Button' and w.cget('text')=='Duel')
duel.invoke()
deadline=time.monotonic()+35
try:
    while a.run['stage']=='duel' and time.monotonic()<deadline:
        a.update(); time.sleep(.05)
    assert not errors,errors
    assert a.run['stage']=='shop',a.run['stage']
    assert a.run['lp']==4200 and a.run['round']==1
    try:a.duel_process.wait(timeout=10)
    except subprocess.TimeoutExpired:pass
    print('PASS: actual Duel button -> native client -> core result -> automatic shop with 4200 carried LP')
finally:
    if getattr(a,'duel_process',None) and a.duel_process.poll() is None: a.duel_process.terminate()
    a.destroy()
    for name in ['campaign-request.json','campaign-result.json']:
        (game.RUNTIME/name).unlink(missing_ok=True)
    (game.RUNTIME/'puzzles/shadow-run.lua').unlink(missing_ok=True)
