import sys,uuid,types
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import frontend as ui,campaign as g,storage
base=ROOT/'temp'/('ui-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
def walk(w):
 for c in w.winfo_children():yield c;yield from walk(c)
def texts(a):
 result=[]
 for w in walk(a):
  try:result.append(w.cget('text'))
  except Exception:pass
 return result
ui.Audio=type('MutedAudio',(),{'__init__':lambda self,*a:None,'resume':lambda self:None,'music':lambda self,*a:None,'effect':lambda self,*a:None,'close':lambda self:None})
a=ui.App();a.withdraw();errors=[];a.report_callback_exception=lambda *x:errors.append(str(x))
try:
 a.characters();a.update();assert a.character_scene.unlocked=={0,1}
 a.run=g.new_run(0);g.auto_deck(a.run);a.run.update(stage='shop',round=2,lp=4200);g.routes(a.run);g.restock(a.run)
 ui.shop(a);a.update();assert not any('BOSS ENCOUNTER' in s for s in texts(a))
 a.draft();a.update()
 assert 'Boss fight!' in texts(a)
 assert not any('BOSS ENCOUNTER' in s for s in texts(a))
 boss=next(w for w in walk(a) if w.winfo_class()=='Button' and w.cget('text')=='Boss fight!');assert boss.cget('bg')=='#a52b3b'
 back=next(w for w in walk(a) if w.winfo_class()=='Button' and w.cget('text')=='Back');back.invoke();a.update();assert a.screen=='shop'
 a.run['round']=1;a.draft();a.update();assert 'Choose next opponent' in texts(a) and 'Boss fight!' not in texts(a)
 from duel_rewards import show_earned
 popup=show_earned(a);a.update();assert '+0' in texts(popup) and not any('COINS' in x for x in texts(popup));popup.destroy()
 a.run['round']=2
 a.routes();a.update();assert texts(a).count('Challenge boss')==3
 a.settings_view();a.update();a.artifact_reference();a.update()
 a.home();a.update();ui.messagebox.showinfo=lambda *x:None
 for ch in 'heartofthecards':a.key(types.SimpleNamespace(char=ch))
 assert len(storage.profile()['unlocked'])==36
 assert not errors,errors
 print('PASS: initial locks, hidden unlock cheat, shop/deck Back, boss warnings/buttons, settings and artifact screens')
finally:a.audio.close();a.destroy()
