import sys,random,uuid,time,tkinter as tk
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import frontend as ui,campaign as g,storage
base=ROOT/'temp'/('shop-test-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;g.SAVE=base/'run.json'
a=ui.App();errors=[];a.report_callback_exception=lambda *args:errors.append(str(args))
try:
 a.run=g.new_run(0,random.Random(1));g.auto_deck(a.run);a.run.update(stage='shop',round=3,gold=999,lp=5400);g.routes(a.run);g.restock(a.run,random.Random(1))
 for size in ['1024x720','1280x880','1920x1080']:
  a.geometry(size);ui.shop(a);a.update();a.shop_scene.draw();a.update()
  scene=a.shop_scene
  assert len([k for k in scene.buttons if k!='basket'])==len(a.run['shop'])==15
  assert scene.background.width()==scene.winfo_width()
  assert scene.background.height()==scene.winfo_height()
  for index,button in scene.buttons.items():
   assert button.winfo_ismapped(),(size,index)
   assert 0<=button.winfo_x() and button.winfo_x()+button.winfo_width()<=scene.winfo_width(),(size,index,'horizontal')
   assert 0<=button.winfo_y() and button.winfo_y()+button.winfo_height()<=scene.winfo_height(),(size,index,'vertical')
 for kind in ['single','pack','artifact']:
  index=next(i for i,item in enumerate(a.run['shop']) if item['kind']==kind and not item['sold'])
  before=a.run['gold'];price=a.run['shop'][index]['price'];pool=len(a.run['pool']);owned=len(a.run['artifacts'])
  a.shop_scene.buttons[index].invoke();a.update();a.shop_scene.draw();a.update()
  a.shop_scene.buttons['basket'].invoke();a.update()
  if kind!='pack':a.shop_scene.draw();a.update()
  assert a.run['gold']==before-price and a.run['shop'][index]['sold']
  if kind!='pack':assert str(a.shop_scene.buttons[index]['state'])=='disabled'
  assert len(a.run['pool'])==pool+({'single':1,'pack':9,'artifact':0}[kind])
  assert len(a.run['artifacts'])==owned+(kind=='artifact')
  assert g.load_run()['gold']==a.run['gold']
  if kind=='pack':
   def walk(w):
    for child in w.winfo_children():yield child;yield from walk(child)
   def labels():
    out=[]
    for w in walk(a):
     if w.winfo_class()=='Label':
      try:out.append(w.cget('text'))
      except tk.TclError:pass
    return out
   def buttons(text):
    out=[]
    for w in walk(a):
     if w.winfo_class()=='Button':
      try:
       if w.cget('text')==text:out.append(w)
      except tk.TclError:pass
    return out
   assert not [w for w in a.winfo_children() if isinstance(w,tk.Toplevel) and w.title()=='Open your boosters']
   deadline=time.monotonic()+15
   while time.monotonic()<deadline:
    a.update();time.sleep(.05)
    ops=buttons('Open pack')
    if ops:
     ops[0].invoke();break
   deadline=time.monotonic()+15
   while time.monotonic()<deadline:
    a.update();time.sleep(.05)
    found=[t for t in labels() if t in {g.BY_ID[c]['name'] for c in a.run['pool'][-9:]}]
    if len(found)>=9:break
   from collections import Counter
   assert Counter(t for t in labels() if t in {g.BY_ID[c]['name'] for c in a.run['pool'][-9:]})==Counter(g.BY_ID[c]['name'] for c in a.run['pool'][-9:])
   deadline=time.monotonic()+15
   while time.monotonic()<deadline:
    a.update();time.sleep(.05)
    conts=buttons('Continue')
    if conts:
     conts[0].invoke();a.update();break
   a.update()
   assert a.screen=='shop' and not any(t=='BOOSTER 1 / 1' for t in labels())
   a.shop_scene.draw();a.update()
   assert str(a.shop_scene.buttons[index]['state'])=='disabled'
 assert not errors,errors
 print('PASS: supplied background, all 15 purchase buttons fit three resolutions, single/pack/artifact purchases, sold states and save persistence')
finally:a.audio.close();a.destroy()
