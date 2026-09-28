import sys,time,tkinter as tk,random,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import frontend as ui,campaign as g,storage,campaign_ui,visual_ui as views
base=ROOT/'temp'/('pack-inspect-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
a=ui.App();a.withdraw();errors=[];a.report_callback_exception=lambda *args:errors.append(str(args))
def pump():
 until=time.monotonic()+.9
 while time.monotonic()<until:a.update();time.sleep(.02)
def descendants(w):
 for child in w.winfo_children():yield child;yield from descendants(child)
def button(text):return next(w for w in descendants(a) if isinstance(w,tk.Button) and w.cget('text')==text)
try:
 a.run=g.new_run(0,random.Random(17));done=[]
 campaign_ui.open_packs(a,a.run['packs'][:2],0,lambda:done.append(True),pack_ids=a.run['pack_ids'][:2],auto_reveal=True)
 pump()
 for i in range(2):
  views.inspect(a,g.BY_ID[a.run['packs'][i][0]]);a.update()
  popup=next(w for w in a.winfo_children() if isinstance(w,tk.Toplevel) and w.title()==g.BY_ID[a.run['packs'][i][0]]['name'])
  next(w for w in descendants(popup) if isinstance(w,tk.Button) and w.cget('text')=='Close').invoke();a.update()
  assert a.grab_current() is None
  button('Continue').invoke();pump()
 assert done==[True]
 # Inspection also remains usable when called from an older modal pack window.
 parent=tk.Toplevel(a);parent.grab_set();a.update();views.inspect(a,g.BY_ID[a.run['packs'][0][0]]);a.update()
 popup=next(w for w in parent.winfo_children() if isinstance(w,tk.Toplevel))
 next(w for w in descendants(popup) if isinstance(w,tk.Button) and w.cget('text')=='Close').invoke();a.update()
 assert a.grab_current()==parent;parent.grab_release();parent.destroy()
 assert not errors,errors
 print('PASS desktop: inspect/close/continue through two packs, modal ownership and input grab preserved')
finally:a.audio.close();a.destroy()
