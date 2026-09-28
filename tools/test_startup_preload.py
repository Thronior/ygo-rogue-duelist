import sys,time,uuid,traceback,tkinter as tk
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
import storage,campaign
base=ROOT/'temp'/('startup-test-'+uuid.uuid4().hex);base.mkdir();storage.ROOT=base;campaign.SAVE=base/'run.json'
original_settings=storage.settings
storage.settings=lambda:{**original_settings(),'music':0,'sound':0}
from frontend import App
from PIL import Image
app=App();app.withdraw();errors=[];app.report_callback_exception=lambda *x:errors.append(''.join(traceback.format_exception(*x)))
try:
 assert app.screen=='loading';last=0;seen=set();until=time.monotonic()+120
 while app.screen=='loading' and time.monotonic()<until:
  app.update();current=app.preloader.completed;assert current>=last;last=current;seen.add(current);time.sleep(.02)
 assert not errors,errors
 assert hasattr(app,'title_scene') and len(app.title_scene.faces)==len(app.title_scene.options),'menu did not finish building'
 assert app.title_scene.options[app.title_scene.selected][3]=='characters'
 assert app.screen=='title',(app.preloader.status,app.preloader.error,app.preloader.failed)
 pre=app.preloader;assert pre.total>1800 and pre.completed==pre.total and not pre.failed
 assert len(pre.images)==pre.total;assert len(seen)>2,'live incremental updates'
 # Existing artwork views use the preloaded data even without reopening the source file.
 from unittest.mock import patch
 cid=next(iter(pre.images));original=Image.open
 def memory_only(fp,*args,**kw):
  assert not isinstance(fp,(str,Path)),'image reread from disk';return original(fp,*args,**kw)
 with patch('artwork.Image.open',memory_only):app.art.photo(ROOT/'assets/cards'/f'{cid}.jpg',(100,145))
 # Tag Duels must remain available without an existing run.
 scene=app.title_scene;scene.selected=next(i for i,o in enumerate(scene.options) if o[3]=='tag_duels');scene.position=scene.target=scene.selected
 invoked=[];app.tag_duels=lambda:invoked.append(True);scene.activate();assert invoked
 assert not errors,errors
 print(f'PASS desktop: {pre.total} cards cached; {len(seen)} incremental updates; title gated until complete; artwork reads cache')
finally:app.audio.close();app.destroy()
